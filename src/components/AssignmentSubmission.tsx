import React, { useState } from 'react';
import { Assignment, AssignmentSubmission } from '../types/assignment';

interface AssignmentSubmissionProps {
  assignment: Assignment;
  onSubmit: (submission: Omit<AssignmentSubmission, 'id'>) => void;
  onClose: () => void;
}

const AssignmentSubmissionForm: React.FC<AssignmentSubmissionProps> = ({ assignment, onSubmit, onClose }) => {
  const [submissionData, setSubmissionData] = useState({
    content: '',
    attachments: [] as { type: 'file' | 'link'; content: string; title?: string }[]
  });
  const [newAttachment, setNewAttachment] = useState({ type: 'file' as 'file' | 'link', content: '', title: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSubmissionData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addAttachment = () => {
    if (newAttachment.content.trim()) {
      setSubmissionData(prev => ({
        ...prev,
        attachments: [...prev.attachments, { ...newAttachment }]
      }));
      setNewAttachment({ type: 'file', content: '', title: '' });
    }
  };

  const removeAttachment = (index: number) => {
    setSubmissionData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!submissionData.content.trim()) {
      newErrors.content = 'Submission content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const submission: Omit<AssignmentSubmission, 'id'> = {
      studentId: 'current-student-id', // This would come from auth context
      assignmentId: assignment.id,
      submittedAt: new Date(),
      content: submissionData.content,
      attachments: submissionData.attachments,
      status: 'submitted'
    };

    onSubmit(submission);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Submit Assignment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Assignment Details */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">{assignment.title}</h3>
          <p className="text-gray-600 text-sm mb-2">{assignment.description}</p>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Type: {assignment.type} {assignment.type === 'classwork' && `(${assignment.classworkType})`}</span>
            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submission Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Submission *
            </label>
            <textarea
              name="content"
              value={submissionData.content}
              onChange={handleInputChange}
              rows={6}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition ${
                errors.content ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
              }`}
              placeholder="Enter your submission content here..."
            />
            {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            <div className="space-y-3">
              {submissionData.attachments.map((attachment, index) => (
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
                  onChange={(e) => setNewAttachment(prev => ({ ...prev, type: e.target.value as 'file' | 'link' }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="file">File</option>
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
                  placeholder="File path or URL"
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
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
            >
              Submit Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentSubmissionForm;


