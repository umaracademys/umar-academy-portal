import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Program } from '../types/assignment';

interface AssignmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  assignment?: Assignment;
  isEdit?: boolean;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({ onClose, onSuccess, assignment, isEdit = false }) => {
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
    attachments: assignment?.attachments || []
  });

  const [programs, setPrograms] = useState<Program[]>([]);
  const [newAttachment, setNewAttachment] = useState({ type: 'text' as 'text' | 'link', content: '', title: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock programs - in real app, this would come from API
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
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleStudentSelection = (studentId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: checked 
        ? [...prev.assignedTo, studentId]
        : prev.assignedTo.filter(id => id !== studentId)
    }));
  };

  const addAttachment = () => {
    if (newAttachment.content.trim()) {
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, { ...newAttachment }]
      }));
      setNewAttachment({ type: 'text', content: '', title: '' });
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.program) newErrors.program = 'Program is required';
    if (formData.assignedTo.length === 0) newErrors.assignedTo = 'At least one student must be selected';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const assignmentData = {
        ...formData,
        assignedBy: user?.id || '',
        dueDate: new Date(formData.dueDate),
        createdAt: assignment?.createdAt || new Date(),
        status: 'published' as const,
        submissions: assignment?.submissions || [],
        notifications: assignment?.notifications || []
      };

      if (isEdit && assignment) {
        await updateAssignment(assignment.id, assignmentData);
      } else {
        await addAssignment(assignmentData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving assignment:', error);
    }
  };

  const selectedProgramStudents = programs.find(p => p.id === formData.program)?.students || [];
  const availableStudents = students.filter(s => selectedProgramStudents.includes(s.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Assignment' : 'Create New Assignment'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assignment Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition ${
                  errors.title ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                }`}
                placeholder="Enter assignment title"
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
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition ${
                  errors.program ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
                }`}
              >
                <option value="">Select Program</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
              {errors.program && <p className="text-red-500 text-sm mt-1">{errors.program}</p>}
            </div>
          </div>

          {/* Assignment Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Assignment Type *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="classwork"
                  checked={formData.type === 'classwork'}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span>Classwork</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="homework"
                  checked={formData.type === 'homework'}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span>Homework</span>
              </label>
            </div>
          </div>

          {/* Classwork Type */}
          {formData.type === 'classwork' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Classwork Type *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="classworkType"
                    value="sabq"
                    checked={formData.classworkType === 'sabq'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span>Sabq</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="classworkType"
                    value="sabqi"
                    checked={formData.classworkType === 'sabqi'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span>Sabqi</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="classworkType"
                    value="manzil"
                    checked={formData.classworkType === 'manzil'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span>Manzil</span>
                </label>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition ${
                errors.description ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
              }`}
              placeholder="Enter assignment description"
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* Attachments for Homework */}
          {formData.type === 'homework' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <div className="space-y-3">
                {formData.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{attachment.title || attachment.content}</span>
                      <span className="text-sm text-gray-500 ml-2">({attachment.type})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                
                <div className="flex space-x-3">
                  <select
                    value={newAttachment.type}
                    onChange={(e) => setNewAttachment(prev => ({ ...prev, type: e.target.value as 'text' | 'link' }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="text">Text</option>
                    <option value="link">Link</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={newAttachment.title}
                    onChange={(e) => setNewAttachment(prev => ({ ...prev, title: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Content or URL"
                    value={newAttachment.content}
                    onChange={(e) => setNewAttachment(prev => ({ ...prev, content: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg flex-1"
                  />
                  <button
                    type="button"
                    onClick={addAttachment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Assign to Students *
            </label>
            {errors.assignedTo && <p className="text-red-500 text-sm mb-2">{errors.assignedTo}</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {availableStudents.map(student => (
                <label key={student.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.assignedTo.includes(student.id)}
                    onChange={(e) => handleStudentSelection(student.id, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">{student.fullName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Due Date *
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition ${
                errors.dueDate ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
              }`}
            />
            {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
            >
              {isEdit ? 'Update Assignment' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentForm;
