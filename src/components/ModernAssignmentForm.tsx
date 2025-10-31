import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Program } from '../types/assignment';

interface ModernAssignmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  assignment?: Assignment;
  isEdit?: boolean;
}

const ModernAssignmentForm: React.FC<ModernAssignmentFormProps> = ({ 
  onClose, 
  onSuccess, 
  assignment, 
  isEdit = false 
}) => {
  const { students, addAssignment, updateAssignment } = useData();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: assignment?.title || '',
    description: assignment?.description || '',
    type: assignment?.type || 'classwork' as 'classwork' | 'homework',
    classworkType: assignment?.classworkType || 'sabq' as 'sabq' | 'sabqi' | 'manzil',
    program: assignment?.program || '',
    assignedTo: assignment?.assignedTo || [],
    dueDate: assignment?.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
    homeworkText: (assignment as any)?.homeworkComments || '',
    homeworkLink: (assignment as any)?.homeworkLink || '',
    assignedTeacher: '',
    readingLink: '',
    comments: ''
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(studentId)
        ? prev.assignedTo.filter(id => id !== studentId)
        : [...prev.assignedTo, studentId]
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.program) newErrors.program = 'Program is required';
    if (formData.assignedTo.length === 0) newErrors.assignedTo = 'At least one student must be selected';
    if (formData.type === 'homework' && !formData.homeworkText.trim() && !formData.homeworkLink.trim()) {
      newErrors.homework = 'Either homework text or link is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const assignmentData = {
        ...formData,
        id: assignment?.id || Date.now().toString(),
        createdAt: assignment?.createdAt || new Date(),
        status: 'active',
        submissions: assignment?.submissions || []
      };

      if (isEdit) {
        await updateAssignment(assignmentData.id, assignmentData);
      } else {
        await addAssignment(assignmentData);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving assignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProgramStudents = programs.find(p => p.id === formData.program)?.students || [];
  const availableStudents = students.filter(s => selectedProgramStudents.includes(s.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white p-8 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {isEdit ? '✏️ Edit Assignment' : '📝 Create New Assignment'}
              </h2>
              <p className="text-blue-100 text-lg">
                {isEdit ? 'Update assignment details and settings' : 'Create a new assignment for your students'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-4xl font-light transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-full"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                📋 Basic Information
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assignment Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter assignment title..."
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Program *
                    </label>
                    <select
                      name="program"
                      value={formData.program}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.program ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a program...</option>
                      {programs.map(program => (
                        <option key={program.id} value={program.id}>
                          {program.name}
                        </option>
                      ))}
                    </select>
                    {errors.program && <p className="text-red-500 text-sm mt-1">{errors.program}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assignment Type *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: 'classwork' }))}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.type === 'classwork'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-1">📚</div>
                          <div className="font-semibold">Classwork</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: 'homework' }))}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.type === 'homework'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-1">🏠</div>
                          <div className="font-semibold">Homework</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter assignment description..."
                />
              </div>
            </div>

            {/* Classwork/Homework Specific Fields */}
            {formData.type === 'classwork' && (
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  📖 Classwork Details
                </h3>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Classwork Type *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'sabq', label: 'Sabq', icon: '📖' },
                      { value: 'sabqi', label: 'Sabqi', icon: '📚' },
                      { value: 'manzil', label: 'Manzil', icon: '📑' }
                    ].map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, classworkType: type.value as any }))}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.classworkType === type.value
                            ? 'border-green-500 bg-green-100 text-green-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-1">{type.icon}</div>
                          <div className="font-semibold">{type.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formData.type === 'homework' && (
              <div className="bg-orange-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  🏠 Homework Details
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Homework Text
                    </label>
                    <textarea
                      name="homeworkText"
                      value={formData.homeworkText}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Enter homework instructions..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Homework Link
                    </label>
                    <input
                      type="url"
                      name="homeworkLink"
                      value={formData.homeworkLink}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                
                {errors.homework && <p className="text-red-500 text-sm mt-2">{errors.homework}</p>}
              </div>
            )}

            {/* After School Reading Special Fields */}
            {formData.program === '3' && (
              <div className="bg-purple-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  📚 After School Reading Details
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assigned Teacher
                    </label>
                    <input
                      type="text"
                      name="assignedTeacher"
                      value={formData.assignedTeacher}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Teacher name..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reading Link
                    </label>
                    <input
                      type="url"
                      name="readingLink"
                      value={formData.readingLink}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="https://example.com/reading"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Comments
                  </label>
                  <textarea
                    name="comments"
                    value={formData.comments}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Additional comments..."
                  />
                </div>
              </div>
            )}

            {/* Student Selection */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                👥 Assign to Students
              </h3>
              
              {formData.program ? (
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Select students from <strong>{programs.find(p => p.id === formData.program)?.name}</strong> program
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {availableStudents.map(student => (
                      <label
                        key={student.id}
                        className="flex items-center p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedTo.includes(student.id)}
                          onChange={() => handleStudentToggle(student.id)}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex items-center">
                          <img
                            src={student.avatar || `https://ui-avatars.com/api/?name=${student.fullName}&background=10b981&color=fff`}
                            alt={student.fullName}
                            className="h-8 w-8 rounded-full mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{student.fullName}</div>
                            <div className="text-sm text-gray-500">{student.email}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {errors.assignedTo && <p className="text-red-500 text-sm mt-2">{errors.assignedTo}</p>}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">👥</div>
                  <p className="text-gray-600">Please select a program first to see available students</p>
                </div>
              )}
            </div>

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
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEdit ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEdit ? '✏️ Update Assignment' : '📝 Create Assignment'}
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

export default ModernAssignmentForm;

