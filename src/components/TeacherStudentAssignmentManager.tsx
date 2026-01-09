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
  const { teachers, students, updateStudent, refreshData, getStudentsByTeacher } = useBackendData();
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

      // Update ALL students, not just filtered ones, to ensure we catch all changes
      const updatePromises = students.map(async (student) => {
        // Use studentRecordId (Student document ID) for backend API, fallback to id/_id
        const studentId = (student as any).studentRecordId || student.id || (student as any)._id || '';
        if (!studentId) {
          console.warn('⚠️ Student missing ID:', student);
          return;
        }
        
        console.log(`🔍 Updating student ${student.fullName}:`, {
          studentRecordId: (student as any).studentRecordId,
          userId: student.id,
          _id: (student as any)._id,
          usingId: studentId
        });

        const currentAssignedTeachers = (student as any).assignedTeachers || [];
        const currentAssignedTeacherIds = (student as any).assignedTeacherIds || [];
        
        const isCurrentlyAssigned = currentAssignedTeacherIds.includes(teacherDocId) || 
                                     currentAssignedTeachers.includes(teacherDocId);
        
        // Check if this student should be assigned - use studentRecordId for comparison if available
        const studentIdForComparison = (student as any).studentRecordId || student.id || (student as any)._id || '';
        const shouldBeAssigned = selectedStudentIds.has(studentIdForComparison);

        // Only update if assignment status changed
        if (isCurrentlyAssigned !== shouldBeAssigned) {
          let updatedTeachers: string[];
          let updatedTeacherIds: string[];

          if (shouldBeAssigned) {
            // Add teacher if not already present
            updatedTeachers = [...new Set([...currentAssignedTeachers, teacherDocId])];
            updatedTeacherIds = [...new Set([...currentAssignedTeacherIds, teacherDocId])];
            console.log(`➕ Adding teacher ${selectedTeacher.fullName} to student ${student.fullName}`);
          } else {
            // Remove teacher
            updatedTeachers = currentAssignedTeachers.filter((id: string) => id !== teacherDocId);
            updatedTeacherIds = currentAssignedTeacherIds.filter((id: string) => id !== teacherDocId);
            console.log(`➖ Removing teacher ${selectedTeacher.fullName} from student ${student.fullName}`);
          }

          try {
            await updateStudent(studentId, {
              assignedTeachers: updatedTeachers,
              assignedTeacherIds: updatedTeacherIds,
              // Keep legacy fields for backward compatibility
              assignedTeacher: updatedTeachers.length > 0 ? updatedTeachers[0] : '',
              assignedTeacherId: updatedTeacherIds.length > 0 ? updatedTeacherIds[0] : '',
            });
            console.log(`✅ Updated student ${student.fullName} (${studentId})`);
          } catch (error) {
            console.error(`❌ Failed to update student ${student.fullName} (${studentId}):`, error);
            throw error; // Re-throw to stop the process
          }
        }
      });

      const results = await Promise.allSettled(updatePromises);
      const failed = results.filter(r => r.status === 'rejected');
      
      if (failed.length > 0) {
        console.error(`❌ ${failed.length} student updates failed:`, failed);
        throw new Error(`${failed.length} student update(s) failed. Check console for details.`);
      }

      // Trigger backend sync to update teacher's assignedStudents arrays
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

      // Clear cache to force fresh data load
      try {
        const { dataCache } = await import('../utils/dataCache');
        dataCache.clear();
        console.log('🗑️ Cache cleared');
      } catch (cacheError) {
        console.warn('⚠️ Could not clear cache:', cacheError);
      }

      // Refresh data to ensure UI updates (this will reload teachers with updated assignedStudents)
      if (refreshData) {
        console.log('🔄 Refreshing data after assignment update...');
        await refreshData();
        console.log('✅ Data refreshed');
      }

      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      alert(`✅ Successfully updated student assignments for ${selectedTeacher.fullName}`);
    } catch (error) {
      console.error('Error updating student assignments:', error);
      alert('❌ Failed to update student assignments: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      <div className="min-h-full px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Teacher-Student Assignment</h1>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
                Manage which students are assigned to each teacher
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
                className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Teachers List */}
          <div className="lg:col-span-1">
            <Card title="👨‍🏫 Select Teacher">
              {/* Teacher Search */}
              <div className="mb-3 sm:mb-4">
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={teacherSearchTerm}
                  onChange={(e) => setTeacherSearchTerm(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Teachers List */}
              <div className="space-y-2 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto">
                {filteredTeachers.length === 0 ? (
                  <p className="text-gray-500 text-center py-6 sm:py-8 text-sm">No teachers found</p>
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
                        className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-all touch-target ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{teacher.fullName}</p>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">{teacher.email}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                              {assignedCount} students
                            </span>
                          </div>
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
              <Card title={`📚 Students - ${selectedTeacher.fullName}`}>
                {/* Student Filters */}
                <div className="mb-3 sm:mb-4 space-y-3">
                  {/* Search Input */}
                  <div>
                    <input
                      type="text"
                      placeholder="Search students by name, email, or program..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  {/* Filter Options */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {/* Status Filter */}
                    <div className="flex-1 sm:flex-none">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'assigned' | 'unassigned')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                      >
                        <option value="all">All Students</option>
                        <option value="assigned">Assigned to Teacher</option>
                        <option value="unassigned">Not Assigned</option>
                      </select>
                    </div>

                    {/* Program Filter */}
                    {availablePrograms.length > 0 && (
                      <div className="flex-1 sm:flex-none">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Program</label>
                        <select
                          value={filterProgram}
                          onChange={(e) => setFilterProgram(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                        >
                          <option value="all">All Programs</option>
                          {availablePrograms.map(program => (
                            <option key={program} value={program}>{program}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Clear Filters Button */}
                    {(searchTerm || filterStatus !== 'all' || filterProgram !== 'all') && (
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                            setFilterProgram('all');
                          }}
                          className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors touch-target whitespace-nowrap"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row gap-2">
                  <div className="flex gap-2 flex-1">
                    <button
                      onClick={handleSelectAll}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 active:bg-primary/30 transition-colors touch-target"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors touch-target"
                    >
                      Deselect All
                    </button>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                {/* Students List */}
                <div className="space-y-2 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 px-4">
                      <p className="text-gray-500 text-sm mb-2">No students found</p>
                      {(searchTerm || filterStatus !== 'all' || filterProgram !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                            setFilterProgram('all');
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Clear filters to see all students
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredStudents.map((student) => {
                      // Use studentRecordId for consistency with update logic
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
                          className={`flex items-start sm:items-center p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all touch-target ${
                            isAssigned
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => handleStudentToggle(studentId)}
                            className="mt-1 sm:mt-0 w-5 h-5 sm:w-5 sm:h-5 flex-shrink-0 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                          />
                          <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{student.fullName}</p>
                                <p className="text-xs sm:text-sm text-gray-600 truncate">
                                  {student.email} • {student.program}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                {isCurrentlyAssigned && !isAssigned && (
                                  <span className="inline-block text-xs text-orange-600 font-medium px-2 py-1 bg-orange-50 rounded">
                                    Currently Assigned
                                  </span>
                                )}
                                {!isCurrentlyAssigned && isAssigned && (
                                  <span className="inline-block text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded">
                                    Will be Added
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
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-100 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">
                        Showing: <span className="font-bold">{filteredStudents.length}</span> of <span className="font-bold">{students.length}</span> students
                        {(searchTerm || filterStatus !== 'all' || filterProgram !== 'all') && (
                          <span className="text-gray-500 ml-1">(filtered)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Selected: <span className="text-primary font-bold">{selectedStudentIds.size}</span> • Currently assigned: <span className="font-bold">{assignedStudents.length}</span>
                      </p>
                    </div>
                    {selectedStudentIds.size !== assignedStudents.length && (
                      <span className="text-xs text-orange-600 font-medium px-2 py-1 bg-orange-50 rounded inline-block">
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

