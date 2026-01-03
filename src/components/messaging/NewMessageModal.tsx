/**
 * New Message Modal
 * 
 * Modal for initiating new conversations.
 * Allows selection of message type, participants, and priority.
 * 
 * @module components/messaging/NewMessageModal
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

interface NewMessageModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NewMessageModal: React.FC<NewMessageModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const { teachers, students } = useData();
  const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
  
  const [messageType, setMessageType] = useState<'teacher_student' | 'pair_teacher'>('teacher_student');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedPair, setSelectedPair] = useState<string>('');
  const [selectedTeacher2, setSelectedTeacher2] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [initialMessage, setInitialMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (messageType === 'teacher_student' && (!selectedTeacher || !selectedStudent)) {
      alert('Please select both teacher and student');
      return;
    }
    
    if (messageType === 'pair_teacher' && (!selectedTeacher || !selectedTeacher2)) {
      alert('Please select both teachers');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      
      // Build participants
      const participants = [];
      if (messageType === 'teacher_student') {
        participants.push(
          { role: 'teacher', userId: selectedTeacher },
          { role: 'student', userId: selectedStudent }
        );
      } else {
        participants.push(
          { role: 'teacher', userId: selectedTeacher },
          { role: 'teacher', userId: selectedTeacher2 }
        );
      }

      // Create conversation
      const convResponse = await fetch(`${API_BASE}/api/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: messageType,
          participants,
          context: messageType === 'teacher_student' 
            ? { studentId: selectedStudent, teacherId: selectedTeacher }
            : { pairId: selectedPair }
        })
      });

      if (!convResponse.ok) {
        throw new Error('Failed to create conversation');
      }

      const conversation = await convResponse.json();

      // Send initial message if provided
      if (initialMessage.trim()) {
        await fetch(`${API_BASE}/api/conversations/${conversation._id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            body: initialMessage.trim(),
            attachments: [],
            priority
          })
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert(error instanceof Error ? error.message : 'Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Initiate New Message</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Message Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Message Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="teacher_student"
                  checked={messageType === 'teacher_student'}
                  onChange={(e) => setMessageType(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm">Teacher ↔ Student</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="pair_teacher"
                  checked={messageType === 'pair_teacher'}
                  onChange={(e) => setMessageType(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm">Teacher ↔ Teacher</span>
              </label>
            </div>
          </div>

          {/* Participants */}
          {messageType === 'teacher_student' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Teacher *
                </label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select teacher...</option>
                  {teachers.map((teacher: any) => (
                    <option key={teacher.id || teacher._id} value={teacher.id || teacher._id}>
                      {teacher.fullName || teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Student *
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select student...</option>
                  {students.map((student: any) => (
                    <option key={student.id || student._id} value={student.id || student._id}>
                      {student.fullName || student.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Teacher 1 *
                </label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select teacher...</option>
                  {teachers.map((teacher: any) => (
                    <option key={teacher.id || teacher._id} value={teacher.id || teacher._id}>
                      {teacher.fullName || teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Teacher 2 *
                </label>
                <select
                  value={selectedTeacher2}
                  onChange={(e) => setSelectedTeacher2(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select teacher...</option>
                  {teachers
                    .filter((t: any) => (t.id || t._id) !== selectedTeacher)
                    .map((teacher: any) => (
                      <option key={teacher.id || teacher._id} value={teacher.id || teacher._id}>
                        {teacher.fullName || teacher.name}
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Initial Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Initial Message (Optional)
            </label>
            <textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              rows={4}
              placeholder="Type your initial message..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || (messageType === 'teacher_student' && (!selectedTeacher || !selectedStudent)) || (messageType === 'pair_teacher' && (!selectedTeacher || !selectedTeacher2))}
            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewMessageModal;

