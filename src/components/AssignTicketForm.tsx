import React, { useState } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { AssignmentTicket, WorkflowStep } from '../types';

interface AssignTicketFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AssignTicketForm: React.FC<AssignTicketFormProps> = ({ onClose, onSuccess }) => {
  const { students, teachers, addTicket } = useBackendData();
  
  const [formData, setFormData] = useState({
    studentId: '',
    workflowStep: 'sabq' as WorkflowStep,
    assignedTeacherId: '',
    program: 'Full Time HQ'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.assignedTeacherId) {
      alert('Please select student and teacher');
      return;
    }

    const student = students.find(s => s.id === formData.studentId);
    const teacher = teachers.find(t => t.id === formData.assignedTeacherId);

    if (!student || !teacher) {
      alert('Student or teacher not found');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket: AssignmentTicket = {
        id: '', // Will be set by backend
        studentId: formData.studentId,
        studentName: student.fullName,
        workflowStep: formData.workflowStep,
        assignedTeacherId: formData.assignedTeacherId,
        assignedTeacherName: teacher.fullName,
        status: 'assigned',
        program: formData.program,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addTicket(ticket);
      alert('Ticket assigned successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to assign ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">🎫 Assign New Ticket</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.studentId}
                onChange={(e) => {
                  const student = students.find(s => s.id === e.target.value);
                  setFormData(prev => ({
                    ...prev,
                    studentId: e.target.value,
                    program: student?.program || prev.program
                  }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select student...</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.fullName} - {student.program}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workflow Step <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.workflowStep}
                onChange={(e) => setFormData(prev => ({ ...prev, workflowStep: e.target.value as WorkflowStep }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="sabq">📖 Sabq</option>
                <option value="sabqi">📚 Sabqi</option>
                <option value="manzil">📿 Manzil</option>
                <option value="finalize">✅ Finalize</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Teacher <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.assignedTeacherId}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTeacherId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select teacher...</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Program
              </label>
              <select
                value={formData.program}
                onChange={(e) => setFormData(prev => ({ ...prev, program: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Full Time HQ">Full Time HQ</option>
                <option value="Part Time HQ">Part Time HQ</option>
                <option value="After School Reading">After School Reading</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Assigning...' : 'Assign Ticket'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignTicketForm;

