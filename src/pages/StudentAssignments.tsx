import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import DebugPanel from '../components/DebugPanel';
import { InteractiveMushaf } from '@umar-academy/mushaf';

interface StudentAssignmentView {
  date: string;
  sabq: string;
  sabqi: string;
  manzil: string;
  homework: string;
  comment: string;
  teacherName: string;
}

const StudentAssignments: React.FC = () => {
  const { user } = useAuth();
  const { students } = useData();
  const { assignments: backendAssignments } = useBackendData();
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current');
  const [showMushafForAssignment, setShowMushafForAssignment] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState(1);

  const currentStudent = students.find(s => s.email === user?.email);

  // Get student's assignments from backend
  const studentAssignments = useMemo(() => {
    if (!currentStudent?.id) return [];
    
    return backendAssignments
      .filter((assignment: any) => {
        const assignedTo = Array.isArray(assignment.assignedTo) ? assignment.assignedTo : [assignment.assignedTo];
        return assignedTo.includes(currentStudent.id) || assignedTo.includes(currentStudent.id.toString());
      })
      .map((assignment: any) => {
        // Parse description to extract sabq/sabqi/manzil info
        const description = assignment.description || '';
        const lines = description.split('\n');
        const listenersInfo = lines.filter((line: string) => line.includes('Listener:'));
        
        // Extract classwork type based on assignment type
        const classworkType = assignment.classworkType || '';
        const sabqLine = lines.find((line: string) => line.toLowerCase().includes('sabq') || classworkType === 'sabq') || '';
        const sabqiLine = lines.find((line: string) => line.toLowerCase().includes('sabqi') || classworkType === 'sabqi') || '';
        const manzilLine = lines.find((line: string) => line.toLowerCase().includes('manzil') || classworkType === 'manzil') || '';
        
        // Extract report (everything before listener info)
        const reportLines = lines.filter((line: string) => !line.includes('Listener:'));
        const report = reportLines.join('\n').trim() || description;
        
        return {
          ...assignment,
          id: assignment._id || assignment.id,
          date: assignment.createdAt ? new Date(assignment.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          sabq: classworkType === 'sabq' ? (sabqLine || description.split('\n')[0] || '') : '',
          sabqi: classworkType === 'sabqi' ? (sabqiLine || description.split('\n')[0] || '') : '',
          manzil: classworkType === 'manzil' ? (manzilLine || description.split('\n')[0] || '') : '',
          homework: assignment.homeworkComments || '',
          homeworkLink: assignment.homeworkLink || '',
          comment: report,
          teacherName: assignment.listenerName || 'Teacher',
          listenerName: assignment.listenerName || assignment.assignedTeacherName || 'Teacher',
          listenersInfo: listenersInfo.join('\n'),
          // Only show mushafMarkings for assignments created from finalized tickets
          mushafMarkings: assignment.fromTicketId && assignment.mushafMarkings ? assignment.mushafMarkings : []
        };
      });
  }, [backendAssignments, currentStudent]);

  // Mock assignments (fallback if no backend assignments)
  const mockAssignments: StudentAssignmentView[] = [
    {
      date: new Date().toISOString().slice(0, 10),
      sabq: 'Surah Al-Baqarah: 1-5',
      sabqi: 'Surah Al-Fatiha',
      manzil: 'Manzil 1 - Review',
      homework: 'Memorize Surah Al-Baqarah verses 6-10. Practice Tajweed rules for Qalqalah.',
      comment: 'Excellent progress! Keep practicing your pronunciation.',
      teacherName: 'Dr. Ibrahim Yusuf'
    },
    {
      date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      sabq: 'Surah Al-Baqarah: 255-260',
      sabqi: 'Surah Al-Ikhlas',
      manzil: 'Manzil 2 - Complete',
      homework: 'Review yesterday\'s lesson. Complete reading practice for Surah Al-Mulk.',
      comment: 'Good work. Focus on elongation (Madd) rules.',
      teacherName: 'Dr. Ibrahim Yusuf'
    },
    {
      date: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
      sabq: 'Surah Al-Imran: 1-10',
      sabqi: 'Surah Al-Falaq',
      manzil: 'Manzil 1 - In Progress',
      homework: 'Practice recitation of new verses. Listen to Qari Abdul Basit recording.',
      comment: 'Very good! Work on your Makhraj (articulation points).',
      teacherName: 'Dr. Ibrahim Yusuf'
    }
  ];

  // Filter assignments based on view mode - use backend assignments if available
  const displayedAssignments = useMemo(() => {
    const assignmentsToShow = studentAssignments.length > 0 ? studentAssignments : mockAssignments;
    
    if (viewMode === 'current') {
      return assignmentsToShow.filter((a: any) => a.date === selectedDate);
    }
    return assignmentsToShow.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewMode, selectedDate, studentAssignments, mockAssignments]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
              <p className="text-gray-600 mt-2">View your daily assignments and homework from your teacher</p>
            </div>
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all shadow-md"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Student Info Banner */}
          {currentStudent && (
            <div className="rounded-xl border border-[#E7AA39] bg-[#FDF7E7] p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <img src={currentStudent.avatar} alt={currentStudent.fullName} className="w-16 h-16 rounded-full" />
                <div>
                  <h2 className="text-xl font-semibold text-[#2E4D32]">{currentStudent.fullName}</h2>
                  <p className="text-sm text-[#2E4D32]/80">Program: <span className="font-semibold text-[#2E4D32]">{currentStudent.program}</span></p>
                  <p className="text-sm text-[#2E4D32]/80">Teacher: {currentStudent.assignedTeacher}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Controls */}
        <Card>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  viewMode === 'current' ? 'text-white shadow-md bg-[#2E4D32]' : 'bg-white border border-[#2E4D32]/30 text-[#2E4D32] hover:border-[#2E4D32]'
                }`}
                onClick={() => setViewMode('current')}
              >
                Today's Assignment
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  viewMode === 'history' ? 'text-white shadow-md bg-[#2E4D32]' : 'bg-white border border-[#2E4D32]/30 text-[#2E4D32] hover:border-[#2E4D32]'
                }`}
                onClick={() => setViewMode('history')}
              >
                Assignment History
              </button>
            </div>

            {viewMode === 'current' && (
              <div>
                <label className="block text-sm font-semibold text-[#2E4D32] mb-2">Select Date</label>
                <input
                  type="date"
                  className="px-4 py-2 border border-[#2E4D32]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E7AA39]/40 transition"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Assignments Display */}
        <div className="mt-6 space-y-6">
          {displayedAssignments.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold text-[#2E4D32] mb-2">No assignments available</h3>
                <p className="text-sm text-[#2E4D32]/70">Assignments assigned to you will appear in this section.</p>
              </div>
            </Card>
          ) : (
            displayedAssignments.map((assignment, index) => {
              const markings = (assignment as any).mushafMarkings || [];
              const hasAudio = markings.some((m: any) => m.audioUrl);
              const formattedDate = new Date(assignment.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });

              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-[#E7AA39] bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 border-b border-[#E7AA39]/30 bg-[#FDF7E7] p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <span className="inline-block rounded-full bg-[#E7AA39] px-3 py-1 text-xs font-semibold text-white">
                        {formattedDate}
                      </span>
                      <h2 className="mt-3 text-2xl font-semibold text-[#2E4D32]">Daily Assignment</h2>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-[#2E4D32]/75">
                        <span>Listener: <span className="font-semibold text-[#2E4D32]">{(assignment as any).listenerName || assignment.teacherName}</span></span>
                        {assignment.teacherName && (assignment as any).listenerName !== assignment.teacherName && (
                          <span>Assigned by: <span className="font-semibold text-[#2E4D32]">{assignment.teacherName}</span></span>
                        )}
                        {(assignment as any).fromTicketId && (
                          <span>Created from ticket workflow</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#2E4D32]/60">Assignment</p>
                      <p className="text-3xl font-semibold text-[#2E4D32]">{String(index + 1).padStart(2, '0')}</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <section>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2E4D32]">Today's Classwork</h3>
                        <div className="h-px flex-1 bg-[#E7AA39]/40 ml-4"></div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {[
                          { title: 'Sabq (New Lesson)', value: assignment.sabq },
                          { title: 'Sabqi (Revision)', value: assignment.sabqi },
                          { title: 'Manzil', value: assignment.manzil }
                        ].map((item) => (
                          <div key={item.title} className="rounded-xl border border-[#E7AA39]/30 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#2E4D32]/70">{item.title}</p>
                            <p className="mt-2 text-sm font-medium text-[#2E4D32]">{item.value || 'Not assigned'}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    {(assignment as any).listenersInfo && (
                      <section>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2E4D32]">Listeners</h3>
                          <div className="h-px flex-1 bg-[#E7AA39]/40 ml-4"></div>
                        </div>
                        <div className="rounded-xl border border-[#2E4D32]/15 bg-white p-4">
                          <p className="text-sm text-[#2E4D32]/80 whitespace-pre-wrap">{(assignment as any).listenersInfo}</p>
                        </div>
                      </section>
                    )}

                    {markings.length > 0 && (
                      <section>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2E4D32]">Mushaf Mistake Markings</h3>
                            <p className="mt-1 text-xs text-[#2E4D32]/70">
                              {markings.length} mistake{markings.length !== 1 ? 's' : ''} identified by your teacher.
                              {hasAudio && ' Audio corrections are available for some mistakes.'}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (showMushafForAssignment === assignment.id) {
                                setShowMushafForAssignment(null);
                              } else {
                                setShowMushafForAssignment(assignment.id);
                                const firstMistake = markings[0];
                                if (firstMistake?.page) {
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
                            {showMushafForAssignment === assignment.id ? 'Hide Mushaf View' : 'View Markings in Mushaf'}
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
                                    <div className="ml-0 md:ml-4 text-xs text-[#2E4D32]/70">
                                      Audio correction provided
                                    </div>
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
                                <h4 className="text-base font-semibold text-[#2E4D32]">Mistakes Highlighted in the Mushaf</h4>
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

                    {assignment.homework && (
                      <section>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2E4D32]">Homework</h3>
                          <div className="h-px flex-1 bg-[#E7AA39]/40 ml-4"></div>
                        </div>
                        <div className="rounded-xl border border-[#E7AA39]/30 bg-[#FDF7E7] p-4">
                          <p className="text-sm text-[#2E4D32]/85 whitespace-pre-wrap">{assignment.homework}</p>
                          {(assignment as any).homeworkLink && (
                            <div className="mt-3">
                              <a
                                href={(assignment as any).homeworkLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-[#2E4D32] underline decoration-[#E7AA39]/60 hover:text-[#E7AA39]"
                              >
                                Open homework resource
                              </a>
                            </div>
                          )}
                        </div>
                      </section>
                    )}

                    {assignment.comment && (
                      <section>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2E4D32]">Report & Feedback</h3>
                          <div className="h-px flex-1 bg-[#E7AA39]/40 ml-4"></div>
                        </div>
                        <div className="rounded-xl border border-[#2E4D32]/15 bg-white p-4">
                          <p className="text-sm text-[#2E4D32]/85 whitespace-pre-wrap">{assignment.comment}</p>
                          <p className="mt-2 text-xs text-[#2E4D32]/60">
                            {((assignment as any).listenerName || assignment.teacherName) && `Provided by ${(assignment as any).listenerName || assignment.teacherName}`}
                          </p>
                        </div>
                      </section>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-[#E7AA39]/30 bg-[#FDF7E7] p-4">
                    <button
                      className="rounded-lg border border-[#2E4D32]/30 px-4 py-2 text-sm font-semibold text-[#2E4D32] transition-colors hover:border-[#2E4D32]"
                      onClick={() => window.print()}
                    >
                      Print assignment
                    </button>
                    <button
                      className="rounded-lg border border-[#2E4D32] bg-[#2E4D32] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Mark as completed
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      <DebugPanel />
    </div>
  );
};

export default StudentAssignments;

