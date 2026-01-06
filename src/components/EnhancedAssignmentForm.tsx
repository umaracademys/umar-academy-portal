import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, ClassworkPhase, AssignmentMushafMistake, HomeworkItem } from '../types/assignment';
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
  const [uploadingFiles, setUploadingFiles] = useState<Record<number, boolean>>({});

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
    items: HomeworkItem[];
    notes: string;
  }>({
    enabled: false,
    items: [],
    notes: ''
  });

  const [comment, setComment] = useState('');

  // Initialize form from existing assignment
  useEffect(() => {
    if (existingAssignment) {
      const classworkData = existingAssignment.classwork || { sabq: [], sabqi: [], manzil: [] };
      setClasswork(classworkData);
      
      const hw = existingAssignment.homework || { enabled: false, content: '', link: '' };
      // Ensure homework items have all required fields
      const normalizedItems = (hw.items || []).map((item: any) => ({
        type: item.type || 'sabq',
        range: {
          mode: item.range?.mode || 'surah_ayah',
          from: {
            surah: item.range?.from?.surah,
            surahName: item.range?.from?.surahName || '',
            ayah: item.range?.from?.ayah
          },
          to: {
            surah: item.range?.to?.surah || item.range?.from?.surah,
            surahName: item.range?.to?.surahName || item.range?.from?.surahName || '',
            ayah: item.range?.to?.ayah
          },
          juzList: item.range?.juzList || []
        },
        source: {
          suggestedFrom: item.source?.suggestedFrom || 'manual',
          ticketIds: item.source?.ticketIds || []
        },
        content: item.content || '',
        attachments: item.attachments || []
      }));
      
      setHomework({
        enabled: hw.enabled || normalizedItems.length > 0,
        items: normalizedItems,
        notes: hw.notes || ''
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
    }
  }, [existingAssignment, prefillTicket]);

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
    const notes = logEntry.notes || logEntry.ticket.adminComment || '';
    
    if (logEntry.type === 'sabq') {
      addClassworkPhase('sabq');
      const lastIndex = classwork.sabq.length;
      updateClassworkPhase('sabq', lastIndex, 'assignmentRange', notes);
      updateClassworkPhase('sabq', lastIndex, 'details', notes);
    } else if (logEntry.type === 'sabqi') {
      addClassworkPhase('sabqi');
      const lastIndex = classwork.sabqi.length;
      updateClassworkPhase('sabqi', lastIndex, 'assignmentRange', notes);
      updateClassworkPhase('sabqi', lastIndex, 'details', notes);
    } else if (logEntry.type === 'manzil') {
      addClassworkPhase('manzil');
      const lastIndex = classwork.manzil.length;
      updateClassworkPhase('manzil', lastIndex, 'assignmentRange', notes);
      updateClassworkPhase('manzil', lastIndex, 'details', notes);
    }
  };

  // Add homework item
  const addHomeworkItem = (item: HomeworkItem) => {
    setHomework(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));
  };

  // Remove homework item
  const removeHomeworkItem = (index: number) => {
    setHomework(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Handle file upload for homework item
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemIndex: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(prev => ({ ...prev, [itemIndex]: true }));

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      const apiUrl = API_BASE.endsWith('/api') ? API_BASE.replace('/api', '') : API_BASE;

      const fileArray: File[] = Array.from(files);
      const uploadPromises = fileArray.map(async (file: File) => {
        const arrayBuffer = await file.arrayBuffer();
        
        const response = await fetch(`${apiUrl}/api/assignments/upload-homework-file`, {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-Filename': file.name,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: arrayBuffer
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        return {
          name: data.originalName || data.name || file.name,
          url: data.url?.startsWith('http') ? data.url : `${apiUrl}${data.url}`,
          type: data.type || file.type || 'document',
          size: data.size || file.size
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const currentItem = homework.items[itemIndex];
      const existingAttachments = currentItem.attachments || [];
      
      updateHomeworkItem(itemIndex, {
        attachments: [...existingAttachments, ...uploadedFiles]
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [itemIndex]: false }));
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Update homework item
  const updateHomeworkItem = (index: number, item: Partial<HomeworkItem>) => {
    setHomework(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === index ? { ...it, ...item } : it)
    }));
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
    const hasHomework = homework.enabled && homework.items.length > 0;
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

      // Filter out incomplete homework items (must have at least a surah or juz)
      // Also normalize data: ensure to.surah is set for surah_ayah mode
      const validHomeworkItems = homework.items
        .filter(item => {
          if (item.type === 'manzil') {
            return item.range.juzList && item.range.juzList.length > 0;
          } else {
            // For sabq/sabqi, require at least from.surah
            return item.range.from?.surah;
          }
        })
        .map(item => {
          // Normalize surah_ayah mode: ensure to.surah is set and ayahs are valid
          if (item.range.mode === 'surah_ayah' && item.range.from?.surah) {
            const fromSurah = Number(item.range.from.surah);
            const toSurah = item.range.to?.surah ? Number(item.range.to.surah) : fromSurah;
            const finalToSurah = toSurah >= fromSurah ? toSurah : fromSurah;
            
            // Normalize ayahs: if same surah, ensure to.ayah >= from.ayah
            let fromAyah = item.range.from?.ayah ? Number(item.range.from.ayah) : undefined;
            let toAyah = item.range.to?.ayah ? Number(item.range.to.ayah) : undefined;
            
            // If both surahs are the same and both ayahs are provided, validate order
            if (finalToSurah === fromSurah && fromAyah !== undefined && toAyah !== undefined) {
              if (fromAyah > toAyah) {
                // Swap them if they're in wrong order
                [fromAyah, toAyah] = [toAyah, fromAyah];
              }
            }
            
            return {
              ...item,
              range: {
                ...item.range,
                mode: item.range.mode || 'surah_ayah',
                from: {
                  ...item.range.from,
                  surah: fromSurah,
                  ayah: fromAyah
                },
                to: {
                  ...item.range.to,
                  surah: finalToSurah,
                  surahName: item.range.to?.surahName || item.range.from?.surahName || '',
                  ayah: toAyah
                }
              }
            };
          }
          return item;
        });

      // Ensure homework.enabled is true if items exist
      const homeworkEnabled = validHomeworkItems.length > 0 ? true : homework.enabled;

      const assignmentData: Assignment = {
        id: assignmentId || '',
        studentId: student.id,
        studentName: student.fullName,
        assignedBy: user.id || '',
        assignedByName: user.name || user.email || 'Unknown',
        assignedByRole: (user.role === 'superadmin' ? 'super_admin' : user.role) as 'admin' | 'super_admin' | 'teacher',
        classwork: filteredClasswork,
        homework: {
          enabled: homeworkEnabled,
          items: validHomeworkItems,
          notes: homework.notes || '',
          content: '', // Legacy field
          link: '' // Legacy field
        },
        comment: comment.trim(),
        mushafMistakes: mushafMistakes.length > 0 ? mushafMistakes : undefined,
        status: 'active'
      };

      console.log('📤 Assignment data being saved:', {
        assignmentId,
        homeworkEnabled,
        homeworkItemsCount: validHomeworkItems.length,
        homeworkItems: validHomeworkItems,
        homeworkNotes: assignmentData.homework.notes
      });

      if (assignmentId && existingAssignment) {
        console.log('💾 Saving assignment update:', {
          assignmentId,
          homework: assignmentData.homework,
          homeworkItems: assignmentData.homework.items?.length || 0
        });
        await updateAssignment(assignmentId, assignmentData);
      } else {
        const assignmentDataWithTicket = prefillTicket && prefillTicket.type === 'sabq' && prefillTicket.id
          ? { ...assignmentData, ticketId: prefillTicket.id }
          : assignmentData;
        console.log('💾 Creating new assignment:', {
          homework: assignmentData.homework,
          homeworkItems: assignmentData.homework.items?.length || 0
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col border-4 border-accent/30 my-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {assignmentId ? 'Edit' : 'Create'} Assignment
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {student?.fullName || 'Student'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Ticket Log Panel */}
          {ticketLogs.length > 0 && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowTicketLog(!showTicketLog)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📋</span>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">Ticket History</h3>
                    <p className="text-xs text-gray-600">{ticketLogs.length} approved ticket(s)</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showTicketLog ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTicketLog && (
                <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Teacher</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Type</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Notes</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {ticketLogs.map((log, idx) => {
                          const colors = getTypeColor(log.type);
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-600">
                                {log.date.toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-gray-600">{log.teacherName}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}>
                                  {log.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-600 max-w-xs truncate" title={log.notes}>
                                {log.notes || '-'}
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => useTicketSuggestion(log)}
                                  className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
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

          {/* Classwork Section */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Classwork</h3>
            
            {/* Sabq */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">Sabq</span>
                </label>
                <button
                  type="button"
                  onClick={() => addClassworkPhase('sabq')}
                  className="px-3 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                >
                  + Add Sabq
                </button>
              </div>
              {classwork.sabq.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">No sabq entries</p>
              ) : (
                <div className="space-y-2">
                  {classwork.sabq.map((phase, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-purple-50/30">
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Assignment Range (e.g., Surah Al-Fatiha, Ayah 1-7)"
                          value={phase.assignmentRange}
                          onChange={(e) => updateClassworkPhase('sabq', index, 'assignmentRange', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          required
                        />
                        <textarea
                          placeholder="Details (optional)"
                          value={phase.details || ''}
                          onChange={(e) => updateClassworkPhase('sabq', index, 'details', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Created: {phase.createdAt ? new Date(phase.createdAt).toLocaleDateString() : 'Today'}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeClassworkPhase('sabq', index)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sabqi */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">Sabqi</span>
                </label>
                <button
                  type="button"
                  onClick={() => addClassworkPhase('sabqi')}
                  className="px-3 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                >
                  + Add Sabqi
                </button>
              </div>
              {classwork.sabqi.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">No sabqi entries</p>
              ) : (
                <div className="space-y-2">
                  {classwork.sabqi.map((phase, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-blue-50/30">
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Assignment Range (e.g., Surah Al-Fatiha, Ayah 1-7)"
                          value={phase.assignmentRange}
                          onChange={(e) => updateClassworkPhase('sabqi', index, 'assignmentRange', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                        <textarea
                          placeholder="Details (optional)"
                          value={phase.details || ''}
                          onChange={(e) => updateClassworkPhase('sabqi', index, 'details', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Created: {phase.createdAt ? new Date(phase.createdAt).toLocaleDateString() : 'Today'}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeClassworkPhase('sabqi', index)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manzil */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Manzil</span>
                </label>
                <button
                  type="button"
                  onClick={() => addClassworkPhase('manzil')}
                  className="px-3 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                >
                  + Add Manzil
                </button>
              </div>
              {classwork.manzil.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">No manzil entries</p>
              ) : (
                <div className="space-y-2">
                  {classwork.manzil.map((phase, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-green-50/30">
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Assignment Range (e.g., Juz 1-3)"
                          value={phase.assignmentRange}
                          onChange={(e) => updateClassworkPhase('manzil', index, 'assignmentRange', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          required
                        />
                        <textarea
                          placeholder="Details (optional)"
                          value={phase.details || ''}
                          onChange={(e) => updateClassworkPhase('manzil', index, 'details', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Created: {phase.createdAt ? new Date(phase.createdAt).toLocaleDateString() : 'Today'}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeClassworkPhase('manzil', index)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Homework Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Homework</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={homework.enabled}
                  onChange={(e) => setHomework(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">Enable Homework</span>
              </label>
            </div>
            
            {homework.enabled && (
              <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                {/* Homework Items */}
                <div className="space-y-3">
                  {homework.items.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>No homework items yet.</strong> Click the buttons below to add structured homework (Sabq, Sabqi, or Manzil).
                      </p>
                    </div>
                  )}
                  {homework.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(item.type).bg} ${getTypeColor(item.type).text}`}>
                          {item.type.toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeHomeworkItem(index)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(item.type === 'sabq' || item.type === 'sabqi') && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">From Surah</label>
                                <select
                                  value={item.range.from?.surah || ''}
                                  onChange={(e) => {
                                    const surahNum = parseInt(e.target.value);
                                    const surah = surahs.find(s => s.id === surahNum);
                                    updateHomeworkItem(index, {
                                      range: {
                                        ...item.range,
                                        mode: item.range?.mode || 'surah_ayah',
                                        from: {
                                          ...item.range?.from,
                                          surah: surahNum || undefined,
                                          surahName: surah?.name_arabic || surah?.name_complex || surah?.name_simple || ''
                                        },
                                        to: item.range?.to || {}
                                      }
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                >
                                  <option value="">اختر السورة</option>
                                  {surahs.map(surah => (
                                    <option key={surah.id} value={surah.id}>
                                      {surah.id}. {surah.name_arabic || surah.name_complex || surah.name_simple || `سورة ${surah.id}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">From Ayah</label>
                                <input
                                  type="number"
                                  placeholder="Ayah number"
                                  value={item.range?.from?.ayah || ''}
                                  onChange={(e) => {
                                    const newFromAyah = parseInt(e.target.value) || undefined;
                                    const toSurah = item.range?.to?.surah || item.range?.from?.surah;
                                    const fromSurah = item.range?.from?.surah;
                                    const currentToAyah = item.range?.to?.ayah;
                                    
                                    // If same surah and to.ayah exists, ensure to.ayah >= from.ayah
                                    let adjustedToAyah = currentToAyah;
                                    if (fromSurah && toSurah === fromSurah && newFromAyah !== undefined && currentToAyah !== undefined) {
                                      if (newFromAyah > currentToAyah) {
                                        adjustedToAyah = newFromAyah; // Auto-adjust to.ayah
                                      }
                                    }
                                    
                                    updateHomeworkItem(index, {
                                      range: {
                                        ...item.range,
                                        mode: item.range?.mode || 'surah_ayah',
                                        from: { ...item.range?.from, ayah: newFromAyah },
                                        to: { 
                                          ...item.range?.to, 
                                          ayah: adjustedToAyah !== undefined ? adjustedToAyah : item.range?.to?.ayah
                                        }
                                      }
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                  min="1"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">To Surah</label>
                                <select
                                  value={item.range?.to?.surah || item.range?.from?.surah || ''}
                                  onChange={(e) => {
                                    const surahNum = parseInt(e.target.value);
                                    const fromSurah = item.range?.from?.surah;
                                    
                                    // Validate: to surah must be >= from surah
                                    if (fromSurah && surahNum && surahNum < fromSurah) {
                                      // Don't update if invalid - keep current value
                                      return;
                                    }
                                    
                                    const surah = surahs.find(s => s.id === surahNum);
                                    updateHomeworkItem(index, {
                                      range: {
                                        ...item.range,
                                        mode: item.range?.mode || 'surah_ayah',
                                        from: item.range?.from || {},
                                        to: {
                                          ...item.range?.to,
                                          surah: surahNum || fromSurah || undefined,
                                          surahName: surah?.name_arabic || surah?.name_complex || surah?.name_simple || item.range?.from?.surahName || ''
                                        }
                                      }
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                >
                                  <option value="">{item.range?.from?.surah ? `Same as From (${item.range.from.surah})` : 'اختر السورة'}</option>
                                  {surahs
                                    .filter(surah => !item.range?.from?.surah || surah.id >= item.range.from.surah)
                                    .map(surah => (
                                    <option key={surah.id} value={surah.id}>
                                      {surah.id}. {surah.name_arabic || surah.name_complex || surah.name_simple || `سورة ${surah.id}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">To Ayah</label>
                                <input
                                  type="number"
                                  placeholder="Ayah number"
                                  value={item.range?.to?.ayah || ''}
                                  onChange={(e) => {
                                    const newToAyah = parseInt(e.target.value) || undefined;
                                    const toSurah = item.range?.to?.surah || item.range?.from?.surah;
                                    const fromSurah = item.range?.from?.surah;
                                    const fromAyah = item.range?.from?.ayah;
                                    
                                    // Validate: if same surah, to.ayah must be >= from.ayah
                                    if (fromSurah && toSurah === fromSurah && fromAyah !== undefined && newToAyah !== undefined) {
                                      if (newToAyah < fromAyah) {
                                        // Don't update if invalid - show alert instead
                                        alert(`To ayah (${newToAyah}) must be greater than or equal to from ayah (${fromAyah}) when in the same surah.`);
                                        return;
                                      }
                                    }
                                    
                                    updateHomeworkItem(index, {
                                      range: {
                                        ...item.range,
                                        mode: item.range?.mode || 'surah_ayah',
                                        from: item.range?.from || {},
                                        to: { ...item.range?.to, ayah: newToAyah }
                                      }
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                                  min={item.range?.from?.ayah || 1}
                                />
                              </div>
                            </div>
                          </>
                        )}
                        {item.type === 'manzil' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Select Juz</label>
                            <select
                              multiple
                              value={item.range?.juzList?.map(j => j.toString()) || []}
                              onChange={(e) => {
                                const selectedJuz = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                                updateHomeworkItem(index, {
                                  range: { 
                                    ...item.range,
                                    mode: item.range?.mode || 'multiple_juz',
                                    from: item.range?.from || {},
                                    to: item.range?.to || {},
                                    juzList: selectedJuz 
                                  }
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 min-h-[120px]"
                              size={10}
                            >
                              {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => (
                                <option key={juz} value={juz.toString()}>
                                  Juz {juz}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.range.juzList && item.range.juzList.length > 0
                                ? `Selected: ${item.range.juzList.sort((a, b) => a - b).join(', ')}`
                                : 'Hold Ctrl/Cmd to select multiple Juz'}
                            </p>
                          </div>
                        )}
                        
                        {/* Content/Text Input */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Additional Notes / Instructions (optional)
                          </label>
                          <textarea
                            value={item.content || ''}
                            onChange={(e) => updateHomeworkItem(index, { content: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                            placeholder="Type any additional instructions, notes, or content for this homework item..."
                          />
                        </div>

                        {/* File Upload */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Attach Files (optional)
                          </label>
                          <div className="space-y-2">
                            <input
                              type="file"
                              multiple
                              onChange={(e) => handleFileUpload(e, index)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                              disabled={uploadingFiles[index]}
                            />
                            {uploadingFiles[index] && (
                              <p className="text-xs text-blue-600">Uploading files...</p>
                            )}
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="space-y-1">
                                {item.attachments.map((file, fileIndex) => (
                                  <div key={fileIndex} className="flex items-center justify-between px-2 py-1 bg-gray-100 rounded text-xs">
                                    <span className="text-gray-700 truncate flex-1">
                                      📎 {file.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newAttachments = item.attachments?.filter((_, i) => i !== fileIndex) || [];
                                        updateHomeworkItem(index, { attachments: newAttachments });
                                      }}
                                      className="ml-2 text-red-600 hover:text-red-700 font-medium"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Homework Item Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addHomeworkItem({
                        type: 'sabq',
                        range: { mode: 'surah_ayah', from: {}, to: {} },
                        source: { suggestedFrom: 'manual', ticketIds: [] }
                      })}
                      className="px-3 py-2 text-xs font-medium border border-purple-300 text-purple-700 rounded hover:bg-purple-50 transition-colors"
                    >
                      + Add Sabq Homework
                    </button>
                    <button
                      type="button"
                      onClick={() => addHomeworkItem({
                        type: 'sabqi',
                        range: { mode: 'surah_ayah', from: {}, to: {} },
                        source: { suggestedFrom: 'manual', ticketIds: [] }
                      })}
                      className="px-3 py-2 text-xs font-medium border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
                    >
                      + Add Sabqi Homework
                    </button>
                    <button
                      type="button"
                      onClick={() => addHomeworkItem({
                        type: 'manzil',
                        range: { mode: 'multiple_juz', juzList: [] },
                        source: { suggestedFrom: 'manual', ticketIds: [] }
                      })}
                      className="px-3 py-2 text-xs font-medium border border-green-300 text-green-700 rounded hover:bg-green-50 transition-colors"
                    >
                      + Add Manzil Homework
                    </button>
                  </div>
                </div>

                {/* Homework Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Homework Notes (optional)
                  </label>
                  <textarea
                    value={homework.notes}
                    onChange={(e) => setHomework(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    placeholder="Add general notes or instructions for homework..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mushaf Mistakes Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Mushaf Mistakes ({currentMistakes.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowMushaf(!showMushaf)}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  showMushaf
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border border-primary text-primary hover:bg-primary/10'
                }`}
              >
                {showMushaf ? 'Hide Mushaf' : 'Mark Mistakes'}
              </button>
            </div>

            {showMushaf && (
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">
                    Click on words in the Mushaf to mark mistakes. Mistakes will be saved to {student?.fullName}'s Personal Mushaf.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Mistakes marked: <strong className="text-primary">{currentMistakes.length}</strong></span>
                  </div>
                </div>
                
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white" style={{ minHeight: '500px', maxHeight: '600px' }}>
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
                  <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Mistakes Marked ({currentMistakes.length})
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {currentMistakes.map((mistake, index) => (
                        <div key={mistake.id || index} className="text-xs text-gray-600 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
                              {mistake.type}
                            </span>
                            <span>Page {mistake.page}, Surah {mistake.surah}:{mistake.ayah}</span>
                            {mistake.note && (
                              <span className="text-gray-500 italic">- {mistake.note}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMistake(mistake.id!)}
                            className="text-red-600 hover:text-red-700 text-xs font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!showMushaf && currentMistakes.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 bg-blue-50">
                <p className="text-sm text-blue-700">
                  <strong>{currentMistakes.length}</strong> mistake(s) marked. Click "Mark Mistakes" to add more or review.
                </p>
              </div>
            )}
          </div>

          {/* Comment Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
              placeholder="Add any additional comments or notes..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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

