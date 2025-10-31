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
import TeacherAssignments from '../components/TeacherAssignments';
import TeacherPayroll from '../components/TeacherPayroll';
import TeacherPerformance from '../components/TeacherPerformance';
import TeacherAttendance from '../components/TeacherAttendance';
import TeacherCommunication from '../components/TeacherCommunication';
import TeacherRegistrationForm from '../components/TeacherRegistrationForm';
import StudentAssignments from '../pages/StudentAssignments';
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
  const [showTeacherAssignments, setShowTeacherAssignments] = useState(false);
  const [showTeacherPayroll, setShowTeacherPayroll] = useState(false);
  const [showTeacherPerformance, setShowTeacherPerformance] = useState(false);
  const [showTeacherAttendance, setShowTeacherAttendance] = useState(false);
  const [showTeacherCommunication, setShowTeacherCommunication] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showStudentAssignments, setShowStudentAssignments] = useState(false);

  // Overview Section
  const OverviewSection = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <Link
          to="/assignments"
          className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          style={{ backgroundColor: '#E7AA39' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d99a2f'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E7AA39'}
        >
          Manage Assignments
        </Link>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Students" value={students.length} icon="👨‍🎓" color="green" />
        <StatCard title="Total Teachers" value={teachers.length} icon="👨‍🏫" color="blue" />
        <StatCard title="Active Courses" value={45} icon="📚" color="purple" />
        <StatCard title="Revenue" value={`$${students.reduce((sum, s) => sum + s.tuitionFee, 0).toLocaleString()}`} icon="💰" color="gold" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Enrollments">
          <div className="space-y-3">
            {students.slice(0, 5).map((student) => (
              <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {student.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{student.fullName}</p>
                    <p className="text-xs text-gray-500">{student.program}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{new Date(student.enrolledDate).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Performance Metrics">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Student Attendance</span>
                <span className="font-semibold">94%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary-600 h-2 rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Teacher Satisfaction</span>
                <span className="font-semibold">88%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gold-500 h-2 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Course Completion</span>
                <span className="font-semibold">76%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary-700 h-2 rounded-full" style={{ width: '76%' }}></div>
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

  // Student Assignments Section
  const StudentAssignmentsSection = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Student Assignments</h2>
        <button
          onClick={() => setShowStudentAssignments(true)}
          className="px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          style={{ backgroundColor: '#E7AA39' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d99a2f'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E7AA39'}
        >
          View All Assignments
        </button>
      </div>
      
      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Student Assignment Management</h3>
          <p className="text-gray-600 mb-6">View and manage student assignments, homework, and progress tracking.</p>
          <button
            onClick={() => setShowStudentAssignments(true)}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Open Assignment Manager
          </button>
        </div>
      </Card>
    </div>
  );

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
      case 'assignments': return <StudentAssignmentsSection />;
      case 'courses': return <CoursesSection />;
      case 'financials': return <FinancialsSection />;
      case 'reports': return <ReportsSection />;
      case 'activities': return <ActivitiesSection />;
      case 'settings': return <SettingsSection />;
      default: return <OverviewSection />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
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
          onAssignments={() => {
            setShowTeacherProfile(false);
            setShowTeacherAssignments(true);
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

      {showTeacherAssignments && selectedTeacher && (
        <TeacherAssignments
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherAssignments(false);
            setSelectedTeacher(null);
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

      {/* Student Assignments Modal */}
      {showStudentAssignments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Student Assignments</h2>
              <button
                onClick={() => setShowStudentAssignments(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <StudentAssignments />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
