import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment } from '../types/assignment';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';

interface TeacherStudentReportsProps {
  onClose: () => void;
}

const TeacherStudentReports: React.FC<TeacherStudentReportsProps> = ({ onClose }) => {
  const { assignments: backendAssignments, deleteAssignment, updateAssignment, refreshData } = useBackendData();
  const { students, teachers, getStudentsByTeacher } = useData();
  const { user } = useAuth();
  
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState({
    finalReport: '',
    homework: '',
    homeworkLink: '',
    sabq: { portion: '', notes: '' },
    sabqi: { portion: '', notes: '' },
    manzil: { portion: '', notes: '' },
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [showMushafForAssignment, setShowMushafForAssignment] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState<number>(1);

  // Get current teacher
  const currentTeacher = user ? (teachers.find(t => t.email === user.email) || teachers[0]) : null;
  const assignedStudents = currentTeacher?.id ? getStudentsByTeacher(currentTeacher.id) : [];

  // Get assignment history for selected student
  const studentAssignments = useMemo(() => {
    if (!selectedStudent) return [];
    const studentId = selectedStudent.id || (selectedStudent as any)._id;
    
    return backendAssignments
      .filter((assignment: any) => {
        const assignedTo = Array.isArray(assignment.assignedTo) ? assignment.assignedTo : [assignment.assignedTo];
        return assignedTo.includes(studentId) || assignedTo.includes(studentId?.toString());
      })
      .sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.updatedAt || 0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.updatedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [selectedStudent, backendAssignments]);

  // Group assignments by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, any[]> = {};
    studentAssignments.forEach((assignment: any) => {
      const date = assignment.createdAt ? new Date(assignment.createdAt) : new Date(assignment.updatedAt || Date.now());
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(assignment);
    });
    return groups;
  }, [studentAssignments]);

  const resolveAssignmentId = (assignment: any): string => {
    return assignment._id || assignment.id || '';
  };

  const handleDeleteAssignment = async (assignment: any) => {
    const assignmentId = resolveAssignmentId(assignment);
    if (!assignmentId) return;

    const confirmed = window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingAssignmentId(assignmentId);
      // Delete the assignment
      await deleteAssignment(assignmentId);
      // Force a complete data refresh to ensure all components update
      await refreshData();
      // Small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      alert('Assignment deleted successfully! All dashboards will be updated.');
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment.');
    } finally {
      setDeletingAssignmentId(null);
    }
  };

  const handleOpenEditModal = (assignment: any) => {
    setEditingAssignment(assignment);
    
    // Extract classwork sections from assignment
    const classworkSections = Array.isArray((assignment as any).classworkSections) 
      ? (assignment as any).classworkSections 
      : [];
    
    // Find sabq, sabqi, manzil sections
    const sabqSection = classworkSections.find((s: any) => (s.step || '').toLowerCase() === 'sabq');
    const sabqiSection = classworkSections.find((s: any) => (s.step || '').toLowerCase() === 'sabqi');
    const manzilSection = classworkSections.find((s: any) => (s.step || '').toLowerCase() === 'manzil');
    
    setEditForm({
      finalReport: assignment.description || assignment.finalReport || assignment.classworkSummary || '',
      homework: assignment.homeworkComments || assignment.homework || assignment.homeworkSummary || '',
      homeworkLink: assignment.homeworkLink || '',
      sabq: {
        portion: sabqSection?.assignmentRange || sabqSection?.assignmentPortion || assignment.sabq?.portion || '',
        notes: sabqSection?.summary || sabqSection?.details || assignment.sabq?.notes || ''
      },
      sabqi: {
        portion: sabqiSection?.assignmentRange || sabqiSection?.assignmentPortion || assignment.sabqi?.portion || '',
        notes: sabqiSection?.summary || sabqiSection?.details || assignment.sabqi?.notes || ''
      },
      manzil: {
        portion: manzilSection?.assignmentRange || manzilSection?.assignmentPortion || assignment.manzil?.portion || '',
        notes: manzilSection?.summary || manzilSection?.details || assignment.manzil?.notes || ''
      },
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAssignment) return;
    if (!editForm.finalReport.trim()) {
      alert('Final report cannot be empty.');
      return;
    }

    const assignmentId = resolveAssignmentId(editingAssignment);
    if (!assignmentId) return;

    try {
      setIsSavingEdit(true);
      
      // Build classwork sections from form data (same structure as AssignmentsPage)
      const classworkSections: any[] = [];
      
      // Add sabq section if it has data
      if (editForm.sabq.portion.trim() || editForm.sabq.notes.trim()) {
        classworkSections.push({
          step: 'sabq',
          title: 'Sabq (New Lesson)',
          label: 'Sabq',
          summary: editForm.sabq.notes.trim(),
          assignmentRange: editForm.sabq.portion.trim(),
          order: 0,
        });
      }
      
      // Add sabqi section if it has data
      if (editForm.sabqi.portion.trim() || editForm.sabqi.notes.trim()) {
        classworkSections.push({
          step: 'sabqi',
          title: 'Sabqi (Revision)',
          label: 'Sabqi',
          summary: editForm.sabqi.notes.trim(),
          assignmentRange: editForm.sabqi.portion.trim(),
          order: 1,
        });
      }
      
      // Add manzil section if it has data
      if (editForm.manzil.portion.trim() || editForm.manzil.notes.trim()) {
        classworkSections.push({
          step: 'manzil',
          title: 'Manzil',
          label: 'Manzil',
          summary: editForm.manzil.notes.trim(),
          assignmentRange: editForm.manzil.portion.trim(),
          order: 2,
        });
      }
      
      await updateAssignment(assignmentId, {
        description: editForm.finalReport,
        homeworkComments: editForm.homework,
        homeworkLink: editForm.homeworkLink,
        classworkSections: classworkSections,
        status: 'published', // Ensure it's published
      });
      // Force a complete data refresh to ensure all components update
      await refreshData();
      // Small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      setEditingAssignment(null);
      alert('Assignment updated successfully! All dashboards will be updated.');
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Failed to update assignment.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getTeacherName = (teacherId: string | undefined) => {
    if (!teacherId) return 'Unknown';
    const teacher = teachers.find(t => 
      t.id === teacherId || 
      (t as any)._id === teacherId ||
      (t as any).teacherId === teacherId
    );
    return teacher?.fullName || 'Unknown Teacher';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)] to-[var(--color-accent)] text-white px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Student Reports</h2>
              <p className="text-white/90 mt-1">View and manage your assigned students' assignment history</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
            >
              ✕ Close
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Assigned Students List */}
            {assignedStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-gray-500">No students assigned to you yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Student ({assignedStudents.length} assigned)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assignedStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`rounded-lg border-2 p-3 text-left transition ${
                        selectedStudent?.id === student.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{student.fullName}</div>
                      <div className="text-xs text-gray-500 mt-1">{student.program}</div>
                      <div className="text-xs text-gray-400 mt-1">{student.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment History */}
            {selectedStudent && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Assignment History: {selectedStudent.fullName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {studentAssignments.length} assignment{studentAssignments.length !== 1 ? 's' : ''} found
                  </p>
                </div>

                {Object.keys(groupedByDate).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <p className="text-gray-500">No assignments found for this student.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedByDate)
                      .sort(([dateA], [dateB]) => {
                        const a = new Date(dateA);
                        const b = new Date(dateB);
                        return b.getTime() - a.getTime();
                      })
                      .map(([dateKey, dayAssignments]) => {
                        const assignments = dayAssignments as any[];
                        return (
                          <div key={dateKey} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 pb-3 border-b border-gray-200">
                              <h4 className="text-lg font-bold text-gray-900">{dateKey}</h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} on this day
                              </p>
                            </div>

                            <div className="space-y-4">
                              {assignments.map((assignment: any) => {
                                const assignmentId = resolveAssignmentId(assignment);
                                const mushafMarkings = Array.isArray(assignment.mushafMarkings) ? assignment.mushafMarkings : [];
                                
                                // Extract classwork sections
                                const classworkSections = Array.isArray((assignment as any).classworkSections) 
                                  ? (assignment as any).classworkSections 
                                  : [];
                                
                                const sabqSection = classworkSections.find((s: any) => (s.step || '').toLowerCase() === 'sabq');
                                const sabqiSection = classworkSections.find((s: any) => (s.step || '').toLowerCase() === 'sabqi');
                                const manzilSection = classworkSections.find((s: any) => (s.step || '').toLowerCase() === 'manzil');
                                
                                return (
                                  <div key={assignmentId} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-lg">📝</span>
                                          <h5 className="font-semibold text-gray-900">
                                            {assignment.title || 'Assignment'}
                                          </h5>
                                        </div>
                                        {assignment.listenerName && (
                                          <p className="text-xs text-gray-600 mb-1">
                                            Listener: {getTeacherName(assignment.listenerName)}
                                          </p>
                                        )}
                                        
                                        {/* Classwork Sections - Sabq, Sabqi, Manzil */}
                                        {(sabqSection || sabqiSection || manzilSection) && (
                                          <div className="mt-3 rounded-lg border border-[#E7AA39]/40 bg-[#FDF7E7] p-4">
                                            <h6 className="text-xs font-semibold text-[#2E4D32] mb-3 uppercase tracking-wide">Classwork Details</h6>
                                            <div className="grid gap-3 md:grid-cols-3">
                                              {/* Sabq */}
                                              {sabqSection && (
                                                <div className="rounded-lg border border-[#E7AA39]/20 bg-white p-3">
                                                  <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide mb-2">✨ Sabq (New Lesson)</p>
                                                  {(sabqSection.assignmentRange || sabqSection.assignmentPortion) && (
                                                    <p className="text-xs text-gray-600 mb-1">
                                                      <span className="font-semibold">Portion:</span> {sabqSection.assignmentRange || sabqSection.assignmentPortion}
                                                    </p>
                                                  )}
                                                  {(sabqSection.summary || sabqSection.details) && (
                                                    <p className="text-xs text-gray-700 whitespace-pre-wrap mt-2">
                                                      {sabqSection.summary || sabqSection.details}
                                                    </p>
                                                  )}
                                                </div>
                                              )}
                                              
                                              {/* Sabqi */}
                                              {sabqiSection && (
                                                <div className="rounded-lg border border-[#E7AA39]/20 bg-white p-3">
                                                  <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide mb-2">🧠 Sabqi (Revision)</p>
                                                  {(sabqiSection.assignmentRange || sabqiSection.assignmentPortion) && (
                                                    <p className="text-xs text-gray-600 mb-1">
                                                      <span className="font-semibold">Portion:</span> {sabqiSection.assignmentRange || sabqiSection.assignmentPortion}
                                                    </p>
                                                  )}
                                                  {(sabqiSection.summary || sabqiSection.details) && (
                                                    <p className="text-xs text-gray-700 whitespace-pre-wrap mt-2">
                                                      {sabqiSection.summary || sabqiSection.details}
                                                    </p>
                                                  )}
                                                </div>
                                              )}
                                              
                                              {/* Manzil */}
                                              {manzilSection && (
                                                <div className="rounded-lg border border-[#E7AA39]/20 bg-white p-3">
                                                  <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide mb-2">🔁 Manzil</p>
                                                  {(manzilSection.assignmentRange || manzilSection.assignmentPortion) && (
                                                    <p className="text-xs text-gray-600 mb-1">
                                                      <span className="font-semibold">Portion:</span> {manzilSection.assignmentRange || manzilSection.assignmentPortion}
                                                    </p>
                                                  )}
                                                  {(manzilSection.summary || manzilSection.details) && (
                                                    <p className="text-xs text-gray-700 whitespace-pre-wrap mt-2">
                                                      {manzilSection.summary || manzilSection.details}
                                                    </p>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Final Report / Description */}
                                        {assignment.description && (
                                          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                                            <h6 className="text-xs font-semibold text-green-900 mb-1">📋 Final Report / Summary</h6>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                              {assignment.description}
                                            </p>
                                          </div>
                                        )}
                                        
                                        {/* Homework */}
                                        {assignment.homeworkComments && (
                                          <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                                            <h6 className="text-xs font-semibold text-yellow-900 mb-1">📝 Homework</h6>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                              {assignment.homeworkComments}
                                            </p>
                                            {assignment.homeworkLink && (
                                              <a
                                                href={assignment.homeworkLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-600 hover:underline text-xs mt-2 inline-block"
                                              >
                                                📎 Homework Link →
                                              </a>
                                            )}
                                          </div>
                                        )}
                                        {mushafMarkings.length > 0 && (
                                          <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                                            <div className="flex items-center justify-between mb-3">
                                              <h6 className="text-xs font-semibold text-orange-900">
                                                📖 Mushaf Mistakes ({mushafMarkings.length} mistake{mushafMarkings.length !== 1 ? 's' : ''})
                                              </h6>
                                              <button
                                                onClick={() => {
                                                  if (showMushafForAssignment === assignmentId) {
                                                    setShowMushafForAssignment(null);
                                                  } else {
                                                    setShowMushafForAssignment(assignmentId);
                                                    const firstMistake = mushafMarkings[0];
                                                    if (firstMistake?.page) {
                                                      setMushafPage(firstMistake.page);
                                                    }
                                                  }
                                                }}
                                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                                              >
                                                {showMushafForAssignment === assignmentId ? '📖 Hide Mushaf' : '📖 View Mushaf'}
                                              </button>
                                            </div>
                                            
                                            {showMushafForAssignment !== assignmentId && (
                                              <div className="space-y-3">
                                                {/* Mistake type summary */}
                                                <div className="flex flex-wrap gap-2">
                                                  {['memory', 'madd', 'ikhfa', 'holding', 'tech', 'other'].map((type) => {
                                                    const count = mushafMarkings.filter((m: MushafMistake) => m.type === type).length;
                                                    if (count === 0) return null;
                                                    const typeLabel = type === 'memory' ? 'Memory' :
                                                                      type === 'madd' ? 'Madd' :
                                                                      type === 'ikhfa' ? 'Ikhfa' :
                                                                      type === 'holding' ? 'Holding' :
                                                                      type === 'tech' ? 'Tech' :
                                                                      type === 'other' ? 'Other' : type;
                                                    return (
                                                      <span key={type} className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-700">
                                                        {typeLabel}: {count}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                                
                                                {/* Page navigation buttons */}
                                                <div className="flex flex-wrap gap-2">
                                                  <span className="text-xs font-semibold text-gray-700 self-center">Navigate to pages:</span>
                                                  {(Array.from(new Set(mushafMarkings.map((m: MushafMistake) => m.page))) as number[])
                                                    .sort((a: number, b: number) => a - b)
                                                    .map((page: number) => {
                                                      const mistakesOnPage = mushafMarkings.filter((m: MushafMistake) => m.page === page).length;
                                                      return (
                                                        <button
                                                          key={page}
                                                          onClick={() => {
                                                            setShowMushafForAssignment(assignmentId);
                                                            setMushafPage(page);
                                                          }}
                                                          className="px-3 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                                                        >
                                                          Page {page} ({mistakesOnPage})
                                                        </button>
                                                      );
                                                    })}
                                                </div>
                                                
                                                {/* Individual mistakes list */}
                                                <div className="flex flex-wrap gap-2">
                                                  {mushafMarkings.map((mistake: any, idx: number) => {
                                                    const typeLabel = mistake.type === 'memory' ? 'Memory' :
                                                                      mistake.type === 'madd' ? 'Madd' :
                                                                      mistake.type === 'ikhfa' ? 'Ikhfa' :
                                                                      mistake.type === 'holding' ? 'Holding' :
                                                                      mistake.type === 'tech' ? 'Tech' :
                                                                      mistake.type === 'other' ? 'Other' : mistake.type;
                                                    return (
                                                      <span
                                                        key={idx}
                                                        className={`px-2 py-1 rounded text-xs font-medium ${
                                                          mistake.type === 'memory' 
                                                            ? 'bg-red-100 text-red-800' 
                                                            : 'bg-yellow-100 text-yellow-800'
                                                        }`}
                                                      >
                                                        {typeLabel} • Page {mistake.page}
                                                        {mistake.surah && mistake.ayah && ` • ${mistake.surah}:${mistake.ayah}`}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {showMushafForAssignment === assignmentId && (
                                              <div className="mt-4 pt-4 border-t border-orange-200">
                                                <div className="flex justify-between items-center mb-3">
                                                  <div className="text-sm text-gray-600">
                                                    Page {mushafPage} • {mushafMarkings.filter((m: MushafMistake) => m.page === mushafPage).length} mistake{mushafMarkings.filter((m: MushafMistake) => m.page === mushafPage).length !== 1 ? 's' : ''} on this page
                                                  </div>
                                                  <div className="flex flex-wrap gap-2">
                                                    {(Array.from(new Set(mushafMarkings.map((m: MushafMistake) => m.page))) as number[])
                                                      .sort((a: number, b: number) => a - b)
                                                      .map((page: number) => {
                                                        const mistakesOnPage = mushafMarkings.filter((m: MushafMistake) => m.page === page).length;
                                                        return (
                                                          <button
                                                            key={page}
                                                            onClick={() => setMushafPage(page)}
                                                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                                              mushafPage === page
                                                                ? 'bg-green-600 text-white'
                                                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                            }`}
                                                          >
                                                            Page {page} ({mistakesOnPage})
                                                          </button>
                                                        );
                                                      })}
                                                  </div>
                                                </div>
                                                
                                                <InteractiveMushaf
                                                  currentPage={mushafPage}
                                                  onPageChange={setMushafPage}
                                                  mistakes={mushafMarkings}
                                                  onMistakeMark={() => {}}
                                                  readOnly={true}
                                                  mode="viewing"
                                                  studentName={selectedStudent?.fullName || 'Student'}
                                                />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-2 ml-4">
                                        <button
                                          onClick={() => handleOpenEditModal(assignment)}
                                          className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                                        >
                                          ✏️ Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteAssignment(assignment)}
                                          disabled={deletingAssignmentId === assignmentId}
                                          className="px-3 py-2 text-xs font-semibold rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {deletingAssignmentId === assignmentId ? 'Deleting...' : '🗑️ Delete'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Assignment Modal - Same as StudentReports */}
      {editingAssignment && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit Assignment</h3>
              <button
                onClick={() => setEditingAssignment(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Classwork Sections */}
              <div className="bg-[#FDF7E7] rounded-lg border border-[#E7AA39]/40 p-4">
                <h4 className="text-sm font-semibold text-[#2E4D32] mb-4 uppercase tracking-wide">Classwork Details</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Sabq */}
                  <div className="rounded-lg border border-[#E7AA39]/20 bg-white p-4">
                    <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide mb-3">✨ Sabq</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Portion</label>
                        <input
                          type="text"
                          value={editForm.sabq.portion}
                          onChange={(e) => setEditForm(prev => ({ ...prev, sabq: { ...prev.sabq, portion: e.target.value } }))}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                          placeholder="e.g., Juz 1, Page 2-5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={editForm.sabq.notes}
                          onChange={(e) => setEditForm(prev => ({ ...prev, sabq: { ...prev.sabq, notes: e.target.value } }))}
                          rows={3}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                          placeholder="Teacher's notes..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sabqi */}
                  <div className="rounded-lg border border-[#E7AA39]/20 bg-white p-4">
                    <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide mb-3">🧠 Sabqi</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Portion</label>
                        <input
                          type="text"
                          value={editForm.sabqi.portion}
                          onChange={(e) => setEditForm(prev => ({ ...prev, sabqi: { ...prev.sabqi, portion: e.target.value } }))}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                          placeholder="e.g., Juz 1, Page 1-3"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={editForm.sabqi.notes}
                          onChange={(e) => setEditForm(prev => ({ ...prev, sabqi: { ...prev.sabqi, notes: e.target.value } }))}
                          rows={3}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                          placeholder="Teacher's notes..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Manzil */}
                  <div className="rounded-lg border border-[#E7AA39]/20 bg-white p-4">
                    <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide mb-3">🔁 Manzil</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Portion</label>
                        <input
                          type="text"
                          value={editForm.manzil.portion}
                          onChange={(e) => setEditForm(prev => ({ ...prev, manzil: { ...prev.manzil, portion: e.target.value } }))}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                          placeholder="e.g., Juz 1, Page 1-10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={editForm.manzil.notes}
                          onChange={(e) => setEditForm(prev => ({ ...prev, manzil: { ...prev.manzil, notes: e.target.value } }))}
                          rows={3}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                          placeholder="Teacher's notes..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Report */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Final Report / Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editForm.finalReport}
                  onChange={(e) => setEditForm(prev => ({ ...prev, finalReport: e.target.value }))}
                  rows={6}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                  placeholder="Enter the final report or summary..."
                />
              </div>

              {/* Homework */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Homework</label>
                <textarea
                  value={editForm.homework}
                  onChange={(e) => setEditForm(prev => ({ ...prev, homework: e.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                  placeholder="Enter homework instructions..."
                />
              </div>

              {/* Homework Link */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Homework Link (Optional)</label>
                <input
                  type="url"
                  value={editForm.homeworkLink}
                  onChange={(e) => setEditForm(prev => ({ ...prev, homeworkLink: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                  placeholder="https://..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  onClick={() => setEditingAssignment(null)}
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || !editForm.finalReport.trim()}
                  className="px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherStudentReports;

