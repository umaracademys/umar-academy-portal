import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';

interface CommonMistake {
  type: string;
  example: string;
  correction: string;
}

interface BroadcastMessageFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const BroadcastMessageForm: React.FC<BroadcastMessageFormProps> = ({ onClose, onSuccess }) => {
  const { teachers } = useData();
  const [category, setCategory] = useState<'mistakes' | 'announcements' | 'alerts'>('announcements');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'selected' | 'active'>('all');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [commonMistakes, setCommonMistakes] = useState<CommonMistake[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

  const handleAddMistake = () => {
    setCommonMistakes([...commonMistakes, { type: '', example: '', correction: '' }]);
  };

  const handleRemoveMistake = (index: number) => {
    setCommonMistakes(commonMistakes.filter((_, i) => i !== index));
  };

  const handleMistakeChange = (index: number, field: keyof CommonMistake, value: string) => {
    const updated = [...commonMistakes];
    updated[index] = { ...updated[index], [field]: value };
    setCommonMistakes(updated);
  };

  const handleTeacherToggle = (teacherId: string) => {
    if (selectedTeachers.includes(teacherId)) {
      setSelectedTeachers(selectedTeachers.filter(id => id !== teacherId));
    } else {
      setSelectedTeachers([...selectedTeachers, teacherId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }

    if (category === 'mistakes' && commonMistakes.length === 0) {
      setError('Please add at least one common mistake');
      return;
    }

    if (recipientType === 'selected' && selectedTeachers.length === 0) {
      setError('Please select at least one teacher');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/broadcast-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          priority,
          title: title.trim(),
          message: message.trim(),
          commonMistakes: category === 'mistakes' ? commonMistakes : [],
          recipients: recipientType === 'selected' ? selectedTeachers : [],
          recipientType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const result = await response.json();
      console.log('✅ Broadcast message sent:', result);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('❌ Error sending broadcast message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Send Broadcast Message</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['mistakes', 'announcements', 'alerts'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    category === cat
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Priority *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as const).map((pri) => (
                <button
                  key={pri}
                  type="button"
                  onClick={() => setPriority(pri)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    priority === pri
                      ? pri === 'high'
                        ? 'border-red-500 bg-red-50 text-red-700 font-semibold'
                        : pri === 'medium'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700 font-semibold'
                        : 'border-green-500 bg-green-50 text-green-700 font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {pri.charAt(0).toUpperCase() + pri.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Send To *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRecipientType('all');
                  setSelectedTeachers([]);
                }}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  recipientType === 'all'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                All Teachers
              </button>
              <button
                type="button"
                onClick={() => setRecipientType('selected')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  recipientType === 'selected'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Selected Teachers
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecipientType('active');
                  setSelectedTeachers([]);
                }}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  recipientType === 'active'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Active Teachers
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {recipientType === 'all' && 'Message will be sent to all teachers'}
              {recipientType === 'selected' && 'Select specific teachers below'}
              {recipientType === 'active' && 'Message will be sent to teachers currently using Interactive Mushaf'}
            </p>
          </div>

          {/* Teacher Selection */}
          {recipientType === 'selected' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Teachers ({selectedTeachers.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                {teachers.map((teacher) => (
                  <label
                    key={teacher._id || teacher.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(teacher._id?.toString() || teacher.id || '')}
                      onChange={() => handleTeacherToggle(teacher._id?.toString() || teacher.id || '')}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{teacher.fullName || teacher.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter message title"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your message"
              required
            />
          </div>

          {/* Common Mistakes (for mistakes category) */}
          {category === 'mistakes' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Common Mistakes *
                </label>
                <button
                  type="button"
                  onClick={handleAddMistake}
                  className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  + Add Mistake
                </button>
              </div>
              <div className="space-y-3">
                {commonMistakes.map((mistake, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Mistake #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMistake(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Mistake Type</label>
                      <input
                        type="text"
                        value={mistake.type}
                        onChange={(e) => handleMistakeChange(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="e.g., Heavy letter, Light letter"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Example</label>
                      <input
                        type="text"
                        value={mistake.example}
                        onChange={(e) => handleMistakeChange(index, 'example', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="e.g., Reading 'ب' as 'پ'"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Correction</label>
                      <input
                        type="text"
                        value={mistake.correction}
                        onChange={(e) => handleMistakeChange(index, 'correction', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="e.g., Focus on proper makhraj, hold for 2 counts"
                      />
                    </div>
                  </div>
                ))}
                {commonMistakes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Click "Add Mistake" to add common mistakes to watch for
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BroadcastMessageForm;

