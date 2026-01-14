import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackendData } from '../contexts/BackendDataContext';
import { Student, Teacher } from '../types';
import Card from './Card';

interface TeacherStudentAssignmentManagerProps {
  onClose?: () => void;
}

const TeacherStudentAssignmentManager: React.FC<TeacherStudentAssignmentManagerProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { teachers, students, updateStudent, refreshData, refreshStudentsAndTeachers, getStudentsByTeacher } = useBackendData();
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'by-teacher' | 'by-student'>('by-teacher');
  const [justSaved, setJustSaved] = useState(false); // Track if we just saved to prevent auto-reset
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null); // For shift-click range selection

  // Get assigned students for selected teacher
  // Filter to show only students actually assigned to this teacher
  const assignedStudents = useMemo(() => {
    if (!selectedTeacher) return [];
    
    // CRITICAL: Use Teacher Document ID, not User ID
    let teacherDocId: string;
    
    if ((selectedTeacher as any).teacherDocumentId) {
      teacherDocId = (selectedTeacher as any).teacherDocumentId.toString();
    } else if ((selectedTeacher as any)._id && (selectedTeacher as any)._id.toString() !== selectedTeacher.id?.toString()) {
      teacherDocId = (selectedTeacher as any)._id.toString();
    } else {
      teacherDocId = selectedTeacher.id;
    }
    
    // Filter students to only show those assigned to this teacher
    return students.filter(student => {
      const assignedTeacherIds = (student as any).assignedTeacherIds || [];
      const assignedTeachers = (student as any).assignedTeachers || [];
      const studentRecordId = (student as any).studentRecordId || student.id || (student as any)._id;
      
      // Check if this student is assigned to the selected teacher
      return assignedTeacherIds.includes(teacherDocId) || 
             assignedTeachers.includes(teacherDocId) ||
             assignedTeacherIds.includes(selectedTeacher.id) ||
             assignedTeachers.includes(selectedTeacher.id);
    });
  }, [selectedTeacher, students]);

  // Initialize selected student IDs when teacher is selected
  // BUT: Don't auto-reset if we just saved (to prevent reverting user's deselections)
  useEffect(() => {
    // Skip auto-reset if we just saved - we'll update manually after refresh
    if (justSaved) {
      return;
    }
    
    if (selectedTeacher && assignedStudents.length > 0) {
      const assignedIds = new Set(
        assignedStudents.map(s => (s as any).studentRecordId || s.id || (s as any)._id || '').filter(Boolean)
      );
      setSelectedStudentIds(assignedIds);
    } else if (!selectedTeacher) {
      setSelectedStudentIds(new Set());
    }
  }, [selectedTeacher, assignedStudents, justSaved]);

  // Filter teachers by search term
  const filteredTeachers = useMemo(() => {
    if (!teacherSearchTerm.trim()) return teachers;
    const term = teacherSearchTerm.toLowerCase();
    return teachers.filter(teacher => 
      teacher.fullName?.toLowerCase().includes(term) ||
      teacher.email?.toLowerCase().includes(term)
    );
  }, [teachers, teacherSearchTerm]);

  // Normalize program names to canonical values
  const normalizeProgramName = (program: string | undefined): string | null => {
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
      return program;
    }
    
    // If no match, return null (invalid program)
    return null;
  };

  // Get unique programs for filter dropdown (normalized)
  const availablePrograms = useMemo(() => {
    const programs = new Set<string>();
    students.forEach(student => {
      if (student.program) {
        const normalized = normalizeProgramName(student.program);
        if (normalized) {
          programs.add(normalized);
        }
      }
    });
    // Sort in a specific order: Full-Time HQ, Part-Time HQ, After School
    const sortedPrograms = Array.from(programs);
    const order = ['Full-Time HQ', 'Part-Time HQ', 'After School'];
    return sortedPrograms.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [students]);

  // Filter students by search term, status, and program
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.fullName?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.parentName?.toLowerCase().includes(term) ||
        student.program?.toLowerCase().includes(term)
      );
    }

    // Filter by assignment status
    if (filterStatus !== 'all' && selectedTeacher) {
      const teacherDocId = (selectedTeacher as any)._id || (selectedTeacher as any).teacherDocumentId || selectedTeacher.id;
      filtered = filtered.filter(student => {
        const currentAssignedTeacherIds = (student as any).assignedTeacherIds || [];
        const currentAssignedTeachers = (student as any).assignedTeachers || [];
        const isAssigned = currentAssignedTeacherIds.includes(teacherDocId) || 
                          currentAssignedTeachers.includes(teacherDocId);
        
        if (filterStatus === 'assigned') return isAssigned;
        if (filterStatus === 'unassigned') return !isAssigned;
        return true;
      });
    }

    // Filter by program (using normalized program names)
    if (filterProgram !== 'all') {
      filtered = filtered.filter(student => {
        const normalizedStudentProgram = normalizeProgramName(student.program);
        return normalizedStudentProgram === filterProgram;
      });
    }

    return filtered;
  }, [students, searchTerm, filterStatus, filterProgram, selectedTeacher]);

  // Get teachers assigned to a student
  const getStudentTeachers = (student: Student) => {
    const assignedTeacherIds = (student as any).assignedTeacherIds || [];
    const assignedTeachers = (student as any).assignedTeachers || [];
    const allIds = [...new Set([...assignedTeacherIds, ...assignedTeachers])];
    
    return teachers.filter(teacher => {
      const teacherDocId = (teacher as any)._id || (teacher as any).teacherDocumentId || teacher.id;
      return allIds.includes(teacherDocId) || allIds.includes(teacher.id);
    });
  };

  const handleTeacherSelect = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setSearchTerm('');
    setFilterStatus('all');
    setFilterProgram('all');
    setLastSelectedIndex(null); // Reset range selection
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredStudents.map(s => (s as any).studentRecordId || s.id || (s as any)._id || '').filter(Boolean));
    setSelectedStudentIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
    setLastSelectedIndex(null);
  };

  // Bulk unselect all currently selected students
  const handleBulkUnselect = () => {
    if (selectedStudentIds.size === 0) {
      alert('No students selected to unselect');
      return;
    }
    setSelectedStudentIds(new Set());
    setLastSelectedIndex(null);
  };

  // Handle shift-click range selection
  const handleStudentToggle = (studentId: string, index: number, event?: React.MouseEvent) => {
    const isShiftClick = event?.shiftKey;
    const isCtrlClick = event?.ctrlKey || event?.metaKey;
    
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      
      if (isShiftClick && lastSelectedIndex !== null) {
        // Range selection: select all students between lastSelectedIndex and current index
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const rangeStudents = filteredStudents.slice(start, end + 1);
        
        rangeStudents.forEach(student => {
          const sId = (student as any).studentRecordId || student.id || (student as any)._id || '';
          if (!sId) return;
          
          // Check if student already has 9 teachers (only when adding)
          if (!newSet.has(sId)) {
            const currentTeachers = getStudentTeachers(student);
            if (currentTeachers.length >= 9) {
              console.warn(`⚠️ Skipping ${student.fullName} - already has 9 teachers`);
              return;
            }
          }
          
          newSet.add(sId);
        });
      } else if (isCtrlClick || isShiftClick) {
        // Multi-select: toggle this student without clearing others
        if (newSet.has(studentId)) {
          newSet.delete(studentId);
        } else {
          const student = filteredStudents[index];
          const currentTeachers = getStudentTeachers(student);
          if (currentTeachers.length >= 9) {
            alert(`⚠️ This student already has ${currentTeachers.length} teachers assigned. Maximum is 9 teachers per student.`);
            return prev;
          }
          newSet.add(studentId);
        }
      } else {
        // Normal single click: toggle this student
        if (newSet.has(studentId)) {
          newSet.delete(studentId);
        } else {
          const student = filteredStudents[index];
          const currentTeachers = getStudentTeachers(student);
          if (currentTeachers.length >= 9) {
            alert(`⚠️ This student already has ${currentTeachers.length} teachers assigned. Maximum is 9 teachers per student.`);
            return prev;
          }
          newSet.add(studentId);
        }
      }
      
      return newSet;
    });
    
    // Update last selected index for range selection
    setLastSelectedIndex(index);
  };

  // Get students in a specific program (from filtered students, respecting current filters)
  // Uses normalized program name matching
  const getStudentsByProgram = (program: string) => {
    return filteredStudents.filter(student => {
      const normalizedStudentProgram = normalizeProgramName(student.program);
      return normalizedStudentProgram === program;
    });
  };

  // Get all students in a program (regardless of filters) - for accurate counts
  const getAllStudentsByProgram = (program: string) => {
    return students.filter(student => student.program === program);
  };

  // Get program selection state: 'all' | 'some' | 'none'
  const getProgramSelectionState = (program: string): 'all' | 'some' | 'none' => {
    const programStudents = getStudentsByProgram(program);
    if (programStudents.length === 0) return 'none';
    
    const selectedCount = programStudents.filter(student => {
      const studentId = (student as any).studentRecordId || student.id || (student as any)._id || '';
      return selectedStudentIds.has(studentId);
    }).length;
    
    if (selectedCount === 0) return 'none';
    if (selectedCount === programStudents.length) return 'all';
    return 'some';
  };

  // Toggle all students in a program
  const handleProgramToggle = (program: string) => {
    const programStudents = getStudentsByProgram(program);
    const currentState = getProgramSelectionState(program);
    
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      
      if (currentState === 'all') {
        // Deselect all students in this program
        programStudents.forEach(student => {
          const studentId = (student as any).studentRecordId || student.id || (student as any)._id || '';
          if (studentId) newSet.delete(studentId);
        });
      } else {
        // Select all students in this program (check for 9-teacher limit first)
        const studentsToAdd: string[] = [];
        const studentsToSkip: string[] = [];
        
        programStudents.forEach(student => {
          const studentId = (student as any).studentRecordId || student.id || (student as any)._id || '';
          if (!studentId) return;
          
          if (newSet.has(studentId)) {
            // Already selected, skip
            return;
          }
          
          // Check if student already has 9 teachers
          const currentTeachers = getStudentTeachers(student);
          if (currentTeachers.length >= 9) {
            studentsToSkip.push(student.fullName);
            return;
          }
          
          studentsToAdd.push(studentId);
        });
        
        if (studentsToSkip.length > 0) {
          alert(`⚠️ ${studentsToSkip.length} student(s) already have 9 teachers assigned and cannot be added:\n${studentsToSkip.slice(0, 5).join(', ')}${studentsToSkip.length > 5 ? '...' : ''}`);
        }
        
        studentsToAdd.forEach(studentId => newSet.add(studentId));
      }
      
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!selectedTeacher) return;

    setIsSaving(true);
    try {
      // CRITICAL: Use Teacher Document ID, not User ID
      // Try multiple strategies to find Teacher document ID
      // The backend can handle both Teacher._id and User._id, so we'll try to find the best one
      let teacherDocId: string | null = null;
      
      // Strategy 1: Check teacherDocumentId field (explicit Teacher document ID)
      if ((selectedTeacher as any).teacherDocumentId) {
        teacherDocId = (selectedTeacher as any).teacherDocumentId.toString();
      } 
      // Strategy 2: Check _id field (Teacher document _id) - use it if it exists
      else if ((selectedTeacher as any)._id) {
        teacherDocId = (selectedTeacher as any)._id.toString();
      }
      // Strategy 3: Use id as fallback (backend can handle User ID lookup)
      else if (selectedTeacher.id) {
        teacherDocId = selectedTeacher.id.toString();
        console.warn('⚠️ Using id as Teacher document ID (backend will handle User ID lookup):', {
          teacherName: selectedTeacher.fullName,
          teacherId: selectedTeacher.id,
        });
      }
      
      // Final fallback: If still no ID, this shouldn't happen but handle gracefully
      if (!teacherDocId) {
        console.error('❌ Cannot find any ID for teacher!', {
          teacherName: selectedTeacher.fullName,
          teacherId: selectedTeacher.id,
          _id: (selectedTeacher as any)._id,
          teacherDocumentId: (selectedTeacher as any).teacherDocumentId,
          allKeys: Object.keys(selectedTeacher),
        });
        alert(`❌ Error: Cannot find Teacher document ID for ${selectedTeacher.fullName}. Please refresh the page and try again.`);
        setIsSaving(false);
        return;
      }

      const selectedIdsArray = Array.from(selectedStudentIds);

      console.log('💾 Saving teacher-student assignments:', {
        teacherDocId: teacherDocId,
        teacherName: selectedTeacher.fullName,
        selectedStudentIds: selectedIdsArray.length,
        totalStudents: students.length,
      });

      // Filter: Only students that need updates
      const studentsToUpdate = students.filter((student) => {
        const studentId = (student as any).studentRecordId;
        if (!studentId) {
          console.warn(`⚠️ Student "${student.fullName}" missing studentRecordId - skipping`);
          return false;
        }

        const currentAssignedTeacherIds = (student as any).assignedTeacherIds || [];
        const currentAssignedTeachers = (student as any).assignedTeachers || [];
        const isCurrentlyAssigned = currentAssignedTeacherIds.includes(teacherDocId) || 
                                     currentAssignedTeachers.includes(teacherDocId);
        const shouldBeAssigned = selectedStudentIds.has(studentId);
        
        return isCurrentlyAssigned !== shouldBeAssigned;
      });

      console.log(`📊 Updating ${studentsToUpdate.length} of ${students.length} students`);

      if (studentsToUpdate.length === 0) {
        console.log('✅ No changes to save');
        setIsSaving(false);
        return;
      }

      // Validate: Check if any student would exceed 9 teachers
      for (const student of studentsToUpdate) {
        const studentId = (student as any).studentRecordId;
        const shouldBeAssigned = selectedStudentIds.has(studentId);
        
        if (shouldBeAssigned) {
          const currentTeachers = getStudentTeachers(student);
          if (currentTeachers.length >= 9) {
            alert(`⚠️ Cannot assign ${student.fullName} to ${selectedTeacher.fullName}. Student already has ${currentTeachers.length} teachers (maximum is 9).`);
            setIsSaving(false);
            return;
          }
        }
      }

      type UpdateResult = {
        success: boolean;
        studentId: string;
        studentName: string;
        error?: string;
      };

      const updatePromises = studentsToUpdate.map(async (student): Promise<UpdateResult> => {
        const studentId = (student as any).studentRecordId;
        const currentAssignedTeacherIds = (student as any).assignedTeacherIds || [];
        const currentAssignedTeachers = (student as any).assignedTeachers || [];
        
        const shouldBeAssigned = selectedStudentIds.has(studentId);
        
        let updatedTeachers: string[];
        let updatedTeacherIds: string[];

        if (shouldBeAssigned) {
          updatedTeachers = [...new Set([...currentAssignedTeachers, teacherDocId])];
          updatedTeacherIds = [...new Set([...currentAssignedTeacherIds, teacherDocId])];
          
          // Enforce 9 teacher limit
          if (updatedTeachers.length > 9) {
            updatedTeachers = updatedTeachers.slice(0, 9);
            updatedTeacherIds = updatedTeacherIds.slice(0, 9);
          }
        } else {
          updatedTeachers = currentAssignedTeachers.filter((id: string) => id !== teacherDocId);
          updatedTeacherIds = currentAssignedTeacherIds.filter((id: string) => id !== teacherDocId);
        }

        try {
          await updateStudent(studentId, {
            assignedTeachers: updatedTeachers,
            assignedTeacherIds: updatedTeacherIds,
            assignedTeacher: updatedTeachers.length > 0 ? updatedTeachers[0] : '',
            assignedTeacherId: updatedTeacherIds.length > 0 ? updatedTeacherIds[0] : '',
          });
          
          return { success: true, studentId, studentName: student.fullName };
        } catch (error) {
          console.error(`❌ Failed to update student ${student.fullName} (${studentId}):`, error);
          return { 
            success: false, 
            studentId, 
            studentName: student.fullName, 
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const BATCH_SIZE = 10;
      const results: UpdateResult[] = [];
      
      for (let i = 0; i < updatePromises.length; i += BATCH_SIZE) {
        const batch = updatePromises.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(batch);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            const student = studentsToUpdate[i + index];
            results.push({
              success: false,
              studentId: (student as any).studentRecordId,
              studentName: student.fullName,
              error: result.reason?.message || 'Unknown error'
            });
          }
        });
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`✅ ${successful.length} students updated successfully`);
      if (failed.length > 0) {
        console.error(`❌ ${failed.length} students failed to update:`, failed);
      }

      if (successful.length > 0) {
        // Mark that we just saved to prevent auto-reset
        setJustSaved(true);
        
        // Trigger backend sync FIRST, before refreshing
        try {
          const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
          const token = localStorage.getItem('umar_academy_token');
          const syncResponse = await fetch(`${API_BASE}/teachers/sync-assigned-students`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (syncResponse.ok) {
            console.log('✅ Teacher assignedStudents arrays synced successfully');
            // Wait a bit for the sync to fully complete
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            console.warn('⚠️ Sync request returned non-OK status:', syncResponse.status);
          }
        } catch (syncError) {
          console.warn('⚠️ Could not trigger sync (non-critical):', syncError);
        }
        
        // Now refresh the data
        try {
          // Clear cache first
          try {
            const { dataCache } = await import('../utils/dataCache');
            dataCache.clear();
            console.log('🗑️ Cache cleared');
          } catch (cacheError) {
            console.warn('⚠️ Could not clear cache:', cacheError);
          }
          
          // Refresh data
          if (refreshStudentsAndTeachers) {
            console.log('🔄 Refreshing students and teachers (background)...');
            await refreshStudentsAndTeachers();
            console.log('✅ Students and teachers refreshed');
          } else if (refreshData) {
            console.log('🔄 Refreshing data (background)...');
            await refreshData();
            console.log('✅ Data refreshed');
          }
          
          // After refresh, update selectedStudentIds to match the actual saved state
          // Wait a bit to ensure data is updated and re-rendered
          await new Promise(resolve => setTimeout(resolve, 300));
          
          if (selectedTeacher) {
            // Get the teacher document ID (same logic as in assignedStudents useMemo)
            let teacherDocId: string;
            if ((selectedTeacher as any).teacherDocumentId) {
              teacherDocId = (selectedTeacher as any).teacherDocumentId.toString();
            } else if ((selectedTeacher as any)._id && (selectedTeacher as any)._id.toString() !== selectedTeacher.id?.toString()) {
              teacherDocId = (selectedTeacher as any)._id.toString();
            } else {
              teacherDocId = selectedTeacher.id;
            }
            
            // Get the updated assigned students from the refreshed data
            const updatedAssignedStudents = getStudentsByTeacher(teacherDocId);
            const updatedAssignedIds = new Set(
              updatedAssignedStudents.map(s => (s as any).studentRecordId || s.id || (s as any)._id || '').filter(Boolean)
            );
            
            // Update selectedStudentIds to match what was actually saved
            setSelectedStudentIds(updatedAssignedIds);
            console.log('✅ Updated selectedStudentIds to match saved state:', {
              count: updatedAssignedIds.size,
              ids: Array.from(updatedAssignedIds).slice(0, 5),
              expectedCount: selectedStudentIds.size
            });
          }
          
          // Clear the justSaved flag after update completes
          setTimeout(() => {
            setJustSaved(false);
            console.log('🔄 Cleared justSaved flag, auto-reset now enabled');
          }, 500);
        } catch (err) {
          console.warn('⚠️ Background refresh error (non-critical):', err);
          setJustSaved(false);
        }
      }

      if (failed.length > 0) {
        const errorMessage = `${failed.length} of ${studentsToUpdate.length} student update(s) failed:\n` +
          failed.map(f => `- ${f.studentName}: ${f.error}`).join('\n');
        alert(`⚠️ Some updates failed:\n\n${errorMessage}\n\n${successful.length} students updated successfully.`);
        throw new Error(errorMessage);
      }

      // Note: Backend sync is now handled before refresh (above)

      alert(`✅ Successfully updated ${successful.length} student assignment(s) for ${selectedTeacher.fullName}`);
      
      // Don't update selectedStudentIds here - let the refresh handler do it
      // to ensure it matches the actual database state
    } catch (error) {
      console.error('Error updating student assignments:', error);
      alert('❌ Failed to update student assignments: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-50 overflow-y-auto">
      <div className="min-h-full px-4 py-4">
        {/* Enhanced Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher-Student Assignment</h1>
              <p className="text-sm text-gray-600 mt-1">
                Assign students to teachers (up to 9 teachers per student)
              </p>
            </div>
            <button
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  navigate('/dashboard');
                }
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Close
            </button>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-gray-600">View:</span>
            <button
              onClick={() => setViewMode('by-teacher')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'by-teacher'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              By Teacher
            </button>
            <button
              onClick={() => setViewMode('by-student')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'by-student'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              By Student
            </button>
          </div>
        </div>

        {viewMode === 'by-teacher' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Teachers List */}
            <div className="lg:col-span-1">
              <Card title="Select Teacher" className="h-full">
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search teachers..."
                    value={teacherSearchTerm}
                    onChange={(e) => setTeacherSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredTeachers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 text-sm">No teachers found</p>
                  ) : (
                    filteredTeachers.map((teacher) => {
                      // Calculate actual assigned count for this teacher
                      const teacherDocId = (teacher as any)._id || (teacher as any).teacherDocumentId || teacher.id;
                      const assignedCount = students.filter(student => {
                        const assignedTeacherIds = (student as any).assignedTeacherIds || [];
                        const assignedTeachers = (student as any).assignedTeachers || [];
                        return assignedTeacherIds.includes(teacherDocId) || 
                               assignedTeachers.includes(teacherDocId) ||
                               assignedTeacherIds.includes(teacher.id) ||
                               assignedTeachers.includes(teacher.id);
                      }).length;
                      const isSelected = selectedTeacher?.id === teacher.id || 
                                       (selectedTeacher as any)?._id === (teacher as any)._id;

                      return (
                        <button
                          key={teacher.id || (teacher as any)._id}
                          onClick={() => handleTeacherSelect(teacher)}
                          className={`w-full text-left px-3 py-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">{teacher.fullName}</p>
                              <p className="text-xs text-gray-600 truncate mt-0.5">{teacher.email}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary flex-shrink-0">
                              {assignedCount}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Students List */}
            <div className="lg:col-span-2">
              {selectedTeacher ? (
                <Card title={`Students - ${selectedTeacher.fullName}`} className="h-full">
                  {/* Filters */}
                  <div className="mb-4 space-y-2">
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />

                    <div className="flex gap-2">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'assigned' | 'unassigned')}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                      >
                        <option value="all">All Students</option>
                        <option value="assigned">Assigned</option>
                        <option value="unassigned">Not Assigned</option>
                      </select>

                      {availablePrograms.length > 0 && (
                        <select
                          value={filterProgram}
                          onChange={(e) => setFilterProgram(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                        >
                          <option value="all">All Programs</option>
                          {availablePrograms.map(program => (
                            <option key={program} value={program}>{program}</option>
                          ))}
                        </select>
                      )}

                      {(searchTerm || filterStatus !== 'all' || filterProgram !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                            setFilterProgram('all');
                          }}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Program Selection Checkboxes */}
                  {availablePrograms.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Select by Program</h3>
                        <span className="text-xs text-gray-500">
                          {availablePrograms.length} program{availablePrograms.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availablePrograms.map(program => {
                          const programState = getProgramSelectionState(program);
                          const programStudents = getStudentsByProgram(program);
                          const allProgramStudents = getAllStudentsByProgram(program);
                          const selectedCount = programStudents.filter(student => {
                            const studentId = (student as any).studentRecordId || student.id || (student as any)._id || '';
                            return selectedStudentIds.has(studentId);
                          }).length;
                          
                          return (
                            <label
                              key={program}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                                programState === 'all'
                                  ? 'border-primary bg-primary/10 shadow-sm'
                                  : programState === 'some'
                                  ? 'border-primary/50 bg-primary/5'
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={programState === 'all'}
                                onChange={() => handleProgramToggle(program)}
                                className="w-4 h-4 flex-shrink-0 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{program}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  programState === 'all'
                                    ? 'bg-primary/20 text-primary font-semibold'
                                    : programState === 'some'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {selectedCount}/{programStudents.length}
                                  {programStudents.length !== allProgramStudents.length && (
                                    <span className="ml-1 text-gray-400">(of {allProgramStudents.length} total)</span>
                                  )}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Tip: Check a program to select all students, or uncheck to deselect all students in that program
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mb-4 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleDeselectAll}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Deselect All
                      </button>
                      {selectedStudentIds.size > 0 && (
                        <button
                          onClick={handleBulkUnselect}
                          className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                        >
                          Unselect Selected ({selectedStudentIds.size})
                        </button>
                      )}
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        {isSaving ? 'Saving...' : `Save Changes (${selectedStudentIds.size})`}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-4">
                      <span>💡 Tip: Hold <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Shift</kbd> + Click for range selection</span>
                      <span>Hold <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl/Cmd</kbd> + Click for multi-select</span>
                    </div>
                  </div>

                  {/* Students List */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <div className="text-center py-8 px-2">
                        <p className="text-gray-500 text-sm mb-2">No students found</p>
                        {(searchTerm || filterStatus !== 'all' || filterProgram !== 'all') && (
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setFilterStatus('all');
                              setFilterProgram('all');
                            }}
                            className="text-sm text-primary hover:underline"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredStudents.map((student, index) => {
                        const studentId = (student as any).studentRecordId || student.id || (student as any)._id || '';
                        const isAssigned = selectedStudentIds.has(studentId);
                        const isCurrentlyAssigned = assignedStudents.some(
                          s => {
                            const sId = (s as any).studentRecordId || s.id || (s as any)._id;
                            return sId === studentId;
                          }
                        );
                        const studentTeachers = getStudentTeachers(student);
                        const teacherCount = studentTeachers.length;

                        return (
                          <label
                            key={studentId}
                            className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              isAssigned
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                            }`}
                            onClick={(e) => {
                              // Only handle if clicking on the label itself (not checkbox or button)
                              const target = e.target as HTMLElement;
                              if (target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && !target.closest('button')) {
                                e.preventDefault();
                                handleStudentToggle(studentId, index, e);
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => {
                                e.stopPropagation();
                                // Create a synthetic mouse event from the change event
                                const syntheticEvent = {
                                  ...e.nativeEvent,
                                  shiftKey: (e.nativeEvent as any).shiftKey || false,
                                  ctrlKey: (e.nativeEvent as any).ctrlKey || false,
                                  metaKey: (e.nativeEvent as any).metaKey || false,
                                } as React.MouseEvent;
                                handleStudentToggle(studentId, index, syntheticEvent);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              disabled={!isAssigned && teacherCount >= 9}
                              className="w-5 h-5 flex-shrink-0 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                            />
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-gray-900 truncate">{student.fullName}</p>
                                  <p className="text-xs text-gray-600 truncate mt-0.5">
                                    {student.email} • {student.program}
                                  </p>
                                  {teacherCount > 0 && (
                                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs text-gray-500">Teachers ({teacherCount}/9):</span>
                                      {studentTeachers.slice(0, 3).map(teacher => (
                                        <span key={teacher.id} className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                          {teacher.fullName}
                                        </span>
                                      ))}
                                      {teacherCount > 3 && (
                                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                          +{teacherCount - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                  {!isAssigned && teacherCount >= 9 && (
                                    <span className="text-xs text-red-600 font-medium px-2 py-1 bg-red-50 rounded">
                                      Max (9)
                                    </span>
                                  )}
                                  {isCurrentlyAssigned && !isAssigned && (
                                    <span className="text-xs text-orange-600 font-medium px-2 py-1 bg-orange-50 rounded">
                                      Remove
                                    </span>
                                  )}
                                  {!isCurrentlyAssigned && isAssigned && (
                                    <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded">
                                      Add
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {/* Summary */}
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">
                          {filteredStudents.length}/{students.length} students
                        </span>
                        <span className="text-gray-600 ml-3">
                          Selected: <span className="text-primary font-bold">{selectedStudentIds.size}</span> • 
                          Assigned: <span className="font-bold">{assignedStudents.length}</span>
                        </span>
                      </div>
                      {selectedStudentIds.size !== assignedStudents.length && (
                        <span className="text-xs text-orange-600 font-medium px-2 py-1 bg-orange-50 rounded">
                          Changes pending
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ) : (
                <Card title="Select a Teacher" className="h-full">
                  <div className="text-center py-12 px-4">
                    <p className="text-gray-500">Please select a teacher from the list to manage their student assignments</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : (
          // By Student View
          <Card title="Student-Teacher Assignments">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredStudents.map((student) => {
                const studentTeachers = getStudentTeachers(student);
                const teacherCount = studentTeachers.length;
                
                return (
                  <div
                    key={student.id || (student as any)._id}
                    className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{student.fullName}</h3>
                        <p className="text-sm text-gray-600 mt-1">{student.email} • {student.program}</p>
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-700 mb-2">
                            Assigned Teachers ({teacherCount}/9):
                          </p>
                          {teacherCount > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {studentTeachers.map(teacher => (
                                <span
                                  key={teacher.id}
                                  className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-lg border border-primary/20"
                                >
                                  {teacher.fullName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">No teachers assigned</p>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          teacherCount >= 9 
                            ? 'bg-red-100 text-red-700' 
                            : teacherCount > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {teacherCount}/9
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeacherStudentAssignmentManager;
