import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';

interface StudentProfileProps {
  student: any;
  onClose: () => void;
  onEdit: (student: any) => void;
  onEnrollment?: () => void;
  onPayments?: () => void;
  onProgress?: () => void;
  onCommunication?: () => void;
  onWeeklyEvaluations?: () => void;
}

const StudentProfile: React.FC<StudentProfileProps> = ({
  student,
  onClose,
  onEdit,
  onEnrollment,
  onPayments,
  onProgress,
  onCommunication,
  onWeeklyEvaluations,
}) => {
  const { students, teachers, assignments } = useData();
  const { assignments: backendAssignments, tickets, recitationReviews, getPairStudents, getTeacherPairs } = useBackendData();
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pairInfo, setPairInfo] = useState<any>(null);

  const currentStudent = useMemo(
    () => students.find((entry) => entry.id === student.id) ?? student,
    [students, student],
  );

  // Load pair information for student
  useEffect(() => {
    const loadPairInfo = async () => {
      if (!currentStudent?.id) {
        setPairInfo(null);
        return;
      }
      
      try {
        const pairStudents = await getPairStudents({ student: currentStudent.id, status: 'active' });
        if (pairStudents.length > 0) {
          const pairStudent = pairStudents[0];
          // Get the full pair information
          const pairs = await getTeacherPairs();
          const pair = pairs.find((p: any) => p._id === pairStudent.pair?._id || p._id === pairStudent.pair);
          
          if (pair) {
            setPairInfo({
              pair: pair,
              pairStudent: pairStudent,
              schedule: {
                startTime: pairStudent.startTime,
                endTime: pairStudent.endTime,
                days: pairStudent.days
              }
            });
          }
        } else {
          setPairInfo(null);
        }
      } catch (error) {
        console.error('Error loading pair info:', error);
        setPairInfo(null);
      }
    };
    
    loadPairInfo();
  }, [currentStudent?.id, getPairStudents, getTeacherPairs]);

  // Refresh data when backendAssignments changes (e.g., after deletion)
  useEffect(() => {
    // This will force re-computation of activityHistory when assignments change
    setRefreshKey(prev => prev + 1);
  }, [backendAssignments.length]);

  const assignedTeacher = teachers.find((t) => t.id === currentStudent.assignedTeacher);

  const scheduleEntries = useMemo(() => {
    // Use pair schedule if available, otherwise use student schedule
    const schedule = pairInfo?.schedule || currentStudent.schedule;
    const days = Array.isArray(schedule?.days)
      ? schedule.days
      : (Array.isArray(currentStudent.schedule?.days) ? currentStudent.schedule.days : []);

    // Get teacher names from pair
    const teacherNames = pairInfo?.pair 
      ? `${pairInfo.pair.teacher1?.fullName || 'Teacher 1'}${pairInfo.pair.teacher2?.fullName ? ` & ${pairInfo.pair.teacher2.fullName}` : ''}`
      : (assignedTeacher?.fullName || 'Not assigned');

    return days.map((day: string) => ({
      day,
      time:
        schedule?.startTime && schedule?.endTime
          ? `${schedule.startTime} - ${schedule.endTime}`
          : (currentStudent.schedule?.startTime && currentStudent.schedule?.endTime
              ? `${currentStudent.schedule.startTime} - ${currentStudent.schedule.endTime}`
              : '—'),
      teacher: teacherNames,
      room: currentStudent.schedule?.room || '—',
    }));
  }, [pairInfo, assignedTeacher?.fullName, currentStudent.schedule]);

  const studentAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          assignment.studentId === currentStudent.id,
      ),
    [assignments, currentStudent.id],
  );

  const gradedAssignments = studentAssignments.filter(
    (assignment) => typeof (assignment as any).grade === 'number',
  );

  const averageGrade =
    gradedAssignments.length > 0
      ? Math.round(
          gradedAssignments.reduce((sum, assignment) => sum + ((assignment as any).grade || 0), 0) /
            gradedAssignments.length,
        )
      : null;

  const payments = Array.isArray((currentStudent as any).payments)
    ? (currentStudent as any).payments
    : [];

  const notes = Array.isArray((currentStudent as any).notes)
    ? (currentStudent as any).notes
    : [];

  const attendance = Array.isArray((currentStudent as any).attendance)
    ? (currentStudent as any).attendance
    : [];

  const courses = Array.isArray((currentStudent as any).courses)
    ? (currentStudent as any).courses
    : [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'history', label: 'Activity History', icon: '📜' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'assignments', label: 'Assignments', icon: '📝' },
    { id: 'progress', label: 'Progress', icon: '📈' },
    { id: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'payments', label: 'Payments', icon: '💰' },
    { id: 'notes', label: 'Notes', icon: '📄' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  ];

  // Build comprehensive activity history timeline
  const activityHistory = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'assignment' | 'ticket' | 'recitation_review';
      date: Date;
      title: string;
      description: string;
      status?: string;
      icon: string;
      color: string;
      data: any;
    }> = [];

    const studentId = currentStudent.id || (currentStudent as any)._id;

    // Get all finalized/completed tickets for this student to check if assignments came from tickets
    const finalizedTickets = tickets.filter((ticket: any) => {
      const ticketStudentId = ticket.studentId || (ticket as any).student?._id || (ticket as any).student?.id;
      const matchesStudent = ticketStudentId === studentId || ticketStudentId?.toString() === studentId?.toString();
      const isFinalized = ticket.status === 'finalized' || ticket.status === 'completed';
      return matchesStudent && isFinalized && ticket.assignmentId;
    });
    const finalizedTicketIds = new Set(finalizedTickets.map((t: any) => t.id || t._id));

    // Only show finalized assignments:
    // 1. Published/completed assignments (not drafts)
    // 2. Assignments from finalized tickets (have fromTicketId matching a finalized ticket)
    // 3. Manual assignments (no fromTicketId, no fromRecitationReviewId)
    backendAssignments
      .filter((assignment: any) => {
        const assignedTo = Array.isArray(assignment.assignedTo) ? assignment.assignedTo : [assignment.assignedTo];
        const matchesStudent = assignedTo.includes(studentId) || assignedTo.includes(studentId?.toString());
        
        if (!matchesStudent) return false;

        // Filter to only finalized assignments
        const status = assignment.status || 'published';
        const isPublished = status === 'published' || status === 'completed';
        const isDraft = status === 'draft' || status === 'pending_homework';
        
        // Show if published/completed
        if (isPublished && !isDraft) return true;
        
        // Show if from a finalized ticket
        const fromTicketId = assignment.fromTicketId;
        if (fromTicketId && finalizedTicketIds.has(fromTicketId)) return true;
        
        // Show manual assignments (no ticket, no recitation review)
        const isManual = !assignment.fromTicketId && !assignment.fromRecitationReviewId;
        if (isManual && isPublished) return true;
        
        return false;
      })
      .forEach((assignment: any) => {
        // Determine source
        let source = 'Manual Assignment';
        if (assignment.fromTicketId) {
          source = 'From Ticket System';
        } else if (assignment.fromRecitationReviewId) {
          source = 'From Recitation Review';
        }
        
        activities.push({
          id: assignment._id || assignment.id || `assignment-${Date.now()}`,
          type: 'assignment',
          date: assignment.createdAt ? new Date(assignment.createdAt) : new Date(assignment.updatedAt || Date.now()),
          title: `${assignment.title || 'Assignment'} (${source})`,
          description: assignment.description || assignment.homeworkComments || 'No description',
          status: assignment.status || 'published',
          icon: '📝',
          color: 'bg-green-100 text-green-800 border-green-200',
          data: assignment,
        });
      });

    // Sort by date (most recent first)
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [currentStudent.id, backendAssignments, tickets, recitationReviews, refreshKey]);

  // Group activities by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Array<{
      id: string;
      type: 'assignment' | 'ticket' | 'recitation_review';
      date: Date;
      title: string;
      description: string;
      status?: string;
      icon: string;
      color: string;
      data: any;
    }>> = {};
    activityHistory.forEach(activity => {
      const dateKey = activity.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });
    return groups;
  }, [activityHistory]);

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '—');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border-2 border-primary">
        <header className="bg-gradient-to-br from-primary to-[rgba(var(--color-primary-rgb),0.85)]">
          <div className="flex flex-col gap-6 px-8 py-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-5">
              <div className="relative">
                <img
                  src={
                    currentStudent.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentStudent.fullName || 'Student',
                    )}&background=random&color=fff`
                  }
                  alt={currentStudent.fullName}
                  className="h-24 w-24 rounded-full border-4 border-accent shadow-lg"
                />
                <span
                  className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-4 border-primary ${
                    currentStudent.status === 'active'
                      ? 'bg-accent'
                      : currentStudent.status === 'inactive'
                        ? 'bg-soft-primary'
                        : 'bg-accent'
                  }`}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight text-accent">{currentStudent.fullName}</h1>
                <p className="text-accent/90">{currentStudent.email || 'No email on file'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-accent/20 px-3 py-1 font-medium text-accent">
                    {currentStudent.program || 'No program assigned'}
                  </span>
                  <span className="rounded-full bg-accent/20 px-3 py-1 font-medium capitalize text-accent">
                    {currentStudent.status || 'active'}
                  </span>
                  {pairInfo?.pair && (
                    <span className="rounded-full bg-primary/20 px-3 py-1 font-medium text-primary">
                      👥 Pair: {pairInfo.pair.name}
                    </span>
                  )}
                  {!pairInfo?.pair && currentStudent.assignedTeacher && (() => {
                    const teacher = teachers.find(t => t.id === currentStudent.assignedTeacher);
                    return teacher ? (
                      <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
                        👤 Individual: {teacher.fullName}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
                        👤 Individual Assignment
                      </span>
                    );
                  })()}
                  {!pairInfo?.pair && !currentStudent.assignedTeacher && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
                      No Assignment
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onEdit(currentStudent)}
                className="inline-flex items-center rounded-xl border-2 border-accent px-5 py-3 text-sm font-extrabold text-accent transition hover:bg-accent/20 shadow-lg"
              >
                ✏️ Edit Profile
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-primary transition hover:bg-accent/90 shadow-lg hover:scale-105"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b-2 border-primary bg-soft-primary px-6 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-extrabold transition ${
                activeTab === tab.id
                  ? 'bg-primary text-accent shadow-lg'
                  : 'text-primary hover:bg-primary/20'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <StatCard label="Assignments" value={studentAssignments.length} icon="📝" />
                  <StatCard
                    label="Average Grade"
                    value={averageGrade !== null ? `${averageGrade}%` : '—'}
                    icon="📈"
                  />
                  <StatCard
                    label="Monthly Tuition"
                    value={currentStudent.tuitionFee ? `$${currentStudent.tuitionFee}` : '—'}
                    icon="💰"
                  />
                  <StatCard
                    label="Enrollment Date"
                    value={formatDate(currentStudent.enrolledDate)}
                    icon="📅"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <InfoCard
                    title="Profile"
                    icon="👤"
                    items={[
                      { label: 'Parent / Guardian', value: currentStudent.parentName },
                      { label: 'Contact', value: currentStudent.contact },
                      { label: 'Email', value: currentStudent.email },
                      { label: 'Status', value: currentStudent.status },
                    ]}
                  />
                  <InfoCard
                    title="Enrollment"
                    icon="🎓"
                    items={[
                      { label: 'Program', value: currentStudent.program },
                      {
                        label: 'Teacher Pair',
                        value: pairInfo?.pair ? (
                          <div className="space-y-2">
                            <div>
                              <div className="font-semibold text-primary">{pairInfo.pair.name}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                Program: {pairInfo.pair.program}
                              </div>
                            </div>
                            <div className="border-t border-gray-200 pt-2">
                              <div className="text-xs font-bold text-gray-500 mb-1">Teachers:</div>
                              <div className="text-sm font-semibold text-primary">
                                • {pairInfo.pair.teacher1?.fullName || 'Teacher 1'}
                              </div>
                              {pairInfo.pair.teacher2?.fullName && (
                                <div className="text-sm font-semibold text-primary">
                                  • {pairInfo.pair.teacher2.fullName}
                                </div>
                              )}
                            </div>
                            {pairInfo.schedule && (
                              <div className="border-t border-gray-200 pt-2">
                                <div className="text-xs font-bold text-gray-500 mb-1">Schedule:</div>
                                <div className="text-xs text-gray-700">
                                  {pairInfo.schedule.startTime} - {pairInfo.schedule.endTime}
                                </div>
                                {pairInfo.schedule.days && pairInfo.schedule.days.length > 0 && (
                                  <div className="text-xs text-gray-700 mt-1">
                                    Days: {pairInfo.schedule.days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="mt-2">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                pairInfo.pair.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {pairInfo.pair.status || 'Active'}
                              </span>
                            </div>
                          </div>
                        ) : currentStudent.assignedTeacher ? (
                          <div className="text-sm text-gray-500">
                            Individual Teacher: {assignedTeacher?.fullName || 'Not found'}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">
                            No assignment. Edit profile to assign teacher or pair.
                          </div>
                        ),
                      },
                      {
                        label: 'Tuition',
                        value: currentStudent.tuitionFee ? `$${currentStudent.tuitionFee}` : '—',
                      },
                      {
                        label: 'Registration',
                        value: currentStudent.registrationAmount
                          ? `$${currentStudent.registrationAmount}`
                          : '—',
                      },
                    ]}
                  />
                </div>

                <SectionCard title="Upcoming Sessions" icon="📅">
                  {scheduleEntries.length === 0 ? (
                    <EmptyState message="No schedule has been added for this student yet." />
                  ) : (
                    <ul className="space-y-3 text-sm text-primary">
                      {scheduleEntries.map((entry, index) => (
                        <li
                          key={`${entry.day}-${index}`}
                          className="flex flex-wrap items-center justify-between rounded-xl border-2 border-primary bg-soft-primary px-4 py-3 shadow-md"
                        >
                          <span className="font-extrabold text-primary">{entry.day}</span>
                          <span className="text-primary">{entry.time}</span>
                          <span className="text-primary">{entry.teacher}</span>
                          <span className="text-primary">{entry.room}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>

                <SectionCard title="Recent Assignments" icon="📝" onAction={onProgress} actionLabel="View All">
                  {studentAssignments.length === 0 ? (
                    <EmptyState message="No assignments found for this student." />
                  ) : (
                    <ul className="space-y-3 text-sm text-primary">
                      {studentAssignments.slice(0, 4).map((assignment) => (
                        <li
                          key={assignment.id}
                          className="rounded-xl border-2 border-primary bg-soft-primary px-4 py-3 shadow-md"
                        >
                          <div className="flex flex-wrap items-center justify-between">
                            <span className="font-extrabold text-primary">Assignment</span>
                            <span className="text-xs text-primary">
                              {assignment.createdAt
                                ? new Date(assignment.createdAt).toLocaleDateString()
                                : 'No date'}
                            </span>
                          </div>
                          <p className="text-xs text-primary">
                            {assignment.classwork?.sabq?.length ? 'Sabq' : assignment.classwork?.sabqi?.length ? 'Sabqi' : assignment.classwork?.manzil?.length ? 'Manzil' : 'Classwork'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
              </>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <SectionCard title="Activity Timeline" icon="📜">
                  {activityHistory.length === 0 ? (
                    <EmptyState message="No activity history found for this student yet." />
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedByDate)
                        .sort(([dateA], [dateB]) => {
                          const a = new Date(dateA);
                          const b = new Date(dateB);
                          return b.getTime() - a.getTime();
                        })
                        .map(([dateKey, dayActivities]) => {
                          const activities = dayActivities as Array<{
                            id: string;
                            type: 'assignment' | 'ticket' | 'recitation_review';
                            date: Date;
                            title: string;
                            description: string;
                            status?: string;
                            icon: string;
                            color: string;
                            data: any;
                          }>;
                          return (
                          <div key={dateKey} className="rounded-xl border-2 border-primary bg-soft-primary p-6 shadow-lg">
                            <div className="mb-4 pb-3 border-b-2 border-primary">
                              <h3 className="text-lg font-extrabold text-primary">{dateKey}</h3>
                              <p className="text-xs text-primary mt-1">
                                {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} on this day
                              </p>
                            </div>
                            
                            <div className="space-y-4">
                              {activities.map((activity) => {
                                const mushafMarkings = activity.type === 'assignment' && activity.data.mushafMarkings 
                                  ? (Array.isArray(activity.data.mushafMarkings) ? activity.data.mushafMarkings : [])
                                  : [];
                                
                                return (
                                  <div key={activity.id} className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">{activity.icon}</span>
                                        <div>
                                          <h4 className="font-extrabold text-primary">{activity.title}</h4>
                                          <p className="text-xs text-primary mt-0.5">
                                            {activity.date.toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                      {activity.status && (
                                        <span className="px-2 py-1 rounded-full text-xs font-extrabold bg-primary text-accent border-2 border-primary">
                                          {activity.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {activity.description && activity.description !== 'No description' && (
                                      <p className="text-sm text-primary mt-2 whitespace-pre-wrap">
                                        {activity.description}
                                      </p>
                                    )}
                                    
                                    {/* Mushaf Mistakes */}
                                    {mushafMarkings.length > 0 && (
                                      <div className="mt-3 rounded-lg border-2 border-accent/50 bg-accent/10 p-3">
                                        <h5 className="text-xs font-extrabold text-primary mb-2">
                                          📖 Mushaf Mistakes ({mushafMarkings.length})
                                        </h5>
                                        <div className="flex flex-wrap gap-2">
                                          {mushafMarkings.map((mistake: any, idx: number) => {
                                            const typeLabel = mistake.type === 'memory' ? 'Memory' :
                                                             mistake.type === 'madd' ? 'Madd' :
                                                             mistake.type === 'ikhfa' ? 'Ikhfa' :
                                                             mistake.type === 'holding' ? 'Holding' :
                                                             mistake.type === 'tech' ? 'Tech' :
                                                             mistake.type === 'other' ? 'Other' : mistake.type;
                                            return (
                                              <span
                                                key={idx}
                                                className="px-2 py-1 rounded text-xs font-extrabold bg-accent/20 text-primary border border-accent/30"
                                              >
                                                {typeLabel} • Page {mistake.page}
                                                {mistake.surah && mistake.ayah && ` • ${mistake.surah}:${mistake.ayah}`}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Additional info based on type */}
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-primary">
                                      {activity.type === 'assignment' && activity.data.assignedBy && (
                                        <span>Assigned by: {activity.data.listenerName || activity.data.assignedTeacherName || 'Admin'}</span>
                                      )}
                                      {activity.type === 'ticket' && activity.data.assignedTeacherName && (
                                        <span>Teacher: {activity.data.assignedTeacherName}</span>
                                      )}
                                      {activity.type === 'recitation_review' && activity.data.audioLink && (
                                        <a 
                                          href={activity.data.audioLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-accent hover:underline font-extrabold"
                                        >
                                          🔊 Listen to Audio
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          );
                        })}
                    </div>
                  )}
                </SectionCard>

                {/* Summary Statistics */}
                {activityHistory.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      label="Total Activities"
                      value={activityHistory.length}
                      icon="📊"
                    />
                    <StatCard
                      label="Assignments"
                      value={activityHistory.filter(a => a.type === 'assignment').length}
                      icon="📝"
                    />
                    <StatCard
                      label="Tickets"
                      value={activityHistory.filter(a => a.type === 'ticket').length}
                      icon="🎫"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schedule' && (
              <SectionCard title="Weekly Schedule" icon="📅">
                {scheduleEntries.length === 0 ? (
                  <EmptyState message="No schedule yet. Add days and times from the student registration form." />
                ) : (
                  <table className="w-full table-auto text-sm">
                    <thead className="bg-primary text-left text-xs font-extrabold text-accent">
                      <tr>
                        <th className="px-4 py-3">Day</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Teacher</th>
                        <th className="px-4 py-3">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-primary">
                      {scheduleEntries.map((entry, index) => (
                        <tr key={`${entry.day}-${index}`} className="hover:bg-primary/10">
                          <td className="px-4 py-3 font-extrabold text-primary">{entry.day}</td>
                          <td className="px-4 py-3 text-primary">{entry.time}</td>
                          <td className="px-4 py-3 text-primary">{entry.teacher}</td>
                          <td className="px-4 py-3 text-primary">{entry.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </SectionCard>
            )}

            {activeTab === 'assignments' && (
              <SectionCard title="Assignments" icon="📝">
                {studentAssignments.length === 0 ? (
                  <EmptyState message="This student does not have any assignments yet." />
                ) : (
                  <ul className="space-y-3 text-sm text-primary">
                    {studentAssignments.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="rounded-xl border-2 border-primary bg-soft-primary px-4 py-3 shadow-md"
                      >
                        <div className="flex flex-wrap items-center justify-between">
                          <div>
                            <p className="font-extrabold text-primary">Assignment</p>
                            <p className="text-xs text-primary">
                              {assignment.classwork?.sabq?.length ? 'Sabq' : assignment.classwork?.sabqi?.length ? 'Sabqi' : assignment.classwork?.manzil?.length ? 'Manzil' : 'Classwork'}
                            </p>
                          </div>
                          <div className="text-right text-xs text-primary">
                            <p>
                              Created:{' '}
                              {assignment.createdAt
                                ? new Date(assignment.createdAt).toLocaleDateString()
                                : 'Not set'}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}

            {activeTab === 'progress' && (
              <SectionCard title="Progress Snapshot" icon="📈">
                {studentAssignments.length === 0 ? (
                  <EmptyState message="Assign coursework to start tracking progress." />
                ) : (
                  <div className="space-y-3 text-sm text-primary">
                    <p>
                      <span className="font-extrabold">Assignments completed:</span>{' '}
                      {gradedAssignments.length} of {studentAssignments.length}
                    </p>
                    <p>
                      <span className="font-extrabold">Average grade:</span>{' '}
                      {averageGrade !== null ? `${averageGrade}%` : '—'}
                    </p>
                  </div>
                )}
              </SectionCard>
            )}

            {activeTab === 'attendance' && (
              <SectionCard title="Attendance" icon="✅">
                {attendance.length === 0 ? (
                  <EmptyState message="No attendance records found." />
                ) : (
                  <ul className="space-y-3 text-sm text-primary">
                    {attendance.map((record: any, index: number) => (
                      <li
                        key={`${record.date}-${index}`}
                        className="flex flex-wrap items-center justify-between rounded-xl border-2 border-primary bg-soft-primary px-4 py-3 shadow-md"
                      >
                        <span className="font-extrabold text-primary">
                          {record.date ? new Date(record.date).toLocaleDateString() : '—'}
                        </span>
                        <span className="text-xs text-primary">{record.status}</span>
                        <span className="text-xs text-primary">{record.notes}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}

            {activeTab === 'payments' && (
              <SectionCard title="Payments" icon="💰" actionLabel="Record Payment" onAction={onPayments}>
                {payments.length === 0 ? (
                  <EmptyState message="No payments recorded for this student." />
                ) : (
                  <ul className="space-y-3 text-sm text-primary">
                    {payments.map((payment: any, index: number) => (
                      <li
                        key={payment.id || index}
                        className="flex flex-wrap items-center justify-between rounded-xl border-2 border-primary bg-soft-primary px-4 py-3 shadow-md"
                      >
                        <div>
                          <p className="font-extrabold text-primary">
                            ${payment.amount}{' '}
                            <span className="text-xs text-primary">({payment.status})</span>
                          </p>
                          <p className="text-xs text-primary">Method: {payment.method || '—'}</p>
                        </div>
                        <div className="text-right text-xs text-primary">
                          <p>{formatDate(payment.date)}</p>
                          {payment.reference && <p>Ref: {payment.reference}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}

            {activeTab === 'overview' && onWeeklyEvaluations && (
              <SectionCard title="Weekly Evaluations" icon="📋" actionLabel="View Evaluations" onAction={onWeeklyEvaluations}>
                <div className="text-sm text-primary">
                  <p>View and provide feedback on weekly evaluations for this student.</p>
                </div>
              </SectionCard>
            )}

            {activeTab === 'notes' && (
              <SectionCard 
                title="Teacher Notes" 
                icon="📄" 
                actionLabel="Add Note"
                onAction={() => {
                  const noteContent = prompt('Enter a note for this student:');
                  if (noteContent && noteContent.trim()) {
                    // Note: This would typically call an API to save the note
                    // For now, we'll just show an alert
                    alert('Note functionality: This would save a note to the student profile. API integration needed.');
                  }
                }}
              >
                {notes.length === 0 ? (
                  <EmptyState message="No notes for this student yet." />
                ) : (
                  <ul className="space-y-3 text-sm text-primary">
                    {notes.map((note: any) => (
                      <li
                        key={note.id}
                        className="rounded-xl border-2 border-primary bg-soft-primary px-4 py-3 shadow-md"
                      >
                        <div className="flex items-center justify-between text-xs text-primary">
                          <span>{note.author || 'Team member'}</span>
                          <span>{formatDate(note.date)}</span>
                        </div>
                        <p className="mt-2 text-primary">{note.content}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}

            {activeTab === 'courses' && (
              <SectionCard title="Courses" icon="📚">
                {courses.length === 0 ? (
                  <EmptyState message="No courses assigned yet." />
                ) : (
                  <ul className="space-y-3 text-sm text-primary">
                    {courses.map((course: any, index: number) => (
                      <li
                        key={course.id || index}
                        className="rounded-xl border-2 border-primary bg-soft-primary px-4 py-3 shadow-md"
                      >
                        {course.name || course}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}

            {activeTab === 'family' && (
              <SectionCard title="Family & Emergency Contacts" icon="👨‍👩‍👧‍👦">
                <ul className="space-y-3 text-sm text-primary">
                  <li className="rounded-xl border-2 border-primary bg-soft-primary px-4 py-3 shadow-md">
                    <p className="font-extrabold text-primary">Primary Guardian</p>
                    <p className="text-primary">{currentStudent.parentName || 'Not provided'}</p>
                    <p className="text-xs text-primary">{currentStudent.contact || 'No phone'}</p>
                  </li>
                  {Array.isArray((currentStudent as any).familyContacts) &&
                    (currentStudent as any).familyContacts.map((contact: any, index: number) => (
                      <li
                        key={contact.id || index}
                        className="rounded-xl border-2 border-primary bg-soft-primary px-4 py-3 shadow-md"
                      >
                        <p className="font-extrabold text-primary">
                          {contact.name} — {contact.relationship}
                        </p>
                        <p className="text-xs text-primary">{contact.phone}</p>
                      </li>
                    ))}
                </ul>
              </SectionCard>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
  <div className="rounded-xl border-2 border-primary bg-soft-primary p-4 shadow-lg">
    <div className="flex items-center justify-between">
      <span className="text-2xl">{icon}</span>
      <div className="text-right">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{label}</p>
        <p className="mt-1 text-lg font-extrabold text-primary">{value}</p>
      </div>
    </div>
  </div>
);

interface InfoCardProps {
  title: string;
  icon: string;
  items: Array<{ label: string; value?: string | number | null }>;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, icon, items }) => (
  <div className="rounded-xl border-2 border-primary bg-soft-primary p-6 shadow-lg">
    <h3 className="mb-4 flex items-center text-lg font-extrabold text-primary">
      <span className="mr-3 text-xl">{icon}</span>
      {title}
    </h3>
    <div className="grid grid-cols-1 gap-3 text-sm text-primary">
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between">
          <span className="font-semibold text-primary/70">{label}</span>
          <span className="font-extrabold text-primary">{value ?? '—'}</span>
        </div>
      ))}
    </div>
  </div>
);

interface SectionCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: (() => void) | undefined;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children, actionLabel, onAction }) => (
  <div className="rounded-xl border-2 border-primary bg-soft-primary p-6 shadow-lg">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="flex items-center text-lg font-extrabold text-primary">
        <span className="mr-3 text-xl">{icon}</span>
        {title}
      </h3>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-sm font-extrabold text-accent hover:text-accent/80 underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
    {children}
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-8 text-center text-sm text-primary">
    {message}
  </div>
);

export default StudentProfile;