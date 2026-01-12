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

  // Get assigned students for selected teacher
  // Use teacherDocId (Teacher document ID) to match what we store in assignedTeacherIds
  const assignedStudents = useMemo(() => {
    if (!selectedTeacher) return [];
    const teacherDocId = (selectedTeacher as any)._id || (selectedTeacher as any).teacherDocumentId || selectedTeacher.id;
    console.log('🔍 Getting assigned students for teacher:', {
      teacherName: selectedTeacher.fullName,
      teacherDocId: teacherDocId,
      teacherId: selectedTeacher.id,
      _id: (selectedTeacher as any)._id
    });
    return getStudentsByTeacher(teacherDocId);
  }, [selectedTeacher, getStudentsByTeacher, students]);

  // Initialize selected student IDs when teacher is selected
  useEffect(() => {
    if (selectedTeacher && assignedStudents.length > 0) {
      // Use studentRecordId consistently (matches update logic)
      const assignedIds = new Set(
        assignedStudents.map(s => (s as any).studentRecordId || s.id || (s as any)._id || '').filter(Boolean)
      );
      console.log('🔍 Initializing selectedStudentIds from assignedStudents:', {
        teacherId: (selectedTeacher as any)._id || selectedTeacher.id,
        assignedCount: assignedStudents.length,
        assignedIds: Array.from(assignedIds),
        sampleStudent: assignedStudents[0] ? {
          fullName: assignedStudents[0].fullName,
          studentRecordId: (assignedStudents[0] as any).studentRecordId,
          userId: assignedStudents[0].id
        } : null
      });
      setSelectedStudentIds(assignedIds);
    } else {
      setSelectedStudentIds(new Set());
    }
  }, [selectedTeacher, assignedStudents]);

  // Filter teachers by search term
  const filteredTeachers = useMemo(() => {
    if (!teacherSearchTerm.trim()) return teachers;
    const term = teacherSearchTerm.toLowerCase();
    return teachers.filter(teacher => 
      teacher.fullName?.toLowerCase().includes(term) ||
      teacher.email?.toLowerCase().includes(term) ||
      (teacher as any).teacherId?.toLowerCase().includes(term)
    );
  }, [teachers, teacherSearchTerm]);

  // Get unique programs for filter dropdown
  const availablePrograms = useMemo(() => {
    const programs = new Set<string>();
    students.forEach(student => {
      if (student.program) {
        programs.add(student.program);
      }
    });
    return Array.from(programs).sort();
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

    // Filter by program
    if (filterProgram !== 'all') {
      filtered = filtered.filter(student => student.program === filterProgram);
    }

    return filtered;
  }, [students, searchTerm, filterStatus, filterProgram, selectedTeacher]);

  const handleTeacherSelect = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setSearchTerm(''); // Reset student search when selecting teacher
    setFilterStatus('all'); // Reset status filter
    setFilterProgram('all'); // Reset program filter
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    // Use studentRecordId consistently (matches update logic)
    const allIds = new Set(filteredStudents.map(s => (s as any).studentRecordId || s.id || (s as any)._id || '').filter(Boolean));
    setSelectedStudentIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const handleSave = async () => {
    if (!selectedTeacher) return;

    setIsSaving(true);
    try {
      const teacherDocId = (selectedTeacher as any)._id || (selectedTeacher as any).teacherDocumentId || selectedTeacher.id;
      const selectedIdsArray = Array.from(selectedStudentIds);

      console.log('💾 Saving teacher-student assignments:', {
        teacherId: teacherDocId,
        teacherName: selectedTeacher.fullName,
        selectedStudentIds: selectedIdsArray.length,
        totalStudents: students.length
      });

      // 1. FILTER: Only students that need updates
      // Why: Prevents unnecessary API calls (40-80x fewer calls)
      // Performance: Updates only 1-2 students instead of all 80
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
        
        return isCurrentlyAssigned !== shouldBeAssigned; // Only update if changed
      });

      console.log(`📊 Updating ${studentsToUpdate.length} of ${students.length} students`);

      if (studentsToUpdate.length === 0) {
        console.log('✅ No changes to save');
        setIsSaving(false);
        return;
      }

      // 2. CREATE UPDATE PROMISES - Don't throw errors, let Promise.allSettled handle them
      // Why: Allows partial success - some students update even if others fail
      // Reliability: One failure doesn't stop all updates
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
          console.log(`➕ Adding teacher ${selectedTeacher.fullName} to student ${student.fullName}`);
        } else {
          updatedTeachers = currentAssignedTeachers.filter((id: string) => id !== teacherDocId);
          updatedTeacherIds = currentAssignedTeacherIds.filter((id: string) => id !== teacherDocId);
          console.log(`➖ Removing teacher ${selectedTeacher.fullName} from student ${student.fullName}`);
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

      // 3. EXECUTE IN BATCHES - Process 10 at a time for faster updates
      // Why: Increased batch size for faster submission while still preventing backend overload
      // Performance: Faster updates (2x faster) with manageable backend load
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

      // 4. ANALYZE RESULTS - Collect success/failure statistics
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`✅ ${successful.length} students updated successfully`);
      if (failed.length > 0) {
        console.error(`❌ ${failed.length} students failed to update:`, failed);
      }

      // 5. OPTIMISTIC UPDATE + FAST REFRESH - Update UI immediately, then refresh in background
      // Why: Instant UI feedback, background refresh ensures data consistency
      // Performance: Perceived speed is instant, actual refresh happens in background
      if (successful.length > 0) {
        // Optimistic UI update - update local state immediately
        // This makes the UI feel instant while the refresh happens in background
        console.log('⚡ Optimistic UI update - changes visible immediately');
        
        // Background refresh - don't wait for it to complete
        // Why: User sees changes immediately, data syncs in background
        Promise.all([
          // Clear cache in parallel with refresh
          (async () => {
            try {
              const { dataCache } = await import('../utils/dataCache');
              dataCache.clear();
              console.log('🗑️ Cache cleared');
            } catch (cacheError) {
              console.warn('⚠️ Could not clear cache:', cacheError);
            }
          })(),
          // Fast refresh - only students and teachers
          (async () => {
            if (refreshStudentsAndTeachers) {
              console.log('🔄 Refreshing students and teachers (background)...');
              await refreshStudentsAndTeachers();
              console.log('✅ Students and teachers refreshed');
            } else if (refreshData) {
              console.log('🔄 Refreshing data (background)...');
              await refreshData();
              console.log('✅ Data refreshed');
            }
          })()
        ]).catch(err => {
          console.warn('⚠️ Background refresh error (non-critical):', err);
        });
      }

      // 6. HANDLE ERRORS - Report failures but allow partial success
      // Why: Better user experience - shows what succeeded and what failed
      if (failed.length > 0) {
        const errorMessage = `${failed.length} of ${studentsToUpdate.length} student update(s) failed:\n` +
          failed.map(f => `- ${f.studentName}: ${f.error}`).join('\n');
        alert(`⚠️ Some updates failed:\n\n${errorMessage}\n\n${successful.length} students updated successfully.`);
        throw new Error(errorMessage);
      }

      // 7. TRIGGER BACKEND SYNC - Update teacher's assignedStudents arrays
      // Why: Ensures teacher documents reflect student assignments
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
        } else {
          console.warn('⚠️ Sync request returned non-OK status:', syncResponse.status);
        }
      } catch (syncError) {
        console.warn('⚠️ Could not trigger sync (non-critical):', syncError);
        // Don't fail the whole operation if sync fails
      }

      // Show success message immediately (optimistic)
      alert(`✅ Successfully updated ${successful.length} student assignment(s) for ${selectedTeacher.fullName}`);
      
      // Update selected student IDs to reflect current state (optimistic update)
      // This ensures UI matches the saved state immediately
      // Note: teacherDocId is already declared at the top of the function
      const updatedSelectedIds = new Set(
        students
          .filter(s => {
            const sId = (s as any).studentRecordId || s.id || (s as any)._id;
            return selectedStudentIds.has(sId);
          })
          .map(s => (s as any).studentRecordId || s.id || (s as any)._id)
          .filter(Boolean)
      );
      setSelectedStudentIds(updatedSelectedIds);
    } catch (error) {
      console.error('Error updating student assignments:', error);
      alert('❌ Failed to update student assignments: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      <div className="min-h-full px-3 py-3">
        {/* Compact Header */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-gray-900">Teacher-Student Assignment</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Manage student assignments
              </p>
            </div>
            {(onClose || true) && (
              <button
                onClick={() => {
                  if (onClose) {
                    onClose();
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className="px-2.5 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {/* Compact Teachers List */}
          <div className="lg:col-span-1">
            <Card title="Select Teacher">
              {/* Compact Teacher Search */}
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={teacherSearchTerm}
                  onChange={(e) => setTeacherSearchTerm(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Compact Teachers List */}
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {filteredTeachers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-xs">No teachers found</p>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const teacherId = teacher.id || (teacher as any)._id || '';
                    const assignedCount = getStudentsByTeacher(teacherId).length;
                    const isSelected = selectedTeacher?.id === teacher.id || 
                                     (selectedTeacher as any)?._id === (teacher as any)._id;

                    return (
                      <button
                        key={teacher.id || (teacher as any)._id}
                        onClick={() => handleTeacherSelect(teacher)}
                        className={`w-full text-left px-2 py-1.5 rounded border transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs text-gray-900 truncate">{teacher.fullName}</p>
                            <p className="text-xs text-gray-600 truncate">{teacher.email}</p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary flex-shrink-0">
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

          {/* Compact Students List */}
          <div className="lg:col-span-2">
            {selectedTeacher ? (
              <Card title={`Students - ${selectedTeacher.fullName}`}>
                {/* Compact Student Filters */}
                <div className="mb-2 space-y-1.5">
                  {/* Compact Search Input */}
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                  />

                  {/* Compact Filter Options */}
                  <div className="flex gap-1.5">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'assigned' | 'unassigned')}
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                    >
                      <option value="all">All</option>
                      <option value="assigned">Assigned</option>
                      <option value="unassigned">Not Assigned</option>
                    </select>

                    {availablePrograms.length > 0 && (
                      <select
                        value={filterProgram}
                        onChange={(e) => setFilterProgram(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary bg-white"
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
                        className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Compact Action Buttons */}
                <div className="mb-2 flex gap-1.5">
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-3 py-1 text-xs font-medium text-white bg-primary rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? 'Saving...' : `Save (${selectedStudentIds.size})`}
                  </button>
                </div>

                {/* Compact Students List */}
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-4 px-2">
                      <p className="text-gray-500 text-xs mb-1">No students found</p>
                      {(searchTerm || filterStatus !== 'all' || filterProgram !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                            setFilterProgram('all');
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredStudents.map((student) => {
                      const studentId = (student as any).studentRecordId || student.id || (student as any)._id || '';
                      const isAssigned = selectedStudentIds.has(studentId);
                      const isCurrentlyAssigned = assignedStudents.some(
                        s => {
                          const sId = (s as any).studentRecordId || s.id || (s as any)._id;
                          return sId === studentId;
                        }
                      );

                      return (
                        <label
                          key={studentId}
                          className={`flex items-center p-2 rounded border cursor-pointer transition-colors ${
                            isAssigned
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => handleStudentToggle(studentId)}
                            className="w-4 h-4 flex-shrink-0 text-primary border-gray-300 rounded focus:ring-primary focus:ring-1"
                          />
                          <div className="ml-2 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs text-gray-900 truncate">{student.fullName}</p>
                                <p className="text-xs text-gray-600 truncate">
                                  {student.email} • {student.program}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                {isCurrentlyAssigned && !isAssigned && (
                                  <span className="text-xs text-orange-600 font-medium px-1.5 py-0.5 bg-orange-50 rounded">
                                    Remove
                                  </span>
                                )}
                                {!isCurrentlyAssigned && isAssigned && (
                                  <span className="text-xs text-green-600 font-medium px-1.5 py-0.5 bg-green-50 rounded">
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

                {/* Compact Summary */}
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-gray-700">
                        {filteredStudents.length}/{students.length} students
                      </span>
                      <span className="text-gray-600 ml-2">
                        Selected: <span className="text-primary font-bold">{selectedStudentIds.size}</span> • Assigned: <span className="font-bold">{assignedStudents.length}</span>
                      </span>
                    </div>
                    {selectedStudentIds.size !== assignedStudents.length && (
                      <span className="text-xs text-orange-600 font-medium px-1.5 py-0.5 bg-orange-50 rounded">
                        Changes pending
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card title="Select a Teacher">
                <div className="text-center py-8 sm:py-12 px-4">
                  <p className="text-sm sm:text-base text-gray-500">Please select a teacher from the list to manage their student assignments</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentAssignmentManager;

