import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Program, ClassworkSection } from '../types/assignment';
import { MushafMistake } from '@umar-academy/mushaf';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { useBackendData } from '../contexts/BackendDataContext';
import { AssignmentTicket } from '../types';
import ModernAssignmentForm from '../components/ModernAssignmentForm';
import AssignmentSectionBuilder from '../components/assignment/AssignmentSectionBuilder';

const AssignmentsPage: React.FC = () => {
  const { assignments } = useData();
  const { students, tickets, teachers, assignTicketToNext, finalizeTicket, updateAssignment, refreshData } = useBackendData();
  const { user } = useAuth();
  
  const [showMushafForAssignment, setShowMushafForAssignment] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState<number>(1);
  const [filterProgram, setFilterProgram] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<AssignmentTicket | null>(null);
  const [selectedNextTeacher, setSelectedNextTeacher] = useState('');
  const [finalizeData, setFinalizeData] = useState({
    finalReport: '',
    homework: '',
    homeworkLink: ''
  });
  const [finalizeSections, setFinalizeSections] = useState<ClassworkSection[]>([]);
  const [finalReportTouched, setFinalReportTouched] = useState(false);
  const [homeworkTouched, setHomeworkTouched] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAssignmentForAction, setSelectedAssignmentForAction] = useState<Assignment | null>(null);
  const [showAssignTeacherOption, setShowAssignTeacherOption] = useState(false);
  const [selectedTeacherForAssignment, setSelectedTeacherForAssignment] = useState('');

  // Check if user can create assignments
  const canCreateAssignments = user?.role === 'superadmin' || 
    user?.role === 'admin' ||
    user?.role === 'teacher';

  // Mock programs - in real app, this would come from API
  useEffect(() => {
    const mockPrograms: Program[] = [
      { id: '1', name: 'Full Time HQ', description: 'Full-time Hifz program', students: ['1', '2', '3'], createdAt: new Date(), status: 'active' },
      { id: '2', name: 'Part Time HQ', description: 'Part-time Hifz program', students: ['1', '4', '5'], createdAt: new Date(), status: 'active' },
      { id: '3', name: 'After School Reading', description: 'After school reading program', students: ['2', '3', '6'], createdAt: new Date(), status: 'active' }
    ];
    setPrograms(mockPrograms);
  }, []);

  useEffect(() => {
    if (selectedTicket?.workflowStep === 'finalize') {
      const ticketSections = (selectedTicket as any).classworkSections as ClassworkSection[] | undefined;

      if (ticketSections && ticketSections.length > 0) {
        setFinalizeSections(ticketSections);
      } else if (selectedTicket.assignmentRange) {
        setFinalizeSections([
          {
            step: (selectedTicket.workflowStep as 'sabq' | 'sabqi' | 'manzil') || 'sabq',
            title: 'Ticket range',
            label: 'Ticket range',
            assignmentRange: selectedTicket.assignmentRange,
            assignmentPortion: selectedTicket.assignmentPortion,
            order: 0,
            summary: selectedTicket.assignmentRange,
          },
        ]);
      } else {
        setFinalizeSections([]);
      }

      setFinalizeData({
        finalReport: selectedTicket.finalReport || '',
        homework: selectedTicket.homework || '',
        homeworkLink: selectedTicket.homeworkLink || '',
      });
      setFinalReportTouched(Boolean(selectedTicket.finalReport));
      setHomeworkTouched(Boolean(selectedTicket.homework));
    } else {
      setFinalizeSections([]);
      setFinalizeData({
        finalReport: '',
        homework: '',
        homeworkLink: '',
      });
      setFinalReportTouched(false);
      setHomeworkTouched(false);
    }
  }, [selectedTicket]);

  // Filter assignments - only show those from finalized tickets
  const filteredAssignments = assignments.filter(assignment => {
    // Only show assignments created from approved/finalized tickets
    const hasTicketId = !!(assignment as any).fromTicketId;
    
    const programMatch = !filterProgram || assignment.program === filterProgram;
    const typeMatch = !filterType || assignment.type === filterType;
    
    return hasTicketId && programMatch && typeMatch;
  });

  // Get approved tickets that need action (assign to next teacher or finalize)
  const approvedTicketsNeedingAction = tickets.filter(ticket => 
    ticket.status === 'approved' && 
    ticket.workflowStep !== 'finalize' && 
    (!ticket.nextTicketId || (() => {
      const nextTicket = tickets.find(t => t.id === ticket.nextTicketId || (t as any)._id === ticket.nextTicketId);
      return nextTicket?.status === 'pending';
    })())
  );

  const approvedFinalizeTickets = tickets.filter(ticket => 
    ticket.status === 'approved' && 
    ticket.workflowStep === 'finalize'
  );

  // Get student name from student ID
  const getStudentName = (studentId: string): string => {
    const student = students.find(s => (s as any)._id === studentId || s.id === studentId);
    return student?.fullName || 'Unknown Student';
  };

  // Get mistake type label
  const getMistakeTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      "memory": "Memory",
      "madd": "Mad (Elongation)",
      "ikhfa": "Ikhfa",
      "holding": "Holding/Fluency",
      "tech": "Ghunna",
      "other": "Other",
    };
    return typeMap[type] || type;
  };

  useEffect(() => {
    if (!selectedTicket || selectedTicket.workflowStep !== 'finalize') return;

    const sectionSummaries = finalizeSections.map((section, index) => {
      const title =
        section.label ||
        section.title ||
        `${section.step.charAt(0).toUpperCase() + section.step.slice(1)} ${finalizeSections.length > 1 ? index + 1 : ''}`;
      const range = section.summary || section.assignmentRange || '';
      const notes = section.details ? ` — ${section.details}` : '';
      return `• ${title}${range ? `: ${range}` : ''}${notes}`;
    });

    const mistakes = selectedTicket.mushafMarkings || [];
    const mistakeCounts = mistakes.reduce<Record<string, number>>((acc, mistake) => {
      const key = mistake.type || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const mistakeLines = Object.entries(mistakeCounts).map(
      ([type, count]) => `• ${getMistakeTypeLabel(type)} — ${count} time${count === 1 ? '' : 's'}`
    );

    const autoReport = [
      `Classwork Summary (${new Date().toLocaleDateString()}):`,
      sectionSummaries.length > 0 ? sectionSummaries.join('\n') : '• Portions recorded via ticket workflow.',
      '',
      mistakes.length > 0
        ? `Recorded Mistakes (${mistakes.length}):`
        : 'No mistakes recorded during this session.',
      mistakeLines.join('\n'),
    ]
      .filter(Boolean)
      .join('\n');

    const lastSection = finalizeSections[finalizeSections.length - 1];
    const mistakeLabels = mistakeLines.map((line) =>
      line.replace(/^•\s*/, '').replace(/\s—.*$/, '').toLowerCase()
    );
    const homeworkLines = [
      lastSection?.summary || lastSection?.assignmentRange
        ? `Review ${lastSection.summary || lastSection.assignmentRange} with clean recitation.`
        : null,
      mistakeLabels.length > 0
        ? `Focus on correcting: ${mistakeLabels.join(', ')}.`
        : null,
      'Prepare the next portion with steady pacing and tajweed focus.',
    ].filter(Boolean);

    const autoHomework = homeworkLines.join('\n');

    if (!finalReportTouched) {
      setFinalizeData((prev) => ({
        ...prev,
        finalReport: autoReport,
      }));
    }

    if (!homeworkTouched) {
      setFinalizeData((prev) => ({
        ...prev,
        homework: autoHomework,
      }));
    }
  }, [finalizeSections, selectedTicket, finalReportTouched, homeworkTouched]);

  // Get workflow step label
  const getWorkflowStepLabel = (assignment: Assignment): string => {
    if (assignment.classworkType === 'sabq') return 'Sabq';
    if (assignment.classworkType === 'sabqi') return 'Sabqi';
    if (assignment.classworkType === 'manzil') return 'Manzil';
    return 'Recitation';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-700 rounded-2xl p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">📝 Finalized Assignments</h1>
                <p className="text-purple-100 text-lg">View assignments created from approved ticket workflow</p>
              </div>
                {canCreateAssignments && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                  className="px-8 py-4 bg-white text-purple-600 rounded-xl hover:bg-purple-50 font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center"
                    >
                      <span className="mr-2">✨</span>
                      Create New Assignment
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Approved Tickets Needing Action */}
        {(approvedTicketsNeedingAction.length > 0 || approvedFinalizeTickets.length > 0) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ⚠️ Approved Tickets Needing Action
            </h2>
            <div className="space-y-3">
              {approvedTicketsNeedingAction.map(ticket => {
                const ticketId = ticket.id || (ticket as any)._id;
                return (
                  <div key={ticketId} className="bg-white p-4 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{getStudentName(ticket.studentId)}</p>
                        <p className="text-sm text-gray-600">
                          {ticket.workflowStep === 'sabq' ? '📖 Sabq' : 
                           ticket.workflowStep === 'sabqi' ? '📚 Sabqi' : 
                           ticket.workflowStep === 'manzil' ? '📿 Manzil' : ticket.workflowStep}
                          {' → '}
                          {ticket.workflowStep === 'sabq' ? '📚 Sabqi' : 
                           ticket.workflowStep === 'sabqi' ? '📿 Manzil' : 
                           ticket.workflowStep === 'manzil' ? '✅ Finalize' : 'Next Step'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Student hasn't recited next portion yet</p>
                      </div>
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Assign to Next Teacher
                      </button>
                    </div>
                  </div>
                );
              })}
              {approvedFinalizeTickets.map(ticket => {
                const ticketId = ticket.id || (ticket as any)._id;
                return (
                  <div key={ticketId} className="bg-white p-4 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{getStudentName(ticket.studentId)}</p>
                        <p className="text-sm text-gray-600">✅ Finalize - Ready to add homework</p>
                      </div>
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                      >
                        Finalize & Add Homework
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ticket Action Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Ticket Action</h3>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setSelectedNextTeacher('');
                    setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="font-semibold">Student: {getStudentName(selectedTicket.studentId)}</p>
                <p className="text-sm text-gray-600">Step: {selectedTicket.workflowStep}</p>
              </div>

              {selectedTicket.workflowStep !== 'finalize' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Teacher for Next Step
                  </label>
                  <select
                    value={selectedNextTeacher}
                    onChange={(e) => setSelectedNextTeacher(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                  >
                    <option value="">Choose a teacher...</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.fullName}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        if (!selectedNextTeacher) {
                          alert('Please select a teacher');
                          return;
                        }
                        const teacher = teachers.find(t => t.id === selectedNextTeacher);
                        if (!teacher) return;
                        try {
                          const ticketId = selectedTicket.id || (selectedTicket as any)._id;
                          await assignTicketToNext(ticketId, teacher.id, teacher.fullName);
                          alert('✅ Next step assigned successfully!');
                          setSelectedTicket(null);
                          setSelectedNextTeacher('');
                          await refreshData();
                        } catch (error) {
                          alert('Failed to assign ticket');
                        }
                      }}
                      disabled={!selectedNextTeacher}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      Assign to Next Teacher
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTicket(null);
                        setSelectedNextTeacher('');
                      }}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-purple-700">Classwork portions</p>
                        <p className="text-xs text-purple-600">
                          Type <span className="font-semibold">sabqi</span>, <span className="font-semibold">manzil</span>, or <span className="font-semibold">juz</span> to build the plan. Students will receive this summary instantly.
                        </p>
                      </div>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                        Mobile friendly
                      </span>
                    </div>
                    <div className="mt-4">
                      <AssignmentSectionBuilder
                        value={finalizeSections}
                        onChange={(sections) => setFinalizeSections(sections)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Final report <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={finalizeData.finalReport}
                        onChange={(event) => {
                          setFinalReportTouched(true);
                          setFinalizeData((prev) => ({ ...prev, finalReport: event.target.value }));
                        }}
                        rows={5}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                        placeholder="Auto-generated summary…"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Homework for next day <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={finalizeData.homework}
                        onChange={(event) => {
                          setHomeworkTouched(true);
                          setFinalizeData((prev) => ({ ...prev, homework: event.target.value }));
                        }}
                        rows={4}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                        placeholder="Auto-generated homework…"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Optional homework link
                      </label>
                      <input
                        type="url"
                        value={finalizeData.homeworkLink}
                        onChange={(event) =>
                          setFinalizeData((prev) => ({ ...prev, homeworkLink: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                        placeholder="https://resource-link.com"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    <h4 className="mb-2 text-sm font-semibold text-gray-800">
                      Student preview
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Classwork</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {finalizeSections.length === 0 ? (
                            <li className="text-gray-500">No portions added yet</li>
                          ) : (
                            finalizeSections.map((section, idx) => (
                              <li key={`${section.step}-${idx}`} className="text-gray-700">
                                {section.summary || section.assignmentRange || section.label}
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Mistakes from classwork
                        </p>
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {(selectedTicket.mushafMarkings || []).length === 0 ? (
                            <li className="text-gray-500">No mistakes recorded</li>
                          ) : (
                            Object.entries(
                              (selectedTicket.mushafMarkings || []).reduce<Record<string, number>>(
                                (acc, mistake) => {
                                  const key = mistake.type || 'other';
                                  acc[key] = (acc[key] || 0) + 1;
                                  return acc;
                                },
                                {}
                              )
                            ).map(([type, count]) => (
                              <li key={type} className="text-gray-700">
                                {getMistakeTypeLabel(type)} — {count}
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Homework</p>
                        <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-white px-3 py-2 text-gray-700 shadow-inner">
                          {finalizeData.homework || 'Auto-generated homework will appear here.'}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={async () => {
                        if (!finalizeData.finalReport.trim() || !finalizeData.homework.trim()) {
                          alert('Please fill in all required fields');
                          return;
                        }

                        if (finalizeSections.length === 0) {
                          alert('Please add at least one classwork portion before finalizing.');
                          return;
                        }

                        try {
                          const ticketId = selectedTicket.id || (selectedTicket as any)._id;
                          const classworkSummary = finalizeSections
                            .map((section) => section.summary || section.assignmentRange)
                            .filter(Boolean)
                            .join('\n');

                          await finalizeTicket(ticketId, {
                            finalReport: finalizeData.finalReport,
                            homework: finalizeData.homework,
                            homeworkLink: finalizeData.homeworkLink,
                            reviewedBy: user?.id || '',
                            classworkSections: finalizeSections,
                            classworkSummary,
                            homeworkSummary: finalizeData.homework,
                            classworkType: finalizeSections[0]?.step,
                          } as any);
                          alert('✅ Ticket finalized! Assignment created.');
                          setSelectedTicket(null);
                          setFinalizeSections([]);
                          setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                          setFinalReportTouched(false);
                          setHomeworkTouched(false);
                          await refreshData();
                        } catch (error) {
                          alert('Failed to finalize ticket');
                        }
                      }}
                      className="flex-1 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                    >
                      Finalize &amp; Create Assignment
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTicket(null);
                        setFinalizeSections([]);
                        setFinalizeData({ finalReport: '', homework: '', homeworkLink: '' });
                        setFinalReportTouched(false);
                        setHomeworkTouched(false);
                      }}
                      className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Program</label>
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Programs</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="classwork">Classwork</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterProgram('');
                  setFilterType('');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Assignments List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Assignments ({filteredAssignments.length})</h2>
          </div>
          
          {filteredAssignments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
              <p className="text-gray-600">
                Assignments will appear here once tickets are finalized
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAssignments.map((assignment) => {
                const studentId = assignment.assignedTo[0]; // Usually one student per assignment from ticket
                const studentName = getStudentName(studentId);
                const mushafMarkings = (assignment as any).mushafMarkings || [];
                const workflowStep = getWorkflowStepLabel(assignment);
                
                return (
                  <div key={assignment.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="space-y-4">
                      {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{studentName}</h3>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                              {workflowStep}
                            </span>
                            {assignment.listenerName && (
                              <span className="text-sm text-gray-600">
                                👂 Listener: {assignment.listenerName}
                          </span>
                            )}
                        </div>
                        
                          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                            <span>📚 {programs.find(p => p.id === assignment.program)?.name || 'Unknown Program'}</span>
                          <span>📅 {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}</span>
                            {assignment.createdAt && (
                              <span>🕒 Created: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Description/Report */}
                      {assignment.description && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <h4 className="font-semibold text-gray-900 mb-2">📋 Recitation Report</h4>
                          <p className="text-gray-700 whitespace-pre-wrap text-sm">{assignment.description}</p>
                        </div>
                      )}

                      {/* Mushaf Markings */}
                      {mushafMarkings.length > 0 && (
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-gray-900">
                              📖 Mushaf Mistake Markings ({mushafMarkings.length} mistake{mushafMarkings.length !== 1 ? 's' : ''})
                            </h4>
                        <button
                          onClick={() => {
                                if (showMushafForAssignment === assignment.id) {
                                  setShowMushafForAssignment(null);
                                } else {
                                  setShowMushafForAssignment(assignment.id);
                                  const firstMistake = mushafMarkings[0];
                                  if (firstMistake?.page) {
                                    setMushafPage(firstMistake.page);
                                  }
                                }
                          }}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                              {showMushafForAssignment === assignment.id ? '📖 Hide Mushaf' : '📖 View Mushaf'}
                        </button>
                          </div>

                          {/* Quick navigation to pages with mistakes */}
                          {showMushafForAssignment !== assignment.id && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="text-xs font-semibold text-gray-700 self-center">Navigate to pages:</span>
                              {(Array.from(new Set(mushafMarkings.map((m: MushafMistake) => m.page))) as number[])
                                .sort((a: number, b: number) => a - b)
                                .map((page: number) => {
                                  const mistakesOnPage = mushafMarkings.filter((m: MushafMistake) => m.page === page).length;
                                  return (
                          <button
                                      key={page}
                            onClick={() => {
                                        setShowMushafForAssignment(assignment.id);
                                        setMushafPage(page);
                                      }}
                                      className="px-3 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                                    >
                                      Page {page} ({mistakesOnPage})
                                    </button>
                                  );
                                })}
                            </div>
                          )}

                          {/* Mistake summary by type */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {['memory', 'madd', 'ikhfa', 'holding', 'tech', 'other'].map((type) => {
                              const count = mushafMarkings.filter((m: MushafMistake) => m.type === type).length;
                              if (count === 0) return null;
                              return (
                                <span key={type} className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-700">
                                  {getMistakeTypeLabel(type)}: {count}
                                </span>
                              );
                            })}
                          </div>

                          {/* Mushaf View */}
                          {showMushafForAssignment === assignment.id && (
                            <div className="mt-4 pt-4 border-t border-purple-200">
                              <div className="flex justify-between items-center mb-3">
                                <div className="text-sm text-gray-600">
                                  Page {mushafPage} • {mushafMarkings.filter((m: MushafMistake) => m.page === mushafPage).length} mistake{mushafMarkings.filter((m: MushafMistake) => m.page === mushafPage).length !== 1 ? 's' : ''} on this page
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(Array.from(new Set(mushafMarkings.map((m: MushafMistake) => m.page))) as number[])
                                    .sort((a: number, b: number) => a - b)
                                    .map((page: number) => {
                                      const mistakesOnPage = mushafMarkings.filter((m: MushafMistake) => m.page === page).length;
                                      return (
                                        <button
                                          key={page}
                                          onClick={() => setMushafPage(page)}
                                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                            mushafPage === page
                                              ? 'bg-purple-600 text-white'
                                              : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                          }`}
                                        >
                                          Page {page} ({mistakesOnPage})
                          </button>
                                      );
                                    })}
                                </div>
                              </div>
                              
                              <InteractiveMushaf
                                currentPage={mushafPage}
                                onPageChange={setMushafPage}
                                mistakes={mushafMarkings}
                                onMistakeMark={() => {}} // Read-only
                                readOnly={true}
                                mode="viewing"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Homework Section */}
                      {assignment.homeworkComments && (
                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <h4 className="font-semibold text-gray-900 mb-2">📝 Homework</h4>
                          <p className="text-gray-700 whitespace-pre-wrap text-sm">{assignment.homeworkComments}</p>
                          {(assignment as any).homeworkLink && (
                            <div className="mt-3">
                              <a
                                href={(assignment as any).homeworkLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-medium text-sm"
                              >
                                📎 Homework Link →
                              </a>
                            </div>
                        )}
                      </div>
                      )}

                      {/* Assignment Actions */}
                      {(user?.role === 'superadmin' || user?.role === 'admin') && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedAssignmentForAction(assignment);
                                setShowAssignTeacherOption(true);
                                setSelectedTeacherForAssignment('');
                              }}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              Reassign Teacher
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Assignment Modal */}
        {showCreateForm && (
          <ModernAssignmentForm
            onClose={() => {
              setShowCreateForm(false);
            }}
            onSuccess={() => {
              setShowCreateForm(false);
              refreshData();
            }}
          />
        )}

        {/* Reassign Teacher Modal */}
        {selectedAssignmentForAction && showAssignTeacherOption && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Reassign Assignment</h3>
                <button
                  onClick={() => {
                    setSelectedAssignmentForAction(null);
                    setShowAssignTeacherOption(false);
                    setSelectedTeacherForAssignment('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="font-semibold text-gray-900 mb-1">Assignment:</p>
                <p className="text-sm text-gray-600 mb-2">
                  {getStudentName(selectedAssignmentForAction.assignedTo[0])} - {getWorkflowStepLabel(selectedAssignmentForAction)}
                </p>
                <p className="text-xs text-gray-500">
                  Current Teacher: {selectedAssignmentForAction.listenerName || 'Not assigned'}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Teacher <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTeacherForAssignment}
                  onChange={(e) => setSelectedTeacherForAssignment(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Choose a teacher...</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!selectedTeacherForAssignment) {
                      alert('Please select a teacher');
                      return;
                    }

                    const teacher = teachers.find(t => t.id === selectedTeacherForAssignment);
                    if (!teacher) {
                      alert('Selected teacher not found');
                      return;
                    }

                    try {
                      await updateAssignment(selectedAssignmentForAction.id, {
                        listenerName: teacher.fullName,
                        listenerId: teacher.id,
                        assignedBy: teacher.id
                      });
                      alert('✅ Assignment reassigned successfully!');
                      setSelectedAssignmentForAction(null);
                      setShowAssignTeacherOption(false);
                      setSelectedTeacherForAssignment('');
                      await refreshData();
                    } catch (error) {
                      console.error('Error reassigning assignment:', error);
                      alert('Failed to reassign assignment');
                    }
                  }}
                  disabled={!selectedTeacherForAssignment}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reassign
                </button>
                <button
                  onClick={() => {
                    setSelectedAssignmentForAction(null);
                    setShowAssignTeacherOption(false);
                    setSelectedTeacherForAssignment('');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentsPage;
