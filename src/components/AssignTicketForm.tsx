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
    program: 'Full Time HQ',
    autoCreateChain: true // Auto-create full workflow chain by default
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
      const ticketData: any = {
        studentId: formData.studentId,
        studentName: student.fullName,
        workflowStep: formData.workflowStep,
        assignedTeacherId: formData.assignedTeacherId,
        assignedTeacherName: teacher.fullName,
        status: 'assigned',
        program: formData.program,
        autoCreateChain: formData.autoCreateChain && formData.workflowStep === 'sabq'
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });

      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }

      const result = await response.json();
      
      if (result.chainCreated) {
        alert(`✅ Full workflow chain created!\n\n📖 Sabq → 📚 Sabqi → 📿 Manzil → ✅ Finalize\n\nThe Sabq ticket is assigned to ${teacher.fullName}. Subsequent steps will be activated as each step is approved.`);
      } else {
      alert('Ticket assigned successfully!');
      }
      
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
                <option value="sabq">📖 Sabq (Start New Workflow)</option>
                <option value="sabqi">📚 Sabqi (Single Ticket)</option>
                <option value="manzil">📿 Manzil (Single Ticket)</option>
                <option value="finalize">✅ Finalize (Single Ticket)</option>
              </select>
              {formData.workflowStep === 'sabq' && (
                <p className="mt-2 text-sm text-gray-600">
                  💡 Creating a Sabq ticket will automatically create the full workflow chain (Sabq → Sabqi → Manzil → Finalize)
                </p>
              )}
            </div>
            
            {formData.workflowStep === 'sabq' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoCreateChain"
                  checked={formData.autoCreateChain}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoCreateChain: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoCreateChain" className="ml-2 block text-sm text-gray-700">
                  Auto-create full workflow chain (Sabq → Sabqi → Manzil → Finalize)
                </label>
              </div>
            )}

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

