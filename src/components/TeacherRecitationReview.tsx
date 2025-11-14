import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { RecitationReview, RecitationType, Student } from '../types';

interface TeacherRecitationReviewProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TeacherRecitationReview: React.FC<TeacherRecitationReviewProps> = ({ onClose, onSuccess }) => {
  const { students, addRecitationReview, getStudentsByTeacher, teachers } = useData();
  const { user } = useAuth();

  // Get current teacher and permissions
  const currentTeacher = React.useMemo(() => {
    if (!user?.email) return null;
    return teachers.find((t: any) => t.email === user.email) || teachers[0];
  }, [teachers, user?.email]);

  const permissions = React.useMemo(() => {
    return currentTeacher?.permissions || {
      canViewAssessments: true,
      canEditAssessments: true,
      canViewEvaluations: true,
      canEditEvaluations: true,
      canViewFinancials: false,
      canManageSchedule: true,
      canContactParents: true,
      canViewStudentEmail: true,
      canViewStudentContact: true,
      canViewStudentPersonalInfo: true,
    };
  }, [currentTeacher]);
  
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [formData, setFormData] = useState({
    studentId: '',
    recitationType: 'sabq' as RecitationType,
    program: '',
    notes: '',
    audioLink: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get assigned students for this teacher
  const assignedStudents = useMemo(() => {
    const teacherId = user?.id || '';
    if (!teacherId) return [];
    return getStudentsByTeacher(teacherId);
  }, [students, user?.id, getStudentsByTeacher]);

  // Get unique programs from assigned students
  const availablePrograms = useMemo(() => {
    return Array.from(new Set(assignedStudents.map(s => s.program).filter(Boolean)));
  }, [assignedStudents]);

  // Get assigned students filtered by program (only show when program is selected)
  const availableStudents = useMemo(() => {
    if (!selectedProgram) {
      return []; // Don't show any students until a program is selected
    }
    return assignedStudents.filter(student => student.program === selectedProgram);
  }, [assignedStudents, selectedProgram]);

  // Clear student selection if the selected student is no longer in the filtered list
  useEffect(() => {
    if (formData.studentId && !availableStudents.find(s => s.id === formData.studentId)) {
      setFormData(prev => ({ ...prev, studentId: '', program: '' }));
    }
  }, [availableStudents, formData.studentId]);

  // Auto-fill program from selected student
  useEffect(() => {
    if (formData.studentId) {
      const selectedStudent = availableStudents.find(s => s.id === formData.studentId);
      if (selectedStudent?.program) {
        setFormData(prev => ({ ...prev, program: selectedStudent.program }));
      }
    }
  }, [formData.studentId, availableStudents]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProgramFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const program = e.target.value;
    setSelectedProgram(program);
    // Clear student selection when program filter changes
    setFormData(prev => ({ ...prev, studentId: '', program: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.notes) {
      alert('Please fill in all required fields');
      return;
    }

    const selectedStudent = availableStudents.find(s => s.id === formData.studentId);
    if (!selectedStudent) {
      alert('Student not found');
      return;
    }

    setIsSubmitting(true);

    try {
      const review: RecitationReview = {
        id: '', // Will be set by backend
        studentId: formData.studentId,
        studentName: selectedStudent.fullName,
        teacherId: user?.id || '',
        teacherName: user?.name || 'Unknown Teacher',
        recitationType: formData.recitationType,
        program: formData.program || selectedStudent.program || 'Full Time HQ',
        notes: formData.notes,
        audioLink: formData.audioLink || undefined,
        status: 'pending_review',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addRecitationReview(review);
      alert('Recitation review submitted successfully! Admin will be notified.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting recitation review:', error);
      alert('Failed to submit recitation review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">📖 Submit Recitation Review</h2>
              <p className="text-green-100 mt-1">Listen to student recitation and submit review</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Program Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎓 Filter by Program *
            </label>
            <select
              value={selectedProgram}
              onChange={handleProgramFilterChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select a program...</option>
              {availablePrograms.length > 0 ? (
                availablePrograms.map(program => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))
              ) : (
                <option value="" disabled>No programs available</option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedProgram 
                ? `Showing students assigned to you in ${selectedProgram}`
                : availablePrograms.length > 0
                ? 'Select a program to see your assigned students'
                : 'No students assigned to you. Contact admin to get students assigned.'}
            </p>
          </div>

          {/* Student Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👨‍🎓 Select Student *
            </label>
            <select
              name="studentId"
              value={formData.studentId}
              onChange={handleInputChange}
              required
              disabled={!selectedProgram}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedProgram 
                  ? 'Please select a program first...' 
                  : availableStudents.length === 0 
                  ? `No students assigned to you in ${selectedProgram}`
                  : `Choose a student... (${availableStudents.length} available)`}
              </option>
              {availableStudents.map(student => (
                <option key={student.id} value={student.id}>
                  {student.fullName} {student.program ? `- ${student.program}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {!selectedProgram
                ? 'Select a program above to see your assigned students'
                : availableStudents.length > 0 
                ? `Showing ${availableStudents.length} assigned student${availableStudents.length > 1 ? 's' : ''} in ${selectedProgram}`
                : `No students assigned to you in ${selectedProgram}. Contact admin to get students assigned.`}
            </p>
          </div>

          {/* Recitation Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📚 Recitation Type *
            </label>
            <select
              name="recitationType"
              value={formData.recitationType}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="sabq">📖 Sabq (New Lesson)</option>
              <option value="sabqi">📚 Sabqi (Review Lesson)</option>
              <option value="manzil">📿 Manzil (Revision)</option>
            </select>
          </div>

          {/* Program (Auto-filled) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎓 Program (Auto-filled)
            </label>
            <input
              type="text"
              name="program"
              value={formData.program || 'Will auto-fill from selected student'}
              readOnly
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Automatically filled from the selected student's program
            </p>
          </div>

          {/* WhatsApp Audio Link */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔊 WhatsApp Audio Link (Optional)
            </label>
            <input
              type="url"
              name="audioLink"
              value={formData.audioLink}
              onChange={handleInputChange}
              placeholder="Paste WhatsApp audio link here..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              If you received the audio via WhatsApp, paste the link here
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📝 Review Notes *
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              required
              rows={6}
              placeholder="Enter your review notes here... (e.g., pronunciation, mistakes, corrections needed, etc.)"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 font-semibold transition-all shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : '✅ Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherRecitationReview;

