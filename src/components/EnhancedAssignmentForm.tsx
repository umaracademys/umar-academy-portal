import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, ClassworkPhase, AssignmentMushafMistake } from '../types/assignment';
import { Ticket } from '../types/ticket';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import { getQuranChapters, Chapter } from '@umar-academy/mushaf';

interface EnhancedAssignmentFormProps {
  studentId: string;
  assignmentId?: string | null;
  prefillTicket?: Ticket | null;
  onClose: () => void;
  onSave: () => void;
}

interface TicketLogEntry {
  ticket: Ticket;
  date: Date;
  teacherName: string;
  type: 'sabq' | 'sabqi' | 'manzil';
  notes: string;
}

const EnhancedAssignmentForm: React.FC<EnhancedAssignmentFormProps> = ({
  studentId,
  assignmentId,
  prefillTicket,
  onClose,
  onSave
}) => {
  const { students, assignments, addAssignment, updateAssignment, refreshData, getStudentPersonalMushaf, teachers } = useBackendData();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketLogs, setTicketLogs] = useState<TicketLogEntry[]>([]);
  const [showTicketLog, setShowTicketLog] = useState(true);
  const [showMushaf, setShowMushaf] = useState(false);
  const [mushafPage, setMushafPage] = useState(1);
  const [currentMistakes, setCurrentMistakes] = useState<MushafMistake[]>([]);
  const [existingMistakes, setExistingMistakes] = useState<MushafMistake[]>([]);
  const [surahs, setSurahs] = useState<Chapter[]>([]);

  const student = students.find(s => s.id === studentId);
  const existingAssignment = assignmentId 
    ? assignments.find(a => a.id === assignmentId)
    : null;

  // Load Surahs on mount
  useEffect(() => {
    const loadSurahs = async () => {
      try {
        const chapters = await getQuranChapters();
        setSurahs(chapters);
      } catch (error) {
        console.error('Error loading Surahs:', error);
        // Fallback: create basic list
        const fallbackSurahs: Chapter[] = Array.from({ length: 114 }, (_, i) => ({
          id: i + 1,
          name_simple: `Surah ${i + 1}`,
          name_arabic: `سورة ${i + 1}`,
          name_complex: `Surah ${i + 1}`,
          verses_count: 0,
          revelation_place: ''
        }));
        setSurahs(fallbackSurahs);
      }
    };
    loadSurahs();
  }, []);

  // Load ticket history for this student
  useEffect(() => {
    const loadTicketLogs = async () => {
      if (!studentId) return;
      
      setLoadingTickets(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/tickets?studentId=${studentId}&status=sent_to_assignment`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const tickets: Ticket[] = await response.json();
          const logs: TicketLogEntry[] = tickets
            .filter(t => t.status === 'sent_to_assignment')
            .map(ticket => ({
              ticket,
              date: ticket.sentAt ? new Date(ticket.sentAt) : (ticket.createdAt ? new Date(ticket.createdAt) : new Date()),
              teacherName: ticket.assignedTeacherName || ticket.createdByName || 'N/A',
              type: ticket.type as 'sabq' | 'sabqi' | 'manzil',
              notes: ticket.teacherComment || ticket.adminComment || ''
            }))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
          
          setTicketLogs(logs);
        }
      } catch (error) {
        console.error('Error loading ticket logs:', error);
      } finally {
        setLoadingTickets(false);
      }
    };

    loadTicketLogs();
  }, [studentId]);

  // Load existing mistakes from student's personal mushaf
  useEffect(() => {
    const loadMistakes = async () => {
      if (!studentId) return;
      
      try {
        const data = await getStudentPersonalMushaf(studentId);
        if (data && data.mistakes) {
          const convertedMistakes: MushafMistake[] = data.mistakes.map((m: any) => ({
            id: m.id,
            type: m.type,
            page: m.page,
            surah: m.surah,
            ayah: m.ayah,
            wordIndex: m.wordIndex,
            position: m.position,
            note: m.note,
            audioUrl: m.audioUrl,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            workflowStep: m.workflowStep
          }));
          setExistingMistakes(convertedMistakes);
        }
      } catch (err) {
        console.error('Error loading existing mistakes:', err);
      }
    };
    
    loadMistakes();
  }, [studentId, getStudentPersonalMushaf]);

  // Form state
  const [classwork, setClasswork] = useState<{
    sabq: ClassworkPhase[];
    sabqi: ClassworkPhase[];
    manzil: ClassworkPhase[];
  }>({
    sabq: [],
    sabqi: [],
    manzil: []
  });

  const [homework, setHomework] = useState<{
    enabled: boolean;
    content: string;
    link: string;
  }>({
    enabled: false,
    content: '',
    link: ''
  });

  const [comment, setComment] = useState('');

  // Initialize form from existing assignment
  useEffect(() => {
    if (existingAssignment) {
      const classworkData = existingAssignment.classwork || { sabq: [], sabqi: [], manzil: [] };
      setClasswork(classworkData);
      
      const hw = existingAssignment.homework || { enabled: false, content: '', link: '' };
      
      setHomework({
        enabled: hw.enabled || !!(hw.content?.trim() || hw.link?.trim()),
        content: hw.content || '',
        link: hw.link || ''
      });
      
      setComment(existingAssignment.comment || '');
      
      // Load existing mistakes
      if (existingAssignment.mushafMistakes && existingAssignment.mushafMistakes.length > 0) {
        const convertedMistakes: MushafMistake[] = existingAssignment.mushafMistakes.map((m: AssignmentMushafMistake) => ({
          id: m.id,
          type: m.type,
          page: m.page,
          surah: m.surah,
          ayah: m.ayah,
          wordIndex: m.wordIndex,
          position: m.position,
          note: m.note,
          audioUrl: m.audioUrl,
          timestamp: m.timestamp || new Date(),
          workflowStep: m.workflowStep
        }));
        setCurrentMistakes(convertedMistakes);
      }
    } else if (prefillTicket) {
      // Pre-fill from ticket
      const currentDate = new Date();
      if (prefillTicket.type === 'sabq') {
        setClasswork(prev => ({
          ...prev,
          sabq: [{
            type: 'sabq',
            assignmentRange: prefillTicket.adminComment || 'Sabq recitation',
            details: prefillTicket.adminComment || '',
            createdAt: currentDate
          }]
        }));
      } else if (prefillTicket.type === 'sabqi') {
        setClasswork(prev => ({
          ...prev,
          sabqi: [{
            type: 'sabqi',
            assignmentRange: prefillTicket.teacherComment || prefillTicket.adminComment || 'Sabqi recitation',
            details: prefillTicket.teacherComment || prefillTicket.adminComment || '',
            createdAt: currentDate
          }]
        }));
      } else if (prefillTicket.type === 'manzil') {
        setClasswork(prev => ({
          ...prev,
          manzil: [{
            type: 'manzil',
            assignmentRange: prefillTicket.teacherComment || prefillTicket.adminComment || 'Manzil recitation',
            details: prefillTicket.teacherComment || prefillTicket.adminComment || '',
            createdAt: currentDate
          }]
        }));
      }
      
      if (prefillTicket.mistakes && prefillTicket.mistakes.length > 0) {
        const convertedMistakes: MushafMistake[] = prefillTicket.mistakes.map((m: any) => ({
          id: m.id,
          type: m.type,
          page: m.page,
          surah: m.surah,
          ayah: m.ayah,
          wordIndex: m.wordIndex,
          position: m.position,
          note: m.note,
          audioUrl: m.audioUrl,
          timestamp: m.timestamp || new Date(),
          workflowStep: prefillTicket.type
        }));
        setCurrentMistakes(convertedMistakes);
      }
    } else if (ticketLogs.length > 0 && !assignmentId) {
      // Auto-prefill from approved tickets (when creating new assignment)
      const currentDate = new Date();
      ticketLogs.forEach(log => {
        const ticket = log.ticket;
        if (ticket.type === 'sabq') {
          setClasswork(prev => {
            // Check if sabq already exists
            if (prev.sabq.length === 0) {
              return {
                ...prev,
                sabq: [{
                  type: 'sabq',
                  assignmentRange: ticket.adminComment || 'Sabq recitation',
                  details: ticket.adminComment || '',
                  createdAt: currentDate
                }]
              };
            }
            return prev;
          });
        } else if (ticket.type === 'sabqi') {
          setClasswork(prev => {
            if (prev.sabqi.length === 0) {
              return {
                ...prev,
                sabqi: [{
                  type: 'sabqi',
                  assignmentRange: ticket.teacherComment || ticket.adminComment || 'Sabqi recitation',
                  details: ticket.teacherComment || ticket.adminComment || '',
                  createdAt: currentDate
                }]
              };
            }
            return prev;
          });
        } else if (ticket.type === 'manzil') {
          setClasswork(prev => {
            if (prev.manzil.length === 0) {
              return {
                ...prev,
                manzil: [{
                  type: 'manzil',
                  assignmentRange: ticket.teacherComment || ticket.adminComment || 'Manzil recitation',
                  details: ticket.teacherComment || ticket.adminComment || '',
                  createdAt: currentDate
                }]
              };
            }
            return prev;
          });
        }
      });
    }
  }, [existingAssignment, prefillTicket, ticketLogs, assignmentId]);

  // Get current user info
  const currentUserInfo = useMemo(() => {
    if (!user) return { id: '', name: '' };
    const teacher = teachers.find(t => t.id === user.id || t.email === user.email);
    if (teacher) {
      return { id: teacher.id, name: teacher.fullName || 'Teacher' };
    }
    return { id: user.id || '', name: user.name || user.email || 'Admin' };
  }, [user, teachers]);

  // Add classwork phase
  const addClassworkPhase = (type: 'sabq' | 'sabqi' | 'manzil') => {
    const newPhase: ClassworkPhase = {
      type,
      assignmentRange: '',
      details: '',
      createdAt: new Date()
    };
    setClasswork(prev => ({
      ...prev,
      [type]: [...prev[type], newPhase]
    }));
  };

  // Update classwork phase
  const updateClassworkPhase = (
    type: 'sabq' | 'sabqi' | 'manzil',
    index: number,
    field: keyof ClassworkPhase,
    value: any
  ) => {
    setClasswork(prev => ({
      ...prev,
      [type]: prev[type].map((phase, i) => 
        i === index ? { ...phase, [field]: value } : phase
      )
    }));
  };

  // Remove classwork phase
  const removeClassworkPhase = (type: 'sabq' | 'sabqi' | 'manzil', index: number) => {
    setClasswork(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Use suggestion from ticket log
  const useTicketSuggestion = (logEntry: TicketLogEntry) => {
    const currentDate = new Date();
    const teacherName = logEntry.teacherName;
    const mistakeCount = logEntry.ticket.mistakes?.length || 0;
    const teacherComment = logEntry.notes || logEntry.ticket.teacherComment || '';
    
    // Format the data: Teacher: [Name] | Mistakes Marked: [Count] | Comments: [Teacher Comments]
    const formattedData = `Teacher: ${teacherName} | Mistakes Marked: ${mistakeCount} | Comments: ${teacherComment}`;
    
    if (logEntry.type === 'sabq') {
      addClassworkPhase('sabq');
      const lastIndex = classwork.sabq.length;
      updateClassworkPhase('sabq', lastIndex, 'assignmentRange', formattedData);
      updateClassworkPhase('sabq', lastIndex, 'details', formattedData);
    } else if (logEntry.type === 'sabqi') {
      addClassworkPhase('sabqi');
      const lastIndex = classwork.sabqi.length;
      updateClassworkPhase('sabqi', lastIndex, 'assignmentRange', formattedData);
      updateClassworkPhase('sabqi', lastIndex, 'details', formattedData);
    } else if (logEntry.type === 'manzil') {
      addClassworkPhase('manzil');
      const lastIndex = classwork.manzil.length;
      updateClassworkPhase('manzil', lastIndex, 'assignmentRange', formattedData);
      updateClassworkPhase('manzil', lastIndex, 'details', formattedData);
    }
  };


  // Handle mistake mark
  const handleMistakeMark = (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    const newMistake: MushafMistake = {
      ...mistake,
      id: `mistake-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    setCurrentMistakes(prev => [...prev, newMistake]);
  };

  // Remove mistake
  const removeMistake = (mistakeId: string) => {
    setCurrentMistakes(prev => prev.filter(m => m.id !== mistakeId));
  };

  // Get mistakes for current page
  const getMistakesForPage = useCallback((page: number) => {
    return currentMistakes.filter(m => m.page === page);
  }, [currentMistakes]);

  // Filter classwork to remove empty entries
  const filteredClasswork = useMemo(() => {
    return {
      sabq: classwork.sabq.filter(c => c.assignmentRange.trim()),
      sabqi: classwork.sabqi.filter(c => c.assignmentRange.trim()),
      manzil: classwork.manzil.filter(c => c.assignmentRange.trim())
    };
  }, [classwork]);

  // Validation
  const isValid = useMemo(() => {
    const hasClasswork = 
      filteredClasswork.sabq.length > 0 ||
      filteredClasswork.sabqi.length > 0 ||
      filteredClasswork.manzil.length > 0;
    const hasHomework = homework.enabled && (homework.content.trim() || homework.link.trim());
    return hasClasswork || hasHomework;
  }, [filteredClasswork, homework]);

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSaving) {
      console.log('⏸️ Already saving, ignoring duplicate submission');
      return;
    }
    
    if (!student || !user) {
      alert('Student or user information is missing');
      return;
    }

    if (!isValid) {
      alert('Please add at least one classwork entry or homework item');
      return;
    }

    setIsSaving(true);
    try {
      // Convert mistakes to AssignmentMushafMistake format
      const mushafMistakes: AssignmentMushafMistake[] = currentMistakes.map(m => ({
        id: m.id,
        type: m.type,
        page: m.page,
        surah: m.surah,
        ayah: m.ayah,
        wordIndex: m.wordIndex,
        position: m.position,
        note: m.note,
        audioUrl: m.audioUrl,
        workflowStep: (m as any).workflowStep,
        markedBy: currentUserInfo.id,
        markedByName: currentUserInfo.name,
        timestamp: m.timestamp || new Date()
      }));

      // Simplified homework - just content and link
      const assignmentData: Assignment = {
        id: assignmentId || '',
        studentId: student.id,
        studentName: student.fullName,
        assignedBy: user.id || '',
        assignedByName: user.name || user.email || 'Unknown',
        assignedByRole: (user.role === 'superadmin' ? 'super_admin' : user.role) as 'admin' | 'super_admin' | 'teacher',
        classwork: filteredClasswork,
        homework: {
          enabled: homework.enabled,
          content: homework.content || '',
          link: homework.link || ''
        },
        comment: comment.trim(),
        mushafMistakes: mushafMistakes.length > 0 ? mushafMistakes : undefined,
        status: 'active'
      };

      console.log('📤 Assignment data being saved:', {
        assignmentId,
        homeworkEnabled: homework.enabled,
        homeworkContent: homework.content,
        homeworkLink: homework.link
      });

      if (assignmentId && existingAssignment) {
        console.log('💾 Saving assignment update:', {
          assignmentId,
          homework: assignmentData.homework
        });
        await updateAssignment(assignmentId, assignmentData);
      } else {
        const assignmentDataWithTicket = prefillTicket && prefillTicket.type === 'sabq' && prefillTicket.id
          ? { ...assignmentData, ticketId: prefillTicket.id }
          : assignmentData;
        console.log('💾 Creating new assignment:', {
          homework: assignmentData.homework
        });
        await addAssignment(assignmentDataWithTicket);
      }

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('assignmentUpdated', { 
        detail: { assignmentId, studentId } 
      }));
      
      // Small delay to ensure state updates propagate before closing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onSave();
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert('Failed to save assignment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeColor = (type: 'sabq' | 'sabqi' | 'manzil') => {
    const colors = {
      sabq: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
      sabqi: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
      manzil: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' }
    };
    return colors[type];
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col my-4">
        {/* Compact Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {assignmentId ? 'Edit' : 'Create'} Assignment
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {student?.fullName || 'Student'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Compact Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {/* Compact Ticket Log Panel - Wrapped by default */}
          {ticketLogs.length > 0 && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowTicketLog(!showTicketLog)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded border border-gray-300 hover:bg-gray-100 transition-colors text-sm"
              >
                <span className="font-medium text-gray-700">Ticket History ({ticketLogs.length})</span>
                <span className="text-gray-500">{showTicketLog ? '▼' : '▶'}</span>
              </button>

              {showTicketLog && (
                <div className="mt-2 border border-gray-200 rounded overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Date</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Type</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Mistakes</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {ticketLogs.map((log, idx) => {
                          const colors = getTypeColor(log.type);
                          const mistakeCount = log.ticket.mistakes?.length || 0;
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-2 py-1.5 text-gray-600 text-xs">
                                {log.date.toLocaleDateString()}
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}>
                                  {log.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-gray-600 text-xs">
                                {mistakeCount}
                              </td>
                              <td className="px-2 py-1.5">
                                <button
                                  type="button"
                                  onClick={() => useTicketSuggestion(log)}
                                  className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                                >
                                  Use
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compact Classwork Section */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Classwork</h3>
            
            {/* Compact Sabq */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">Sabq</span>
                </label>
                <button
                  type="button"
                  onClick={() => addClassworkPhase('sabq')}
                  className="px-2 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                >
                  + Add
                </button>
              </div>
              {classwork.sabq.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-1">No sabq entries</p>
              ) : (
                <div className="space-y-1.5">
                  {classwork.sabq.map((phase, index) => (
                    <div key={index} className="border border-gray-200 rounded p-2 bg-purple-50/20">
                      <input
                        type="text"
                        placeholder="Assignment Range"
                        value={phase.assignmentRange}
                        onChange={(e) => updateClassworkPhase('sabq', index, 'assignmentRange', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 mb-1"
                        required
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {phase.createdAt ? new Date(phase.createdAt).toLocaleDateString() : 'Today'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeClassworkPhase('sabq', index)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Compact Sabqi */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">Sabqi</span>
                </label>
                <button
                  type="button"
                  onClick={() => addClassworkPhase('sabqi')}
                  className="px-2 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                >
                  + Add
                </button>
              </div>
              {classwork.sabqi.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-1">No sabqi entries</p>
              ) : (
                <div className="space-y-1.5">
                  {classwork.sabqi.map((phase, index) => (
                    <div key={index} className="border border-gray-200 rounded p-2 bg-blue-50/20">
                      <input
                        type="text"
                        placeholder="Assignment Range"
                        value={phase.assignmentRange}
                        onChange={(e) => updateClassworkPhase('sabqi', index, 'assignmentRange', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-1"
                        required
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {phase.createdAt ? new Date(phase.createdAt).toLocaleDateString() : 'Today'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeClassworkPhase('sabqi', index)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Compact Manzil */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">Manzil</span>
                </label>
                <button
                  type="button"
                  onClick={() => addClassworkPhase('manzil')}
                  className="px-2 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                >
                  + Add
                </button>
              </div>
              {classwork.manzil.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-1">No manzil entries</p>
              ) : (
                <div className="space-y-1.5">
                  {classwork.manzil.map((phase, index) => (
                    <div key={index} className="border border-gray-200 rounded p-2 bg-green-50/20">
                      <input
                        type="text"
                        placeholder="Assignment Range"
                        value={phase.assignmentRange}
                        onChange={(e) => updateClassworkPhase('manzil', index, 'assignmentRange', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 focus:border-green-500 mb-1"
                        required
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {phase.createdAt ? new Date(phase.createdAt).toLocaleDateString() : 'Today'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeClassworkPhase('manzil', index)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Simplified Homework Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Homework</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={homework.enabled}
                  onChange={(e) => setHomework(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-xs font-medium text-gray-700">Enable</span>
              </label>
            </div>
            
            {homework.enabled && (
              <div className="space-y-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                {/* Comment Box */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Homework Instructions
                  </label>
                  <textarea
                    value={homework.content}
                    onChange={(e) => setHomework(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                    placeholder="Enter homework instructions, notes, or content..."
                  />
                </div>

                {/* Link Box */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Link (optional)
                  </label>
                  <input
                    type="url"
                    value={homework.link}
                    onChange={(e) => setHomework(prev => ({ ...prev, link: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="Paste link here (e.g., https://...)"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Compact Mushaf Mistakes Section - Wrapped by default */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowMushaf(!showMushaf)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded border transition-colors ${
                showMushaf
                  ? 'bg-primary text-white border-primary hover:bg-primary/90'
                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <span>Mushaf Mistakes ({currentMistakes.length})</span>
              <span>{showMushaf ? '▼' : '▶'}</span>
            </button>

            {showMushaf && (
              <div className="mt-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="mb-2">
                  <p className="text-xs text-gray-600 mb-1">
                    Click on words in the Mushaf to mark mistakes.
                  </p>
                  <div className="text-xs text-gray-500">
                    Mistakes marked: <strong className="text-primary">{currentMistakes.length}</strong>
                  </div>
                </div>
                
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white" style={{ minHeight: '400px', maxHeight: '500px' }}>
                  <InteractiveMushaf
                    currentPage={mushafPage}
                    onPageChange={setMushafPage}
                    mistakes={getMistakesForPage(mushafPage)}
                    historicalMistakes={existingMistakes.filter(m => m.page === mushafPage)}
                    onMistakeMark={handleMistakeMark}
                    readOnly={false}
                    mode="marking"
                    showHistorical={true}
                    showSurahIndexDefault={true}
                    studentName={student?.fullName}
                  />
                </div>

                {currentMistakes.length > 0 && (
                  <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 mb-1">
                      Mistakes ({currentMistakes.length})
                    </h4>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {currentMistakes.map((mistake, index) => (
                        <div key={mistake.id || index} className="text-xs text-gray-600 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs">
                              {mistake.type}
                            </span>
                            <span>P{mistake.page}, S{mistake.surah}:{mistake.ayah}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMistake(mistake.id!)}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!showMushaf && currentMistakes.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded p-2 bg-blue-50">
                <p className="text-xs text-blue-700">
                  {currentMistakes.length} mistake(s) marked. Click to view/edit.
                </p>
              </div>
            )}
          </div>

          {/* Compact Comment Section */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              placeholder="Additional comments..."
            />
          </div>

          {/* Compact Submit Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving || !isValid}
            >
              {isSaving ? 'Saving...' : assignmentId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedAssignmentForm;

