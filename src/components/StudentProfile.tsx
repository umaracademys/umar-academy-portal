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
}

const StudentProfile: React.FC<StudentProfileProps> = ({
  student,
  onClose,
  onEdit,
  onEnrollment,
  onPayments,
  onProgress,
  onCommunication,
}) => {
  const { students, teachers, assignments } = useData();
  const { assignments: backendAssignments, tickets, recitationReviews } = useBackendData();
  const [activeTab, setActiveTab] = useState('overview');

  const currentStudent = useMemo(
    () => students.find((entry) => entry.id === student.id) ?? student,
    [students, student],
  );

  const assignedTeacher = teachers.find((t) => t.id === currentStudent.assignedTeacher);

  const scheduleEntries = useMemo(() => {
    const days = Array.isArray(currentStudent.schedule?.days)
      ? currentStudent.schedule?.days
      : [];

    return days.map((day: string) => ({
      day,
      time:
        currentStudent.schedule?.startTime && currentStudent.schedule?.endTime
          ? `${currentStudent.schedule?.startTime} - ${currentStudent.schedule?.endTime}`
          : '—',
      teacher: assignedTeacher?.fullName || 'Not assigned',
      room: currentStudent.schedule?.room || '—',
    }));
  }, [assignedTeacher?.fullName, currentStudent.schedule]);

  const studentAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          Array.isArray(assignment.assignedTo) && assignment.assignedTo.includes(currentStudent.id),
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

    // Add assignments
    backendAssignments
      .filter((assignment: any) => {
        const assignedTo = Array.isArray(assignment.assignedTo) ? assignment.assignedTo : [assignment.assignedTo];
        return assignedTo.includes(studentId) || assignedTo.includes(studentId?.toString());
      })
      .forEach((assignment: any) => {
        activities.push({
          id: assignment._id || assignment.id || `assignment-${Date.now()}`,
          type: 'assignment',
          date: assignment.createdAt ? new Date(assignment.createdAt) : new Date(assignment.updatedAt || Date.now()),
          title: assignment.title || 'Assignment',
          description: assignment.description || assignment.homeworkComments || 'No description',
          status: assignment.status,
          icon: '📝',
          color: 'bg-green-100 text-green-800 border-green-200',
          data: assignment,
        });
      });

    // Add tickets
    tickets
      .filter((ticket: any) => {
        const ticketStudentId = ticket.studentId || (ticket as any).student?._id || (ticket as any).student?.id;
        return ticketStudentId === studentId || ticketStudentId?.toString() === studentId?.toString();
      })
      .forEach((ticket: any) => {
        const stepLabel = ticket.workflowStep === 'sabq' ? 'Sabq (New Lesson)' :
                         ticket.workflowStep === 'sabqi' ? 'Sabqi (Revision)' :
                         ticket.workflowStep === 'manzil' ? 'Manzil' :
                         ticket.workflowStep === 'finalize' ? 'Finalize' :
                         ticket.workflowStep || 'Ticket';
        
        activities.push({
          id: ticket.id || ticket._id || `ticket-${Date.now()}`,
          type: 'ticket',
          date: ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(ticket.createdAt || Date.now()),
          title: `${stepLabel} - ${ticket.status?.replace('_', ' ') || 'Pending'}`,
          description: ticket.progressNotes || ticket.revisionNotes || 'No notes',
          status: ticket.status,
          icon: ticket.workflowStep === 'sabq' ? '✨' : ticket.workflowStep === 'sabqi' ? '🧠' : ticket.workflowStep === 'manzil' ? '🔁' : '📋',
          color: ticket.status === 'finalized' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                 ticket.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                 ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                 'bg-yellow-100 text-yellow-800 border-yellow-200',
          data: ticket,
        });
      });

    // Add recitation reviews
    recitationReviews
      .filter((review: any) => {
        const reviewStudentId = review.studentId || (review as any).student?._id || (review as any).student?.id;
        return reviewStudentId === studentId || reviewStudentId?.toString() === studentId?.toString();
      })
      .forEach((review: any) => {
        const typeLabel = review.recitationType === 'sabq' ? 'Sabq Review' :
                         review.recitationType === 'sabqi' ? 'Sabqi Review' :
                         review.recitationType === 'manzil' ? 'Manzil Review' :
                         'Recitation Review';
        
        activities.push({
          id: review.id || review._id || `review-${Date.now()}`,
          type: 'recitation_review',
          date: review.updatedAt ? new Date(review.updatedAt) : new Date(review.createdAt || Date.now()),
          title: `${typeLabel} by ${review.teacherName || review.listenerName || 'Teacher'}`,
          description: review.notes || review.comments || 'No notes',
          status: review.status,
          icon: '📖',
          color: review.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                 review.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                 'bg-yellow-100 text-yellow-800 border-yellow-200',
          data: review,
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
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
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
                  className="h-24 w-24 rounded-full border-4 border-white shadow-lg"
                />
                <span
                  className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-4 border-white ${
                    currentStudent.status === 'active'
                      ? 'bg-green-500'
                      : currentStudent.status === 'inactive'
                        ? 'bg-gray-500'
                        : 'bg-yellow-500'
                  }`}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight">{currentStudent.fullName}</h1>
                <p className="text-blue-100">{currentStudent.email || 'No email on file'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white/20 px-3 py-1 font-medium">
                    {currentStudent.program || 'No program assigned'}
                  </span>
                  <span className="rounded-full bg-white/20 px-3 py-1 font-medium capitalize">
                    {currentStudent.status || 'active'}
                  </span>
                  {assignedTeacher && (
                    <span className="rounded-full bg-white/20 px-3 py-1 font-medium">
                      Teacher: {assignedTeacher.fullName}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onEdit(currentStudent)}
                className="inline-flex items-center rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                ✏️ Edit Profile
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-gray-200 bg-gray-50 px-6 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:bg-white hover:text-blue-600'
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
                        label: 'Assigned Teacher',
                        value: assignedTeacher ? assignedTeacher.fullName : 'Not assigned',
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
                    <ul className="space-y-3 text-sm text-gray-700">
                      {scheduleEntries.map((entry, index) => (
                        <li
                          key={`${entry.day}-${index}`}
                          className="flex flex-wrap items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                        >
                          <span className="font-semibold text-blue-700">{entry.day}</span>
                          <span>{entry.time}</span>
                          <span>{entry.teacher}</span>
                          <span>{entry.room}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>

                <SectionCard title="Recent Assignments" icon="📝" onAction={onProgress} actionLabel="View All">
                  {studentAssignments.length === 0 ? (
                    <EmptyState message="No assignments found for this student." />
                  ) : (
                    <ul className="space-y-3 text-sm text-gray-700">
                      {studentAssignments.slice(0, 4).map((assignment) => (
                        <li
                          key={assignment.id}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between">
                            <span className="font-semibold text-gray-900">{assignment.title}</span>
                            <span className="text-xs text-gray-500">
                              {assignment.dueDate
                                ? new Date(assignment.dueDate).toLocaleDateString()
                                : 'No due date'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {assignment.program || assignment.classworkType || 'Classwork'}
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
                          <div key={dateKey} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 pb-3 border-b border-gray-200">
                              <h3 className="text-lg font-bold text-gray-900">{dateKey}</h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} on this day
                              </p>
                            </div>
                            
                            <div className="space-y-4">
                              {activities.map((activity) => {
                                const mushafMarkings = activity.type === 'assignment' && activity.data.mushafMarkings 
                                  ? (Array.isArray(activity.data.mushafMarkings) ? activity.data.mushafMarkings : [])
                                  : [];
                                
                                return (
                                  <div key={activity.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">{activity.icon}</span>
                                        <div>
                                          <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            {activity.date.toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                      {activity.status && (
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${activity.color}`}>
                                          {activity.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {activity.description && activity.description !== 'No description' && (
                                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                                        {activity.description}
                                      </p>
                                    )}
                                    
                                    {/* Mushaf Mistakes */}
                                    {mushafMarkings.length > 0 && (
                                      <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                                        <h5 className="text-xs font-semibold text-orange-900 mb-2">
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
                                                className={`px-2 py-1 rounded text-xs font-medium ${
                                                  mistake.type === 'memory' 
                                                    ? 'bg-red-100 text-red-800' 
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}
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
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
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
                                          className="text-blue-600 hover:underline"
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
                    <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Day</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Teacher</th>
                        <th className="px-4 py-3">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {scheduleEntries.map((entry, index) => (
                        <tr key={`${entry.day}-${index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{entry.day}</td>
                          <td className="px-4 py-3 text-gray-600">{entry.time}</td>
                          <td className="px-4 py-3 text-gray-600">{entry.teacher}</td>
                          <td className="px-4 py-3 text-gray-600">{entry.room}</td>
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
                  <ul className="space-y-3 text-sm text-gray-700">
                    {studentAssignments.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{assignment.title}</p>
                            <p className="text-xs text-gray-500">
                              {assignment.program || assignment.classworkType || 'Classwork'}
                            </p>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            <p>
                              Due:{' '}
                              {assignment.dueDate
                                ? new Date(assignment.dueDate).toLocaleDateString()
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
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      <span className="font-semibold">Assignments completed:</span>{' '}
                      {gradedAssignments.length} of {studentAssignments.length}
                    </p>
                    <p>
                      <span className="font-semibold">Average grade:</span>{' '}
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
                  <ul className="space-y-3 text-sm text-gray-700">
                    {attendance.map((record: any, index: number) => (
                      <li
                        key={`${record.date}-${index}`}
                        className="flex flex-wrap items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <span className="font-semibold text-gray-900">
                          {record.date ? new Date(record.date).toLocaleDateString() : '—'}
                        </span>
                        <span className="text-xs text-gray-500">{record.status}</span>
                        <span className="text-xs text-gray-500">{record.notes}</span>
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
                  <ul className="space-y-3 text-sm text-gray-700">
                    {payments.map((payment: any, index: number) => (
                      <li
                        key={payment.id || index}
                        className="flex flex-wrap items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">
                            ${payment.amount}{' '}
                            <span className="text-xs text-gray-500">({payment.status})</span>
                          </p>
                          <p className="text-xs text-gray-500">Method: {payment.method || '—'}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <p>{formatDate(payment.date)}</p>
                          {payment.reference && <p>Ref: {payment.reference}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}

            {activeTab === 'notes' && (
              <SectionCard title="Teacher Notes" icon="📄" actionLabel="Add Note">
                {notes.length === 0 ? (
                  <EmptyState message="No notes for this student yet." />
                ) : (
                  <ul className="space-y-3 text-sm text-gray-700">
                    {notes.map((note: any) => (
                      <li
                        key={note.id}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{note.author || 'Team member'}</span>
                          <span>{formatDate(note.date)}</span>
                        </div>
                        <p className="mt-2 text-gray-800">{note.content}</p>
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
                  <ul className="space-y-3 text-sm text-gray-700">
                    {courses.map((course: any, index: number) => (
                      <li
                        key={course.id || index}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
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
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <p className="font-semibold text-gray-900">Primary Guardian</p>
                    <p>{currentStudent.parentName || 'Not provided'}</p>
                    <p className="text-xs text-gray-500">{currentStudent.contact || 'No phone'}</p>
                  </li>
                  {Array.isArray((currentStudent as any).familyContacts) &&
                    (currentStudent as any).familyContacts.map((contact: any, index: number) => (
                      <li
                        key={contact.id || index}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <p className="font-semibold text-gray-900">
                          {contact.name} — {contact.relationship}
                        </p>
                        <p className="text-xs text-gray-500">{contact.phone}</p>
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
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <span className="text-2xl">{icon}</span>
      <div className="text-right">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
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
  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
      <span className="mr-3 text-xl">{icon}</span>
      {title}
    </h3>
    <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between">
          <span className="font-medium text-gray-500">{label}</span>
          <span className="text-gray-900">{value ?? '—'}</span>
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
  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="flex items-center text-lg font-semibold text-gray-900">
        <span className="mr-3 text-xl">{icon}</span>
        {title}
      </h3>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
    {children}
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
    {message}
  </div>
);

export default StudentProfile;