import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBackendData } from '../contexts/BackendDataContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ProgramType } from '../types';
import StudentAssignmentHistory from '../components/StudentAssignmentHistory';
import EnhancedAssignmentForm from '../components/EnhancedAssignmentForm';
import TicketCreationForm from '../components/TicketCreationForm';
import AfterSchoolStudentView from '../components/AfterSchoolStudentView';
import HomeworkAssignmentForm from '../components/HomeworkAssignmentForm';
import AdminSabqReview from '../components/AdminSabqReview';
import { Ticket } from '../types/ticket';
import { HomeworkItem } from '../types/assignment';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

// Helper function to normalize IDs (same as in BackendDataContext)
const normalizeId = (id: any): string => {
  if (!id) return '';
  // Handle ObjectId objects (MongoDB) - they have a toString method
  if (id && typeof id === 'object' && id.toString && typeof id.toString === 'function') {
    const str = id.toString();
    // Check if it's an ObjectId string (24 hex characters)
    if (/^[0-9a-fA-F]{24}$/.test(str)) {
      return str;
    }
    // If toString() returns "[object Object]", it's not a valid ID - try to extract from common properties
    if (str === '[object Object]') {
      // Try to get the actual ID from common MongoDB ObjectId properties
      if (id._str) return String(id._str);
      if (id.id) return normalizeId(id.id);
      if (id.toString && id.toString !== Object.prototype.toString) {
        // Already tried toString, return empty to indicate invalid
        return '';
      }
      return '';
    }
    // If it's a valid-looking string (not "[object Object]"), return it trimmed
    return str.trim();
  }
  // Handle strings
  if (typeof id === 'string') {
    return id.trim();
  }
  // Fallback: convert to string, but filter out "[object Object]"
  const str = String(id);
  if (str === '[object Object]') {
    return '';
  }
  return str.trim();
};

const AssignmentManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { students: allStudents, assignments, getStudentAssignments, refreshData, refreshDataLight, recitationTickets, loading, error: backendError, fetchAssignmentById } = useBackendData();
  const { teachers, getStudentsByTeacher } = useData();
  const { user } = useAuth();
  const [selectedProgram, setSelectedProgram] = useState<ProgramType | 'all'>('all');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [prefillTicket, setPrefillTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'students' | 'completed' | 'all-assignments'>('students');
  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [homeworkAssignmentId, setHomeworkAssignmentId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-assignments' | 'without-assignments'>('all');
  const [sabqReviewTicket, setSabqReviewTicket] = useState<Ticket | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Error and loading states
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const hasOpenedFromUrlRef = useRef(false);
  const hasFetchedForUrlRef = useRef<string | null>(null);

  // Clear errors when component mounts or data changes
  useEffect(() => {
    if (backendError) {
      setError(backendError);
    } else {
      setError(null);
    }
  }, [backendError]);

  // Open assignment from URL (?assignmentId=xxx) when coming from notification click
  useEffect(() => {
    const assignmentIdFromUrl = searchParams.get('assignmentId');
    if (!assignmentIdFromUrl || hasOpenedFromUrlRef.current) return;

    const cachedAssignments = Array.isArray(assignments) ? assignments : [];
    const assignment = cachedAssignments.find((a: any) => (a.id || a._id) === assignmentIdFromUrl);

    if (assignment) {
      hasOpenedFromUrlRef.current = true;
      hasFetchedForUrlRef.current = null;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('assignmentId');
        return next;
      }, { replace: true });
      setEditingAssignment(assignmentIdFromUrl);
      setShowAssignmentForm(true);
      setOperationError(null);
      return;
    }

    if (hasFetchedForUrlRef.current === assignmentIdFromUrl) return;
    hasFetchedForUrlRef.current = assignmentIdFromUrl;
    fetchAssignmentById(assignmentIdFromUrl);
  }, [searchParams, assignments, fetchAssignmentById, setSearchParams]);

  // Validate critical dependencies
  useEffect(() => {
    if (!allStudents || !Array.isArray(allStudents)) {
      console.warn('⚠️ allStudents is not a valid array:', allStudents);
      setError('Student data is not available. Please refresh the page.');
    }
    if (!assignments || !Array.isArray(assignments)) {
      console.warn('⚠️ assignments is not a valid array:', assignments);
      setError('Assignment data is not available. Please refresh the page.');
    }
    if (!getStudentAssignments || typeof getStudentAssignments !== 'function') {
      console.warn('⚠️ getStudentAssignments is not a function:', getStudentAssignments);
      setError('Assignment lookup function is not available. Please refresh the page.');
    }
  }, [allStudents, assignments, getStudentAssignments]);

  const currentTeacher = useMemo(() => {
    try {
      if (!user || !teachers || !Array.isArray(teachers)) return null;
      return teachers.find(t => t && t.email === user.email) || null;
    } catch (err) {
      console.error('❌ Error finding current teacher:', err);
      return null;
    }
  }, [user, teachers]);

  const assignedStudents = useMemo(() => {
    try {
      if (!allStudents || !Array.isArray(allStudents)) return [];
      if (!currentTeacher?.id) return allStudents;
      if (!getStudentsByTeacher || typeof getStudentsByTeacher !== 'function') {
        console.warn('⚠️ getStudentsByTeacher is not available');
        return allStudents;
      }
      const result = getStudentsByTeacher(currentTeacher.id);
      return Array.isArray(result) ? result : allStudents;
    } catch (err) {
      console.error('❌ Error getting assigned students:', err);
      return allStudents || [];
    }
  }, [currentTeacher, allStudents, getStudentsByTeacher]);

  // Normalize program names to canonical ProgramType values
  const normalizeProgramName = (program: string | undefined): ProgramType | null => {
    if (!program) return null;
    const normalized = program.trim().toLowerCase();
    
    // Map variations to canonical ProgramType values
    if (normalized.includes('full') && normalized.includes('time')) {
      return 'Full-Time HQ';
    }
    if (normalized.includes('part') && normalized.includes('time')) {
      return 'Part-Time HQ';
    }
    if (normalized.includes('after') && normalized.includes('school')) {
      return 'After School';
    }
    
    // If it matches exactly, return as-is
    if (program === 'Full-Time HQ' || program === 'Part-Time HQ' || program === 'After School') {
      return program as ProgramType;
    }
    
    return null;
  };

  const programs = useMemo(() => {
    const programSet = new Set<ProgramType>();
    assignedStudents.forEach(student => {
      const normalized = normalizeProgramName(student.program);
      if (normalized) {
        programSet.add(normalized);
      }
    });
    return Array.from(programSet).sort(); // Sort alphabetically for better UX
  }, [assignedStudents]);

  const filteredStudents = useMemo(() => {
    let filtered = assignedStudents;
    
    // Filter by program - normalize both sides for comparison
    if (selectedProgram !== 'all') {
      filtered = filtered.filter(student => {
        const normalizedStudentProgram = normalizeProgramName(student.program);
        return normalizedStudentProgram === selectedProgram;
      });
    }
    
    // Filter by assignment status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(student => {
        // Use studentRecordId (Student document _id) which matches assignment.studentId
        // Fallback to student.id if studentRecordId doesn't exist
        const studentIdToUse = (student as any).studentRecordId || student.id || (student as any)._id;
        const studentAssignments = getStudentAssignments(studentIdToUse);
        const hasAssignments = studentAssignments.length > 0;
        
        if (filterStatus === 'with-assignments') return hasAssignments;
        if (filterStatus === 'without-assignments') return !hasAssignments;
        return true;
      });
    }
    
    // Filter by search query - handle undefined/null values safely
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(student => {
        // Check fullName
        const fullName = student.fullName?.toLowerCase() || '';
        if (fullName.includes(query)) return true;
        
        // Check email
        const email = student.email?.toLowerCase() || '';
        if (email.includes(query)) return true;
        
        // Check id (convert to string safely)
        const id = String(student.id || (student as any)._id || '').toLowerCase();
        if (id.includes(query)) return true;
        
        // Check program
        const program = student.program?.toLowerCase() || '';
        if (program.includes(query)) return true;
        
        // Check contact/phone
        const contact = student.contact?.toLowerCase() || '';
        if (contact.includes(query)) return true;
        
        return false;
      });
    }
    
    return filtered;
  }, [assignedStudents, selectedProgram, searchQuery, filterStatus, getStudentAssignments]);

  const stats = useMemo(() => {
    try {
      // Fail fast - validate inputs
      if (!assignedStudents || !Array.isArray(assignedStudents)) {
        console.warn('⚠️ assignedStudents is not a valid array');
        return {
          totalAssignments: 0,
          studentsWithAssignments: 0,
          activeAssignments: 0,
          completedAssignments: 0,
          pendingHomework: 0,
          completionRate: 0,
          totalStudents: 0
        };
      }

      if (!assignments || !Array.isArray(assignments)) {
        console.warn('⚠️ assignments is not a valid array');
        return {
          totalAssignments: 0,
          studentsWithAssignments: 0,
          activeAssignments: 0,
          completedAssignments: 0,
          pendingHomework: 0,
          completionRate: 0,
          totalStudents: assignedStudents.length || 0
        };
      }

      // Build a set of all possible student IDs for each assigned student
      // This includes: id, studentRecordId, _id, userId
      const assignedStudentIdSets = assignedStudents.map(s => {
        try {
          const ids = new Set<string>();
          const addValidId = (idValue: any) => {
            try {
              const normalized = normalizeId(idValue);
              // Only add if it's a valid non-empty string and not "[object Object]"
              if (normalized && normalized !== '[object Object]' && normalized.length > 0) {
                ids.add(normalized);
              }
            } catch (err) {
              console.warn('⚠️ Error normalizing ID:', idValue, err);
            }
          };
          if (s && s.id) addValidId(s.id);
          if (s && (s as any).studentRecordId) addValidId((s as any).studentRecordId);
          if (s && (s as any)._id) addValidId((s as any)._id);
          if (s && (s as any).userId) addValidId((s as any).userId);
          return ids;
        } catch (err) {
          console.warn('⚠️ Error processing student ID set:', err);
          return new Set<string>();
        }
      });
    
    // Flatten all possible student IDs into a single set for quick lookup
    const allPossibleStudentIds = new Set<string>();
    assignedStudentIdSets.forEach(idSet => {
      idSet.forEach(id => {
        // Double-check: only add valid IDs
        if (id && id !== '[object Object]' && id.length > 0) {
          allPossibleStudentIds.add(id);
        }
      });
    });
    
    // Get all unique student IDs from assignments to check for mismatches
    const assignmentStudentIds = new Set<string>(
      assignments.map(a => normalizeId(a.studentId || (a as any)._id?.studentId)).filter((id): id is string => !!id)
    );
    
    // Find assignments with studentIds that don't match any assigned students
    const unmatchedAssignmentIds: string[] = Array.from(assignmentStudentIds).filter(
      (assignmentId: string) => !allPossibleStudentIds.has(assignmentId)
    );
    
    // Debug logging to identify ID mismatches
    // Filter out invalid IDs from samples
    const validSampleAssignedStudentIds = Array.from<string>(allPossibleStudentIds)
      .filter(id => id && id !== '[object Object]' && id.length > 0)
      .slice(0, 10);
    const validSampleAssignmentStudentIds = Array.from<string>(assignmentStudentIds)
      .filter(id => id && id !== '[object Object]' && id.length > 0)
      .slice(0, 10);
    
    if (import.meta.env.DEV) {
    console.log('🔍 Assignment-Student ID Matching Analysis:', {
      totalAssignments: assignments.length,
      assignedStudentsCount: assignedStudents.length,
      allStudentsCount: allStudents.length,
      allPossibleStudentIdsCount: allPossibleStudentIds.size,
      assignmentStudentIdsCount: assignmentStudentIds.size,
      unmatchedAssignmentIds: unmatchedAssignmentIds.slice(0, 10),
      unmatchedCount: unmatchedAssignmentIds.length,
      sampleAssignedStudentIds: validSampleAssignedStudentIds,
      sampleAssignmentStudentIds: validSampleAssignmentStudentIds,
      // Check if there are any students that match the unmatched assignment IDs
      unmatchedButStudentExists: unmatchedAssignmentIds.slice(0, 5).map((id: string) => {
        const foundStudent = allStudents.find(s => {
          const studentId = normalizeId(s.id || (s as any)._id);
          const studentRecordId = normalizeId((s as any).studentRecordId);
          return studentId === id || studentRecordId === id;
        });
        return { 
          assignmentId: id, 
          studentFound: !!foundStudent, 
          studentId: foundStudent?.id,
          studentRecordId: foundStudent ? normalizeId((foundStudent as any).studentRecordId) : null
        };
      })
    });
    }
    
    const relevantAssignments = assignments.filter(a => {
      const assignmentStudentId = normalizeId(a.studentId || (a as any)._id?.studentId);
      if (!assignmentStudentId) {
        console.warn('⚠️ Assignment missing studentId:', {
          assignmentId: a.id || (a as any)._id,
          assignment: a
        });
        return false;
      }
      // Check against all possible student IDs (id, studentRecordId, _id, userId)
      const matches = allPossibleStudentIds.has(assignmentStudentId);
      
      // Also check if student exists in allStudents (not just assignedStudents)
      if (!matches) {
        const studentExists = allStudents.some(s => {
          const studentId = normalizeId(s.id || (s as any)._id);
          const studentRecordId = normalizeId((s as any).studentRecordId);
          return studentId === assignmentStudentId || studentRecordId === assignmentStudentId;
        });
        if (studentExists) {
          console.warn('⚠️ Assignment studentId exists in allStudents but not in assignedStudents:', {
            assignmentId: a.id || (a as any)._id,
            assignmentStudentId,
            isTeacherView: !!currentTeacher
          });
        }
      }
      
      return matches;
    });
    const totalAssignments = relevantAssignments.length;
    
    if (import.meta.env.DEV) {
    console.log('📊 AssignmentManagement Stats Result:', {
      totalAssignments,
      relevantAssignmentsCount: relevantAssignments.length,
      unmatchedAssignments: assignments.length - relevantAssignments.length,
      studentsWithAssignments: new Set(relevantAssignments.map(a => normalizeId(a.studentId || (a as any)._id?.studentId))).size
    });
    }
    const studentsWithAssignments = new Set(relevantAssignments.map(a => a.studentId)).size;
    const activeAssignments = relevantAssignments.filter(a => a.status === 'active').length;
    const completedAssignments = relevantAssignments.filter((a: any) => {
      // Explicitly completed
      if (a.status === 'completed') return true;
      // Archived assignments
      if (a.status === 'archived') return true;
      // Homework that has been graded
      if (a.homework?.enabled && 
          a.homework?.submission?.submitted && 
          a.homework?.submission?.status === 'graded') return true;
      // Homework that has feedback (even if status isn't 'graded')
      if (a.homework?.enabled && 
          a.homework?.submission?.submitted && 
          a.homework?.submission?.feedback) return true;
      return false;
    }).length;
    const pendingHomework = relevantAssignments.filter((a: any) => 
      a.homework?.enabled && 
      a.homework?.submission?.submitted && 
      a.homework?.submission?.status === 'submitted'
    ).length;
    const completionRate = totalAssignments > 0 
      ? Math.round((completedAssignments / totalAssignments) * 100) 
      : 0;
    
      return {
        totalAssignments,
        studentsWithAssignments,
        activeAssignments,
        completedAssignments,
        pendingHomework,
        completionRate,
        totalStudents: assignedStudents.length
      };
    } catch (err) {
      console.error('❌ Error calculating stats:', err);
      return {
        totalAssignments: 0,
        studentsWithAssignments: 0,
        activeAssignments: 0,
        completedAssignments: 0,
        pendingHomework: 0,
        completionRate: 0,
        totalStudents: assignedStudents?.length || 0
      };
    }
  }, [assignments, assignedStudents]);

  // Get completed assignments for display
  const completedAssignmentsList = useMemo(() => {
    try {
      if (!assignedStudents || !Array.isArray(assignedStudents) || !assignments || !Array.isArray(assignments)) {
        return [];
      }

      // Normalize student IDs to handle ObjectId vs string mismatches
      const assignedStudentIds = new Set(
        assignedStudents
          .filter(s => s != null)
          .map(s => {
            try {
              return normalizeId(s.id || (s as any)._id);
            } catch (err) {
              console.warn('⚠️ Error normalizing student ID:', err);
              return '';
            }
          })
          .filter(id => id && id.length > 0)
      );

      return assignments
        .filter((a: any) => {
          try {
            if (!a) return false;
            const assignmentStudentId = normalizeId(a.studentId || (a as any)._id?.studentId);
            return assignmentStudentId && assignedStudentIds.has(assignmentStudentId);
          } catch (err) {
            console.warn('⚠️ Error filtering assignment:', err);
            return false;
          }
        })
        .filter((assignment: any) => {
          try {
            if (!assignment) return false;
            // Explicitly completed
            if (assignment.status === 'completed') return true;
            // Archived assignments
            if (assignment.status === 'archived') return true;
            // Homework that has been graded
            if (assignment.homework?.enabled && 
                assignment.homework?.submission?.submitted && 
                assignment.homework?.submission?.status === 'graded') return true;
            // Homework that has feedback (even if status isn't 'graded')
            if (assignment.homework?.enabled && 
                assignment.homework?.submission?.submitted && 
                assignment.homework?.submission?.feedback) return true;
            return false;
          } catch (err) {
            console.warn('⚠️ Error checking assignment completion status:', err);
            return false;
          }
        })
        .sort((a: any, b: any) => {
          try {
            const dateA = a.completedAt || a.homework?.submission?.gradedAt || a.updatedAt || a.createdAt;
            const dateB = b.completedAt || b.homework?.submission?.gradedAt || b.updatedAt || b.createdAt;
            const timeA = dateA ? new Date(dateA).getTime() : 0;
            const timeB = dateB ? new Date(dateB).getTime() : 0;
            return timeB - timeA;
          } catch (err) {
            console.warn('⚠️ Error sorting assignments:', err);
            return 0;
          }
        });
    } catch (err) {
      console.error('❌ Error getting completed assignments list:', err);
      return [];
    }
  }, [assignments, assignedStudents]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Check if student has tickets in progress
  const getStudentTicketStatus = (studentId: string) => {
    try {
      if (!studentId || typeof studentId !== 'string') {
        return { inProgress: false, inProgressCount: 0, needsHomework: false, needsHomeworkCount: 0, done: false };
      }

      if (!recitationTickets || !Array.isArray(recitationTickets)) {
        return { inProgress: false, inProgressCount: 0, needsHomework: false, needsHomeworkCount: 0, done: false };
      }

      const normalizedStudentId = normalizeId(studentId);
      const studentTickets = recitationTickets.filter(t => {
        try {
          if (!t) return false;
          const ticketStudentId = normalizeId(t.studentId || '');
          return ticketStudentId === normalizedStudentId;
        } catch (err) {
          console.warn('⚠️ Error filtering ticket:', err);
          return false;
        }
      });

      // Check for tickets that are in progress (not yet sent to assignment)
      const inProgressTickets = studentTickets.filter(t => {
        try {
          if (!t || !t.status) return false;
          return t.status === 'pending' || 
                 t.status === 'in_progress' || 
                 t.status === 'submitted';
        } catch (err) {
          console.warn('⚠️ Error checking ticket progress:', err);
          return false;
        }
      });

      // Check for tickets that are approved but assignment doesn't have homework yet
      const approvedTicketsWithoutHomework = studentTickets.filter(t => {
        try {
          if (!t || t.status !== 'sent_to_assignment' || !t.sentToAssignmentId) return false;
          if (!assignments || !Array.isArray(assignments)) return false;
          
          const assignment = assignments.find(a => {
            try {
              if (!a) return false;
              const aId = normalizeId((a as any)._id || a.id);
              const ticketAssignmentId = normalizeId(t.sentToAssignmentId);
              return aId === ticketAssignmentId;
            } catch (err) {
              console.warn('⚠️ Error matching assignment:', err);
              return false;
            }
          });
          
          // Ticket is approved but assignment doesn't have homework
          return assignment && (!assignment.homework?.enabled || 
            (!assignment.homework?.content?.trim() && 
             (!assignment.homework?.items || assignment.homework.items.length === 0)));
        } catch (err) {
          console.warn('⚠️ Error checking ticket homework status:', err);
          return false;
        }
      });

      const done = studentTickets.some(t => {
        try {
          if (!t || t.status !== 'sent_to_assignment' || !t.sentToAssignmentId) return false;
          if (!assignments || !Array.isArray(assignments)) return false;
          
          const assignment = assignments.find(a => {
            try {
              if (!a) return false;
              const aId = normalizeId((a as any)._id || a.id);
              const ticketAssignmentId = normalizeId(t.sentToAssignmentId);
              return aId === ticketAssignmentId;
            } catch (err) {
              console.warn('⚠️ Error matching assignment for done check:', err);
              return false;
            }
          });
          
          // Ticket is approved AND assignment has homework
          return assignment && assignment.homework?.enabled && 
            (assignment.homework?.content?.trim() || 
             (assignment.homework?.items && assignment.homework.items.length > 0));
        } catch (err) {
          console.warn('⚠️ Error checking if ticket is done:', err);
          return false;
        }
      });

      return {
        inProgress: inProgressTickets.length > 0,
        inProgressCount: inProgressTickets.length,
        needsHomework: approvedTicketsWithoutHomework.length > 0,
        needsHomeworkCount: approvedTicketsWithoutHomework.length,
        done
      };
    } catch (err) {
      console.error('❌ Error getting student ticket status:', err);
      return { inProgress: false, inProgressCount: 0, needsHomework: false, needsHomeworkCount: 0, done: false };
    }
  };

  const handleStudentClick = (studentId: string) => {
    try {
      if (!studentId || typeof studentId !== 'string') {
        setOperationError('Invalid student ID. Please try again.');
        return;
      }
      setSelectedStudent(studentId);
      setOperationError(null);
    } catch (err) {
      console.error('❌ Error handling student click:', err);
      setOperationError('Failed to open student view. Please try again.');
    }
  };

  // Check if After School is selected
  const isAfterSchoolSelected = selectedProgram === 'After School';

  const handleCreateAssignment = (studentId: string) => {
    try {
      if (!studentId || typeof studentId !== 'string') {
        setOperationError('Invalid student ID. Cannot create assignment.');
        return;
      }
      
      // Validate student exists
      const student = allStudents?.find(s => {
        const sId = normalizeId(s.id || (s as any)._id);
        const sRecordId = normalizeId((s as any).studentRecordId);
        const normalizedStudentId = normalizeId(studentId);
        return sId === normalizedStudentId || sRecordId === normalizedStudentId;
      });
      
      if (!student) {
        setOperationError('Student not found. Please refresh the page.');
        return;
      }
      
      setSelectedStudent(studentId);
      setEditingAssignment(null);
      setPrefillTicket(null);
      setShowAssignmentForm(true);
      setOperationError(null);
    } catch (err) {
      console.error('❌ Error creating assignment:', err);
      setOperationError('Failed to open assignment form. Please try again.');
    }
  };

  const handleCreateTicket = (studentId: string) => {
    try {
      if (!studentId || typeof studentId !== 'string') {
        setOperationError('Invalid student ID. Cannot create ticket.');
        return;
      }
      
      // Validate student exists
      const student = allStudents?.find(s => {
        const sId = normalizeId(s.id || (s as any)._id);
        const sRecordId = normalizeId((s as any).studentRecordId);
        const normalizedStudentId = normalizeId(studentId);
        return sId === normalizedStudentId || sRecordId === normalizedStudentId;
      });
      
      if (!student) {
        setOperationError('Student not found. Please refresh the page.');
        return;
      }
      
      setSelectedStudent(studentId);
      setShowTicketForm(true);
      setOperationError(null);
    } catch (err) {
      console.error('❌ Error creating ticket:', err);
      setOperationError('Failed to open ticket form. Please try again.');
    }
  };

  const handleTicketSuccess = async (ticket: Ticket, openSabqReview?: boolean) => {
    try {
      if (!ticket || !ticket.id) {
        setOperationError('Invalid ticket data. Please try creating the ticket again.');
        return;
      }
      
      setShowTicketForm(false);
      setOperationError(null);
      
      if (ticket.type === 'sabq' && openSabqReview) {
        // Open AdminSabqReview for new Sabq tickets
        setSabqReviewTicket(ticket);
      } else if (ticket.type === 'sabq') {
        // ✅ OPTIMIZED: Pass only essential fields to reduce state size
        setPrefillTicket({
          id: ticket.id,
          type: ticket.type,
          studentId: ticket.studentId,
          studentName: ticket.studentName,
          assignedTeacherId: ticket.assignedTeacherId,
          assignedTeacherName: ticket.assignedTeacherName,
          recitationRange: ticket.recitationRange,
          mistakeCount: ticket.mistakeCount,
          atkees: ticket.atkees,
          mistakes: ticket.mistakes?.slice(0, 10), // ✅ Limit array size
          tajweedIssues: ticket.tajweedIssues,
          adminComment: ticket.adminComment,
          teacherComment: ticket.teacherComment,
          status: ticket.status,
          sentAt: ticket.sentAt,
          createdAt: ticket.createdAt
        } as Ticket);
        setShowAssignmentForm(true);
      }
      
      // Refresh data to get the new ticket
      if (refreshDataLight && typeof refreshDataLight === 'function') {
        setIsLoading(true);
        try {
          await refreshDataLight();
        } catch (refreshErr) {
          console.error('❌ Error refreshing data after ticket creation:', refreshErr);
          setOperationError('Ticket created successfully, but failed to refresh data. Please refresh the page.');
        } finally {
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('❌ Error handling ticket success:', err);
      setOperationError('Failed to process ticket. Please try again.');
      setShowTicketForm(false);
    }
  };

  const handleEditAssignment = (assignmentId: string) => {
    try {
      if (!assignmentId || typeof assignmentId !== 'string') {
        setOperationError('Invalid assignment ID. Cannot edit assignment.');
        return;
      }
      
      // Validate assignment exists
      const assignment = assignments?.find(a => {
        const aId = normalizeId(a.id || (a as any)._id);
        const normalizedAssignmentId = normalizeId(assignmentId);
        return aId === normalizedAssignmentId;
      });
      
      if (!assignment) {
        setOperationError('Assignment not found. Please refresh the page.');
        return;
      }
      
      setEditingAssignment(assignmentId);
      setShowAssignmentForm(true);
      setOperationError(null);
    } catch (err) {
      console.error('❌ Error editing assignment:', err);
      setOperationError('Failed to open assignment editor. Please try again.');
    }
  };

  const handleCloseModal = () => {
    try {
      setSelectedStudent(null);
      setShowAssignmentForm(false);
      setEditingAssignment(null);
      setOperationError(null);
    } catch (err) {
      console.error('❌ Error closing modal:', err);
    }
  };

  const handleAssignHomework = (assignmentId: string, studentId: string) => {
    try {
      if (!assignmentId || typeof assignmentId !== 'string') {
        setOperationError('Invalid assignment ID. Cannot assign homework.');
        return;
      }
      
      if (!studentId || typeof studentId !== 'string') {
        setOperationError('Invalid student ID. Cannot assign homework.');
        return;
      }
      
      // Validate assignment exists
      const assignment = assignments?.find(a => {
        const aId = normalizeId(a.id || (a as any)._id);
        const normalizedAssignmentId = normalizeId(assignmentId);
        return aId === normalizedAssignmentId;
      });
      
      if (!assignment) {
        setOperationError('Assignment not found. Please refresh the page.');
        return;
      }
      
      // Validate student exists
      const student = allStudents?.find(s => {
        const sId = normalizeId(s.id || (s as any)._id);
        const sRecordId = normalizeId((s as any).studentRecordId);
        const normalizedStudentId = normalizeId(studentId);
        return sId === normalizedStudentId || sRecordId === normalizedStudentId;
      });
      
      if (!student) {
        setOperationError('Student not found. Please refresh the page.');
        return;
      }
      
      setHomeworkAssignmentId(assignmentId);
      setSelectedStudent(studentId);
      setShowHomeworkForm(true);
      setOperationError(null);
    } catch (err) {
      console.error('❌ Error assigning homework:', err);
      setOperationError('Failed to open homework form. Please try again.');
    }
  };

  const handleSaveHomework = async (homeworkItems: HomeworkItem[], notes: string) => {
    // Fail fast - validate inputs immediately
    if (!homeworkAssignmentId || typeof homeworkAssignmentId !== 'string') {
      const errorMsg = 'Invalid assignment ID. Cannot save homework.';
      setOperationError(errorMsg);
      throw new Error(errorMsg);
    }

    if (!Array.isArray(homeworkItems)) {
      const errorMsg = 'Invalid homework items. Please provide a valid array.';
      setOperationError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setOperationError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      if (!API_BASE) {
        throw new Error('API base URL is not configured. Please check your environment variables.');
      }

      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Validate assignment ID format (MongoDB ObjectId)
      const assignmentIdNormalized = normalizeId(homeworkAssignmentId);
      if (!assignmentIdNormalized || assignmentIdNormalized.length !== 24) {
        throw new Error('Invalid assignment ID format. Please refresh and try again.');
      }

      // Get current assignment with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      let assignmentResponse: Response;
      try {
        assignmentResponse = await fetch(`${API_BASE}/assignments/${assignmentIdNormalized}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw new Error(`Network error: ${fetchErr.message || 'Failed to connect to server'}`);
      } finally {
        clearTimeout(timeoutId);
      }

      if (!assignmentResponse.ok) {
        let errorMessage = 'Failed to fetch assignment';
        try {
          const errorData = await assignmentResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server returned ${assignmentResponse.status} ${assignmentResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const assignment = await assignmentResponse.json();
      if (!assignment || !assignment.id) {
        throw new Error('Invalid assignment data received from server.');
      }

      // Validate homework items structure
      const validHomeworkItems = homeworkItems.filter(item => {
        if (!item || typeof item !== 'object') return false;
        return true; // Add more validation if needed
      });

      // Update assignment with timeout
      const updateController = new AbortController();
      const updateTimeoutId = setTimeout(() => updateController.abort(), 10000);

      let updateResponse: Response;
      try {
        updateResponse = await fetch(`${API_BASE}/assignments/${assignmentIdNormalized}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            homework: {
              enabled: validHomeworkItems.length > 0,
              items: validHomeworkItems,
              notes: notes || ''
            }
          }),
          signal: updateController.signal
        });
      } catch (updateErr: any) {
        clearTimeout(updateTimeoutId);
        if (updateErr.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw new Error(`Network error: ${updateErr.message || 'Failed to save homework'}`);
      } finally {
        clearTimeout(updateTimeoutId);
      }

      if (!updateResponse.ok) {
        let errorMessage = 'Failed to save homework';
        try {
          const errorData = await updateResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server returned ${updateResponse.status} ${updateResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Refresh assignments only (faster than full refreshData)
      if (refreshDataLight && typeof refreshDataLight === 'function') {
        try {
          await refreshDataLight();
        } catch (refreshErr) {
          console.error('❌ Error refreshing data after homework save:', refreshErr);
          // Don't throw - homework was saved successfully
          setOperationError('Homework saved successfully, but failed to refresh data. Please refresh the page.');
        }
      } else if (refreshData && typeof refreshData === 'function') {
        try {
          await refreshData();
        } catch (refreshErr) {
          console.error('❌ Error refreshing data after homework save:', refreshErr);
          setOperationError('Homework saved successfully, but failed to refresh data. Please refresh the page.');
        }
      }
    } catch (error: any) {
      console.error('❌ Error saving homework:', error);
      const errorMessage = error.message || 'Failed to save homework. Please try again.';
      setOperationError(errorMessage);
      throw error; // Re-throw so the form can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseHomeworkForm = () => {
    setShowHomeworkForm(false);
    setHomeworkAssignmentId(null);
    setSelectedStudent(null);
  };

  const displayError = error || operationError;

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
      <AppLayout
        sidebar={
          <Sidebar
            activeSection="assignments"
            onSectionChange={() => {}}
            isMobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((o) => !o)}
            onMobileClose={() => setSidebarOpen(false)}
          />
        }
        sidebarOpen={sidebarOpen}
        onOverlayClick={() => setSidebarOpen(false)}
        maxWidth="7xl"
      >
        <div className="space-y-4 sm:space-y-6">
          {displayError && (
            <EmptyState
              title={error ? 'System Error' : 'Operation Error'}
              message={displayError}
              action={
                <Button
                  variant="primary"
                  size="md"
                  fullWidthMobile
                  onClick={() => {
                    setError(null);
                    setOperationError(null);
                    if (refreshData) refreshData().catch((err: unknown) => console.error('Refresh error:', err));
                  }}
                >
                  Dismiss and Refresh
                </Button>
              }
            />
          )}

          {(isLoading || loading) && !displayError && (
            <div className="flex flex-col items-center justify-center py-8" role="status">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
              <p className="body-text text-gray-600">{isLoading ? 'Processing...' : 'Loading...'}</p>
            </div>
          )}

          {!displayError && (
            <>
        <section className="space-y-4">
          <div>
            <h1 className="heading-page text-gray-900">Assignments</h1>
            <p className="caption mt-1">
              {currentTeacher
                ? `${stats.totalStudents} students · ${stats.totalAssignments} assignments · ${stats.completedAssignments} completed`
                : `${stats.totalStudents} students · ${stats.totalAssignments} assignments`}
              {stats.pendingHomework > 0 && ` · ${stats.pendingHomework} homework to grade`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant={viewMode === 'students' ? 'primary' : 'outline'}
              size="md"
              onClick={() => setViewMode('students')}
              fullWidthMobile
              className="min-h-[44px]"
            >
              By student
            </Button>
            <Button
              variant={viewMode === 'completed' ? 'primary' : 'outline'}
              size="md"
              onClick={() => setViewMode('completed')}
              fullWidthMobile
              className="min-h-[44px]"
            >
              Completed
              {stats.completedAssignments > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">
                  {stats.completedAssignments}
                </span>
              )}
            </Button>
            <Button
              variant={viewMode === 'all-assignments' ? 'primary' : 'outline'}
              size="md"
              onClick={() => setViewMode('all-assignments')}
              fullWidthMobile
              className="min-h-[44px]"
            >
              All assignments
              {stats.totalAssignments > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">
                  {stats.totalAssignments}
                </span>
              )}
            </Button>
          </div>
        </section>

        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
          <h2 className="heading-card mb-3">Search and filters</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <label className="block body-text font-medium text-gray-700 mb-1 sr-only">Search students</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block body-text font-medium text-gray-700 mb-1 sr-only">Program</label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value as ProgramType | 'all')}
                  className="min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All programs</option>
                  <option value="Full-Time HQ">Full-Time HQ</option>
                  <option value="Part-Time HQ">Part-Time HQ</option>
                  <option value="After School">After School</option>
                </select>
              </div>
              {viewMode === 'students' && (
                <div>
                  <label className="block body-text font-medium text-gray-700 mb-1 sr-only">Assignment status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'with-assignments' | 'without-assignments')}
                    className="min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="all">All</option>
                    <option value="with-assignments">With assignments</option>
                    <option value="without-assignments">Without assignments</option>
                  </select>
                </div>
              )}
              {(searchQuery || selectedProgram !== 'all' || filterStatus !== 'all') && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedProgram('all');
                    setFilterStatus('all');
                  }}
                  className="min-h-[44px]"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'all-assignments' ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="heading-section">
                All assignments ({stats.totalAssignments})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing all {stats.totalAssignments} assignments across all students
              </p>
            </div>

            {stats.totalAssignments === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-gray-600">No assignments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      // Normalize student IDs to handle ObjectId vs string mismatches
                      const assignedStudentIds = new Set(assignedStudents.map(s => normalizeId(s.id || (s as any)._id)));
                      const allRelevantAssignments = assignments
                        .filter(a => {
                          const assignmentStudentId = normalizeId(a.studentId || (a as any)._id?.studentId);
                          return assignedStudentIds.has(assignmentStudentId);
                        })
                        .sort((a: any, b: any) => {
                          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                          return dateB - dateA;
                        });
                      
                      return allRelevantAssignments.map((assignment: any) => {
                        const student = allStudents.find((s: any) => {
                          const studentId = normalizeId(s.id || (s as any)._id);
                          const assignmentStudentId = normalizeId(assignment.studentId || (assignment as any)._id?.studentId);
                          return studentId === assignmentStudentId;
                        });
                        
                        return (
                          <tr key={assignment.id || assignment._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 text-sm">
                                {assignment.studentName || student?.fullName || 'Unknown'}
                              </div>
                              {student?.program && (
                                <div className="text-xs text-gray-500 mt-1">{student.program}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600">
                                {assignment.homework?.enabled ? 'Homework' : 'Assignment'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                assignment.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {assignment.status || 'active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  const studentId = normalizeId(assignment.studentId || (assignment as any)._id?.studentId);
                                  handleStudentClick(studentId);
                                }}
                                className="text-primary hover:text-primary/80 text-sm font-medium"
                              >
                                View Student
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : viewMode === 'students' ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {currentTeacher ? 'My Students' : 'All Students'}
                </h2>
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">{filteredStudents.length}</span> of <span className="font-medium">{assignedStudents.length}</span> students
                  {(searchQuery || selectedProgram !== 'all' || filterStatus !== 'all') && (
                    <span className="text-gray-500 ml-1">(filtered)</span>
                  )}
                </p>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 px-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="mt-4 text-gray-600">No students found</p>
                {(searchQuery || selectedProgram !== 'all' || filterStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedProgram('all');
                      setFilterStatus('all');
                    }}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Clear filters to see all students
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredStudents.map(student => {
                  // Use studentRecordId (Student document _id) which matches assignment.studentId
                  // Fallback to student.id if studentRecordId doesn't exist
                  try {
                    const studentIdToUse = (student as any).studentRecordId || student.id || (student as any)._id;
                    const normalizedStudentId = normalizeId(studentIdToUse);
                    
                    // Defensive check for getStudentAssignments
                    let studentAssignments: any[] = [];
                    if (getStudentAssignments && typeof getStudentAssignments === 'function') {
                      try {
                        studentAssignments = getStudentAssignments(normalizedStudentId) || [];
                      } catch (err) {
                        console.warn('⚠️ Error getting student assignments:', err);
                        studentAssignments = [];
                      }
                    }
                    
                    const activeAssignments = Array.isArray(studentAssignments) 
                      ? studentAssignments.filter(a => a && a.status === 'active').length 
                      : 0;
                    const completedAssignments = Array.isArray(studentAssignments)
                      ? studentAssignments.filter((a: any) => 
                          a && (a.status === 'completed' || a.status === 'archived' ||
                          (a.homework?.submission?.submitted && a.homework?.submission?.status === 'graded'))
                        ).length
                      : 0;
                    const initials = student?.fullName ? getInitials(student.fullName) : '??';
                    const ticketStatus = getStudentTicketStatus(student.id || '');
                  
                    return (
                      <div
                        key={student.id || (student as any)._id || Math.random()}
                        className="px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Compact Avatar */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {student.avatar ? (
                              <img
                                src={student.avatar}
                                alt={student.fullName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          
                          {/* Compact Student Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate text-sm">{student.fullName}</p>
                              {/* Progress Indicators */}
                              {ticketStatus.inProgress && (
                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex-shrink-0">
                                  In Progress
                                </span>
                              )}
                              {ticketStatus.needsHomework && (
                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium flex-shrink-0">
                                  Needs Homework
                                </span>
                              )}
                              {ticketStatus.done && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex-shrink-0">
                                  Done
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                              {student.program && (
                                <span className="px-1.5 py-0.5 bg-gray-100 rounded">{student.program}</span>
                              )}
                              {activeAssignments > 0 && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {activeAssignments} active
                                </span>
                              )}
                              {completedAssignments > 0 && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                  {completedAssignments} done
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Compact Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!isAfterSchoolSelected && (
                            <button
                              onClick={() => handleCreateTicket(student.id)}
                              className="px-2 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                            >
                              Ticket
                            </button>
                          )}
                          {!isAfterSchoolSelected && (
                            <button
                              onClick={() => handleCreateAssignment(student.id)}
                              className="px-2 py-1 text-xs font-medium bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                            >
                              Assignment
                            </button>
                          )}
                          <button
                            onClick={() => handleStudentClick(student.id)}
                            className="px-2 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  } catch (err) {
                    console.error('❌ Error rendering student:', err, student);
                    return (
                      <div key={student.id || Math.random()} className="px-3 py-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-700">Error displaying student: {student.fullName || 'Unknown'}</p>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                ✅ Completed Assignments & Homework
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {completedAssignmentsList.length} completed assignment{completedAssignmentsList.length !== 1 ? 's' : ''}
              </p>
            </div>

            {completedAssignmentsList.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-gray-600">No completed assignments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Completed</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {completedAssignmentsList.map((assignment: any) => {
                      const isCompleted = assignment.status === 'completed';
                      const isArchived = assignment.status === 'archived';
                      const isGraded = assignment.homework?.submission?.status === 'graded';
                      const hasFeedback = !!assignment.homework?.submission?.feedback;
                      const completedDate = assignment.completedAt || 
                                           assignment.homework?.submission?.gradedAt || 
                                           assignment.updatedAt || 
                                           assignment.createdAt;
                      const grade = assignment.homework?.submission?.grade;
                      const student = allStudents.find((s: any) => s.id === assignment.studentId);
                      
                      return (
                        <tr key={assignment.id || assignment._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-sm">
                              {assignment.studentName || student?.fullName || 'Unknown'}
                            </div>
                            {student?.program && (
                              <div className="text-xs text-gray-500 mt-1">{student.program}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">
                              {assignment.homework?.enabled ? 'Homework' : 'Assignment'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isArchived ? (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-300">
                                Archived
                              </span>
                            ) : isCompleted ? (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-300">
                                Completed
                              </span>
                            ) : isGraded ? (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                                Graded
                              </span>
                            ) : hasFeedback ? (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                                Reviewed
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {completedDate ? new Date(completedDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            {grade !== null && grade !== undefined ? (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
                                {grade}/100
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStudent(assignment.studentId);
                                  handleStudentClick(assignment.studentId);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                View
                              </button>
                              {assignment.status === 'active' && (
                                <button
                                  onClick={() => handleAssignHomework(assignment.id || assignment._id, assignment.studentId)}
                                  className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-colors"
                                >
                                  Assign Homework
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      {/* Modals */}
      {/* After School Student View */}
      {selectedStudent && !showAssignmentForm && isAfterSchoolSelected && (
        <AfterSchoolStudentView
          studentId={selectedStudent}
          onClose={handleCloseModal}
        />
      )}

      {/* Regular Student Assignment History (for non-After School) */}
      {selectedStudent && !showAssignmentForm && !isAfterSchoolSelected && (
        <StudentAssignmentHistory
          studentId={selectedStudent}
          onClose={handleCloseModal}
          onEditAssignment={handleEditAssignment}
          onCreateAssignment={() => {
            setShowAssignmentForm(true);
            setEditingAssignment(null);
          }}
          onAssignHomework={handleAssignHomework}
        />
      )}

      {showTicketForm && selectedStudent && (
        <TicketCreationForm
          studentId={selectedStudent}
          onClose={() => {
            setShowTicketForm(false);
          }}
          onSuccess={handleTicketSuccess}
        />
      )}

      {/* Admin Sabq Review */}
      {sabqReviewTicket && (
        <AdminSabqReview
          ticket={sabqReviewTicket}
          onClose={() => {
            setSabqReviewTicket(null);
          }}
          onSubmit={async (ticketId, data) => {
            // Fail fast - validate inputs
            if (!ticketId || typeof ticketId !== 'string') {
              const errorMsg = 'Invalid ticket ID. Cannot submit Sabq.';
              setOperationError(errorMsg);
              alert(errorMsg);
              return;
            }

            if (!data || typeof data !== 'object') {
              const errorMsg = 'Invalid data. Cannot submit Sabq.';
              setOperationError(errorMsg);
              alert(errorMsg);
              return;
            }

            setIsLoading(true);
            setOperationError(null);

            try {
              const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
              if (!API_BASE) {
                throw new Error('API base URL is not configured. Please check your environment variables.');
              }

              const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
              if (!token) {
                throw new Error('Authentication token not found. Please log in again.');
              }

              // Validate ticket ID format
              const normalizedTicketId = normalizeId(ticketId);
              if (!normalizedTicketId) {
                throw new Error('Invalid ticket ID format. Please refresh and try again.');
              }

              // Submit with timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

              let response: Response;
              try {
                response = await fetch(`${API_BASE}/tickets/${normalizedTicketId}/submit-sabq`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(data),
                  signal: controller.signal
                });
              } catch (fetchErr: any) {
                clearTimeout(timeoutId);
                if (fetchErr.name === 'AbortError') {
                  throw new Error('Request timed out. Please check your connection and try again.');
                }
                throw new Error(`Network error: ${fetchErr.message || 'Failed to connect to server'}`);
              } finally {
                clearTimeout(timeoutId);
              }
              
              if (!response.ok) {
                let errorMessage = 'Failed to submit Sabq';
                try {
                  const errorData = await response.json();
                  errorMessage = errorData.error || errorMessage;
                } catch {
                  errorMessage = `Server returned ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
              }
              
              const result = await response.json();
              if (!result) {
                throw new Error('Invalid response from server.');
              }

              alert('Sabq submitted successfully and assignment updated!');
              
              // Refresh data
              if (refreshDataLight && typeof refreshDataLight === 'function') {
                try {
                  await refreshDataLight();
                } catch (refreshErr) {
                  console.error('❌ Error refreshing data after Sabq submit:', refreshErr);
                  setOperationError('Sabq submitted successfully, but failed to refresh data. Please refresh the page.');
                }
              }
              
              setSabqReviewTicket(null);
              setOperationError(null);
            } catch (error: any) {
              console.error('❌ Error submitting Sabq:', error);
              const errorMessage = error.message || 'Failed to submit Sabq. Please try again.';
              setOperationError(errorMessage);
              alert('Failed to submit Sabq: ' + errorMessage);
              throw error;
            } finally {
              setIsLoading(false);
            }
          }}
        />
      )}

      {showAssignmentForm && (
        <EnhancedAssignmentForm
          studentId={selectedStudent || ''}
          assignmentId={editingAssignment}
          prefillTicket={prefillTicket}
          onClose={() => {
            setShowAssignmentForm(false);
            setEditingAssignment(null);
            setPrefillTicket(null);
            if (!selectedStudent) {
              setSelectedStudent(null);
            }
          }}
          onSave={async () => {
            try {
              // Close form first for better UX
              setShowAssignmentForm(false);
              setEditingAssignment(null);
              setPrefillTicket(null);
              setOperationError(null);
              
              // ✅ FIX: Don't refresh immediately after creating assignment
              // addAssignment() already updates the state immediately via setAssignments()
              // Refreshing here would overwrite the newly added assignment if backend hasn't committed yet
              // Instead, refresh in the background after a delay to ensure consistency
              setTimeout(async () => {
                try {
                  if (refreshDataLight && typeof refreshDataLight === 'function') {
                    await refreshDataLight();
                  } else if (refreshData && typeof refreshData === 'function') {
                    await refreshData();
                  } else {
                    console.warn('⚠️ No refresh function available');
                  }
                } catch (refreshErr) {
                  console.error('❌ Error refreshing data after assignment save:', refreshErr);
                  setOperationError('Assignment saved successfully, but failed to refresh data. Please refresh the page.');
                }
              }, 1000); // Wait 1 second for backend to commit, then refresh in background
            } catch (err) {
              console.error('❌ Error in assignment save handler:', err);
              setOperationError('Failed to process assignment save. Please refresh the page.');
            }
          }}
        />
      )}

      {showHomeworkForm && selectedStudent && homeworkAssignmentId && (
        <HomeworkAssignmentForm
          studentId={selectedStudent}
          assignmentId={homeworkAssignmentId}
          onSave={handleSaveHomework}
          onClose={handleCloseHomeworkForm}
        />
      )}
            </>
          )}
        </div>
      </AppLayout>
    </div>
  );
};

export default AssignmentManagement;
