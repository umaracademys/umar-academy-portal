import React, { useMemo, useState } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { AssignmentTicket, WorkflowStep } from '../types';

interface AssignTicketFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AssignTicketForm: React.FC<AssignTicketFormProps> = ({ onClose, onSuccess }) => {
  const { students, teachers, tickets } = useBackendData();
  
  const [formData, setFormData] = useState({
    studentId: '',
    assignedTeacherId: '',
    program: 'Full Time HQ',
    notes: ''
  });
  const [assignmentPlan, setAssignmentPlan] = useState<'full-workflow' | 'single-step'>('full-workflow');
  const [singleStep, setSingleStep] = useState<WorkflowStep>('sabqi');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.assignedTeacherId) {
      alert('Please select a student and teacher');
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
      const baseTicket = {
        studentId: formData.studentId,
        studentName: student.fullName,
        assignedTeacherId: formData.assignedTeacherId,
        assignedTeacherName: teacher.fullName,
        status: 'assigned',
        program: formData.program,
        notes: formData.notes.trim() || undefined
      };

      const ticketData =
        assignmentPlan === 'full-workflow'
          ? {
              ...baseTicket,
              workflowStep: 'sabq' as WorkflowStep,
              autoCreateChain: true
            }
          : {
              ...baseTicket,
              workflowStep: singleStep,
              autoCreateChain: false
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
      
      const summaryMessage =
        assignmentPlan === 'full-workflow'
          ? `✅ Full workflow ready!\n\nSabq → Sabqi → Manzil → Finalize\n\n${teacher.fullName} will hear the student's new Sabq. The remaining steps will unlock automatically once each one is approved.`
          : `Ticket assigned to ${teacher.fullName} for the ${singleStep.toUpperCase()} step.`;

      alert(summaryMessage);
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">1. Choose Student</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600">
                    Student <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => {
                      const student = students.find(s => s.id === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        studentId: e.target.value,
                        program: student?.program || prev.program,
                        assignedTeacherId: student?.assignedTeacher || prev.assignedTeacherId
                      }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select student...</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.fullName} – {student.program}
                      </option>
                    ))}
                  </select>
                </div>
                <StudentSnapshot studentId={formData.studentId} tickets={tickets} />
              </div>
            </section>

            <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">2. Select Plan</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAssignmentPlan('full-workflow')}
                  className={`border rounded-xl p-4 text-left transition ${
                    assignmentPlan === 'full-workflow'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span>📖</span> Full Workflow
                  </h4>
                  <p className="text-xs text-gray-600 mt-2">
                    Create the complete chain (Sabq → Sabqi → Manzil → Finalize). Perfect for new cycles.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentPlan('single-step')}
                  className={`border rounded-xl p-4 text-left transition ${
                    assignmentPlan === 'single-step'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span>🎯</span> Single Step
                  </h4>
                  <p className="text-xs text-gray-600 mt-2">
                    Send a focused ticket for an individual step – ideal for makeups or spot checks.
                  </p>
                </button>
              </div>
              {assignmentPlan === 'single-step' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Which step?
                    </label>
                    <select
                      value={singleStep}
                      onChange={(e) => setSingleStep(e.target.value as WorkflowStep)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="sabqi">📚 Sabqi (recent revision)</option>
                      <option value="manzil">📿 Manzil (established review)</option>
                      <option value="finalize">✅ Finalize (admin follow-up)</option>
                    </select>
                  </div>
                  <div className="bg-white border border-dashed border-gray-300 rounded-lg px-4 py-3 text-xs text-gray-600">
                    {singleStep === 'sabqi' && 'Assign a revision ticket to reinforce the last few lessons.'}
                    {singleStep === 'manzil' && 'Send a manzil ticket to keep long-term memorization fresh.'}
                    {singleStep === 'finalize' && 'Send directly to admin review when all listening steps are completed.'}
                  </div>
                </div>
              )}
            </section>

            <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">3. Assign Teacher & Notes</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Teacher <span className="text-red-500">*</span>
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Internal note for listening teacher (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Example: Focus on last week’s sabqi corrections, double-check Madd rules on page 132…"
                />
              </div>
              <AssignmentPreview
                plan={assignmentPlan}
                singleStep={singleStep}
                teacherName={teachers.find(t => t.id === formData.assignedTeacherId)?.fullName}
              />
            </section>

            <div className="flex gap-3 pt-2">
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

const StudentSnapshot: React.FC<{ studentId: string; tickets: AssignmentTicket[] }> = ({ studentId, tickets }) => {
  const recentTickets = useMemo(() => {
    if (!studentId) return [];
    return tickets
      .filter(ticket => ticket.studentId === studentId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [studentId, tickets]);

  if (!studentId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-xs text-gray-500">
        Select a student to see their latest ticket activity.
      </div>
    );
  }

  if (recentTickets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-xs text-gray-600">
        No previous tickets for this student yet. This will be their first workflow cycle.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 space-y-2">
      <div className="font-semibold text-gray-800">Recent ticket history</div>
      <ul className="space-y-1">
        {recentTickets.map(ticket => (
          <li key={ticket.id || `${ticket.studentId}-${ticket.workflowStep}-${ticket.status}`} className="flex justify-between">
            <span className="flex items-center gap-1">
              {workflowIcon(ticket.workflowStep)}
              {ticket.workflowStep.toUpperCase()}
            </span>
            <span className="text-gray-400">
              {ticket.status === 'finalized' ? 'Finalized' : ticket.status.replace('_', ' ')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const AssignmentPreview: React.FC<{
  plan: 'full-workflow' | 'single-step';
  singleStep: WorkflowStep;
  teacherName?: string;
}> = ({ plan, singleStep, teacherName }) => {
  const summary =
    plan === 'full-workflow'
      ? ['📖 Sabq (New lesson)', '📚 Sabqi (Recent revision)', '📿 Manzil (Established review)', '✅ Finalize (Admin)']
      : [workflowLabel(singleStep)];

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
      <div className="font-semibold text-blue-800 mb-1">This ticket will:</div>
      <ul className="list-disc list-inside space-y-1">
        {summary.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {teacherName && (
        <p className="mt-2 text-[11px] text-blue-600">
          Assigned listener: <span className="font-semibold">{teacherName}</span>
        </p>
      )}
    </div>
  );
};

const workflowLabel = (step: WorkflowStep) => {
  switch (step) {
    case 'sabq':
      return '📖 Sabq (New lesson)';
    case 'sabqi':
      return '📚 Sabqi (Recent revision)';
    case 'manzil':
      return '📿 Manzil (Established review)';
    case 'finalize':
      return '✅ Finalize (Admin review)';
    default:
      return step;
  }
};

const workflowIcon = (step: WorkflowStep) => {
  switch (step) {
    case 'sabq':
      return '📖';
    case 'sabqi':
      return '📚';
    case 'manzil':
      return '📿';
    case 'finalize':
      return '✅';
    default:
      return '🎧';
  }
};

