import React, { useState } from 'react';
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
  const { teachers, deleteTeacher, refreshData } = useData();
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

  const handleTeacherSelect = (teacher: any) => {
    setSelectedTeacher(teacher);
    setShowTeacherProfile(true);
  };

  const handleEditTeacher = (teacher: any) => {
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

  const totalTeachers = teachers.length;
  const activeTeacherCount = teachers.filter((teacher) => teacher.status === 'active').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              id: 'teach-analytics',
              badge: 'AN',
              title: 'Teacher Analytics',
              description: 'Monitor performance, coverage, and load balancing.',
              footer: `${totalTeachers} total • ${activeTeacherCount} active`,
              action: () => setShowTeacherAnalytics(true),
              button: 'Open analytics',
              disabled: false,
            },
            {
              id: 'teach-credentials',
              badge: 'CR',
              title: 'Teacher Credentials',
              description: 'Manage onboarding documents and access credentials.',
              footer: `${totalTeachers} teachers`,
              action: () => {
                if (!selectedTeacher && teachers.length > 0) {
                  setSelectedTeacher(teachers[0]);
                }
                setShowTeacherCredentials(true);
              },
              button: 'Manage access',
              disabled: !selectedTeacher && teachers.length === 0,
            },
            {
              id: 'teach-bulk',
              badge: 'BL',
              title: 'Teacher Bulk Operations',
              description: 'Import, export, or batch update teacher rosters.',
              footer: `${totalTeachers} teachers`,
              action: () => setShowTeacherBulkOperations(true),
              button: 'Run bulk action',
              disabled: false,
            },
            {
              id: 'add-teacher',
              badge: '➕',
              title: 'Add Teacher',
              description: 'Register a new teacher and capture details.',
              footer: `${totalTeachers} teachers`,
              action: () => {
                setSelectedTeacher(null);
                setShowTeacherForm(true);
              },
              button: 'Register teacher',
              disabled: false,
            },
          ].map((item) => (
            <Card key={item.id}>
              <div className="flex h-full flex-col gap-4 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm hover:shadow-md transition">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-soft-primary text-xs font-semibold text-primary">
                  {item.badge}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-primary">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                  {item.footer && (
                    <p className="mt-2 text-xs font-semibold text-gray-500">{item.footer}</p>
                  )}
                </div>
                <button
                  onClick={item.action}
                  disabled={item.disabled}
                  className="inline-flex items-center justify-center rounded-lg border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item.button}
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Teacher List */}
        <TeacherList
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
