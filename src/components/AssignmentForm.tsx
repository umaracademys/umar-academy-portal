import React, { useState, useEffect, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, ClassworkPhase } from '../types/assignment';
import { Ticket } from '../types/ticket';
import AiSuggestionsInput from './AiSuggestionsInput';

interface AssignmentFormProps {
  studentId: string;
  assignmentId?: string | null;
  prefillTicket?: Ticket | null;
  onClose: () => void;
  onSave: () => void;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({
  studentId,
  assignmentId,
  prefillTicket,
  onClose,
  onSave
}) => {
  const { students, assignments, addAssignment, updateAssignment, refreshData } = useBackendData();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const student = students.find(s => s.id === studentId);
  const existingAssignment = assignmentId 
    ? assignments.find(a => a.id === assignmentId)
    : null;

  // Also try to find the most recent active assignment for this student if no assignmentId provided
  const studentActiveAssignment = useMemo(() => {
    if (assignmentId) return null; // If assignmentId is provided, use existingAssignment
    return assignments
      .filter(a => a.studentId === studentId && a.status === 'active')
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      })[0] || null;
  }, [assignments, studentId, assignmentId]);

  // Refresh data when component mounts to ensure we have the latest assignment data (only once)
  const hasRefreshed = React.useRef(false);
  useEffect(() => {
    if (!hasRefreshed.current) {
      hasRefreshed.current = true;
      refreshData();
    }
  }, []); // Empty deps - only run on mount

  // Form state
  const [classwork, setClasswork] = useState<{
    sabq: ClassworkPhase[];
    sabqi: ClassworkPhase[];
    manzil: ClassworkPhase[];
  }>({
    sabq: [],
    sabqi: [],
    manzil: []
  });

  const [homework, setHomework] = useState<{
    enabled: boolean;
    content: string;
    link: string;
  }>({
    enabled: false,
    content: '',
    link: ''
  });

  const [comment, setComment] = useState('');

  // Initialize form with existing assignment data or prefill ticket
  useEffect(() => {
    console.log('🔄 AssignmentForm useEffect triggered:', {
      assignmentId,
      existingAssignment: existingAssignment ? {
        id: existingAssignment.id,
        studentId: existingAssignment.studentId,
        sabqCount: existingAssignment.classwork?.sabq?.length || 0,
        sabqiCount: existingAssignment.classwork?.sabqi?.length || 0,
        manzilCount: existingAssignment.classwork?.manzil?.length || 0,
        classwork: existingAssignment.classwork
      } : null,
      prefillTicket: prefillTicket ? { type: prefillTicket.type } : null
    });

    if (existingAssignment) {
      const classworkData = existingAssignment.classwork || { sabq: [], sabqi: [], manzil: [] };
      console.log('📝 Setting classwork from existing assignment:', {
        sabq: classworkData.sabq.length,
        sabqi: classworkData.sabqi.length,
        manzil: classworkData.manzil.length,
        fullClasswork: classworkData
      });
      setClasswork(classworkData);
      const hw = existingAssignment.homework || { enabled: false, content: '', link: '' };
      setHomework({
        enabled: hw.enabled || false,
        content: hw.content || '',
        link: hw.link || ''
      });
      setComment(existingAssignment.comment || '');
    } else if (prefillTicket && prefillTicket.type === 'sabq') {
      // Pre-fill sabq from ticket
      setClasswork({
        sabq: [{
          type: 'sabq',
          assignmentRange: '', // Will need to be filled manually or from ticket
          details: prefillTicket.adminComment || ''
        }],
        sabqi: [],
        manzil: []
      });
      setComment(prefillTicket.adminComment || '');
    } else if (studentActiveAssignment) {
        // If no assignmentId provided, use the most recent active assignment for this student
        console.log('📝 Found active assignment for student:', {
          id: studentActiveAssignment.id,
          sabq: studentActiveAssignment.classwork?.sabq?.length || 0,
          sabqi: studentActiveAssignment.classwork?.sabqi?.length || 0,
          manzil: studentActiveAssignment.classwork?.manzil?.length || 0
        });
        const classworkData = studentActiveAssignment.classwork || { sabq: [], sabqi: [], manzil: [] };
        console.log('📝 Setting classwork from active assignment:', {
          sabq: classworkData.sabq.length,
          sabqi: classworkData.sabqi.length,
          manzil: classworkData.manzil.length,
          fullClasswork: classworkData
        });
        setClasswork(classworkData);
        const hw = studentActiveAssignment.homework || { enabled: false, content: '', link: '' };
        setHomework({
          enabled: hw.enabled || false,
          content: hw.content || '',
          link: hw.link || ''
        });
        setComment(studentActiveAssignment.comment || '');
      }
    }, [existingAssignment, prefillTicket, assignmentId, studentId, studentActiveAssignment]);

  const addClassworkPhase = (type: 'sabq' | 'sabqi' | 'manzil') => {
    setClasswork(prev => ({
      ...prev,
      [type]: [...prev[type], {
        type,
        assignmentRange: '',
        details: ''
      }]
    }));
  };

  const removeClassworkPhase = (type: 'sabq' | 'sabqi' | 'manzil', index: number) => {
    setClasswork(prev => ({
        ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateClassworkPhase = (
    type: 'sabq' | 'sabqi' | 'manzil',
    index: number,
    field: keyof ClassworkPhase,
    value: string | number
  ) => {
    setClasswork(prev => ({
      ...prev,
      [type]: prev[type].map((phase, i) => 
        i === index ? { ...phase, [field]: value } : phase
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!student || !user) {
      alert('Student or user information is missing');
      return;
    }

    // Validate that at least one classwork phase has assignmentRange
    const hasClasswork = 
      classwork.sabq.some(p => p.assignmentRange.trim()) ||
      classwork.sabqi.some(p => p.assignmentRange.trim()) ||
      classwork.manzil.some(p => p.assignmentRange.trim());

    if (!hasClasswork && !homework.enabled && !comment.trim()) {
      alert('Please add at least one classwork phase, homework, or comment');
      return;
    }

    // Filter out empty classwork phases
    const filteredClasswork = {
      sabq: classwork.sabq.filter(p => p.assignmentRange.trim()),
      sabqi: classwork.sabqi.filter(p => p.assignmentRange.trim()),
      manzil: classwork.manzil.filter(p => p.assignmentRange.trim())
    };

    setIsSaving(true);
    try {
      const assignmentData: Assignment = {
        id: assignmentId || '',
        studentId: student.id,
        studentName: student.fullName,
        assignedBy: user.id || '',
        assignedByName: user.name || user.email || 'Unknown',
        assignedByRole: (user.role === 'superadmin' ? 'super_admin' : user.role) as 'admin' | 'super_admin' | 'teacher',
        classwork: filteredClasswork,
        homework: {
          enabled: homework.enabled,
          content: homework.content.trim(),
          link: homework.link.trim()
        },
        comment: comment.trim(),
        status: 'active'
      };

      if (assignmentId && existingAssignment) {
        await updateAssignment(assignmentId, assignmentData);
      } else {
        // If this assignment is being created from a sabq ticket, include the ticket ID
        const assignmentDataWithTicket = prefillTicket && prefillTicket.type === 'sabq' && prefillTicket.id
          ? { ...assignmentData, ticketId: prefillTicket.id }
          : assignmentData;
        await addAssignment(assignmentDataWithTicket);
      }

      onSave();
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert('Failed to save assignment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b-4 border-accent bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.9)] shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg">
                {assignmentId ? 'Edit' : 'Create'} Assignment
          </h2>
              <p className="text-white mt-2 text-base sm:text-lg font-extrabold drop-shadow-md">
                {student?.fullName || 'Student'}
              </p>
            </div>
          <button
            onClick={onClose}
              className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-accent text-primary rounded-full transition-all text-3xl sm:text-4xl font-extrabold shadow-2xl hover:scale-110 hover:bg-accent/90 border-2 border-accent/50"
              title="Close"
          >
            ×
          </button>
        </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-background to-white">
          {/* Classwork Section */}
          <div className="mb-6">
            <h3 className="text-base sm:text-lg font-extrabold text-primary mb-4">Classwork</h3>
            
            {/* Sabq */}
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <label className="text-sm font-extrabold text-primary">Sabq</label>
                <button
                  type="button"
                  onClick={() => addClassworkPhase('sabq')}
                  className="px-6 py-3 text-sm sm:text-base text-white rounded-full font-extrabold transition-all shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                    e.currentTarget.style.color = 'white';
                  }}
                >
                  + Add Sabq
                </button>
              </div>
              <div className="space-y-3">
                {classwork.sabq.map((phase, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 items-start p-4 bg-gradient-to-br from-soft-primary to-white border-2 border-primary/20 rounded-3xl shadow-md">
                    <div className="flex-1 space-y-2 w-full">
                      <input
                        type="text"
                        placeholder="Assignment Range (e.g., Surah Al-Fatiha, Ayah 1-7)"
                        value={phase.assignmentRange}
                        onChange={(e) => updateClassworkPhase('sabq', index, 'assignmentRange', e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                        required
                      />
              <AiSuggestionsInput
                        value={phase.details || ''}
                        onChange={(value) => updateClassworkPhase('sabq', index, 'details', value)}
                        category="general"
                        rows={2}
                        multiline={true}
                        className="w-full px-4 py-2.5 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                        placeholder="Details (optional)"
                      />
            </div>
                    <button
                      type="button"
                      onClick={() => removeClassworkPhase('sabq', index)}
                      className="px-4 py-2 bg-red-600 text-white rounded-full font-extrabold hover:bg-red-700 transition-all shadow-md whitespace-nowrap self-end sm:self-auto hover:scale-105"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {classwork.sabq.length === 0 && (
                  <p className="text-sm text-primary-soft italic">No sabq entries. Click "+ Add Sabq" to add one.</p>
                )}
              </div>
            </div>

            {/* Sabqi */}
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <label className="text-sm font-extrabold text-primary">Sabqi</label>
                <button
                  type="button"
                  onClick={() => addClassworkPhase('sabqi')}
                  className="px-6 py-3 text-sm sm:text-base text-white rounded-full font-extrabold transition-all shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                    e.currentTarget.style.color = 'white';
                  }}
                >
                  + Add Sabqi
                </button>
          </div>
              <div className="space-y-3">
                {classwork.sabqi.map((phase, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 items-start p-4 bg-gradient-to-br from-soft-primary to-white border-2 border-primary/20 rounded-3xl shadow-md">
                    <div className="flex-1 space-y-2 w-full">
                      <input
                        type="text"
                        placeholder="Assignment Range (e.g., Surah Al-Fatiha, Ayah 1-7)"
                        value={phase.assignmentRange}
                        onChange={(e) => updateClassworkPhase('sabqi', index, 'assignmentRange', e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                        required
                      />
                      <AiSuggestionsInput
                        value={phase.details || ''}
                        onChange={(value) => updateClassworkPhase('sabqi', index, 'details', value)}
                        category="general"
                        rows={2}
                        multiline={true}
                        className="w-full px-4 py-2.5 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                        placeholder="Details (optional)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeClassworkPhase('sabqi', index)}
                      className="px-4 py-2 bg-red-600 text-white rounded-full font-extrabold hover:bg-red-700 transition-all shadow-md whitespace-nowrap self-end sm:self-auto hover:scale-105"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {classwork.sabqi.length === 0 && (
                  <p className="text-sm text-primary-soft italic">No sabqi entries. Click "+ Add Sabqi" to add one.</p>
                )}
              </div>
            </div>

            {/* Manzil */}
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <label className="text-sm font-extrabold text-primary">Manzil</label>
                <button
                  type="button"
                  onClick={() => addClassworkPhase('manzil')}
                  className="px-6 py-3 text-sm sm:text-base text-white rounded-full font-extrabold transition-all shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                    e.currentTarget.style.color = 'white';
                  }}
                >
                  + Add Manzil
                </button>
              </div>
              <div className="space-y-3">
                {classwork.manzil.map((phase, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 items-start p-4 bg-gradient-to-br from-soft-primary to-white border-2 border-primary/20 rounded-3xl shadow-md">
                    <div className="flex-1 space-y-2 w-full">
                  <input
                    type="text"
                        placeholder="Assignment Range (e.g., Surah Al-Fatiha, Ayah 1-7)"
                        value={phase.assignmentRange}
                        onChange={(e) => updateClassworkPhase('manzil', index, 'assignmentRange', e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                        required
                  />
                  <AiSuggestionsInput
                        value={phase.details || ''}
                        onChange={(value) => updateClassworkPhase('manzil', index, 'details', value)}
                        category="general"
                        rows={2}
                        multiline={true}
                        className="w-full px-4 py-2.5 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                        placeholder="Details (optional)"
                      />
                    </div>
                  <button
                    type="button"
                      onClick={() => removeClassworkPhase('manzil', index)}
                      className="px-4 py-2 bg-red-600 text-white rounded-full font-extrabold hover:bg-red-700 transition-all shadow-md whitespace-nowrap self-end sm:self-auto hover:scale-105"
                  >
                      Remove
                  </button>
                </div>
                ))}
                {classwork.manzil.length === 0 && (
                  <p className="text-sm text-primary-soft italic">No manzil entries. Click "+ Add Manzil" to add one.</p>
                )}
              </div>
            </div>
          </div>

          {/* Homework Section */}
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="homework-enabled"
                checked={homework.enabled}
                onChange={(e) => setHomework(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 text-primary border-2 border-primary/30 rounded focus:ring-primary"
              />
              <label htmlFor="homework-enabled" className="ml-2 text-sm font-extrabold text-primary">
                Enable Homework
              </label>
            </div>
            
            {homework.enabled && (
              <div className="space-y-3 pl-0 sm:pl-6">
                <div>
                  <label className="block text-sm font-extrabold text-primary mb-1">
                    Homework Content
                  </label>
                  <AiSuggestionsInput
                    value={homework.content}
                    onChange={(value) => setHomework(prev => ({ ...prev, content: value }))}
                    category="general"
                    rows={4}
                    multiline={true}
                    className="w-full px-4 py-2.5 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                    placeholder="Enter homework instructions or content..."
                  />
                </div>
          <div>
                  <label className="block text-sm font-extrabold text-primary mb-1">
                    Homework Link (optional)
            </label>
                  <input
                    type="url"
                    value={homework.link}
                    onChange={(e) => setHomework(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                  />
                </div>
            </div>
            )}
          </div>

          {/* Comment Section */}
          <div className="mb-6">
            <label className="block text-sm font-extrabold text-primary mb-2">
              Comment
            </label>
            <AiSuggestionsInput
              value={comment}
              onChange={(value) => setComment(value)}
              category="general"
              rows={4}
              multiline={true}
              className="w-full px-4 py-2.5 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm"
              placeholder="Add any additional comments or notes..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t-2 border-primary/20">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-primary/30 text-primary rounded-full font-extrabold hover:bg-primary hover:text-white transition-all shadow-lg hover:shadow-xl hover:scale-105"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 text-white rounded-full font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-105"
              style={{ backgroundColor: 'var(--color-primary)' }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                  e.currentTarget.style.color = 'var(--color-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : assignmentId ? 'Update Assignment' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentForm;

// Simplified and improved UI
