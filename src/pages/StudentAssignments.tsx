import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';
import Header from '../components/Header';
import DebugPanel from '../components/DebugPanel';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '../types';

interface EnrichedAssignment {
  id: string;
  date: string;
  sabq: string;
  sabqi: string;
  manzil: string;
  homework: string;
  homeworkLink?: string;
  comment: string;
  teacherName: string;
  listenerName?: string;
  listenersInfo?: string;
  classworkSections: Array<{
    step: string;
    title: string;
    details: string;
    teacherName: string;
    order: number;
  }>;
  mushafMarkings: MushafMistake[];
}

const StudentAssignments: React.FC = () => {
  const { user } = useAuth();
  const { students } = useData();
  const { assignments: backendAssignments, tickets } = useBackendData();
  
  const [showMushafForAssignment, setShowMushafForAssignment] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState(1);
  const [summaryMushafPage, setSummaryMushafPage] = useState(1);
  const [historyExpanded, setHistoryExpanded] = useState<Record<string, boolean>>({});

  const currentStudent = students.find((s) => s.email === user?.email);

  const studentAssignments = useMemo<EnrichedAssignment[]>(() => {
    if (!currentStudent?.id) return [];
    
    return backendAssignments
      .filter((assignment: any) => {
        const assignedTo = Array.isArray(assignment.assignedTo) ? assignment.assignedTo : [assignment.assignedTo];
        return assignedTo.includes(currentStudent.id) || assignedTo.includes(currentStudent.id.toString());
      })
      .map((assignment: any) => {
        const linkedTicket = tickets.find(
          (ticket) =>
            ticket.assignmentId === (assignment._id || assignment.id) ||
            (assignment.fromTicketId &&
              (ticket.id === assignment.fromTicketId || (ticket as any)._id === assignment.fromTicketId))
        );

        const mushafMarkings = Array.isArray(assignment.mushafMarkings) && assignment.mushafMarkings.length > 0
          ? assignment.mushafMarkings
          : Array.isArray(linkedTicket?.mushafMarkings)
            ? linkedTicket!.mushafMarkings
            : [];

        const description = assignment.description || '';
        const lines = description.split('\n');
        const listenersInfo = lines.filter((line: string) => line.includes('Listener:'));
        
        const classworkType = assignment.classworkType || '';
        const sabqLine = lines.find((line: string) => line.toLowerCase().includes('sabq') || classworkType === 'sabq') || '';
        const sabqiLine = lines.find((line: string) => line.toLowerCase().includes('sabqi') || classworkType === 'sabqi') || '';
        const manzilLine = lines.find((line: string) => line.toLowerCase().includes('manzil') || classworkType === 'manzil') || '';
        
        const reportLines = lines.filter((line: string) => !line.includes('Listener:'));
        const report = reportLines.join('\n').trim() || description;
        
        const enriched: EnrichedAssignment = {
          ...assignment,
          id: assignment._id || assignment.id,
          date: assignment.createdAt
            ? new Date(assignment.createdAt).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          sabq: classworkType === 'sabq' ? sabqLine || description.split('\n')[0] || '' : '',
          sabqi: classworkType === 'sabqi' ? sabqiLine || description.split('\n')[0] || '' : '',
          manzil: classworkType === 'manzil' ? manzilLine || description.split('\n')[0] || '' : '',
          homework: assignment.homeworkComments || '',
          homeworkLink: assignment.homeworkLink || '',
          comment: report,
          teacherName: assignment.listenerName || 'Teacher',
          listenerName: assignment.listenerName || assignment.assignedTeacherName || 'Teacher',
          listenersInfo: listenersInfo.join('\n'),
          classworkSections: Array.isArray((assignment as any).classworkSections)
            ? (assignment as any).classworkSections.map((section: any, index: number) => ({
                step: (section.step || '').toLowerCase(),
                title: section.title || '',
                details: section.details || '',
                teacherName: section.teacherName || '',
                order: typeof section.order === 'number' ? section.order : index,
              }))
            : [],
          mushafMarkings,
        };
        return enriched;
      });
  }, [backendAssignments, currentStudent, tickets]);

  const fallbackAssignments: EnrichedAssignment[] = [
    {
      id: 'mock-1',
      date: new Date().toISOString().slice(0, 10),
      sabq: 'Surah Al-Baqarah: 1-5',
      sabqi: 'Surah Al-Fatiha',
      manzil: 'Manzil 1 - Review',
      homework: 'Memorize Surah Al-Baqarah verses 6-10. Practice Tajweed rules for Qalqalah.',
      comment: 'Excellent progress! Keep practicing your pronunciation.',
      teacherName: 'Instructor',
      listenerName: 'Instructor',
      listenersInfo: '',
      classworkSections: [],
      mushafMarkings: [],
      homeworkLink: '',
    },
    {
      id: 'mock-2',
      date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      sabq: 'Surah Al-Baqarah: 255-260',
      sabqi: 'Surah Al-Ikhlas',
      manzil: 'Manzil 2 - Complete',
      homework: 'Review yesterday\'s lesson. Complete reading practice for Surah Al-Mulk.',
      comment: 'Good work. Focus on elongation (Madd) rules.',
      teacherName: 'Instructor',
      listenerName: 'Instructor',
      listenersInfo: '',
      classworkSections: [],
      mushafMarkings: [],
      homeworkLink: '',
    },
  ];

  const assignments = useMemo<EnrichedAssignment[]>(() => {
    const source = studentAssignments.length > 0 ? studentAssignments : fallbackAssignments;
    return [...source].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [studentAssignments]);

  const summaryAssignment = assignments[0];
  const historyAssignments = assignments.slice(1);

  useEffect(() => {
    if (summaryAssignment?.mushafMarkings?.length) {
      const initialPage = summaryAssignment.mushafMarkings[0]?.page;
      setSummaryMushafPage(initialPage || 1);
    } else {
      setSummaryMushafPage(1);
    }
  }, [summaryAssignment?.id]);

  const formatFullDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
      day: 'numeric',
    });

  const stats = useMemo(() => {
    const totalAssignments = assignments.length;
    const totalMistakes = assignments.reduce(
      (acc, assignment) => acc + assignment.mushafMarkings.length,
      0
    );
    const audioCorrections = assignments.reduce(
      (acc, assignment) => acc + assignment.mushafMarkings.filter((m) => !!m.audioUrl).length,
      0
    );
    const homeworkCount = assignments.reduce(
      (acc, assignment) => acc + (assignment.homework?.trim() ? 1 : 0),
      0
    );

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const assignmentsThisWeek = assignments.filter((assignment) => new Date(assignment.date) >= weekAgo).length;

    return {
      totalAssignments,
      totalMistakes,
      audioCorrections,
      homeworkCount,
      assignmentsThisWeek,
      lastUpdated: summaryAssignment?.date ? formatFullDate(summaryAssignment.date) : null,
    };
  }, [assignments, summaryAssignment?.date]);

  const historyGroups = useMemo<Array<[string, EnrichedAssignment[]]>>(() => {
    const groups = historyAssignments.reduce<Record<string, EnrichedAssignment[]>>((acc, assignment) => {
      const label = new Date(assignment.date).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(assignment);
      return acc;
    }, {});

    const entries = Object.entries(groups) as Array<[string, EnrichedAssignment[]]>;
    return entries.sort((a, b) => {
      const bDate = b[1][0] ? new Date(b[1][0].date).getTime() : 0;
      const aDate = a[1][0] ? new Date(a[1][0].date).getTime() : 0;
      return bDate - aDate;
    });
  }, [historyAssignments]);

  const buildSectionItems = (assignment: EnrichedAssignment, step: string, fallback?: string) => {
    const filtered = Array.isArray(assignment.classworkSections)
      ? assignment.classworkSections.filter((section) => (section.step || '').toLowerCase() === step)
      : [];

                if (filtered.length > 0) {
      return filtered.map((section, idx) => (
        <li key={`${assignment.id}-${step}-${idx}`} className="text-sm text-[rgba(var(--color-primary-rgb),0.85)]">
          <span className="font-medium text-primary">
            {section.title || `${step.charAt(0).toUpperCase() + step.slice(1)}${filtered.length > 1 ? ` ${idx + 1}` : ''}`}
                      </span>
                      {section.details && (
            <span className="mt-1 block text-xs text-primary-soft">{section.details}</span>
                      )}
                    </li>
                  ));
                }

                if (fallback) {
                  return [
        <li key={`${assignment.id}-${step}-fallback`} className="text-sm text-primary-soft">
                      {fallback}
        </li>,
                  ];
                }

                return [
      <li key={`${assignment.id}-${step}-none`} className="text-sm text-primary-faint">
                    Not assigned
      </li>,
    ];
  };

  const getMistakeLabel = (type: string) => {
    const map: Record<string, string> = {
      madd: 'Mad (Elongation)',
      holding: 'Holding / Fluency',
      memory: 'Memory',
      ikhfa: 'Ikhfa',
      tech: 'Ghunna',
      other: 'Other',
    };
    return map[type] || type;
  };

  const summaryMarkings = summaryAssignment?.mushafMarkings ?? [];
  const summaryHasAudio = summaryMarkings.some((m) => !!m.audioUrl);
 
              return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">My Assignments</h1>
            <p className="mt-2 text-sm text-primary-soft">
              Review your latest recitation, track feedback, and revisit homework from your teachers.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {currentStudent && (
          <div className="rounded-3xl border border-accent-soft bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={currentStudent.avatar}
                  alt={currentStudent.fullName}
                  className="h-16 w-16 flex-shrink-0 rounded-full object-cover ring-4 ring-[rgba(var(--color-accent-rgb),0.3)]"
                />
                    <div>
                  <h2 className="text-xl font-semibold text-primary">{currentStudent.fullName}</h2>
                  <p className="text-sm text-primary-soft">
                    Program:{' '}
                    <span className="font-medium text-primary">{currentStudent.program || '—'}</span>
                  </p>
                  <p className="text-sm text-primary-soft">
                    Primary Teacher:{' '}
                    <span className="font-medium text-primary">{currentStudent.assignedTeacher || '—'}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-[rgba(var(--color-primary-rgb),0.8)] md:grid-cols-4">
                {[
                  { label: 'Assignments', value: stats.totalAssignments },
                  { label: 'This Week', value: stats.assignmentsThisWeek },
                  { label: 'Mistakes', value: stats.totalMistakes },
                  { label: 'Audio Clips', value: stats.audioCorrections },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-soft-accent px-4 py-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-accent">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-primary">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {summaryAssignment ? (
          <section className="rounded-3xl border border-accent-soft bg-white shadow-sm">
            <div className="border-b border-accent-soft bg-soft-accent px-6 py-5 sm:px-10 sm:py-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <span className="inline-flex items-center rounded-full bg-accent px-4 py-1 text-xs font-medium uppercase tracking-wide text-white">
                    {formatFullDate(summaryAssignment.date)}
                  </span>
                  <h2 className="text-2xl font-semibold text-primary">Today’s Assignment</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-primary-soft">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-primary">
                      <span className="h-2 w-2 rounded-full bg-accent"></span>
                      {summaryAssignment.listenerName || summaryAssignment.teacherName || 'Teacher'}
                    </span>
                    {summaryMarkings.length ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-accent">
                        <span className="h-2 w-2 rounded-full bg-accent"></span>
                        {summaryMarkings.length} mistake
                        {summaryMarkings.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-primary">
                        <span className="h-2 w-2 rounded-full bg-primary"></span>
                        No mistakes recorded today
                      </span>
                    )}
                    {summaryHasAudio && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-primary">
                        <span className="h-2 w-2 rounded-full bg-primary"></span>
                        Audio corrections available
                      </span>
                    )}
                    {summaryAssignment.homework && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-primary">
                        <span className="h-2 w-2 rounded-full bg-primary"></span>
                        Homework assigned
                      </span>
                        )}
                      </div>
                    </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-primary-soft">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-accent">Last Updated</p>
                    <p className="mt-1 font-semibold text-primary">{stats.lastUpdated || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-accent">Homework Items</p>
                    <p className="mt-1 font-semibold text-primary">{stats.homeworkCount}</p>
                  </div>
                </div>
                    </div>
                  </div>

            <div className="space-y-8 px-6 py-8 sm:px-10">
                    <section>
                      <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Classwork Focus</h3>
                  <div className="ml-4 h-px flex-1 bg-[rgba(var(--color-accent-rgb),0.4)]"></div>
                      </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {[
                    { title: 'Sabq (New Lesson)', items: buildSectionItems(summaryAssignment, 'sabq', summaryAssignment.sabq) },
                    { title: 'Sabqi (Revision)', items: buildSectionItems(summaryAssignment, 'sabqi', summaryAssignment.sabqi) },
                    { title: 'Manzil', items: buildSectionItems(summaryAssignment, 'manzil', summaryAssignment.manzil) },
                        ].map((section) => (
                    <div key={`summary-${section.title}`} className="rounded-2xl border border-accent-soft bg-white px-5 py-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{section.title}</p>
                      <ul className="mt-2 space-y-2 text-sm text-[rgba(var(--color-primary-rgb),0.8)]">{section.items}</ul>
                          </div>
                        ))}
                      </div>
                    </section>

              {summaryMarkings.length > 0 && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Mistakes Highlighted in the Mushaf</h3>
                      <p className="mt-1 text-xs text-primary-soft">Navigate through the pages to review each correction from your teacher.</p>
                          </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set<number>(summaryMarkings.map((m: any) => Number(m.page))))
                        .filter((page): page is number => !Number.isNaN(page))
                        .sort((a, b) => a - b)
                        .map((page) => (
                          <button
                            key={`summary-page-${page}`}
                            onClick={() => setSummaryMushafPage(page)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                              summaryMushafPage === page
                                ? 'bg-primary text-white'
                                : 'bg-soft-accent text-primary hover:bg-accent hover:text-white'
                            }`}
                          >
                            Page {page}
                          </button>
                        ))}
                    </div>
                        </div>

                  <div className="space-y-3 rounded-2xl border border-accent-soft bg-white px-5 py-4">
                    {summaryMarkings.map((mistake: any, idx: number) => (
                      <div
                        key={`summary-mistake-${idx}`}
                        className="flex flex-col gap-2 border-b border-accent-soft pb-3 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                              >
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${mistake.type === 'memory' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
                            >
                              {getMistakeLabel(mistake.type)}
                                    </span>
                            <span className="text-sm text-[rgba(var(--color-primary-rgb),0.8)]">
                                      Page {mistake.page}, Surah {mistake.surah}, Ayah {mistake.ayah}
                                      {mistake.note && ` — ${mistake.note}`}
                                    </span>
                                  </div>
                          {mistake.audioUrl && (
                            <span className="ml-0 text-xs text-[rgba(var(--color-primary-rgb),0.6)]">Audio correction available</span>
                                  )}
                                </div>
                        {mistake.audioUrl && (
                          <audio controls src={mistake.audioUrl} className="w-full max-w-sm rounded md:w-auto">
                                    Your browser does not support the audio element.
                                  </audio>
                                )}
                              </div>
                                  ))}
                              </div>

                  <div className="rounded-2xl border border-accent-soft bg-white px-5 py-5 shadow-sm">
                            <InteractiveMushaf
                      currentPage={summaryMushafPage}
                      onPageChange={setSummaryMushafPage}
                      mistakes={summaryMarkings}
                              onMistakeMark={() => {}}
                              readOnly
                              mode="viewing"
                            />
                          </div>
                      </section>
                    )}

              {summaryAssignment.homework && (
              <section className="space-y-3">
                  <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Homework</h3>
                  <div className="ml-4 h-px flex-1 bg-[rgba(var(--color-accent-rgb),0.4)]"></div>
                        </div>
                <div className="rounded-2xl border border-accent-soft bg-soft-accent px-5 py-4 text-sm text-[rgba(var(--color-primary-rgb),0.85)]">
                    <p className="whitespace-pre-wrap">{summaryAssignment.homework}</p>
                    {summaryAssignment.homeworkLink && (
                            <div className="mt-3">
                              <a
                          href={summaryAssignment.homeworkLink}
                                target="_blank"
                                rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline decoration-[rgba(var(--color-accent-rgb),0.6)] hover:text-accent"
                              >
                                Open homework resource
                              </a>
                            </div>
                          )}
                        </div>
                      </section>
                    )}

              {summaryAssignment.comment && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Teacher Feedback</h3>
                    <div className="ml-4 h-px flex-1 bg-[rgba(var(--color-accent-rgb),0.4)]"></div>
                        </div>
                  <div className="rounded-2xl border border-accent-soft bg-white px-5 py-4 text-sm text-[rgba(var(--color-primary-rgb),0.85)]">
                    <p className="whitespace-pre-wrap">{summaryAssignment.comment}</p>
                    <p className="mt-2 text-xs text-[rgba(var(--color-primary-rgb),0.6)]">
                      {summaryAssignment.listenerName || summaryAssignment.teacherName || 'Instructor'} • {formatFullDate(summaryAssignment.date)}
                          </p>
                        </div>
                      </section>
                    )}
                  </div>
          </section>
        ) : (
          <div className="rounded-3xl border border-dashed border-accent-soft bg-white px-6 py-12 text-center text-sm text-primary-soft">
            No assignments are available yet. Your teacher will assign work here once it’s ready.
          </div>
        )}

        {historyAssignments.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Assignment History</h2>
              <div className="ml-4 h-px flex-1 bg-[rgba(var(--color-accent-rgb),0.3)]"></div>
            </div>

            <div className="space-y-8">
              {historyGroups.map(([label, groupAssignments]) => (
                <div key={label} className="space-y-4">
                    <button
                    onClick={() =>
                      setHistoryExpanded((prev) => ({
                        ...prev,
                        [label]: !prev[label],
                      }))
                    }
                  className="flex w-full items-center justify-between rounded-2xl border border-accent-soft bg-white px-4 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-soft-accent"
                  >
                    <span>{label}</span>
                    <span
                      className={`transform text-lg transition-transform ${
                        historyExpanded[label] ? 'rotate-180' : ''
                      }`}
                    >
                      ▾
                    </span>
                  </button>
                  {historyExpanded[label] && (
                    <div className="space-y-4">
                      {groupAssignments.map((assignment) => {
                        const markings = assignment.mushafMarkings;
                        const hasAudio = markings.some((m) => !!m.audioUrl);
                        const isExpanded = showMushafForAssignment === assignment.id;

                        return (
                          <div
                            key={assignment.id}
                            className="rounded-2xl border border-accent-soft bg-white px-5 py-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-primary">{formatFullDate(assignment.date)}</p>
                                <p className="text-xs text-[rgba(var(--color-primary-rgb),0.6)]">
                                  Listener: {assignment.listenerName || assignment.teacherName || 'Teacher'}
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs text-primary-soft">
                                  {markings.length > 0 && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-soft-accent px-3 py-1 font-semibold text-accent">
                                      <span className="h-2 w-2 rounded-full bg-accent"></span>
                                      {markings.length} mistake{markings.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {assignment.homework && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-soft-accent px-3 py-1 font-semibold text-primary">
                                      <span className="h-2 w-2 rounded-full bg-primary"></span>
                                      Homework assigned
                                    </span>
                                  )}
                                  {hasAudio && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-soft-accent px-3 py-1 font-semibold text-primary">
                                      <span className="h-2 w-2 rounded-full bg-primary"></span>
                                      Audio corrections
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    if (showMushafForAssignment === assignment.id) {
                                      setShowMushafForAssignment(null);
                                    } else {
                                      setShowMushafForAssignment(assignment.id);
                                      const firstMistake = markings[0];
                                      setMushafPage(firstMistake?.page || 1);
                                    }
                                  }}
                                  disabled={markings.length === 0}
                                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                                    markings.length === 0
                                      ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                      : isExpanded
                                        ? 'bg-primary text-white'
                                        : 'border border-primary text-primary hover:bg-primary hover:text-white'
                                  }`}
                                >
                                  {markings.length === 0
                                    ? 'No Mistakes'
                                    : isExpanded
                                      ? 'Hide Mushaf'
                                      : 'View Mushaf'}
                                </button>
                                {assignment.homework && (
                                  <button
                                    onClick={() => alert(assignment.homework)}
                                    className="rounded-full border border-[rgba(var(--color-accent-rgb),0.4)] px-4 py-2 text-xs font-semibold text-accent hover:border-accent"
                                  >
                                    View Homework
                    </button>
                                )}
                                {assignment.comment && (
                    <button
                                    onClick={() => alert(assignment.comment)}
                                    className="rounded-full border border-[rgba(var(--color-accent-rgb),0.4)] px-4 py-2 text-xs font-semibold text-accent hover:border-accent"
                    >
                                    Read Feedback
                    </button>
                                )}
                              </div>
                            </div>

                            {showMushafForAssignment === assignment.id && markings.length > 0 && (
                              <div className="mt-4 space-y-3 rounded-2xl border border-accent-soft bg-soft-accent px-4 py-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  {markings.map((mistake: any, idx: number) => (
                                    <span
                                      key={`history-${assignment.id}-mistake-${idx}`}
                                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${mistake.type === 'memory' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
                                    >
                                      {getMistakeLabel(mistake.type)} • Pg {mistake.page}
                                    </span>
                                  ))}
                                </div>
                                <div className="rounded-2xl border border-accent-soft bg-white px-4 py-3">
                                  <InteractiveMushaf
                                    currentPage={mushafPage}
                                    onPageChange={setMushafPage}
                                    mistakes={markings}
                                    onMistakeMark={() => {}}
                                    readOnly
                                    mode="viewing"
                                  />
                  </div>
                              </div>
                            )}
                </div>
              );
                      })}
                    </div>
          )}
        </div>
              ))}
            </div>
          </section>
        )}
      </div>
      
      <DebugPanel />
    </div>
  );
};

export default StudentAssignments;

