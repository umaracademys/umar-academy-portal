import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { RecitationReview, RecitationType, Student } from '../types';

interface TeacherRecitationReviewProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TeacherRecitationReview: React.FC<TeacherRecitationReviewProps> = ({ onClose, onSuccess }) => {
  const { students, addRecitationReview } = useData();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    studentId: '',
    recitationType: 'sabq' as RecitationType,
    program: '',
    notes: '',
    audioLink: ''
  });

  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get all students (teachers can access all students)
  useEffect(() => {
    setAvailableStudents(students);
  }, [students]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Choose a student...</option>
              {availableStudents.map(student => (
                <option key={student.id} value={student.id}>
                  {student.fullName} - {student.program}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              All students are available for recitation review
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

          {/* Program */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎓 Program
            </label>
            <select
              name="program"
              value={formData.program}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="Full Time HQ">Full Time HQ</option>
              <option value="Part Time HQ">Part Time HQ</option>
              <option value="After School Reading">After School Reading</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Will auto-fill from student's program if not specified
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

