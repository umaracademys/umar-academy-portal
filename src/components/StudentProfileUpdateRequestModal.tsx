import React, { useState } from 'react';

interface StudentProfileUpdateRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
  studentName: string;
  studentId: string;
}

const StudentProfileUpdateRequestModal: React.FC<StudentProfileUpdateRequestModalProps> = ({
  onClose,
  onSuccess,
  studentName,
  studentId,
}) => {
  const [requestDetails, setRequestDetails] = useState('');
  const [updateFields, setUpdateFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableFields = [
    { key: 'personal_info', label: 'Personal Information (Name, Email, Phone)' },
    { key: 'parent', label: 'Parent/Guardian Information' },
    { key: 'contact', label: 'Contact Information' },
    { key: 'program', label: 'Program' },
    { key: 'schedule', label: 'Class Schedule' },
    { key: 'financial', label: 'Financial Information' },
    { key: 'academic', label: 'Academic Records' },
    { key: 'other', label: 'Other' },
  ];

  const handleFieldToggle = (fieldKey: string) => {
    setUpdateFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (updateFields.length === 0 && !requestDetails.trim()) {
      alert('Please select at least one field to update or provide details.');
      return;
    }

    setIsSubmitting(true);

    try {
      const API_BASE =
        (import.meta.env?.VITE_API_BASE_URL as string) ||
        'http://localhost:3001/api';

      const fieldLabels = updateFields.map(
        (key) => availableFields.find((f) => f.key === key)?.label || key
      );

      const message = `${
        fieldLabels.length > 0
          ? `Requesting update for: ${fieldLabels.join(', ')}. `
          : ''
      }${requestDetails.trim() || 'No additional details provided.'}`;

      const notification = {
        type: 'profile_update_request',
        title: `Profile Update Request from ${studentName}`,
        message,
        studentId,
        priority: 'medium',
      };

      const response = await fetch(`${API_BASE}/admin-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        throw new Error('Failed to submit profile update request');
      }

      await response.json();
      alert('Profile update request submitted successfully! An admin will review your request shortly.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting profile update request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Request Profile Update</h2>
          <p className="text-primary-100 text-sm mt-1">
            Specify what information you would like to update in your profile
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Field Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What would you like to update? (Select all that apply)
            </label>
            <div className="space-y-2">
              {availableFields.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={updateFields.includes(field.key)}
                    onChange={() => handleFieldToggle(field.key)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Details (Optional)
            </label>
            <textarea
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              rows={4}
              placeholder="Please provide any additional information about the changes you'd like to make..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentProfileUpdateRequestModal;

