import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';

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
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'assignments', label: 'Assignments', icon: '📝' },
    { id: 'progress', label: 'Progress', icon: '📈' },
    { id: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'payments', label: 'Payments', icon: '💰' },
    { id: 'notes', label: 'Notes', icon: '📄' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  ];

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