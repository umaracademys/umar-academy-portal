import React, { useState, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useData } from '../contexts/DataContext';
import { Assignment } from '../types/assignment';

interface StudentReportsProps {
  onClose: () => void;
}

const StudentReports: React.FC<StudentReportsProps> = ({ onClose }) => {
  const { assignments: backendAssignments, deleteAssignment, updateAssignment, refreshData } = useBackendData();
  const { students, teachers } = useData();
  
  const [selectedProgram, setSelectedProgram] = useState<string>('');
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

  // Get unique programs from students
  const programs = useMemo(() => {
    const uniquePrograms = new Set<string>();
    students.forEach(student => {
      if (student.program) {
        uniquePrograms.add(student.program);
      }
    });
    return Array.from(uniquePrograms).sort();
  }, [students]);

  // Filter students by program
  const filteredStudents = useMemo(() => {
    if (!selectedProgram) return [];
    return students.filter(student => student.program === selectedProgram);
  }, [students, selectedProgram]);

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
    setEditForm({
      finalReport: assignment.description || assignment.finalReport || '',
      homework: assignment.homeworkComments || assignment.homework || '',
      homeworkLink: assignment.homeworkLink || '',
      sabq: {
        portion: assignment.sabq?.portion || '',
        notes: assignment.sabq?.notes || ''
      },
      sabqi: {
        portion: assignment.sabqi?.portion || '',
        notes: assignment.sabqi?.notes || ''
      },
      manzil: {
        portion: assignment.manzil?.portion || '',
        notes: assignment.manzil?.notes || ''
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
      await updateAssignment(assignmentId, {
        description: editForm.finalReport,
        homeworkComments: editForm.homework,
        homeworkLink: editForm.homeworkLink,
        sabq: editForm.sabq,
        sabqi: editForm.sabqi,
        manzil: editForm.manzil,
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
              <p className="text-white/90 mt-1">View and manage student assignment history</p>
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
            {/* Program Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Program
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => {
                  setSelectedProgram(e.target.value);
                  setSelectedStudent(null);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              >
                <option value="">-- Select a Program --</option>
                {programs.map(program => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
            </div>

            {/* Student List */}
            {selectedProgram && filteredStudents.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Student ({filteredStudents.length} students)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredStudents.map(student => (
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
                      <div className="text-xs text-gray-500 mt-1">{student.email}</div>
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
                                        {assignment.description && (
                                          <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                                            {assignment.description}
                                          </p>
                                        )}
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
                                            <h6 className="text-xs font-semibold text-orange-900 mb-2">
                                              📖 Mushaf Mistakes ({mushafMarkings.length})
                                            </h6>
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

      {/* Edit Assignment Modal */}
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

export default StudentReports;

