import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import TeacherList from '../components/TeacherList';
import TeacherProfile from '../components/TeacherProfile';
import TeacherRegistrationForm from '../components/TeacherRegistrationForm';
import TeacherAnalytics from '../components/TeacherAnalytics';
import TeacherCredentials from '../components/TeacherCredentials';
import TeacherBulkOperations from '../components/TeacherBulkOperations';
import TeacherPayroll from '../components/TeacherPayroll';
import TeacherPerformance from '../components/TeacherPerformance';
import TeacherAttendance from '../components/TeacherAttendance';
import TeacherCommunication from '../components/TeacherCommunication';
import Card from '../components/Card';

const TeachersPage: React.FC = () => {
  const { user } = useAuth();
  const { teachers, admins, deleteTeacher, refreshData } = useData();
  
  // Redirect teachers to their dashboard - this page is for admin/superadmin only
  if (user?.role === 'teacher') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Redirect students to their dashboard
  if (user?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showTeacherProfile, setShowTeacherProfile] = useState(false);
  const [showTeacherAnalytics, setShowTeacherAnalytics] = useState(false);
  const [showTeacherCredentials, setShowTeacherCredentials] = useState(false);
  const [showTeacherBulkOperations, setShowTeacherBulkOperations] = useState(false);
  const [showTeacherPayroll, setShowTeacherPayroll] = useState(false);
  const [showTeacherPerformance, setShowTeacherPerformance] = useState(false);
  const [showTeacherAttendance, setShowTeacherAttendance] = useState(false);
  const [showTeacherCommunication, setShowTeacherCommunication] = useState(false);

  // Combine teachers and admins, marking admins with a flag
  const combinedTeachers = React.useMemo(() => {
    const teachersList = teachers.map(t => ({ ...t, isAdmin: false }));
    const adminsList = admins.map(a => ({
      ...a,
      isAdmin: true,
      // Map admin fields to teacher-like structure for compatibility
      department: a.assignedDepartments?.[0] || 'Administration',
      location: 'Local' as const,
      employmentType: 'Full Time' as const,
    }));
    return [...teachersList, ...adminsList];
  }, [teachers, admins]);

  const handleTeacherSelect = (teacher: any) => {
    setSelectedTeacher(teacher);
    setShowTeacherProfile(true);
  };

  const handleEditTeacher = (teacher: any) => {
    // Don't allow editing admins through teacher form
    if (teacher.isAdmin) {
      alert('Admin profiles cannot be edited through the teacher form. Please use admin management.');
      return;
    }
    setSelectedTeacher(teacher);
    setShowTeacherProfile(false);
    setShowTeacherForm(true);
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!teacherId) {
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this teacher?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteTeacher(teacherId);
      alert('Teacher deleted successfully.');
      setSelectedTeacher(null);
      setShowTeacherProfile(false);
      if (refreshData) {
        await refreshData();
      }
    } catch (err) {
      console.error('Failed to delete teacher:', err);
      alert('Failed to delete teacher. Please try again.');
    }
  };

  const totalTeachers = combinedTeachers.length;
  const activeTeacherCount = combinedTeachers.filter((teacher) => teacher.status === 'active').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4">

        {/* Teacher List (includes admins) */}
        <TeacherList
          teachers={combinedTeachers}
          onTeacherSelect={handleTeacherSelect}
          onEditTeacher={handleEditTeacher}
          onDeleteTeacher={handleDeleteTeacher}
          onAddTeacher={() => {
            setSelectedTeacher(null);
            setShowTeacherForm(true);
          }}
          onCredentials={(teacher) => {
            setSelectedTeacher(teacher);
            setShowTeacherCredentials(true);
          }}
          onAnalytics={(teacher) => {
            setSelectedTeacher(teacher);
            setShowTeacherAnalytics(true);
          }}
          onBulkOperations={() => setShowTeacherBulkOperations(true)}
        />
      </div>

      {/* Modals */}
      {showTeacherForm && (
        <TeacherRegistrationForm
          onClose={() => {
            setShowTeacherForm(false);
            setSelectedTeacher(null);
            if (refreshData) {
              refreshData();
            }
          }}
          teacher={selectedTeacher}
          isEdit={!!selectedTeacher}
        />
      )}

      {showTeacherProfile && selectedTeacher && (
        <TeacherProfile
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherProfile(false);
            setSelectedTeacher(null);
          }}
          onEdit={(teacher) => {
            setSelectedTeacher(teacher);
            setShowTeacherProfile(false);
            setShowTeacherForm(true);
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

      {showTeacherCredentials && (
        <TeacherCredentials
          teacher={selectedTeacher || { id: 'general', name: 'System Access Management' }}
          onClose={() => {
            setShowTeacherCredentials(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherAnalytics && (
        <TeacherAnalytics
          teacher={selectedTeacher || { id: 'general', name: 'System Analytics' }}
          onClose={() => {
            setShowTeacherAnalytics(false);
            setSelectedTeacher(null);
          }}
        />
      )}

      {showTeacherBulkOperations && (
        <TeacherBulkOperations
          onClose={() => {
            setShowTeacherBulkOperations(false);
            if (refreshData) {
              refreshData();
            }
          }}
        />
      )}
    </div>
  );
};

export default TeachersPage;
