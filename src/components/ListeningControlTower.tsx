import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ListeningSession } from '../types';
import { useBackendData } from '../contexts/BackendDataContext';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './ui/ToastContainer';

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

interface ListeningControlTowerProps {
  onClose?: () => void;
}

type SessionBucket = {
  active: ListeningSession[];
  recent: ListeningSession[];
};

type GroupedSessions = {
  [date: string]: ListeningSession[];
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateHeader = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateStr = date.toDateString();
  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();
  
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
};

const upsertSession = (collection: ListeningSession[], session: ListeningSession) => {
  const next = [...collection];
  // First, try to find by id (exact match)
  let index = next.findIndex((item) => item.id === session.id);
  
  // If not found by id, try to find by ticketId (since only one session should exist per ticket)
  if (index < 0 && session.ticketId) {
    index = next.findIndex((item) => item.ticketId === session.ticketId);
  }
  
  if (index >= 0) {
    // Update existing session
    next[index] = session;
  } else {
    // Only add if no duplicate exists
    // Double-check for ticketId duplicates before adding
    const hasDuplicate = session.ticketId && next.some((item) => item.ticketId === session.ticketId);
    if (!hasDuplicate) {
      next.push(session);
    }
  }
  return next;
};

const removeSession = (collection: ListeningSession[], sessionId: string) =>
  collection.filter((session) => session.id !== sessionId);

const STEP_OPTIONS: Array<{ value: 'ALL' | 'sabq' | 'sabqi' | 'manzil' | 'finalize'; label: string }> = [
  { value: 'ALL', label: 'All steps' },
  { value: 'sabq', label: 'Sabq (new lesson)' },
  { value: 'sabqi', label: 'Sabqi (recent revision)' },
  { value: 'manzil', label: 'Manzil (established review)' },
  { value: 'finalize', label: 'Finalize' }
];

const formatStatusLabel = (status: ListeningSession['status']) => {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'abandoned':
      return 'Abandoned';
    default:
      return status;
  }
};

const ListeningControlTower: React.FC<ListeningControlTowerProps> = ({ onClose }) => {
  const { deleteTicket, endListeningSession } = useBackendData();
  const { showToast, toasts, removeToast } = useToast();
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });
  const [sessions, setSessions] = useState<SessionBucket>({ active: [], recent: [] });
  const [historyByDate, setHistoryByDate] = useState<GroupedSessions>({});
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [stepFilter, setStepFilter] = useState<'ALL' | 'sabq' | 'sabqi' | 'manzil' | 'finalize'>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelingTicketId, setCancelingTicketId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Load historical sessions grouped by date
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(`${API_BASE}/listening-sessions/history?days=30`);
        if (!response.ok) {
          throw new Error(`Failed to load history (${response.status})`);
        }
        const grouped = await response.json() as GroupedSessions;
        setHistoryByDate(grouped);
        // Auto-expand today
        const today = new Date().toISOString().split('T')[0];
        if (grouped[today]) {
          setExpandedDates(new Set([today]));
        }
      } catch (error) {
        console.error('Failed to load session history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchInitialSnapshot = async () => {
      try {
        const response = await fetch(`${API_BASE}/listening-sessions/live`);
        if (!response.ok) {
          throw new Error(`Snapshot request failed (${response.status})`);
        }
        const payload = await response.json();
        if (!cancelled) {
          // Deduplicate sessions by ticketId before setting state
          const activeSessions = payload.active ?? [];
          const deduplicatedActive = new Map<string, ListeningSession>();
          
          activeSessions.forEach((session: ListeningSession) => {
            const key = session.ticketId || session.id;
            const existing = deduplicatedActive.get(key);
            // Keep the most recent session
            if (!existing || 
                new Date(session.lastHeartbeatAt || session.startedAt).getTime() > 
                new Date(existing.lastHeartbeatAt || existing.startedAt).getTime()) {
              deduplicatedActive.set(key, session);
            }
          });
          
          setSessions({
            active: Array.from(deduplicatedActive.values()),
            recent: payload.recent ?? []
          });
          setIsConnecting(false);
        }
      } catch (error: any) {
        if (!cancelled) {
          setConnectionError(error?.message || 'Failed to load listening sessions');
          setIsConnecting(false);
        }
      }
    };

    fetchInitialSnapshot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/listening-sessions/stream`, {
      withCredentials: false
    });
    eventSourceRef.current = eventSource;

    const handleSnapshot = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        
        // Deduplicate sessions by ticketId
        const activeSessions = payload.active ?? [];
        const deduplicatedActive = new Map<string, ListeningSession>();
        
        activeSessions.forEach((session: ListeningSession) => {
          const key = session.ticketId || session.id;
          const existing = deduplicatedActive.get(key);
          // Keep the most recent session
          if (!existing || 
              new Date(session.lastHeartbeatAt || session.startedAt).getTime() > 
              new Date(existing.lastHeartbeatAt || existing.startedAt).getTime()) {
            deduplicatedActive.set(key, session);
          }
        });
        
        setSessions({
          active: Array.from(deduplicatedActive.values()),
          recent: payload.recent ?? []
        });
        setConnectionError(null);
        setIsConnecting(false);
      } catch (error) {
        console.error('Failed to parse session snapshot:', error);
      }
    };

    const handleStarted = (event: MessageEvent) => {
      try {
        const payload: ListeningSession = JSON.parse(event.data);
        setSessions((prev) => ({
          active: upsertSession(prev.active, payload),
          recent: prev.recent
        }));
      } catch (error) {
        console.error('Failed to parse session started payload:', error);
      }
    };

    const handleUpdated = (event: MessageEvent) => {
      try {
        const payload: ListeningSession = JSON.parse(event.data);
        setSessions((prev) => ({
          active: upsertSession(prev.active, payload),
          recent: prev.recent
        }));
      } catch (error) {
        console.error('Failed to parse session updated payload:', error);
      }
    };

    const handleEnded = (event: MessageEvent) => {
      try {
        const payload: ListeningSession = JSON.parse(event.data);
        setSessions((prev) => {
          const nextActive = removeSession(prev.active, payload.id);
          const nextRecent = upsertSession(prev.recent, payload)
            .sort((a, b) => {
              const aTime = new Date(a.endedAt || a.updatedAt || a.createdAt || 0).getTime();
              const bTime = new Date(b.endedAt || b.updatedAt || b.createdAt || 0).getTime();
              return bTime - aTime;
            })
            .slice(0, 10);
          return {
            active: nextActive,
            recent: nextRecent
          };
        });
        
        // Reload history when a session ends
        fetch(`${API_BASE}/listening-sessions/history?days=30`)
          .then(res => res.json())
          .then(grouped => setHistoryByDate(grouped as GroupedSessions))
          .catch(console.error);
      } catch (error) {
        console.error('Failed to parse session ended payload:', error);
      }
    };

    const handleDeleted = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.id) {
          setSessions((prev) => ({
            active: removeSession(prev.active, payload.id),
            recent: removeSession(prev.recent, payload.id)
          }));
          // Reload history
          fetch(`${API_BASE}/listening-sessions/history?days=30`)
            .then(res => res.json())
            .then(grouped => setHistoryByDate(grouped as GroupedSessions))
            .catch(console.error);
        }
      } catch (error) {
        console.error('Failed to parse session deleted payload:', error);
      }
    };

    const handleError = (event: Event) => {
      console.error('Listening session stream encountered an error:', event);
      setConnectionError('Live stream unavailable – retrying…');
    };

    eventSource.addEventListener('session_snapshot', handleSnapshot);
    eventSource.addEventListener('session_started', handleStarted);
    eventSource.addEventListener('session_updated', handleUpdated);
    eventSource.addEventListener('session_ended', handleEnded);
    eventSource.addEventListener('session_deleted', handleDeleted);
    eventSource.addEventListener('sessions_deleted', handleDeleted);
    eventSource.addEventListener('session_error', handleError);
    eventSource.onerror = handleError;

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, []);

  // Deduplicate active sessions by ticketId before sorting (only keep the most recent one per ticket)
  const sortedActiveSessions = useMemo(() => {
    const deduplicated = new Map<string, ListeningSession>();
    
    sessions.active.forEach((session) => {
      const key = session.ticketId || session.id;
      const existing = deduplicated.get(key);
      
      // Keep the most recent session (by startedAt) if duplicates exist
      if (!existing || new Date(session.startedAt).getTime() > new Date(existing.startedAt).getTime()) {
        deduplicated.set(key, session);
      }
    });
    
    return Array.from(deduplicated.values()).sort((a, b) => {
      const aTime = new Date(a.startedAt).getTime();
      const bTime = new Date(b.startedAt).getTime();
      return aTime - bTime;
    });
  }, [sessions.active]);

  const activeSessionsWithElapsed = useMemo(
    () =>
      sortedActiveSessions.map((session) => {
        const startedAtMs = new Date(session.startedAt).getTime();
        const elapsedSeconds =
          session.status === 'in_progress'
            ? Math.max(0, Math.round((now - startedAtMs) / 1000))
            : session.totalListeningSeconds;
        return {
          session,
          elapsedSeconds
        };
      }),
    [sortedActiveSessions, now]
  );

  const teacherOptions = useMemo(() => {
    const names = new Set<string>();
    sessions.active.forEach((session) => names.add(session.teacherName));
    sessions.recent.forEach((session) => names.add(session.teacherName));
    (Object.values(historyByDate).flat() as ListeningSession[]).forEach((session) => names.add(session.teacherName));
    return Array.from(names).sort();
  }, [sessions.active, sessions.recent, historyByDate]);

  const matchesFilters = (session: ListeningSession) => {
    if (stepFilter !== 'ALL' && session.workflowStep !== stepFilter) {
      return false;
    }
    if (teacherFilter !== 'ALL' && session.teacherName !== teacherFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      const studentMatch = session.studentName.toLowerCase().includes(query);
      const teacherMatch = session.teacherName.toLowerCase().includes(query);
      const ticketMatch = session.ticketId.toLowerCase().includes(query);
      if (!studentMatch && !teacherMatch && !ticketMatch) {
        return false;
      }
    }
    return true;
  };

  const filteredActiveSessions = activeSessionsWithElapsed.filter(({ session }) => matchesFilters(session));

  // Group and filter historical sessions
  const filteredHistoryByDate = useMemo(() => {
    const filtered: GroupedSessions = {};
    Object.entries(historyByDate).forEach(([date, sessionsForDate]) => {
      const filteredSessions = (sessionsForDate as ListeningSession[]).filter(matchesFilters);
      if (filteredSessions.length > 0) {
        filtered[date] = filteredSessions;
      }
    });
    return filtered;
  }, [historyByDate, stepFilter, teacherFilter, searchTerm]);

  const sortedHistoryDates = useMemo(() => {
    return Object.keys(filteredHistoryByDate).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [filteredHistoryByDate]);

  const toggleDateExpanded = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const handleCancelTicket = useCallback(
    async (session: ListeningSession) => {
      if (!session?.ticketId) {
        return;
      }

      setConfirmModal({
        isOpen: true,
        title: 'Cancel Ticket',
        description: `Cancel ticket ${session.ticketId} for ${session.studentName}? This will end the active listening session and remove the ticket.`,
        danger: true,
        onConfirm: async () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          await performCancelTicket(session);
        }
      });
    },
    [deleteTicket, endListeningSession]
  );

  const performCancelTicket = async (session: ListeningSession) => {
    setActionError(null);
    setCancelingTicketId(session.ticketId);

    const targetId = session.id || session.ticketId;
    let endErrorMessage: string | null = null;

    if (targetId) {
      try {
        await endListeningSession(targetId, {
          status: 'abandoned',
          endedAt: new Date().toISOString()
        });
      } catch (error) {
        endErrorMessage =
          error instanceof Error
            ? error.message
            : 'Unable to end the listening session before cancelling.';
        console.error('Failed to end listening session prior to cancellation:', error);
      }
    }

    try {
      await deleteTicket(session.ticketId);
      if (targetId) {
        setSessions((prev) => ({
          active: removeSession(prev.active, targetId),
          recent: removeSession(prev.recent, targetId)
        }));
      }

      if (endErrorMessage) {
        showToast(
          `${endErrorMessage} The ticket was removed, but the session may take a moment to disappear.`,
          'warning',
          6000
        );
      } else {
        showToast('Ticket cancelled successfully', 'success');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to cancel ticket. Please try again.';
      setActionError(message);
      showToast(message, 'error');
      console.error('Failed to cancel ticket from control tower:', error);
      return;
    } finally {
      setCancelingTicketId(null);
    }
  };

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      setConfirmModal({
        isOpen: true,
        title: 'Delete Session',
        description: 'Are you sure you want to delete this session? This action cannot be undone.',
        danger: true,
        onConfirm: async () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          await performDeleteSession(sessionId);
        }
      });
    },
    []
  );

  const performDeleteSession = async (sessionId: string) => {
    setActionError(null);
    setDeletingSessionId(sessionId);

    try {
      const response = await fetch(`${API_BASE}/listening-sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session (${response.status})`);
      }

      setSessions((prev) => ({
        active: removeSession(prev.active, sessionId),
        recent: removeSession(prev.recent, sessionId)
      }));

      // Reload history
      const historyResponse = await fetch(`${API_BASE}/listening-sessions/history?days=30`);
      if (historyResponse.ok) {
        const grouped = await historyResponse.json() as GroupedSessions;
        setHistoryByDate(grouped);
      }
      showToast('Session deleted successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete session. Please try again.';
      setActionError(message);
      showToast(message, 'error');
      console.error('Failed to delete session:', error);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleDeleteDate = useCallback(
    async (date: string) => {
      const sessionCount = filteredHistoryByDate[date]?.length || 0;
      setConfirmModal({
        isOpen: true,
        title: 'Delete Sessions',
        description: `Are you sure you want to delete all ${sessionCount} sessions from ${formatDateHeader(date)}? This action cannot be undone.`,
        danger: true,
        onConfirm: async () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          await performDeleteDate(date);
        }
      });
    },
    [filteredHistoryByDate]
  );

  const performDeleteDate = async (date: string) => {
    setActionError(null);
    setDeletingDate(date);

    try {
      const response = await fetch(`${API_BASE}/listening-sessions/date/${date}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete sessions for date (${response.status})`);
      }

      // Reload history
      const historyResponse = await fetch(`${API_BASE}/listening-sessions/history?days=30`);
      if (historyResponse.ok) {
        const grouped = await historyResponse.json() as GroupedSessions;
        setHistoryByDate(grouped);
      }
      showToast('Sessions deleted successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete sessions. Please try again.';
      setActionError(message);
      showToast(message, 'error');
      console.error('Failed to delete sessions by date:', error);
    } finally {
      setDeletingDate(null);
    }
  };

  return (
    <>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        danger={confirmModal.danger}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
        <div className="relative flex h-full max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-gray-200 bg-gradient-to-r from-green-600 via-green-700 to-green-800 px-6 py-4 text-white">
          <div>
            <h2 className="text-2xl font-bold">Listening Control Tower</h2>
            <p className="mt-1 text-sm text-green-50">
              Monitor active listening sessions, timer progress, and Mushaf activity in real time.
            </p>
            {connectionError && (
              <p className="mt-2 text-xs font-semibold text-red-200">{connectionError}</p>
            )}
            {actionError && (
              <p className="mt-2 text-xs font-semibold text-red-200">{actionError}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Close
          </button>
          </header>

          <main className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto]">
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search student, teacher, or ticket…"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full border-none text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <label htmlFor="listening-step-filter" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Step
              </label>
              <select
                id="listening-step-filter"
                value={stepFilter}
                onChange={(event) => setStepFilter(event.target.value as typeof stepFilter)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
              >
                {STEP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <label htmlFor="listening-teacher-filter" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Teacher
              </label>
              <select
                id="listening-teacher-filter"
                value={teacherFilter}
                onChange={(event) => setTeacherFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
              >
                <option value="ALL">All teachers</option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher} value={teacher}>
                    {teacher}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Active sessions</h3>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                {filteredActiveSessions.length}
              </span>
              {isConnecting && (
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Connecting…
                </span>
              )}
            </div>
            {filteredActiveSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
                <p className="text-sm font-medium text-gray-500">
                  No active listening sessions right now. Live updates will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {filteredActiveSessions.map(({ session, elapsedSeconds }) => (
                  <div
                    key={session.id}
                    className="flex h-full flex-col gap-4 rounded-2xl border-2 border-green-200 bg-white px-5 py-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wide text-green-600 font-semibold">
                          {session.workflowStep.toUpperCase()}
                        </p>
                        <h4 className="text-base font-semibold text-gray-900">
                          {session.studentName}
                        </h4>
                        <p className="text-xs text-gray-500">Teacher: {session.teacherName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          {formatDuration(elapsedSeconds)}
                        </div>
                        <button
                          onClick={() => handleCancelTicket(session)}
                          disabled={cancelingTicketId === session.ticketId}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {cancelingTicketId === session.ticketId ? 'Cancelling…' : 'Cancel ticket'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-green-50/60 px-4 py-3 text-sm text-green-900">
                      <div className="flex items-center justify-between">
                        <span>Current page</span>
                        <span className="font-semibold">{session.currentPage ?? '—'}</span>
                      </div>
                      <div className="mt-1 text-xs text-green-700">
                        {session.currentSection || 'Section not reported'}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center justify-between">
                        <span>Mistakes marked</span>
                        <span className="font-semibold">{session.mistakeCount}</span>
                      </div>
                      {session.mistakes.length > 0 && (
                        <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg bg-white px-3 py-2 text-xs text-gray-600">
                          {session.mistakes
                            .slice()
                            .reverse()
                            .map((mistake) => (
                              <div key={mistake.id || `${mistake.page}-${mistake.ayah}-${mistake.wordIndex}`}>
                                <span className="font-semibold text-gray-800">{mistake.type || 'Mistake'}</span>
                                <span className="mx-1 text-gray-400">•</span>
                                <span>
                                  Page {mistake.page ?? '—'} • Ayah {mistake.ayah ?? '—'}
                                </span>
                                {mistake.note && (
                                  <span className="ml-1 text-gray-400">({mistake.note})</span>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Started {formatDateTime(session.startedAt)}</span>
                      <span>Last update {formatDateTime(session.lastHeartbeatAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Session history</h3>
                {isLoadingHistory && (
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Loading…
                  </span>
                )}
              </div>
            </div>
            
            {sortedHistoryDates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
                No historical listening sessions recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedHistoryDates.map((date) => {
                  const sessionsForDate = filteredHistoryByDate[date] || [];
                  const isExpanded = expandedDates.has(date);
                  
                  return (
                    <div key={date} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      <button
                        onClick={() => toggleDateExpanded(date)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <svg
                            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div className="text-left">
                            <h4 className="text-base font-semibold text-gray-900">
                              {formatDateHeader(date)}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {sessionsForDate.length} session{sessionsForDate.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDate(date);
                          }}
                          disabled={deletingDate === date}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingDate === date ? 'Deleting…' : 'Delete all'}
                        </button>
                      </button>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-2">
                          {sessionsForDate.map((session) => (
                            <div
                              key={session.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">
                                  {session.studentName} <span className="text-gray-400">·</span>{' '}
                                  <span className="uppercase tracking-wide text-xs text-gray-500">
                                    {session.workflowStep}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Teacher {session.teacherName} • Ended {formatDateTime(session.endedAt || session.updatedAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    session.status === 'completed'
                                      ? 'bg-green-100 text-green-700'
                                      : session.status === 'abandoned'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {formatStatusLabel(session.status)}
                                </span>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Total listening time</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {formatDuration(session.totalListeningSeconds)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Mistakes</p>
                                  <p className="text-sm font-semibold text-gray-900">{session.mistakeCount}</p>
                                </div>
                                <button
                                  onClick={() => handleDeleteSession(session.id)}
                                  disabled={deletingSessionId === session.id}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {deletingSessionId === session.id ? 'Deleting…' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
        </div>
      </div>
    </>
  );
};

export default ListeningControlTower;
