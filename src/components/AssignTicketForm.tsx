import React, { useMemo, useState } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import {
  AssignmentTicket,
  WorkflowStep,
  RecitationUnit,
  StudentRecitationProfile,
  RecitationStep
} from '../types';

interface AssignTicketFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type RecitationSuggestion = {
  step: RecitationStep;
  headline: string;
  subline?: string;
  pageInfo?: string;
  notes?: string;
  isAvailable: boolean;
  unit?: RecitationUnit;
};

const STEP_ICONS: Record<RecitationStep, string> = {
  sabq: '✨',
  sabqi: '🧠',
  manzil: '🔁'
};

const STEP_TITLES: Record<RecitationStep, string> = {
  sabq: 'Sabq',
  sabqi: 'Sabqi',
  manzil: 'Manzil'
};

const formatRecitationUnit = (unit?: RecitationUnit): Omit<RecitationSuggestion, 'step' | 'isAvailable'> & { isEmpty: boolean } => {
  if (!unit) {
    return {
      headline: 'No portion recorded',
      subline: 'Update the student profile to add this step.',
      isEmpty: true
    };
  }

  let headline = '';
  let subline: string | undefined;
  let pageInfo: string | undefined;

  if (unit.unitType === 'surah') {
    const parts: string[] = [];
    if (unit.surahNumber !== undefined) {
      parts.push(`Surah ${unit.surahNumber}`);
    }
    if (unit.surahName) {
      parts.push(unit.surahName);
    }
    headline = parts.join(' – ') || 'Surah selection';

    if (unit.fromAyah !== undefined || unit.toAyah !== undefined) {
      const from = unit.fromAyah ?? '?';
      const to = unit.toAyah ?? '?';
      subline = `Ayah ${from} – ${to}`;
    }
  } else if (unit.unitType === 'juz') {
    headline = unit.juzNumber ? `Juz ${unit.juzNumber}` : 'Juz selection';
  } else if (unit.unitType === 'pages') {
    const from = unit.fromPage ?? '?';
    const to = unit.toPage ?? '?';
    headline = `Pages ${from} – ${to}`;
  }

  if (unit.pageCount) {
    pageInfo = `${unit.pageCount} page${unit.pageCount === 1 ? '' : 's'}`;
  }

  const notes = unit.notes;

  return {
    headline: headline || 'Portion recorded',
    subline,
    pageInfo,
    notes,
    isEmpty: false
  };
};

const buildRecitationSuggestions = (profile?: StudentRecitationProfile): RecitationSuggestion[] => {
  return (['sabq', 'sabqi', 'manzil'] as RecitationStep[]).map((step) => {
    const formatted = formatRecitationUnit(profile?.current?.[step]);
    return {
      step,
      headline: formatted.headline,
      subline: formatted.subline,
      pageInfo: formatted.pageInfo,
      notes: formatted.notes,
      isAvailable: !formatted.isEmpty,
      unit: profile?.current?.[step]
    };
  });
};

const buildRecitationNotes = (profile?: StudentRecitationProfile) => {
  const suggestions = buildRecitationSuggestions(profile);
  const lines = suggestions
    .filter((suggestion) => suggestion.isAvailable)
    .map((suggestion) => {
      const pieces = [
        `${STEP_TITLES[suggestion.step]}: ${suggestion.headline}`,
        suggestion.subline,
        suggestion.pageInfo,
        suggestion.notes ? `Notes: ${suggestion.notes}` : undefined
      ].filter(Boolean);
      return pieces.join(' • ');
    });

  return lines.join('\n');
};

const buildAssignmentRangeText = (suggestion?: RecitationSuggestion) => {
  if (!suggestion || !suggestion.isAvailable) {
    return undefined;
  }
  const parts = [suggestion.headline, suggestion.subline, suggestion.pageInfo].filter(Boolean);
  return parts.join(' • ');
};

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

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === formData.studentId),
    [students, formData.studentId]
  );

  const recitationSuggestions = useMemo(
    () => buildRecitationSuggestions(selectedStudent?.recitationProfile),
    [selectedStudent?.recitationProfile]
  );

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

    const sabqSuggestion = recitationSuggestions.find((suggestion) => suggestion.step === 'sabq');
    const stepForSuggestion: RecitationStep | undefined =
      assignmentPlan === 'full-workflow'
        ? 'sabq'
        : singleStep === 'finalize'
          ? undefined
          : (singleStep as RecitationStep);
    const currentStepSuggestion = stepForSuggestion
      ? recitationSuggestions.find((suggestion) => suggestion.step === stepForSuggestion)
      : undefined;

    const assignmentRange = buildAssignmentRangeText(currentStepSuggestion);
    const assignmentPortion = currentStepSuggestion?.notes || currentStepSuggestion?.pageInfo;

    setIsSubmitting(true);
    try {
      const baseTicket = {
        studentId: formData.studentId,
        studentName: student.fullName,
        assignedTeacherId: formData.assignedTeacherId,
        assignedTeacherName: teacher.fullName,
        status: 'assigned',
        program: formData.program,
        notes: formData.notes.trim() || undefined,
        assignmentRange,
        assignmentPortion
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
                      const matchingTeacher = student
                        ? teachers.find(t => t.id === (student as any).assignedTeacher || t.fullName === (student as any).assignedTeacher)
                        : undefined;
                      const notesTemplate = buildRecitationNotes(student?.recitationProfile);
                      setFormData(prev => ({
                        ...prev,
                        studentId: e.target.value,
                        program: student?.program || prev.program,
                        assignedTeacherId: matchingTeacher?.id || prev.assignedTeacherId,
                        notes: notesTemplate || ''
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
              {selectedStudent && (
                <RecitationProfilePreview suggestions={recitationSuggestions} />
              )}
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

const RecitationProfilePreview: React.FC<{ suggestions: RecitationSuggestion[] }> = ({ suggestions }) => {
  const available = suggestions.filter((suggestion) => suggestion.isAvailable);
  if (suggestions.length === 0) {
    return null;
  }

  if (available.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        No recitation profile stored for this student yet. Update their registration to unlock quick ticket suggestions.
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      {available.map((suggestion) => (
        <div
          key={`recitation-suggestion-${suggestion.step}`}
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800"
        >
          <div className="flex items-center gap-2 text-green-900">
            <span className="text-base">{STEP_ICONS[suggestion.step]}</span>
            <span className="font-semibold uppercase tracking-wide text-[11px]">{STEP_TITLES[suggestion.step]}</span>
          </div>
          <div className="mt-2 space-y-1">
            <p className="font-semibold text-sm text-green-900">{suggestion.headline}</p>
            {suggestion.subline && <p>{suggestion.subline}</p>}
            {suggestion.pageInfo && <p>{suggestion.pageInfo}</p>}
            {suggestion.notes && <p className="italic text-green-700">Notes: {suggestion.notes}</p>}
          </div>
        </div>
      ))}
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

