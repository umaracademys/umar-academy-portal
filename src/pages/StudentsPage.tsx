import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import StudentList from '../components/StudentList';
import StudentProfile from '../components/StudentProfile';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import StudentCredentials from '../components/StudentCredentials';
import { useData } from '../contexts/DataContext';
import { useLoadingState } from '../hooks/useLoadingState';

const StudentsPage: React.FC = () => {
  const { deleteStudent, refreshData, students } = useData();
  const { loading, error, clearError, run } = useLoadingState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  // Load data on mount using shared loading state
  useEffect(() => {
    if (!refreshData) return;
    run(refreshData);
  }, [refreshData, run]);

  const handleView = (student: any) => {
    setSelectedStudent(student);
    setShowProfile(true);
  };

  const handleEdit = (student: any) => {
    setSelectedStudent(student);
    setShowEditForm(true);
  };

  const handleAddStudent = () => {
    setSelectedStudent(null);
    setShowEditForm(true);
  };

  const handleCredentials = (student: any) => {
    setSelectedStudent(student);
    setShowCredentials(true);
  };

  const handleDelete = async (studentId: string) => {
    if (!studentId) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this student? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      if (deleteStudent) {
        await deleteStudent(studentId);
        if (refreshData) {
          await refreshData();
        }
      }
    } catch (err) {
      console.error('Failed to delete student:', err);
      alert('Failed to delete student. Please try again.');
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
            activeSection="students"
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
            <h1 className="heading-page text-gray-900">Students</h1>
            <p className="caption mt-1">Manage student records and enrollment</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 sm:py-5">
            {error ? (
              <EmptyState
                title="Could not load students"
                message={error}
                action={
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleRetry}
                    fullWidthMobile
                  >
                    Retry
                  </Button>
                }
              />
            ) : loading && !students?.length ? (
              <div
                className="flex flex-col items-center justify-center py-12"
                role="status"
                aria-label="Loading students"
              >
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
                <p className="text-sm text-muted">Loading students...</p>
              </div>
            ) : (
              <StudentList
                onStudentSelect={handleView}
                onEditStudent={handleEdit}
                onDeleteStudent={handleDelete}
                onAddStudent={handleAddStudent}
                onCredentials={handleCredentials}
              />
            )}
          </div>
          </div>
        </section>

        {/* Student Profile Modal */}
        {showProfile && selectedStudent && (
          <StudentProfile
            student={selectedStudent}
            onClose={() => {
              setShowProfile(false);
              setSelectedStudent(null);
            }}
            onEdit={(student) => {
              setShowProfile(false);
              setSelectedStudent(student);
              setShowEditForm(true);
            }}
          />
        )}

        {/* Edit Student Form Modal */}
        {showEditForm && (
          <StudentRegistrationForm
            student={selectedStudent}
            isEdit={!!selectedStudent}
            onClose={() => {
              setShowEditForm(false);
              setSelectedStudent(null);
              if (refreshData) {
                refreshData();
              }
            }}
          />
        )}

        {/* Student Credentials Modal */}
        {showCredentials && selectedStudent && (
          <StudentCredentials
            student={selectedStudent}
            onClose={() => {
              setShowCredentials(false);
              setSelectedStudent(null);
            }}
          />
        )}
      </AppLayout>
    </div>
  );
};

export default StudentsPage;
