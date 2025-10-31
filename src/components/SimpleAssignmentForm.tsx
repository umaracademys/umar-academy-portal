import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Program } from '../types/assignment';

interface SimpleAssignmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const SimpleAssignmentForm: React.FC<SimpleAssignmentFormProps> = ({ onClose, onSuccess }) => {
  const { students, addAssignment, loading, error } = useData();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    program: '',
    type: 'classwork' as 'classwork' | 'homework',
    lessonType: 'sabq' as 'sabq' | 'sabqi' | 'manzil',
    link: '',
    comment: '',
    feedback: '',
    selectedStudents: [] as string[]
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock programs
  useEffect(() => {
    const mockPrograms: Program[] = [
      { id: '1', name: 'Full Time HQ', description: 'Full-time Hifz program', students: ['1', '2', '3'], createdAt: new Date(), status: 'active' },
      { id: '2', name: 'Part Time HQ', description: 'Part-time Hifz program', students: ['1', '4', '5'], createdAt: new Date(), status: 'active' },
      { id: '3', name: 'After School Reading', description: 'After school reading program', students: ['2', '3', '6'], createdAt: new Date(), status: 'active' }
    ];
    setPrograms(mockPrograms);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStudentToggle = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter(id => id !== studentId)
        : [...prev.selectedStudents, studentId]
    }));
  };

  const handleSelectAllStudents = () => {
    const allStudentIds = availableStudents.map(student => student.id);
    setFormData(prev => ({
      ...prev,
      selectedStudents: allStudentIds
    }));
  };

  const handleDeselectAllStudents = () => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.program || formData.selectedStudents.length === 0) {
      alert('Please select a program and at least one student');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const assignmentData = {
        id: Date.now().toString(),
        title: `${formData.type === 'classwork' ? 'Classwork' : 'Homework'} - ${formData.lessonType.charAt(0).toUpperCase() + formData.lessonType.slice(1)}`,
        description: `${formData.type === 'classwork' ? 'Classwork' : 'Homework'} assignment for ${formData.lessonType}`,
        type: formData.type,
        classworkType: formData.lessonType,
        program: formData.program,
        assignedTo: formData.selectedStudents,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        homeworkLink: formData.link,
        homeworkText: formData.link ? `Please complete the assignment using this link: ${formData.link}` : '',
        createdAt: new Date(),
        status: 'active',
        submissions: []
      };

      await addAssignment(assignmentData);
      onSuccess();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Error creating assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter students based on selected program
  const availableStudents = students.filter(student => {
    // For now, show all students when a program is selected
    // In the future, this could be filtered based on student.program or student.assignedProgram
    return true;
  });

  const getLessonIcon = (lessonType: string) => {
    switch (lessonType) {
      case 'sabq': return '📖';
      case 'sabqi': return '📚';
      case 'manzil': return '📑';
      default: return '📖';
    }
  };

  const getLessonColor = (lessonType: string) => {
    switch (lessonType) {
      case 'sabq': return 'from-blue-500 to-blue-600';
      case 'sabqi': return 'from-green-500 to-green-600';
      case 'manzil': return 'from-purple-500 to-purple-600';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">📝 Create New Assignment</h2>
              <p className="text-blue-100 mt-1">Select program, lesson type, and students</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl font-light transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Program Selection */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📚 Select Program</h3>
              <select
                name="program"
                value={formData.program}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              >
                <option value="">Choose a program...</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Program-specific Templates */}
            {formData.program && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Assignment Template</h3>
                
                {formData.program === '3' ? (
                  // After School Reading Template
                  <div className="space-y-4">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-3">📚 After School Reading Assignment</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">📖 Reading Link</label>
                          <input
                            type="url"
                            name="link"
                            value={formData.link}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Paste the reading link here..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">💬 Feedback</label>
                          <textarea
                            name="feedback"
                            value={formData.feedback}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Add feedback or instructions for students..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Full Time HQ & Part Time HQ Template
                  <div className="space-y-6">
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3">📚 Classwork</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">🔗 Classwork Link</label>
                          <input
                            type="url"
                            name="link"
                            value={formData.link}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            placeholder="Paste the classwork link here..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">💬 Classwork Comments</label>
                          <textarea
                            name="comment"
                            value={formData.comment}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            placeholder="Add comments or instructions for classwork..."
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-900 mb-3">🏠 Homework</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">🔗 Homework Link</label>
                          <input
                            type="url"
                            name="link"
                            value={formData.link}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            placeholder="Paste the homework link here..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">💬 Homework Comments</label>
                          <textarea
                            name="comment"
                            value={formData.comment}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            placeholder="Add comments or instructions for homework..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Student Selection */}
            {formData.program && (
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">👥 Select Students</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllStudents}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllStudents}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                
                {/* Debug info */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Debug:</strong> {students.length} students loaded, {availableStudents.length} available for selection
                    {loading && " (Loading...)"}
                    {error && ` (Error: ${error})`}
                  </p>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading students...</span>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">Error loading students: {error}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {availableStudents.map(student => (
                    <div
                      key={student.id}
                      className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.selectedStudents.includes(student.id)}
                            onChange={() => handleStudentToggle(student.id)}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <img
                            src={student.avatar || `https://ui-avatars.com/api/?name=${student.fullName}&background=10b981&color=fff`}
                            alt={student.fullName}
                            className="h-10 w-10 rounded-full mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{student.fullName}</div>
                            <div className="text-sm text-gray-500">{student.email}</div>
                          </div>
                        </div>
                        
                        {formData.selectedStudents.includes(student.id) && (
                          <div className="flex space-x-2">
                            {formData.program !== '3' && (
                              <>
                                <button
                                  type="button"
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200 transition-colors"
                                >
                                  📚 Submit Classwork
                                </button>
                                <button
                                  type="button"
                                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm font-medium hover:bg-orange-200 transition-colors"
                                >
                                  🏠 Submit Homework
                                </button>
                              </>
                            )}
                            {formData.program === '3' && (
                              <button
                                type="button"
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
                              >
                                📖 Submit Reading
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    ))}
                  </div>
                )}
                
                {formData.selectedStudents.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>{formData.selectedStudents.length}</strong> students selected
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            {formData.program && formData.selectedStudents.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">👀 Preview</h3>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{getLessonIcon(formData.lessonType)}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {formData.type === 'classwork' ? 'Classwork' : 'Homework'} - {formData.lessonType.charAt(0).toUpperCase() + formData.lessonType.slice(1)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {programs.find(p => p.id === formData.program)?.name}
                      </p>
                    </div>
                  </div>
                  {formData.link && (
                    <div className="flex items-center text-sm text-blue-600">
                      <span className="mr-2">🔗</span>
                      <a href={formData.link} target="_blank" rel="noopener noreferrer" className="underline">
                        Assignment Link
                      </a>
                    </div>
                  )}
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>{formData.selectedStudents.length}</strong> students will receive this assignment
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.program || formData.selectedStudents.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    📝 Create Assignment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SimpleAssignmentForm;
