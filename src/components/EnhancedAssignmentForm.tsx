import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, ClassworkPhase, AssignmentMushafMistake } from '../types/assignment';
import { Ticket, RecitationRange } from '../types/ticket';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import { getQuranChapters, Chapter } from '@umar-academy/mushaf';
import { MistakeBadgeHighlight } from './workflow/MistakeBadgeHighlight';
import ClassworkEntryCard from './ClassworkEntryCard';

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

  // ✅ OPTIMIZED: Memoize student and assignment lookups
  const student = useMemo(() => 
    students.find(s => s.id === studentId),
    [students, studentId]
  );
  
  const existingAssignment = useMemo(() => 
    assignmentId ? assignments.find(a => a.id === assignmentId) : null,
    [assignmentId, assignments]
  );

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
        
        // ✅ FIX: Fetch tickets with all fields needed for display and "use this ticket"
        const response = await fetch(`${API_BASE}/tickets?studentId=${studentId}&status=sent_to_assignment`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          // Ensure tickets is an array - handle both array response and object with tickets property
          const tickets: Ticket[] = Array.isArray(data) ? data : (Array.isArray(data?.tickets) ? data.tickets : []);
          
          // ✅ FIX: Include ALL ticket fields needed for display and "use this ticket" functionality
          const logs: TicketLogEntry[] = tickets
            .filter(t => t && t.status === 'sent_to_assignment')
            .map(ticket => ({
              ticket: {
                id: ticket.id,
                _id: ticket._id,
                type: ticket.type,
                recitationRange: ticket.recitationRange,
                sabqEntries: ticket.sabqEntries, // ✅ Include sabqEntries for Sabq tickets
                mistakeCount: ticket.mistakeCount,
                atkees: ticket.atkees,
                mistakes: ticket.mistakes || [], // ✅ Include all mistakes (not limited)
                tajweedIssues: ticket.tajweedIssues || [], // ✅ Include tajweed issues
                adminComment: ticket.adminComment,
                teacherComment: ticket.teacherComment,
                teacherNotes: ticket.teacherNotes,
                reviewNotes: ticket.reviewNotes,
                assignedTeacherName: ticket.assignedTeacherName,
                assignedTeacherId: ticket.assignedTeacherId,
                createdByName: ticket.createdByName,
                homeworkRange: ticket.homeworkRange, // ✅ Include homework range for Sabq tickets
                sentAt: ticket.sentAt,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt
              } as Ticket,
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

  // ✅ FIX: Removed invalid fields sabqiContent and manzilContent (not in MongoDB schema)
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
      
      // ✅ FIX: Removed invalid fields sabqiContent and manzilContent
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
      
      // ✅ OPTIMIZED: Limit mistakes array to prevent large state
      if (prefillTicket.mistakes && prefillTicket.mistakes.length > 0) {
        const convertedMistakes: MushafMistake[] = prefillTicket.mistakes
          .slice(0, 20) // ✅ Limit to 20 mistakes for performance
          .map((m: any) => ({
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
    // ✅ FIX 7: Removed auto-prefill from ticketLogs
    // This caused confusion and duplicated data
    // Users should explicitly use "Use This Ticket" button or prefillTicket prop
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
    try {
      // Fail fast - validate input
      if (!['sabq', 'sabqi', 'manzil'].includes(type)) {
        console.warn('⚠️ Invalid type in addClassworkPhase:', type);
        return;
      }

      const newPhase: ClassworkPhase = {
        type,
        assignmentRange: '',
        details: '',
        createdAt: new Date()
      };

      setClasswork(prev => {
        try {
          if (!prev || typeof prev !== 'object') {
            console.warn('⚠️ Invalid classwork state, initializing');
            return {
              sabq: type === 'sabq' ? [newPhase] : [],
              sabqi: type === 'sabqi' ? [newPhase] : [],
              manzil: type === 'manzil' ? [newPhase] : []
            };
          }

          const currentTypeArray = prev[type];
          if (!Array.isArray(currentTypeArray)) {
            console.warn('⚠️ Invalid type array, initializing:', type);
            return {
              ...prev,
              [type]: [newPhase]
            };
          }

          return {
            ...prev,
            [type]: [...currentTypeArray, newPhase]
          };
        } catch (err) {
          console.error('❌ Error adding classwork phase:', err);
          return prev;
        }
      });
    } catch (err) {
      console.error('❌ Error in addClassworkPhase:', err);
    }
  };

  // Update classwork phase
  const updateClassworkPhase = (
    type: 'sabq' | 'sabqi' | 'manzil',
    index: number,
    field: keyof ClassworkPhase,
    value: any
  ) => {
    try {
      // Fail fast - validate inputs
      if (!['sabq', 'sabqi', 'manzil'].includes(type)) {
        console.warn('⚠️ Invalid type in updateClassworkPhase:', type);
        return;
      }

      if (typeof index !== 'number' || index < 0) {
        console.warn('⚠️ Invalid index in updateClassworkPhase:', index);
        return;
      }

      if (!field || typeof field !== 'string') {
        console.warn('⚠️ Invalid field in updateClassworkPhase:', field);
        return;
      }

      setClasswork(prev => {
        try {
          if (!prev || typeof prev !== 'object') {
            console.warn('⚠️ Invalid classwork state');
            return prev;
          }

          const currentTypeArray = prev[type];
          if (!Array.isArray(currentTypeArray)) {
            console.warn('⚠️ Invalid type array:', type);
            return prev;
          }

          if (index >= currentTypeArray.length) {
            console.warn('⚠️ Index out of bounds:', index, 'length:', currentTypeArray.length);
            return prev;
          }

          return {
            ...prev,
            [type]: currentTypeArray.map((phase, i) => {
              if (i === index) {
                try {
                  return { ...phase, [field]: value };
                } catch (err) {
                  console.warn('⚠️ Error updating phase field:', err);
                  return phase;
                }
              }
              return phase;
            })
          };
        } catch (err) {
          console.error('❌ Error updating classwork phase:', err);
          return prev;
        }
      });
    } catch (err) {
      console.error('❌ Error in updateClassworkPhase:', err);
    }
  };

  // Remove classwork phase
  const removeClassworkPhase = (type: 'sabq' | 'sabqi' | 'manzil', index: number) => {
    try {
      // Fail fast - validate inputs
      if (!['sabq', 'sabqi', 'manzil'].includes(type)) {
        console.warn('⚠️ Invalid type in removeClassworkPhase:', type);
        return;
      }

      if (typeof index !== 'number' || index < 0) {
        console.warn('⚠️ Invalid index in removeClassworkPhase:', index);
        return;
      }

      setClasswork(prev => {
        try {
          if (!prev || typeof prev !== 'object') {
            console.warn('⚠️ Invalid classwork state');
            return prev;
          }

          const currentTypeArray = prev[type];
          if (!Array.isArray(currentTypeArray)) {
            console.warn('⚠️ Invalid type array:', type);
            return prev;
          }

          if (index >= currentTypeArray.length) {
            console.warn('⚠️ Index out of bounds:', index, 'length:', currentTypeArray.length);
            return prev;
          }

          return {
            ...prev,
            [type]: currentTypeArray.filter((_, i) => i !== index)
          };
        } catch (err) {
          console.error('❌ Error removing classwork phase:', err);
          return prev;
        }
      });
    } catch (err) {
      console.error('❌ Error in removeClassworkPhase:', err);
    }
  };

  // ✅ FIX: Use suggestion from ticket log - populate ALL fields including sabqEntries, mistakes, tajweedIssues, atkees
  const useTicketSuggestion = (logEntry: TicketLogEntry) => {
    try {
      // Fail fast - validate input
      if (!logEntry || typeof logEntry !== 'object') {
        alert('Invalid ticket data. Cannot use this ticket.');
        return;
      }

      if (!logEntry.ticket || typeof logEntry.ticket !== 'object') {
        alert('Invalid ticket information. Cannot use this ticket.');
        return;
      }

      const currentDate = new Date();
      const ticket = logEntry.ticket;
      const teacherName = logEntry.teacherName || 'Unknown';
    
    // ✅ FIX: Handle Sabq tickets with sabqEntries (multiple entries)
    if (logEntry.type === 'sabq' && ticket.sabqEntries && Array.isArray(ticket.sabqEntries) && ticket.sabqEntries.length > 0) {
      // For Sabq tickets, create a classwork phase for each sabqEntry
      ticket.sabqEntries.forEach((entry) => {
        try {
          if (!entry || typeof entry !== 'object') {
            console.warn('⚠️ Invalid sabq entry:', entry);
            return;
          }

          const recitationRange = entry.recitationRange || {};
        const surahNumber = recitationRange.surahNumber;
        const surahName = recitationRange.surahName;
        const juzNumber = recitationRange.juzNumber;
        const startAyahNumber = recitationRange.startAyahNumber;
        const startAyahText = recitationRange.startAyahText;
        const endAyahNumber = recitationRange.endAyahNumber;
        const endAyahText = recitationRange.endAyahText;
        const endSurahNumber = recitationRange.endSurahNumber;
        const endSurahName = recitationRange.endSurahName;
        
        // Build assignment range string
        let assignmentRangeStr = '';
        if (surahName && startAyahNumber && endAyahNumber) {
          assignmentRangeStr = `Surah ${surahName}, Ayah ${startAyahNumber}-${endAyahNumber}`;
          if (endSurahName && endSurahName !== surahName) {
            assignmentRangeStr = `Surah ${surahName}, Ayah ${startAyahNumber} → ${endSurahName}, Ayah ${endAyahNumber}`;
          }
          if (juzNumber) {
            assignmentRangeStr += ` (Juz ${juzNumber})`;
          }
        } else if (surahNumber && startAyahNumber && endAyahNumber) {
          assignmentRangeStr = `Surah ${surahNumber}, Ayah ${startAyahNumber}-${endAyahNumber}`;
          if (juzNumber) {
            assignmentRangeStr += ` (Juz ${juzNumber})`;
          }
        } else {
          assignmentRangeStr = entry.adminComment || `${logEntry.type} recitation review`;
        }
        
        // Build mistakes summary from entry
        let mistakesSummary = '';
        if (entry.mistakeCount !== undefined && entry.mistakeCount !== null) {
          mistakesSummary += `Count: ${entry.mistakeCount === 'weak' ? 'Weak' : entry.mistakeCount}`;
        }
        if (entry.atkees) {
          if (mistakesSummary) mistakesSummary += ' | ';
          mistakesSummary += `Atkees: ${entry.atkees}`;
        }
        if (entry.mistakes && entry.mistakes.length > 0) {
          if (mistakesSummary) mistakesSummary += ' | ';
          mistakesSummary += `Total Mistakes: ${entry.mistakes.length}`;
        }
        
        // Get tajweed issues from entry
        const tajweedIssues = entry.tajweedIssues || [];
        
        // Admin comment from entry
        const adminComment = entry.adminComment || '';
        
        // Add classwork phase with all fields
        addClassworkPhase('sabq');
        const lastIndex = classwork.sabq.length;
        updateClassworkPhase('sabq', lastIndex, 'assignmentRange', assignmentRangeStr);
        updateClassworkPhase('sabq', lastIndex, 'details', adminComment);
        updateClassworkPhase('sabq', lastIndex, 'surahNumber', surahNumber);
        updateClassworkPhase('sabq', lastIndex, 'surahName', surahName);
        updateClassworkPhase('sabq', lastIndex, 'juzNumber', juzNumber);
        updateClassworkPhase('sabq', lastIndex, 'fromAyah', startAyahNumber);
        updateClassworkPhase('sabq', lastIndex, 'toAyah', endAyahNumber);
        updateClassworkPhase('sabq', lastIndex, 'startAyahText', startAyahText);
        updateClassworkPhase('sabq', lastIndex, 'endAyahText', endAyahText);
        updateClassworkPhase('sabq', lastIndex, 'mistakesSummary', mistakesSummary);
        updateClassworkPhase('sabq', lastIndex, 'tajweedIssues', tajweedIssues);
        updateClassworkPhase('sabq', lastIndex, 'teacherReviewComment', '');
        updateClassworkPhase('sabq', lastIndex, 'fromTicketId', ticket.id || ticket._id?.toString());
        
          // ✅ Add mistakes from entry to currentMistakes
          if (entry.mistakes && Array.isArray(entry.mistakes) && entry.mistakes.length > 0) {
            try {
              const convertedMistakes = entry.mistakes
                .filter(m => m && typeof m === 'object')
                .map(m => ({
                  ...m,
                  id: m.id || `mistake-${Date.now()}-${Math.random()}`,
                  timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
                  type: m.type || 'other',
                  page: m.page || 1,
                  surah: m.surah || 0,
                  ayah: m.ayah || 0
                }));
              
              setCurrentMistakes(prev => {
                try {
                  if (!Array.isArray(prev)) {
                    return convertedMistakes;
                  }
                  return [...prev, ...convertedMistakes];
                } catch (err) {
                  console.error('❌ Error adding mistakes:', err);
                  return prev;
                }
              });
            } catch (err) {
              console.error('❌ Error converting mistakes:', err);
            }
          }
        } catch (err) {
          console.error('❌ Error processing sabq entry:', err);
        }
      });
      
      // ✅ Set homework range if available
      if (ticket.homeworkRange) {
        setHomework(prev => ({
          ...prev,
          enabled: true,
          // Note: homework range is displayed in the homework section, not stored in homework.items
        }));
      }
      
      return; // Exit early for Sabq tickets
    }
    
    // ✅ FIX: Handle Sabqi/Manzil tickets with single recitationRange
    const recitationRange = (ticket.recitationRange || {}) as Partial<RecitationRange>;
    const surahNumber = recitationRange.surahNumber;
    const surahName = recitationRange.surahName;
    const juzNumber = recitationRange.juzNumber;
    const startAyahNumber = recitationRange.startAyahNumber;
    const startAyahText = recitationRange.startAyahText;
    const endAyahNumber = recitationRange.endAyahNumber;
    const endAyahText = recitationRange.endAyahText;
    const endSurahNumber = recitationRange.endSurahNumber;
    const endSurahName = recitationRange.endSurahName;
    
    // Build assignment range string with surah and ayah info
    let assignmentRangeStr = '';
    if (surahName && startAyahNumber && endAyahNumber) {
      assignmentRangeStr = `Surah ${surahName}, Ayah ${startAyahNumber}-${endAyahNumber}`;
      if (endSurahName && endSurahName !== surahName) {
        assignmentRangeStr = `Surah ${surahName}, Ayah ${startAyahNumber} → ${endSurahName}, Ayah ${endAyahNumber}`;
      }
      if (juzNumber) {
        assignmentRangeStr += ` (Juz ${juzNumber})`;
      }
    } else if (surahNumber && startAyahNumber && endAyahNumber) {
      assignmentRangeStr = `Surah ${surahNumber}, Ayah ${startAyahNumber}-${endAyahNumber}`;
      if (juzNumber) {
        assignmentRangeStr += ` (Juz ${juzNumber})`;
      }
    } else {
      assignmentRangeStr = ticket.teacherComment || ticket.adminComment || `${ticket.type} recitation review`;
    }
    
    // Build mistakes summary
    let mistakesSummary = '';
    if (ticket.mistakeCount !== undefined && ticket.mistakeCount !== null) {
      mistakesSummary += `Count: ${ticket.mistakeCount === 'weak' ? 'Weak' : ticket.mistakeCount}`;
    }
    if (ticket.atkees) {
      if (mistakesSummary) mistakesSummary += ' | ';
      mistakesSummary += `Atkees: ${ticket.atkees}`;
    }
    if (ticket.mistakes && ticket.mistakes.length > 0) {
      if (mistakesSummary) mistakesSummary += ' | ';
      mistakesSummary += `Total Mistakes: ${ticket.mistakes.length}`;
    }
    
    // Get tajweed issues
    const tajweedIssues = ticket.tajweedIssues || [];
    
    // Teacher review comment
    const teacherReviewComment = ticket.teacherComment || ticket.reviewNotes || '';
    
    // Update classwork phase with all new fields
    const updatePhase = (type: 'sabq' | 'sabqi' | 'manzil') => {
      addClassworkPhase(type);
      const lastIndex = classwork[type].length;
      updateClassworkPhase(type, lastIndex, 'assignmentRange', assignmentRangeStr);
      updateClassworkPhase(type, lastIndex, 'details', teacherReviewComment);
      updateClassworkPhase(type, lastIndex, 'surahNumber', surahNumber);
      updateClassworkPhase(type, lastIndex, 'surahName', surahName);
      updateClassworkPhase(type, lastIndex, 'juzNumber', juzNumber);
      updateClassworkPhase(type, lastIndex, 'fromAyah', startAyahNumber);
      updateClassworkPhase(type, lastIndex, 'toAyah', endAyahNumber);
      updateClassworkPhase(type, lastIndex, 'startAyahText', startAyahText);
      updateClassworkPhase(type, lastIndex, 'endAyahText', endAyahText);
      updateClassworkPhase(type, lastIndex, 'mistakesSummary', mistakesSummary);
      updateClassworkPhase(type, lastIndex, 'tajweedIssues', tajweedIssues);
      updateClassworkPhase(type, lastIndex, 'teacherReviewComment', teacherReviewComment);
      updateClassworkPhase(type, lastIndex, 'fromTicketId', ticket.id || ticket._id?.toString());
    };
    
      // ✅ Add mistakes to currentMistakes
      if (ticket.mistakes && Array.isArray(ticket.mistakes) && ticket.mistakes.length > 0) {
        try {
          const convertedMistakes = ticket.mistakes
            .filter(m => m && typeof m === 'object')
            .map(m => ({
              ...m,
              id: m.id || `mistake-${Date.now()}-${Math.random()}`,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
              type: m.type || 'other',
              page: m.page || 1,
              surah: m.surah || 0,
              ayah: m.ayah || 0
            }));
          
          setCurrentMistakes(prev => {
            try {
              if (!Array.isArray(prev)) {
                return convertedMistakes;
              }
              return [...prev, ...convertedMistakes];
            } catch (err) {
              console.error('❌ Error adding mistakes:', err);
              return prev;
            }
          });
        } catch (err) {
          console.error('❌ Error converting mistakes:', err);
        }
      }
      
      if (logEntry.type === 'sabq') {
        updatePhase('sabq');
      } else if (logEntry.type === 'sabqi') {
        updatePhase('sabqi');
      } else if (logEntry.type === 'manzil') {
        updatePhase('manzil');
      } else {
        console.warn('⚠️ Unknown ticket type:', logEntry.type);
      }
    } catch (err) {
      console.error('❌ Error in useTicketSuggestion:', err);
      alert('Failed to use ticket data. Please try again or enter manually.');
    }
  };


  // Handle mistake mark
  const handleMistakeMark = (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    try {
      // Fail fast - validate input
      if (!mistake || typeof mistake !== 'object') {
        console.warn('⚠️ Invalid mistake in handleMistakeMark:', mistake);
        return;
      }

      // Validate required fields
      if (typeof mistake.page !== 'number' || mistake.page < 1 || mistake.page > 604) {
        console.warn('⚠️ Invalid page number:', mistake.page);
        return;
      }

      const newMistake: MushafMistake = {
        ...mistake,
        id: `mistake-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        type: mistake.type || 'other',
        page: mistake.page || 1,
        surah: mistake.surah || 0,
        ayah: mistake.ayah || 0,
        wordIndex: mistake.wordIndex || 0,
        position: mistake.position || { x: 0, y: 0 },
        note: mistake.note || '',
        audioUrl: mistake.audioUrl || ''
      };

      setCurrentMistakes(prev => {
        try {
          if (!Array.isArray(prev)) {
            return [newMistake];
          }
          return [...prev, newMistake];
        } catch (err) {
          console.error('❌ Error adding mistake:', err);
          return prev;
        }
      });
    } catch (err) {
      console.error('❌ Error in handleMistakeMark:', err);
    }
  };

  // Remove mistake
  const removeMistake = (mistakeId: string) => {
    try {
      // Fail fast - validate input
      if (!mistakeId || typeof mistakeId !== 'string' || mistakeId.trim() === '') {
        console.warn('⚠️ Invalid mistakeId in removeMistake:', mistakeId);
        return;
      }

      setCurrentMistakes(prev => {
        try {
          if (!Array.isArray(prev)) {
            return [];
          }
          return prev.filter(m => {
            try {
              return m && m.id !== mistakeId;
            } catch (err) {
              console.warn('⚠️ Error filtering mistake:', err);
              return true; // Keep it if we can't filter
            }
          });
        } catch (err) {
          console.error('❌ Error removing mistake:', err);
          return prev;
        }
      });
    } catch (err) {
      console.error('❌ Error in removeMistake:', err);
    }
  };

  // Get mistakes for current page
  const getMistakesForPage = useCallback((page: number) => {
    return currentMistakes.filter(m => m.page === page);
  }, [currentMistakes]);

  // Filter classwork to remove empty entries
  const filteredClasswork = useMemo(() => {
    try {
      if (!classwork || typeof classwork !== 'object') {
        console.warn('⚠️ Invalid classwork state');
        return { sabq: [], sabqi: [], manzil: [] };
      }

      return {
        sabq: (Array.isArray(classwork.sabq) ? classwork.sabq : [])
          .filter(c => c && typeof c === 'object' && c.assignmentRange && String(c.assignmentRange).trim()),
        sabqi: (Array.isArray(classwork.sabqi) ? classwork.sabqi : [])
          .filter(c => c && typeof c === 'object' && c.assignmentRange && String(c.assignmentRange).trim()),
        manzil: (Array.isArray(classwork.manzil) ? classwork.manzil : [])
          .filter(c => c && typeof c === 'object' && c.assignmentRange && String(c.assignmentRange).trim())
      };
    } catch (err) {
      console.error('❌ Error filtering classwork:', err);
      return { sabq: [], sabqi: [], manzil: [] };
    }
  }, [classwork]);

  // Validation
  const isValid = useMemo(() => {
    try {
      if (!filteredClasswork || typeof filteredClasswork !== 'object') {
        return false;
      }

      const hasClasswork = 
        (Array.isArray(filteredClasswork.sabq) && filteredClasswork.sabq.length > 0) ||
        (Array.isArray(filteredClasswork.sabqi) && filteredClasswork.sabqi.length > 0) ||
        (Array.isArray(filteredClasswork.manzil) && filteredClasswork.manzil.length > 0);
      
      const hasHomework = homework && 
        homework.enabled && 
        (String(homework.content || '').trim() || String(homework.link || '').trim());
      
      return hasClasswork || hasHomework;
    } catch (err) {
      console.error('❌ Error validating form:', err);
      return false;
    }
  }, [filteredClasswork, homework]);

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSaving) {
      if (import.meta.env.DEV) {
      console.log('⏸️ Already saving, ignoring duplicate submission');
      }
      return;
    }
    
    // Fail fast - validate critical dependencies
    if (!student || typeof student !== 'object' || !student.id) {
      alert('Student information is missing or invalid. Please refresh the page.');
      return;
    }

    if (!user || typeof user !== 'object' || !user.id) {
      alert('User information is missing. Please log in again.');
      return;
    }

    if (!isValid) {
      alert('Please add at least one classwork entry (Sabq, Sabqi, or Manzil) or enable homework with content.');
      return;
    }

    // Validate classwork entries have required fields
    const hasValidClasswork = filteredClasswork.sabq.some(c => c.assignmentRange?.trim()) ||
                             filteredClasswork.sabqi.some(c => c.assignmentRange?.trim()) ||
                             filteredClasswork.manzil.some(c => c.assignmentRange?.trim());
    
    const hasValidHomework = homework.enabled && (homework.content?.trim() || homework.link?.trim());

    if (!hasValidClasswork && !hasValidHomework) {
      alert('Please add at least one classwork entry with an assignment range, or enable homework with content or link.');
      return;
    }

    setIsSaving(true);
    try {
      // Validate functions exist
      if (!addAssignment || typeof addAssignment !== 'function') {
        throw new Error('Add assignment function is not available. Please refresh the page.');
      }

      if (assignmentId && (!updateAssignment || typeof updateAssignment !== 'function')) {
        throw new Error('Update assignment function is not available. Please refresh the page.');
      }

      // Convert mistakes to AssignmentMushafMistake format with validation
      const mushafMistakes: AssignmentMushafMistake[] = (Array.isArray(currentMistakes) ? currentMistakes : [])
        .filter(m => m && typeof m === 'object')
        .map(m => {
          try {
            return {
              id: m.id || `mistake-${Date.now()}-${Math.random()}`,
              type: m.type || 'other',
              page: m.page || 1,
              surah: m.surah || 0,
              ayah: m.ayah || 0,
              wordIndex: m.wordIndex || 0,
              position: m.position || { x: 0, y: 0 },
              note: m.note || '',
              audioUrl: m.audioUrl || '',
              workflowStep: (m as any).workflowStep || 'sabq',
              markedBy: currentUserInfo.id || '',
              markedByName: currentUserInfo.name || 'Unknown',
              timestamp: m.timestamp || new Date()
            };
          } catch (err) {
            console.warn('⚠️ Error converting mistake:', err);
            return null;
          }
        })
        .filter((m): m is AssignmentMushafMistake => m !== null);

      // Ensure all classwork entries have createdAt timestamp and validate structure
      const classworkWithTimestamps = {
        sabq: (Array.isArray(filteredClasswork.sabq) ? filteredClasswork.sabq : [])
          .filter(entry => entry && typeof entry === 'object' && entry.assignmentRange?.trim())
          .map(entry => {
            try {
              return {
                ...entry,
                type: 'sabq' as const,
                assignmentRange: String(entry.assignmentRange || '').trim(),
                details: String(entry.details || '').trim(),
                createdAt: entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt || Date.now())
              };
            } catch (err) {
              console.warn('⚠️ Error processing sabq entry:', err);
              return null;
            }
          })
          .filter((e): e is ClassworkPhase => e !== null),
        sabqi: (Array.isArray(filteredClasswork.sabqi) ? filteredClasswork.sabqi : [])
          .filter(entry => entry && typeof entry === 'object' && entry.assignmentRange?.trim())
          .map(entry => {
            try {
              return {
                ...entry,
                type: 'sabqi' as const,
                assignmentRange: String(entry.assignmentRange || '').trim(),
                details: String(entry.details || '').trim(),
                createdAt: entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt || Date.now())
              };
            } catch (err) {
              console.warn('⚠️ Error processing sabqi entry:', err);
              return null;
            }
          })
          .filter((e): e is ClassworkPhase => e !== null),
        manzil: (Array.isArray(filteredClasswork.manzil) ? filteredClasswork.manzil : [])
          .filter(entry => entry && typeof entry === 'object' && entry.assignmentRange?.trim())
          .map(entry => {
            try {
              return {
                ...entry,
                type: 'manzil' as const,
                assignmentRange: String(entry.assignmentRange || '').trim(),
                details: String(entry.details || '').trim(),
                createdAt: entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt || Date.now())
              };
            } catch (err) {
              console.warn('⚠️ Error processing manzil entry:', err);
              return null;
            }
          })
          .filter((e): e is ClassworkPhase => e !== null)
      };

      // Validate homework structure
      const homeworkData = {
        enabled: Boolean(homework.enabled),
        content: String(homework.content || '').trim(),
        link: String(homework.link || '').trim()
      };

      // Validate user role
      const userRole = user.role === 'superadmin' ? 'super_admin' : 
                      (user.role === 'admin' ? 'admin' : 
                      (user.role === 'teacher' ? 'teacher' : 'admin'));

      // Simplified homework - just content and link
      const assignmentData: Assignment = {
        id: assignmentId || '',
        studentId: String(student.id || '').trim(),
        studentName: String(student.fullName || 'Unknown').trim(),
        assignedBy: String(user.id || '').trim(),
        assignedByName: String(user.name || user.email || 'Unknown').trim(),
        assignedByRole: userRole as 'admin' | 'super_admin' | 'teacher',
        classwork: classworkWithTimestamps,
        // ✅ FIX: Removed invalid fields sabqiContent and manzilContent (not in MongoDB schema)
        homework: homeworkData,
        comment: String(comment || '').trim(),
        mushafMistakes: mushafMistakes.length > 0 ? mushafMistakes : undefined,
        status: 'active'
      };

      // Final validation before save
      if (!assignmentData.studentId || assignmentData.studentId.trim() === '') {
        throw new Error('Student ID is missing. Please refresh the page.');
      }

      if (!assignmentData.assignedBy || assignmentData.assignedBy.trim() === '') {
        throw new Error('User ID is missing. Please log in again.');
      }

      if (import.meta.env.DEV) {
        console.log('📤 Assignment data being saved:', {
          assignmentId,
          studentId: student.id,
          studentName: student.fullName,
          classwork: {
            sabq: classworkWithTimestamps.sabq.length,
            sabqi: classworkWithTimestamps.sabqi.length,
            manzil: classworkWithTimestamps.manzil.length
          },
          homeworkEnabled: homework.enabled,
          homeworkContent: homework.content,
          homeworkLink: homework.link,
          status: assignmentData.status
        });
      }

      if (assignmentId && existingAssignment) {
        if (import.meta.env.DEV) {
        console.log('💾 Saving assignment update:', {
          assignmentId,
          homework: assignmentData.homework
        });
        }
        // Ensure all classwork entries have createdAt timestamp
        const classworkWithTimestamps = {
          sabq: filteredClasswork.sabq.map(entry => ({
            ...entry,
            createdAt: entry.createdAt || new Date()
          })),
          sabqi: filteredClasswork.sabqi.map(entry => ({
            ...entry,
            createdAt: entry.createdAt || new Date()
          })),
          manzil: filteredClasswork.manzil.map(entry => ({
            ...entry,
            createdAt: entry.createdAt || new Date()
          }))
        };

        // For updates, only send fields that are allowed to be updated
        // Backend filters out: studentId, studentName, assignedBy, assignedByName, assignedByRole
        // Status must be one of: pending, in_progress, completed, graded (not 'active')
        const updateData: Partial<Assignment> = {
          classwork: classworkWithTimestamps,
          // ✅ FIX: Removed invalid fields sabqiContent and manzilContent (not in MongoDB schema)
          homework: {
            enabled: homework.enabled,
            content: homework.content || '',
            link: homework.link || ''
          },
          comment: comment.trim(),
          mushafMistakes: mushafMistakes.length > 0 ? mushafMistakes : undefined
          // Note: status, studentId, studentName, assignedBy, assignedByName, assignedByRole are NOT included
          // as they are set at creation and cannot be changed via update
        };
        await updateAssignment(assignmentId, updateData);
      } else {
        // Remove 'id' field for new assignments (backend will generate it)
        const { id, ...assignmentDataWithoutId } = assignmentData;
        const assignmentDataWithTicket = prefillTicket && prefillTicket.type === 'sabq' && prefillTicket.id
          ? { ...assignmentDataWithoutId, ticketId: prefillTicket.id }
          : assignmentDataWithoutId;
        if (import.meta.env.DEV) {
        console.log('💾 Creating new assignment:', {
            homework: assignmentDataWithTicket.homework
        });
        }
        await addAssignment(assignmentDataWithTicket);
      }

      // Dispatch custom event to notify other components (including assignment history)
      window.dispatchEvent(new CustomEvent('assignmentUpdated', { 
        detail: { assignmentId, studentId } 
      }));
      
      // Also dispatch storage event for cross-tab communication
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'assignmentUpdated',
        newValue: JSON.stringify({ assignmentId, studentId, timestamp: Date.now() })
      }));
      
      // Small delay to ensure state updates propagate before closing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Small delay to ensure state updates propagate before closing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (onSave && typeof onSave === 'function') {
        onSave();
      }
    } catch (error) {
      console.error('❌ Error saving assignment:', error);
      let errorMessage = 'Failed to save assignment. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      alert(errorMessage);
      
      // Don't close the form on error - let user fix and retry
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[96vh] overflow-hidden flex flex-col my-auto">
        {/* Modern Header with Gradient */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {assignmentId ? 'Edit' : 'Create'} Assignment
                </h2>
                <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {student?.fullName || 'Student'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modern Form with Better Spacing */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* ✅ FIX 1: Student Info Section - Read-only if from ticket */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Student Information
                  {prefillTicket && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      From Ticket
                    </span>
                  )}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Student Name</label>
                  <div className={`text-sm font-semibold text-gray-900 ${prefillTicket ? 'bg-white border border-gray-300 rounded px-3 py-2' : ''}`}>
                    {student?.fullName || 'N/A'}
                  </div>
                </div>
                {prefillTicket?.assignedTeacherName && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Assigned Teacher</label>
                    <div className="text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-3 py-2">
                      {prefillTicket.assignedTeacherName}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ FIX 2: Ticket Review Summary Section (Read-only) */}
            {prefillTicket && (
              <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Review Summary (Read-only)
                  </h3>
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                    {prefillTicket.type.toUpperCase()}
                  </span>
                </div>
                
                {/* Recitation Range - Read-only */}
                {prefillTicket.recitationRange && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Recitation Range</div>
                    {prefillTicket.recitationRange.surahName && (
                      <div 
                        className="text-base font-bold text-blue-700 mb-2"
                        style={{ fontFamily: 'Amiri, "Scheherazade New", serif', direction: 'rtl' }}
                        dir="rtl"
                      >
                        {prefillTicket.recitationRange.surahName}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                        Ayah {prefillTicket.recitationRange.startAyahNumber}-{prefillTicket.recitationRange.endAyahNumber}
                      </span>
                      {prefillTicket.recitationRange.juzNumber && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          Juz {prefillTicket.recitationRange.juzNumber}
                        </span>
                      )}
                    </div>
                    {prefillTicket.recitationRange.startAyahText && (
                      <div 
                        className="text-sm text-gray-900 mt-2 leading-relaxed"
                        style={{ fontFamily: 'Amiri, "Scheherazade New", serif', direction: 'rtl' }}
                        dir="rtl"
                      >
                        {prefillTicket.recitationRange.startAyahText}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Mistake Summary - Read-only */}
                {(prefillTicket.mistakeCount !== undefined || prefillTicket.mistakes?.length || prefillTicket.atkees !== undefined) && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Mistake Summary</div>
                    <div className="flex gap-2 flex-wrap">
                      {prefillTicket.mistakeCount !== undefined && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                          Mistakes: {prefillTicket.mistakeCount === 'weak' ? 'Weak' : prefillTicket.mistakeCount}
                        </span>
                      )}
                      {prefillTicket.atkees !== undefined && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
                          Atkees: {prefillTicket.atkees}
                        </span>
                      )}
                      {prefillTicket.mistakes?.length > 0 && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                          Total: {prefillTicket.mistakes.length}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Comments - Read-only */}
                {(prefillTicket.adminComment || prefillTicket.teacherComment) && (
                  <div className="p-3 bg-white rounded-lg border border-blue-200">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Comments</div>
                    {prefillTicket.adminComment && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-500 mb-1">Admin:</div>
                        <p className="text-sm text-gray-700">{prefillTicket.adminComment}</p>
                      </div>
                    )}
                    {prefillTicket.teacherComment && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Teacher:</div>
                        <p className="text-sm text-gray-700">{prefillTicket.teacherComment}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modern Ticket History Section */}
            {ticketLogs.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTicketLog(!showTicketLog)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-100/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-gray-900">Ticket History</span>
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                      {ticketLogs.length}
                    </span>
                  </div>
                  <svg className={`w-5 h-5 text-gray-600 transition-transform ${showTicketLog ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showTicketLog && (
                  <div className="border-t border-blue-200 bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Mistakes</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {ticketLogs.map((log, idx) => {
                            const colors = getTypeColor(log.type);
                            const mistakeCount = log.ticket.mistakes?.length || 0;
                            const recitationRange = log.ticket.recitationRange;
                            return (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {log.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${colors.bg} ${colors.text} uppercase tracking-wide`}>
                                    {log.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm text-gray-700">
                                    {/* ✅ FIX: Show recitation range or sabqEntries for Sabq tickets */}
                                    {log.type === 'sabq' && log.ticket.sabqEntries && log.ticket.sabqEntries.length > 0 ? (
                                      <div className="space-y-1">
                                        <div className="font-semibold text-xs">Sabq Entries: {log.ticket.sabqEntries.length}</div>
                                        {log.ticket.sabqEntries.slice(0, 2).map((entry, idx) => (
                                          <div key={idx} className="text-xs text-gray-600">
                                            {entry.recitationRange?.surahName || `Surah ${entry.recitationRange?.surahNumber}`}: 
                                            Ayah {entry.recitationRange?.startAyahNumber}-{entry.recitationRange?.endAyahNumber}
                                            {entry.mistakes && entry.mistakes.length > 0 && (
                                              <span className="text-red-600 ml-1">({entry.mistakes.length} mistakes)</span>
                                            )}
                                          </div>
                                        ))}
                                        {log.ticket.sabqEntries.length > 2 && (
                                          <div className="text-xs text-gray-400">+{log.ticket.sabqEntries.length - 2} more</div>
                                        )}
                                      </div>
                                    ) : recitationRange ? (
                                      <div>
                                        <div className="font-semibold">
                                          {recitationRange.surahName || `Surah ${recitationRange.surahNumber}`}
                                          {recitationRange.endSurahName && recitationRange.endSurahName !== recitationRange.surahName && (
                                            <span> → {recitationRange.endSurahName}</span>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Ayah {recitationRange.startAyahNumber}-{recitationRange.endAyahNumber}
                                          {recitationRange.juzNumber && ` (Juz ${recitationRange.juzNumber})`}
                                        </div>
                                        {recitationRange.startAyahText && (
                                          <div className="text-xs text-gray-400 mt-1 line-clamp-1" dir="rtl">
                                            {recitationRange.startAyahText}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">No range</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <div className="text-sm text-gray-700 font-medium">
                                      {log.type === 'sabq' && log.ticket.sabqEntries 
                                        ? log.ticket.sabqEntries.reduce((sum, e) => sum + (e.mistakes?.length || 0), 0)
                                        : mistakeCount} mistakes
                                    </div>
                                    {log.ticket.tajweedIssues && log.ticket.tajweedIssues.length > 0 && (
                                      <div className="text-xs text-gray-600">
                                        {log.ticket.tajweedIssues.length} tajweed issue{log.ticket.tajweedIssues.length !== 1 ? 's' : ''}
                                      </div>
                                    )}
                                    {log.ticket.atkees && (
                                      <div className="text-xs text-gray-600">
                                        Atkees: {log.ticket.atkees}
                                      </div>
                                    )}
                                    {log.ticket.mistakeCount && (
                                      <div className="text-xs text-gray-600">
                                        Count: {log.ticket.mistakeCount === 'weak' ? 'Weak' : log.ticket.mistakeCount}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => useTicketSuggestion(log)}
                                    className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                                  >
                                    Use This Ticket
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

            {/* Modern Classwork Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Classwork</h3>
              </div>
            
              {/* Modern Sabq Section */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">S</span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900">Sabq</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => addClassworkPhase('sabq')}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Entry
                  </button>
                </div>
                {classwork.sabq.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">No Sabq entries yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classwork.sabq.map((phase, index) => (
                      <div key={index} className="bg-white rounded-xl border-2 border-purple-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg">Entry {index + 1}</span>
                            {phase.createdAt && (
                              <span className="text-xs text-gray-500">
                                {new Date(phase.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          {/* Assignment Range Input */}
                          <input
                            type="text"
                            placeholder="Assignment Range (e.g., Surah Al-Fatiha, Ayah 1-7)"
                            value={phase.assignmentRange}
                            onChange={(e) => updateClassworkPhase('sabq', index, 'assignmentRange', e.target.value)}
                            disabled={!!phase.fromTicketId} // ✅ FIX 3: Disable if from ticket
                            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all ${
                              phase.fromTicketId ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''
                            }`}
                            required
                          />
                          {phase.fromTicketId && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              This field is locked because it comes from an approved ticket
                            </p>
                          )}
                      
                          {/* ✅ FIX: Use standardized ClassworkEntryCard for read-only display when fromTicketId exists */}
                          {(phase.fromTicketId || phase.surahName || phase.surahNumber || phase.juzNumber || phase.fromAyah || phase.toAyah || phase.startAyahText || phase.endAyahText || phase.mistakeCount !== undefined || phase.atkees !== undefined || phase.mistakes?.length || phase.tajweedIssues?.length || phase.adminComment || phase.teacherReviewComment || phase.details) ? (
                            <div className="mt-4 pt-4 border-t border-purple-200">
                              <ClassworkEntryCard
                                phase={phase}
                                type="sabq"
                                index={index}
                                showDate={true}
                                className="mb-4"
                              />
                            
                              {/* Marked Mistakes Section - Always show if available */}
                              {(() => {
                                // Priority 1: Use mistakes array directly from phase (if available from SabqEntry)
                                if (phase.mistakes && phase.mistakes.length > 0) {
                                  return (
                                    <div className="mt-3 pt-3 border-t border-gray-300">
                                      <div className="text-sm font-semibold text-gray-700 mb-2">Marked Mistakes ({phase.mistakes.length})</div>
                                      <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {phase.mistakes.map((mistake) => (
                                          <MistakeBadgeHighlight
                                            key={mistake.id || `mistake-${index}-${mistake.page}-${mistake.wordIndex}`}
                                            mistake={mistake}
                                            isNew={false}
                                            showTimestamp={false}
                                            onRemove={undefined}
                                            wordText={mistake.wordText}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                                
                                // Priority 2: Fallback to assignment.mushafMistakes if phase.mistakes not available
                                const assignment = existingAssignment;
                                if (!assignment?.mushafMistakes) return null;
                                
                                const phaseMistakes = assignment.mushafMistakes.filter((m: AssignmentMushafMistake) => {
                                  if (m.workflowStep !== 'sabq') return false;
                                  // Match by surah and ayah range if available
                                  if (phase.surahNumber && phase.fromAyah && phase.toAyah) {
                                    return m.surah === phase.surahNumber && 
                                           m.ayah >= phase.fromAyah && 
                                           m.ayah <= phase.toAyah;
                                  }
                                  return true;
                                }).map((m: AssignmentMushafMistake) => ({
                                  id: m.id || `mistake-${Date.now()}-${Math.random()}`,
                                  type: m.type || 'other',
                                  page: m.page,
                                  surah: m.surah,
                                  ayah: m.ayah,
                                  wordIndex: m.wordIndex,
                                  position: m.position,
                                  note: m.note,
                                  audioUrl: m.audioUrl,
                                  timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
                                  wordText: (m as any).wordText
                                }));
                                
                                return phaseMistakes.length > 0 ? (
                                  <div className="mt-3 pt-3 border-t border-gray-300">
                                    <div className="text-sm font-semibold text-gray-700 mb-2">Marked Mistakes ({phaseMistakes.length})</div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {phaseMistakes.map((mistake) => (
                                        <MistakeBadgeHighlight
                                          key={mistake.id}
                                          mistake={mistake}
                                          isNew={false}
                                          showTimestamp={false}
                                          onRemove={undefined}
                                          wordText={(mistake as any).wordText}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          ) : null}
                          
                          {/* Debug: Show debug info only in development */}
                          {import.meta.env.MODE === 'development' && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                              <p className="font-semibold mb-2">Debug: Sabq Entry Data</p>
                              <div className="space-y-1 text-xs font-mono">
                                <div><strong>fromTicketId:</strong> {phase.fromTicketId || '❌ none'}</div>
                                <div><strong>sabqEntryId:</strong> {phase.sabqEntryId || '❌ none'}</div>
                                <div><strong>surahName:</strong> {phase.surahName || '❌ none'}</div>
                                <div><strong>surahNumber:</strong> {phase.surahNumber || '❌ none'}</div>
                                <div><strong>fromAyah:</strong> {phase.fromAyah || '❌ none'}</div>
                                <div><strong>toAyah:</strong> {phase.toAyah || '❌ none'}</div>
                                <div><strong>startAyahText:</strong> {phase.startAyahText ? `✅ ${phase.startAyahText.substring(0, 40)}...` : '❌ none'}</div>
                                <div><strong>endAyahText:</strong> {phase.endAyahText ? `✅ ${phase.endAyahText.substring(0, 40)}...` : '❌ none'}</div>
                                <div><strong>mistakes:</strong> {phase.mistakes?.length || 0} {(phase.mistakes && phase.mistakes.length > 0) ? '✅' : '❌'}</div>
                                <div><strong>mistakeCount:</strong> {phase.mistakeCount !== undefined ? `✅ ${phase.mistakeCount}` : '❌ none'}</div>
                                <div><strong>atkees:</strong> {phase.atkees !== undefined ? `✅ ${phase.atkees}` : '❌ none'}</div>
                                <div><strong>tajweedIssues:</strong> {phase.tajweedIssues?.length || 0} {(phase.tajweedIssues && phase.tajweedIssues.length > 0) ? '✅' : '❌'}</div>
                                <div><strong>adminComment:</strong> {phase.adminComment ? `✅ ${phase.adminComment.substring(0, 30)}...` : '❌ none'}</div>
                                <div><strong>teacherReviewComment:</strong> {phase.teacherReviewComment ? `✅ ${phase.teacherReviewComment.substring(0, 30)}...` : '❌ none'}</div>
                                <div><strong>details:</strong> {phase.details ? `✅ ${phase.details.substring(0, 30)}...` : '❌ none'}</div>
                              </div>
                            </div>
                          )}
                          
                          {/* Action Footer */}
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                            <button
                              type="button"
                              onClick={() => removeClassworkPhase('sabq', index)}
                              className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modern Sabqi Section */}
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
                        disabled={!!phase.fromTicketId} // ✅ FIX 3: Disable if from ticket
                        className={`w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-1 ${
                          phase.fromTicketId ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''
                        }`}
                        required
                      />
                      {phase.fromTicketId && (
                        <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Locked (from ticket)
                        </p>
                      )}
                      {/* ✅ FIX: Use standardized ClassworkEntryCard for read-only display when fromTicketId exists */}
                      {(phase.fromTicketId || phase.surahName || phase.surahNumber || phase.juzNumber || phase.fromAyah || phase.toAyah || phase.startAyahText || phase.endAyahText || phase.mistakeCount !== undefined || phase.atkees !== undefined || phase.mistakes?.length || phase.tajweedIssues?.length || phase.teacherReviewComment || phase.details) && (
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <ClassworkEntryCard
                            phase={phase}
                            type="sabqi"
                            index={index}
                            showDate={true}
                            className="mb-2"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
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
                        disabled={!!phase.fromTicketId} // ✅ FIX 3: Disable if from ticket
                        className={`w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 focus:border-green-500 mb-1 ${
                          phase.fromTicketId ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''
                        }`}
                        required
                      />
                      {phase.fromTicketId && (
                        <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Locked (from ticket)
                        </p>
                      )}
                      {/* ✅ FIX: Use standardized ClassworkEntryCard for read-only display when fromTicketId exists */}
                      {(phase.fromTicketId || phase.surahName || phase.surahNumber || phase.juzNumber || phase.fromAyah || phase.toAyah || phase.startAyahText || phase.endAyahText || phase.mistakeCount !== undefined || phase.atkees !== undefined || phase.mistakes?.length || phase.tajweedIssues?.length || phase.teacherReviewComment || phase.details) && (
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <ClassworkEntryCard
                            phase={phase}
                            type="manzil"
                            index={index}
                            showDate={true}
                            className="mb-2"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
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
                {/* Homework Range from Sabq Tickets - Like AdminSabqReview */}
                {(() => {
                  // Get homework range from Sabq tickets
                  const sabqTickets = ticketLogs.filter(log => log.type === 'sabq' && log.ticket.homeworkRange);
                  
                  // Also check for homework entries in classwork
                  const homeworkSabqEntries = classwork.sabq.filter(entry => 
                    entry.assignmentRange?.toLowerCase().includes('homework:') ||
                    entry.fromTicketId?.includes('-homework')
                  );
                  
                  // Get the most recent homework range (from ticket or classwork)
                  const latestHomeworkRange = sabqTickets.length > 0 
                    ? sabqTickets[0].ticket.homeworkRange 
                    : homeworkSabqEntries.length > 0 && homeworkSabqEntries[0]
                      ? {
                          surahNumber: homeworkSabqEntries[0].surahNumber,
                          surahName: homeworkSabqEntries[0].surahName,
                          juzNumber: homeworkSabqEntries[0].juzNumber,
                          startAyahNumber: homeworkSabqEntries[0].fromAyah,
                          startAyahText: homeworkSabqEntries[0].startAyahText,
                          endAyahNumber: homeworkSabqEntries[0].toAyah,
                          endAyahText: homeworkSabqEntries[0].endAyahText
                        }
                      : null;
                  
                  // Get admin comment from the most recent Sabq ticket
                  const adminComment = sabqTickets.length > 0 
                    ? sabqTickets[0].ticket.adminComment 
                    : null;
                  
                  if (latestHomeworkRange && latestHomeworkRange.startAyahNumber && latestHomeworkRange.endAyahNumber && (latestHomeworkRange.startAyahNumber > 0 || latestHomeworkRange.endAyahNumber > 0)) {
                    return (
                      <>
                        {/* Homework Range - Like the image */}
                        <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 mb-3">
                          <h4 className="text-sm font-semibold text-blue-900 mb-3">Homework Range</h4>
                          <div className="space-y-3">
                            {/* Start Ayah */}
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-1">Start Ayah</div>
                              {latestHomeworkRange.startAyahNumber && latestHomeworkRange.startAyahNumber > 0 ? (
                                <div>
                                  <div className="text-sm text-blue-700 font-bold">
                                    Surah {latestHomeworkRange.surahNumber || latestHomeworkRange.surahName}:{latestHomeworkRange.startAyahNumber}
                                  </div>
                                  {latestHomeworkRange.startAyahText && (
                                    <div 
                                      className="text-xs text-gray-900 mt-1 leading-relaxed"
                                      style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                                      dir="rtl"
                                    >
                                      {latestHomeworkRange.startAyahText}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">Not selected</div>
                              )}
                            </div>
                            
                            {/* End Ayah */}
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-1">End Ayah</div>
                              {latestHomeworkRange.endAyahNumber && latestHomeworkRange.endAyahNumber > 0 ? (
                                <div>
                                  <div className="text-sm text-blue-700 font-bold">
                                    {(latestHomeworkRange.endSurahName || latestHomeworkRange.surahName) && (
                                      <span dir="rtl" style={{ fontFamily: 'Amiri, "Scheherazade New", serif' }}>
                                        {latestHomeworkRange.endSurahName || latestHomeworkRange.surahName}
                                      </span>
                                    )}
                                    {!latestHomeworkRange.endSurahName && !latestHomeworkRange.surahName && (
                                      <span>Surah {latestHomeworkRange.endSurahNumber || latestHomeworkRange.surahNumber}</span>
                                    )}
                                    :{latestHomeworkRange.endAyahNumber}
                                  </div>
                                  {latestHomeworkRange.endAyahText && (
                                    <div 
                                      className="text-xs text-gray-900 mt-1 leading-relaxed"
                                      style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                                      dir="rtl"
                                    >
                                      {latestHomeworkRange.endAyahText}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">Not selected</div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Admin Comment from Sabq Ticket */}
                        {adminComment && (
                          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Admin Comment</h4>
                            <p className="text-xs text-gray-700">{adminComment}</p>
                          </div>
                        )}
                      </>
                    );
                  }
                  return null;
                })()}
                
                {/* Sabqi & Manzil Homework Fields Together */}
                <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
                  <label className="block text-xs font-semibold text-gray-900 mb-3">
                    Sabqi & Manzil Homework
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* ✅ FIX: Removed Sabqi and Manzil fields - these fields are not in MongoDB schema */}
                    {/* Use homework.content for general homework instructions or homework.items[] for structured homework */}
                  </div>
                </div>

                {/* General Homework Instructions */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Homework Instructions
                  </label>
                  <textarea
                    value={homework.content}
                    onChange={(e) => setHomework(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                    placeholder="Enter general homework instructions, notes, or content..."
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

            {/* Modern Submit Buttons */}
            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-sm flex items-center gap-2"
                disabled={isSaving || !isValid}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {assignmentId ? 'Update Assignment' : 'Create Assignment'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedAssignmentForm;

