import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import TeacherList from '../components/TeacherList';
import TeacherProfile from '../components/TeacherProfile';
import TeacherRegistrationForm from '../components/TeacherRegistrationForm';
import TeacherCredentials from '../components/TeacherCredentials';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useLoadingState } from '../hooks/useLoadingState';

const TeachersPage: React.FC = () => {
  const { user } = useAuth();
  const { teachers, admins, deleteTeacher, refreshData } = useData();
  const { loading, error, clearError, run } = useLoadingState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showTeacherProfile, setShowTeacherProfile] = useState(false);
  const [showTeacherCredentials, setShowTeacherCredentials] = useState(false);

  if (user?.role === 'teacher') {
    return <Navigate to="/dashboard" replace />;
  }
  if (user?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }

  useEffect(() => {
    if (!refreshData) return;
    run(refreshData);
  }, [refreshData, run]);

  const combinedTeachers = React.useMemo(() => {
    const teachersList = teachers.map((t: any) => ({ ...t, isAdmin: false }));
    const adminsList = admins.map((a: any) => ({
      ...a,
      isAdmin: true,
      department: a.assignedDepartments?.[0] || 'Administration',
      location: 'Local' as const,
      employmentType: 'Full Time' as const,
    }));
    const teachersByEmail = new Map<string, any>();
    const teachersById = new Map<string, any>();
    const adminsByEmail = new Map<string, any>();
    const adminsById = new Map<string, any>();
    teachersList.forEach((teacher: any) => {
      const email = teacher.email?.toLowerCase().trim();
      const id = (teacher as any)._id?.toString() || teacher.id?.toString() || '';
      if (email) teachersByEmail.set(email, teacher);
      if (id) teachersById.set(id, teacher);
    });
    adminsList.forEach((admin: any) => {
      const email = admin.email?.toLowerCase().trim();
      const id = (admin as any)._id?.toString() || admin.id?.toString() || '';
      if (email) adminsByEmail.set(email, admin);
      if (id) adminsById.set(id, admin);
    });
    const deduplicated: any[] = [];
    const seenEmails = new Set<string>();
    const seenIds = new Set<string>();
    for (const admin of adminsList) {
      const email = (admin as any).email?.toLowerCase().trim();
      const id = (admin as any)._id?.toString() || (admin as any).id?.toString() || '';
      if (email) seenEmails.add(email);
      if (id) seenIds.add(id);
      deduplicated.push(admin);
    }
    for (const teacher of teachersList) {
      const email = (teacher as any).email?.toLowerCase().trim();
      const id = (teacher as any)._id?.toString() || (teacher as any).id?.toString() || '';
      const isDup = (email && seenEmails.has(email)) || (id && seenIds.has(id));
      if (!isDup) {
        if (email) seenEmails.add(email);
        if (id) seenIds.add(id);
        deduplicated.push(teacher);
      }
    }
    return deduplicated;
  }, [teachers, admins]);

  const handleTeacherSelect = (teacher: any) => {
    setSelectedTeacher(teacher);
    setShowTeacherProfile(true);
  };

  const handleEditTeacher = (teacher: any) => {
    if (teacher.isAdmin) {
      alert('Admin profiles cannot be edited through the teacher form. Please use admin management.');
      return;
    }
    setSelectedTeacher(teacher);
    setShowTeacherProfile(false);
    setShowTeacherForm(true);
  };

  const handleAddTeacher = () => {
    setSelectedTeacher(null);
    setShowTeacherForm(true);
  };

  const handleCredentials = (teacher: any) => {
    setSelectedTeacher(teacher);
    setShowTeacherCredentials(true);
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!teacherId) return;
    const confirmed = window.confirm('Are you sure you want to delete this teacher?');
    if (!confirmed) return;
    try {
      await deleteTeacher(teacherId);
      setSelectedTeacher(null);
      setShowTeacherProfile(false);
      if (refreshData) await refreshData();
    } catch (err) {
      console.error('Failed to delete teacher:', err);
      alert('Failed to delete teacher. Please try again.');
    }
  };

  const handleRetry = () => {
    clearError();
    if (refreshData) run(refreshData);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
      <AppLayout
        sidebar={
          <Sidebar
            activeSection="teachers"
            onSectionChange={() => {}}
            isMobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((o) => !o)}
            onMobileClose={() => setSidebarOpen(false)}
          />
        }
        sidebarOpen={sidebarOpen}
        onOverlayClick={() => setSidebarOpen(false)}
        maxWidth="7xl"
      >
        <section className="space-y-4">
          <div>
            <h1 className="heading-page text-gray-900">Teachers</h1>
            <p className="caption mt-1">View and manage teaching staff</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 sm:py-5">
            {error ? (
              <EmptyState
                title="Could not load teachers"
                message={error}
                action={
                  <Button variant="primary" size="md" onClick={handleRetry} fullWidthMobile>
                    Retry
                  </Button>
                }
              />
            ) : loading && !combinedTeachers.length ? (
              <div className="flex flex-col items-center justify-center py-12" role="status" aria-label="Loading teachers">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
                <p className="body-text text-gray-600">Loading teachers...</p>
              </div>
            ) : (
              <TeacherList
                teachers={combinedTeachers}
                onTeacherSelect={handleTeacherSelect}
                onEditTeacher={handleEditTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                onAddTeacher={handleAddTeacher}
                onCredentials={handleCredentials}
              />
            )}
          </div>
          </div>
        </section>

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
              setShowTeacherForm(true);
            }}
          />
        )}

        {showTeacherForm && (
          <TeacherRegistrationForm
            onClose={() => {
              setShowTeacherForm(false);
              setSelectedTeacher(null);
              if (refreshData) refreshData();
            }}
            teacher={selectedTeacher}
            isEdit={!!selectedTeacher}
          />
        )}

        {showTeacherCredentials && selectedTeacher && (
          <TeacherCredentials
            teacher={selectedTeacher}
            onClose={() => {
              setShowTeacherCredentials(false);
              setSelectedTeacher(null);
            }}
          />
        )}
      </AppLayout>
    </div>
  );
};

export default TeachersPage;
