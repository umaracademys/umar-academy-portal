import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import DebugPanel from '../components/DebugPanel';
import StudentList from '../components/StudentList';
import StudentProfile from '../components/StudentProfile';
import StudentEnrollment from '../components/StudentEnrollment';
import StudentPayments from '../components/StudentPayments';
import StudentProgress from '../components/StudentProgress';
import StudentCommunication from '../components/StudentCommunication';
import TeacherList from '../components/TeacherList';
import TeacherProfile from '../components/TeacherProfile';
import TeacherPayroll from '../components/TeacherPayroll';
import TeacherPerformance from '../components/TeacherPerformance';
import TeacherAttendance from '../components/TeacherAttendance';
import TeacherCommunication from '../components/TeacherCommunication';
import TeacherRegistrationForm from '../components/TeacherRegistrationForm';
import { useData } from '../contexts/DataContext';

const AdminDashboard: React.FC = () => {
  const { students, teachers } = useData();
  const [activeSection, setActiveSection] = useState('overview');
  
  // Student Management State
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [showStudentEnrollment, setShowStudentEnrollment] = useState(false);
  const [showStudentPayments, setShowStudentPayments] = useState(false);
  const [showStudentProgress, setShowStudentProgress] = useState(false);
  const [showStudentCommunication, setShowStudentCommunication] = useState(false);

  // Teacher Management State
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showTeacherProfile, setShowTeacherProfile] = useState(false);
  const [showTeacherPayroll, setShowTeacherPayroll] = useState(false);
  const [showTeacherPerformance, setShowTeacherPerformance] = useState(false);
  const [showTeacherAttendance, setShowTeacherAttendance] = useState(false);
  const [showTeacherCommunication, setShowTeacherCommunication] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);

  // Overview Section
  const OverviewSection = () => (
    <div className="space-y-8">
      <div className="rounded-3xl border border-accent-soft bg-white px-6 py-6 sm:px-10 sm:py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between shadow-sm">
        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">Admin Control</span>
          <h2 className="text-3xl font-semibold text-primary">Dashboard Overview</h2>
          <p className="text-sm text-primary-soft max-w-xl">
            Monitor enrollment trends, teacher coverage, and revenue performance at a glance. Use the quick actions to jump directly into the sections that need your attention.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveSection('students')}
            className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-5 py-3 text-sm font-semibold text-primary transition hover:bg-soft-primary"
          >
            View Students
          </button>
          <button
            onClick={() => setActiveSection('teachers')}
            className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--color-primary-rgb),0.35)] px-5 py-3 text-sm font-semibold text-primary transition hover:bg-soft-primary"
          >
            View Teachers
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={students.length} icon="ST" />
        <StatCard title="Total Teachers" value={teachers.length} icon="TC" />
        <StatCard title="Active Courses" value={45} icon="AC" />
        <StatCard title="Revenue" value={`$${students.reduce((sum, s) => sum + s.tuitionFee, 0).toLocaleString()}`} icon="REV" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Recent Enrollments">
          <div className="space-y-3">
            {students.slice(0, 5).map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded-2xl border border-accent-soft bg-white px-4 py-3 transition hover:bg-soft-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-soft-primary text-sm font-semibold text-primary">
                    {student.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-primary">{student.fullName}</p>
                    <p className="text-xs text-primary-soft">{student.program}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-primary-soft">
                  {new Date(student.enrolledDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Performance Metrics">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-primary-soft">Student Attendance</span>
                <span className="font-semibold">94%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-soft-primary">
                <div className="h-2 rounded-full bg-[var(--color-primary)]" style={{ width: '94%' }}></div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-primary-soft">Teacher Satisfaction</span>
                <span className="font-semibold">88%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-soft-accent">
                <div className="h-2 rounded-full bg-[var(--color-accent)]" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-primary-soft">Course Completion</span>
                <span className="font-semibold">76%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-soft-primary">
                <div className="h-2 rounded-full bg-[rgba(var(--color-primary-rgb),0.6)]" style={{ width: '76%' }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  // Students Section
  const StudentsSection = () => {
    const handleStudentSelect = (student: any) => {
      setSelectedStudent(student);
      setShowStudentProfile(true);
    };

    const handleEditStudent = (student: any) => {
      setSelectedStudent(student);
      setShowStudentProfile(true);
    };

    const handleDeleteStudent = (studentId: string) => {
      if (window.confirm('Are you sure you want to delete this student?')) {
        // In a real app, this would delete the student
        console.log('Deleting student:', studentId);
        alert('Student deleted successfully');
      }
    };

    const activeStudents = students.filter(s => s.status === 'active').length;
    const inactiveStudents = students.filter(s => s.status === 'inactive').length;
    const totalRevenue = students.reduce((sum, s) => sum + s.tuitionFee, 0);

    return (
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-3xl font-bold">Student Management</h2>
              <p className="text-primary-100 mt-1">Comprehensive student administration and tracking</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{students.length}</div>
              <div className="text-primary-200">Total Students</div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-300">{activeStudents}</div>
                  <div className="text-sm text-primary-100">Active Students</div>
                </div>
                <div className="text-3xl">👨‍🎓</div>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-300">{inactiveStudents}</div>
                  <div className="text-sm text-primary-100">Inactive Students</div>
                </div>
                <div className="text-3xl">⏸️</div>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gold-300">${totalRevenue.toLocaleString()}</div>
                  <div className="text-sm text-primary-100">Total Revenue</div>
                </div>
                <div className="text-3xl">💰</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
        </div>

        {/* Student List */}
        <StudentList
          onStudentSelect={handleStudentSelect}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudent}
        />
      </div>
    );
  };

  // Teachers Section
  const TeachersSection = () => {
    const handleTeacherSelect = (teacher: any) => {
      setSelectedTeacher(teacher);
      setShowTeacherProfile(true);
    };

    const handleEditTeacher = (teacher: any) => {
      setSelectedTeacher(teacher);
      setShowTeacherProfile(true);
    };

    const handleDeleteTeacher = (teacherId: string) => {
      if (window.confirm('Are you sure you want to delete this teacher?')) {
        // In a real app, this would delete the teacher
        console.log('Deleting teacher:', teacherId);
        alert('Teacher deleted successfully');
      }
    };

    return (
      <TeacherList
        onTeacherSelect={handleTeacherSelect}
        onEditTeacher={handleEditTeacher}
        onDeleteTeacher={handleDeleteTeacher}
        onAddTeacher={() => setShowTeacherForm(true)}
      />
    );
  };


  // Courses Section
  const CoursesSection = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Courses Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {['Quran Recitation', 'Islamic Studies', 'Arabic Language', 'Tajweed', 'Hifz Program'].map((course, index) => (
          <Card key={index}>
            <h3 className="font-bold text-gray-900 mb-2">{course}</h3>
            <p className="text-sm text-gray-600 mb-4">Active students: {Math.floor(Math.random() * 50) + 10}</p>
            <button className="w-full px-4 py-2 bg-primary-700 text-white rounded hover:bg-primary-800">
              View Details
            </button>
          </Card>
        ))}
      </div>
    </div>
  );

  // Financials Section
  const FinancialsSection = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Financial Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-3xl font-bold text-primary-600">${students.reduce((sum, s) => sum + s.tuitionFee, 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Pending Payments</p>
            <p className="text-3xl font-bold text-gold-600">$12,450</p>
            <p className="text-xs text-gray-500 mt-1">24 students</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Teacher Salaries</p>
            <p className="text-3xl font-bold text-primary-700">
              ${teachers.reduce((sum, t) => sum + t.payroll.monthlySalary, 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Monthly total</p>
          </div>
        </Card>
      </div>
    </div>
  );

  // Reports Section
  const ReportsSection = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Reports & Analytics</h2>
      <Card title="Generate Reports">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-cream-100 transition text-left">
            <h3 className="font-semibold mb-1">📊 Student Report</h3>
            <p className="text-sm text-gray-600">Enrollment, attendance, and performance</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-gold-500 hover:bg-cream-100 transition text-left">
            <h3 className="font-semibold mb-1">💰 Financial Report</h3>
            <p className="text-sm text-gray-600">Revenue, expenses, and projections</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-cream-100 transition text-left">
            <h3 className="font-semibold mb-1">👨‍🏫 Teacher Report</h3>
            <p className="text-sm text-gray-600">Performance and assignments</p>
          </button>
        </div>
      </Card>
    </div>
  );

  // Activities Section
  const ActivitiesSection = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activities</h2>
      <Card title="Activity Feed">
        <div className="space-y-4">
          {[
            { type: 'student', action: 'New student enrolled', name: 'Ahmad Ali', time: '2 hours ago', icon: '👨‍🎓', color: 'blue' },
            { type: 'payment', action: 'Payment received', name: '$500 from Fatima Hassan', time: '4 hours ago', icon: '💰', color: 'green' },
            { type: 'teacher', action: 'Teacher registered', name: 'Dr. Ibrahim Yusuf', time: '1 day ago', icon: '👨‍🏫', color: 'purple' },
            { type: 'course', action: 'New course created', name: 'Advanced Tajweed', time: '2 days ago', icon: '📚', color: 'orange' },
          ].map((activity, index) => (
            <div key={index} className={`flex items-start space-x-3 p-3 border-l-4 border-${activity.color}-500 bg-${activity.color}-50 rounded`}>
              <span className="text-2xl">{activity.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.name}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // Settings Section
  const SettingsSection = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
      <div className="space-y-6">
        <Card title="General Settings">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Academy Name</label>
              <input type="text" defaultValue="Umar Academy" className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <input type="email" defaultValue="admin@umaracademy.org" className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
        </Card>
        
        <Card title="Notification Preferences">
          <div className="space-y-3">
            {['Email Notifications', 'SMS Alerts', 'Payment Reminders', 'Activity Updates'].map((pref, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">{pref}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  // Render active section
  const renderSection = () => {
    switch (activeSection) {
      case 'overview': return <OverviewSection />;
      case 'students': return <StudentsSection />;
      case 'teachers': return <TeachersSection />;
      case 'courses': return <CoursesSection />;
      case 'financials': return <FinancialsSection />;
      case 'reports': return <ReportsSection />;
      case 'activities': return <ActivitiesSection />;
      case 'settings': return <SettingsSection />;
      default: return <OverviewSection />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderSection()}
          </div>
        </main>
      </div>
      
      <DebugPanel />

      {/* Student Management Modals */}
        {showStudentProfile && selectedStudent && (
          <StudentProfile
            student={selectedStudent}
            onClose={() => {
              setShowStudentProfile(false);
              setSelectedStudent(null);
            }}
            onEdit={(student) => {
              setShowStudentProfile(false);
              setSelectedStudent(student);
              setShowStudentProfile(true);
            }}
            onEnrollment={() => {
              setShowStudentProfile(false);
              setShowStudentEnrollment(true);
            }}
            onPayments={() => {
              setShowStudentProfile(false);
              setShowStudentPayments(true);
            }}
            onProgress={() => {
              setShowStudentProfile(false);
              setShowStudentProgress(true);
            }}
            onCommunication={() => {
              setShowStudentProfile(false);
              setShowStudentCommunication(true);
            }}
          />
        )}

      {showStudentEnrollment && selectedStudent && (
        <StudentEnrollment
          student={selectedStudent}
          onClose={() => {
            setShowStudentEnrollment(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentPayments && selectedStudent && (
        <StudentPayments
          student={selectedStudent}
          onClose={() => {
            setShowStudentPayments(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentProgress && selectedStudent && (
        <StudentProgress
          student={selectedStudent}
          onClose={() => {
            setShowStudentProgress(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentCommunication && selectedStudent && (
        <StudentCommunication
          student={selectedStudent}
          onClose={() => {
            setShowStudentCommunication(false);
            setSelectedStudent(null);
          }}
        />
      )}


      {/* Teacher Registration Modal */}
      {showTeacherForm && (
        <TeacherRegistrationForm
          onClose={() => setShowTeacherForm(false)}
        />
      )}

      {/* Teacher Management Modals */}
      {showTeacherProfile && selectedTeacher && (
        <TeacherProfile
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherProfile(false);
            setSelectedTeacher(null);
          }}
          onEdit={(teacher) => {
            setShowTeacherProfile(false);
            setSelectedTeacher(teacher);
            setShowTeacherProfile(true);
          }}
          onPayroll={() => {
            setShowTeacherProfile(false);
            setShowTeacherPayroll(true);
          }}
          onPerformance={() => {
            setShowTeacherProfile(false);
            setShowTeacherPerformance(true);
          }}
          onAttendance={() => {
            setShowTeacherProfile(false);
            setShowTeacherAttendance(true);
          }}
          onCommunication={() => {
            setShowTeacherProfile(false);
            setShowTeacherCommunication(true);
          }}
        />
      )}

      {showTeacherPayroll && selectedTeacher && (
        <TeacherPayroll
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherPayroll(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherPerformance && selectedTeacher && (
        <TeacherPerformance
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherPerformance(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherAttendance && selectedTeacher && (
        <TeacherAttendance
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherAttendance(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherCommunication && selectedTeacher && (
        <TeacherCommunication
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherCommunication(false);
            setSelectedTeacher(null);
          }}
        />
      )}

    </div>
  );
};

export default AdminDashboard;
