import React, { useState, useMemo } from 'react';
import StudentHeader from '../components/StudentHeader';
import StudentSidebar from '../components/StudentSidebar';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useBackendData } from '../../../contexts/BackendDataContext';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';

const StudentAssignments: React.FC = () => {
  const { user } = useAuth();
  const { students } = useData();
  const { assignments: backendAssignments } = useBackendData();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'assigned' | 'history'>('assigned');
  const [showMushafForAssignment, setShowMushafForAssignment] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState(1);

  const currentStudent = students.find(s => s.email === user?.email);

  // Get student's assignments from backend
  const studentAssignments = useMemo(() => {
    if (!currentStudent?.id) return [];
    
    return backendAssignments
      .filter((assignment: any) => {
        const assignedTo = Array.isArray(assignment.assignedTo) ? assignment.assignedTo : [assignment.assignedTo];
        const studentId = currentStudent.id || (currentStudent as any)._id;
        return assignedTo.includes(studentId) || 
               assignedTo.includes(studentId?.toString()) ||
               assignedTo.includes((currentStudent as any)._id);
      })
      .map((assignment: any) => {
        const id = assignment._id || assignment.id;
        const createdAt = assignment.createdAt ? new Date(assignment.createdAt) : new Date();
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : new Date();
        const now = new Date();
        
        // Determine status
        let status = 'pending';
        if (assignment.status === 'completed') {
          status = 'completed';
        } else if (assignment.submissions && assignment.submissions.length > 0) {
          status = 'submitted';
        } else if (dueDate < now) {
          status = 'overdue';
        } else {
          status = 'pending';
        }

        // Parse description
        const description = assignment.description || '';
        const lines = description.split('\n');
        const listenersInfo = lines.filter((line: string) => line.includes('Listener:'));
        
        return {
          id,
          title: assignment.title || `${assignment.classworkType || 'Assignment'}`,
          description: description,
          type: assignment.type || 'classwork',
          classworkType: assignment.classworkType,
          classworkSections: Array.isArray(assignment.classworkSections)
            ? assignment.classworkSections.map((section: any, index: number) => ({
                step: (section.step || '').toLowerCase(),
                title: section.title || '',
                details: section.details || '',
                teacherName: section.teacherName || '',
                order: typeof section.order === 'number' ? section.order : index
              }))
            : [],
          program: assignment.program || '',
          dueDate: dueDate,
          createdAt: createdAt,
          status: status,
          grade: assignment.submissions?.[0]?.grade || null,
          homework: assignment.homeworkComments || '',
          homeworkLink: assignment.homeworkLink || '',
          listenerName: assignment.listenerName || 'Teacher',
          listenersInfo: listenersInfo.join('\n'),
          report: lines.filter((line: string) => !line.includes('Listener:')).join('\n').trim() || description,
          submissions: assignment.submissions || [],
          isPast: dueDate < now || assignment.status === 'completed',
          // Only show mushafMarkings for assignments created from finalized tickets
          mushafMarkings: assignment.fromTicketId && assignment.mushafMarkings 
            ? (assignment.mushafMarkings || []).map((m: any) => ({
            id: m.id || m._id || '',
            type: m.type,
            page: m.page,
            surah: m.surah,
            ayah: m.ayah,
            wordIndex: m.wordIndex,
            position: m.position || { x: 50, y: 50 },
            note: m.note || '',
            audioUrl: m.audioUrl || '', // Include audio URL for student playback
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          } as MushafMistake))
            : []
        };
      })
      .sort((a, b) => {
        // Sort by due date, pending/active first, then completed
        if (a.isPast !== b.isPast) {
          return a.isPast ? 1 : -1; // Active first
        }
        return b.dueDate.getTime() - a.dueDate.getTime(); // Most recent first
      });
  }, [backendAssignments, currentStudent]);

  // Separate assigned (active) and history (completed/past)
  const assignedAssignments = useMemo(() => 
    studentAssignments.filter(a => !a.isPast && a.status !== 'completed'),
    [studentAssignments]
  );

  const historyAssignments = useMemo(() => 
    studentAssignments.filter(a => a.isPast || a.status === 'completed'),
    [studentAssignments]
  );

  // Filter based on view mode
  const displayedAssignments = useMemo(() => {
    const source = viewMode === 'assigned' ? assignedAssignments : historyAssignments;
    
    if (filter === 'all') return source;
    return source.filter(a => a.status === filter);
  }, [viewMode, filter, assignedAssignments, historyAssignments]);

  // Use backend assignments if available, otherwise empty
  const assignmentsToDisplay = displayedAssignments;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'submitted':
        return 'bg-[#2E4D32]/10 text-[#2E4D32]';
      case 'pending':
        return 'bg-[#FDF7E7] text-[#2E4D32]';
      case 'overdue':
        return 'bg-[#E7AA39] text-white';
      default:
        return 'bg-white text-[#2E4D32] border border-[#2E4D32]/40';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'submitted':
        return 'Submitted';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader />
      
      <div className="flex">
        <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 lg:ml-64">
          <div className="p-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-[#2E4D32] mb-2">My Assignments</h1>
              <p className="text-sm text-[#2E4D32]/70">Review current tasks and your assignment history.</p>
            </div>

            {/* View Mode Toggle */}
            <div className="mb-6 flex gap-4 items-center">
              <div className="flex space-x-1 rounded-lg border border-[#E7AA39]/40 bg-white p-1">
                <button
                  onClick={() => setViewMode('assigned')}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'assigned'
                      ? 'bg-[#2E4D32] text-white shadow-sm'
                      : 'text-[#2E4D32] hover:bg-[#FDF7E7]'
                  }`}
                >
                  Assigned ({assignedAssignments.length})
                </button>
                <button
                  onClick={() => setViewMode('history')}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'history'
                      ? 'bg-[#2E4D32] text-white shadow-sm'
                      : 'text-[#2E4D32] hover:bg-[#FDF7E7]'
                  }`}
                >
                  History ({historyAssignments.length})
                </button>
              </div>

              {/* Filter Tabs */}
              {viewMode === 'assigned' && (
                <div className="flex space-x-1 rounded-lg border border-[#E7AA39]/40 bg-white p-1">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'active', label: 'Active' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key as any)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        filter === tab.key
                          ? 'bg-[#FDF7E7] text-[#2E4D32] shadow-sm'
                          : 'text-[#2E4D32] hover:bg-[#FDF7E7]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assignments List */}
            <div className="space-y-6">
              {assignmentsToDisplay.map((assignment: any) => {
                const markings = assignment.mushafMarkings || [];
                const hasAudio = markings.some((m: MushafMistake) => (m as any).audioUrl);

                return (
                  <div
                    key={assignment.id}
                    className="overflow-hidden rounded-2xl border border-[#E7AA39] bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 border-b border-[#E7AA39]/30 bg-[#FDF7E7] p-6 md:flex-row md:items-center md:justify-between">
                      <div>
                        <span className="inline-block rounded-full bg-[#E7AA39] px-3 py-1 text-xs font-semibold text-white">
                          Due {assignment.dueDate.toLocaleDateString()}
                        </span>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <h3 className="text-2xl font-semibold text-[#2E4D32]">{assignment.title}</h3>
                          {assignment.classworkType && (
                            <span className="rounded-full border border-[#2E4D32]/20 bg-white px-3 py-1 text-xs font-semibold text-[#2E4D32]">
                              {assignment.classworkType.toUpperCase()}
                            </span>
                          )}
                          {assignment.program && (
                            <span className="rounded-full border border-[#2E4D32]/20 bg-white px-3 py-1 text-xs font-semibold text-[#2E4D32]">
                              {assignment.program}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-[#2E4D32]/75">
                          <span>Listener: <span className="font-semibold text-[#2E4D32]">{assignment.listenerName}</span></span>
                          <span>Created {assignment.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-semibold ${getStatusColor(assignment.status)}`}>
                          {getStatusText(assignment.status)}
                        </span>
                        {assignment.grade !== null && assignment.grade !== undefined && (
                          <div className="mt-2 text-sm font-semibold text-[#2E4D32]">Grade: {assignment.grade}%</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6 p-6">
                      {/* Classwork Sections */}
                      {assignment.classworkSections.length > 0 && (
                        <div className="mb-4 p-4 bg-[#FDF7E7] rounded-lg border border-[#E7AA39]/40">
                          <h4 className="text-sm font-semibold text-[#2E4D32] mb-2 uppercase tracking-wide">Classwork Details</h4>
                          <div className="grid gap-3 md:grid-cols-3">
                            {[
                              { step: 'sabq', title: 'Sabq (New Lesson)' },
                              { step: 'sabqi', title: 'Sabqi (Revision)' },
                              { step: 'manzil', title: 'Manzil' }
                            ].map(({ step, title }) => {
                              const items = assignment.classworkSections.filter((section: any) => (section.step || '').toLowerCase() === step);
                              if (items.length === 0) {
                                return (
                                  <div key={step} className="rounded-lg border border-[#E7AA39]/20 bg-white p-3">
                                    <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide">{title}</p>
                                    <p className="mt-2 text-sm text-[#2E4D32]/50">Not specified</p>
                                  </div>
                                );
                              }
                              return (
                                <div key={step} className="rounded-lg border border-[#E7AA39]/20 bg-white p-3">
                                  <p className="text-xs font-semibold text-[#2E4D32]/70 uppercase tracking-wide">{title}</p>
                                  <ul className="mt-2 space-y-2">
                                    {items.map((section: any, idx: number) => (
                                      <li key={`${step}-${idx}`} className="text-xs text-[#2E4D32]/80">
                                        <span className="block font-medium text-[#2E4D32]">
                                          {section.title || `${title}${items.length > 1 ? ` ${idx + 1}` : ''}`}
                                        </span>
                                        {section.details && (
                                          <span className="mt-1 block text-[#2E4D32]/65">{section.details}</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Report/Description */}
                      {assignment.report && (
                        <section>
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-[#2E4D32]">Report & Feedback</h4>
                            <div className="ml-4 h-px flex-1 bg-[#E7AA39]/40"></div>
                          </div>
                          <div className="rounded-xl border border-[#2E4D32]/15 bg-white p-4">
                            <p className="text-sm text-[#2E4D32]/85 whitespace-pre-wrap">{assignment.report}</p>
                          </div>
                        </section>
                      )}

                      {assignment.listenersInfo && (
                        <section>
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-[#2E4D32]">Listeners</h4>
                            <div className="ml-4 h-px flex-1 bg-[#E7AA39]/40"></div>
                          </div>
                          <div className="rounded-xl border border-[#2E4D32]/15 bg-white p-4">
                            <p className="text-sm text-[#2E4D32]/85 whitespace-pre-wrap">{assignment.listenersInfo}</p>
                          </div>
                        </section>
                      )}

                      {assignment.homework && (
                        <section>
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-[#2E4D32]">Homework</h4>
                            <div className="ml-4 h-px flex-1 bg-[#E7AA39]/40"></div>
                          </div>
                          <div className="rounded-xl border border-[#E7AA39]/30 bg-[#FDF7E7] p-4">
                            <p className="text-sm text-[#2E4D32]/85 whitespace-pre-wrap mb-2">{assignment.homework}</p>
                            {assignment.homeworkLink && (
                              <a
                                href={assignment.homeworkLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-[#2E4D32] underline decoration-[#E7AA39]/60 hover:text-[#E7AA39]"
                              >
                                Open homework resource
                              </a>
                            )}
                          </div>
                        </section>
                      )}

                      {markings.length > 0 && (
                        <section>
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#2E4D32]">Mushaf Mistake Markings</h4>
                              <p className="text-xs text-[#2E4D32]/70">
                                {markings.length} mistake{markings.length !== 1 ? 's' : ''} recorded for this assignment.{hasAudio && ' Audio corrections are available for select mistakes.'}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                if (showMushafForAssignment === assignment.id) {
                                  setShowMushafForAssignment(null);
                                } else {
                                  setShowMushafForAssignment(assignment.id);
                                  const firstMistake = markings[0];
                                  if (firstMistake && firstMistake.page) {
                                    setMushafPage(firstMistake.page);
                                  }
                                }
                              }}
                              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                                showMushafForAssignment === assignment.id
                                  ? 'border-[#2E4D32] bg-[#2E4D32] text-white'
                                  : 'border-[#2E4D32]/40 text-[#2E4D32] hover:border-[#2E4D32]'
                              }`}
                            >
                              {showMushafForAssignment === assignment.id ? 'Hide Mushaf View' : 'View in Mushaf'}
                            </button>
                          </div>

                          <div className="space-y-3 rounded-xl border border-[#2E4D32]/15 bg-white p-4">
                            {markings.map((mistake: any, idx: number) => {
                              const typeLabels: Record<string, string> = {
                                madd: 'Mad (Elongation)',
                                holding: 'Holding / Fluency',
                                memory: 'Memory',
                                ikhfa: 'Ikhfa',
                                tech: 'Ghunna',
                                other: 'Other'
                              };
                              const label = typeLabels[mistake.type] || mistake.type;
                              const audioUrl = mistake.audioUrl
                                ? (mistake.audioUrl.startsWith('http')
                                    ? mistake.audioUrl
                                    : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001'}${mistake.audioUrl}`)
                                : null;

                              return (
                                <div
                                  key={idx}
                                  className="flex flex-col gap-2 border-b border-[#E7AA39]/30 pb-3 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                                >
                                  <div className="flex flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="inline-flex items-center rounded-full bg-[#FDF7E7] px-3 py-1 text-xs font-semibold text-[#2E4D32]">
                                        {label}
                                      </span>
                                      <span className="text-sm text-[#2E4D32]/80">
                                        Page {mistake.page}, Surah {mistake.surah}, Ayah {mistake.ayah}
                                        {mistake.note && ` — ${mistake.note}`}
                                      </span>
                                    </div>
                                    {audioUrl && (
                                      <div className="ml-0 md:ml-4 text-xs text-[#2E4D32]/70">Audio correction provided</div>
                                    )}
                                  </div>
                                  {audioUrl && (
                                    <audio controls src={audioUrl} className="w-full max-w-sm rounded md:w-auto">
                                      Your browser does not support the audio element.
                                    </audio>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {showMushafForAssignment === assignment.id && (
                            <div className="rounded-xl border border-[#2E4D32]/20 bg-white p-4">
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <h5 className="text-base font-semibold text-[#2E4D32]">Mistakes Highlighted in the Mushaf</h5>
                                  <p className="text-xs text-[#2E4D32]/70">Page {mushafPage} — {markings.filter((m: any) => m.page === mushafPage).length} mistake(s) on this page.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {Array.from(new Set(markings.map((m: any) => m.page)))
                                    .sort((a: number, b: number) => a - b)
                                    .map((page: number) => (
                                      <button
                                        key={page}
                                        onClick={() => setMushafPage(page)}
                                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                          mushafPage === page
                                            ? 'bg-[#2E4D32] text-white'
                                            : 'bg-[#FDF7E7] text-[#2E4D32] hover:bg-[#E7AA39] hover:text-white'
                                        }`}
                                      >
                                        Page {page}
                                      </button>
                                    ))}
                                </div>
                              </div>
                              <InteractiveMushaf
                                currentPage={mushafPage}
                                onPageChange={setMushafPage}
                                mistakes={markings}
                                onMistakeMark={() => {}}
                                readOnly
                                mode="viewing"
                              />
                            </div>
                          )}
                        </section>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-[#E7AA39]/30 bg-[#FDF7E7] p-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#2E4D32]/70">
                        {assignment.submissions && assignment.submissions.length > 0 && (
                          <span>
                            Submitted {assignment.submissions[0].submittedAt ? new Date(assignment.submissions[0].submittedAt).toLocaleDateString() : ''}
                          </span>
                        )}
                        {assignment.status === 'completed' && (
                          <span>Completed on {assignment.createdAt.toLocaleDateString()}</span>
                        )}
                      </div>
                      {assignment.status === 'pending' && viewMode === 'assigned' && (
                        <button className="rounded-lg border border-[#2E4D32] bg-[#2E4D32] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                          Submit assignment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {assignmentsToDisplay.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {viewMode === 'assigned' ? 'No Assigned Tasks' : 'No Assignment History'}
                </h3>
                <p className="text-gray-600">
                  {viewMode === 'assigned' 
                    ? "You don't have any active assignments yet." 
                    : "You don't have any completed assignments in your history yet."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignments;



