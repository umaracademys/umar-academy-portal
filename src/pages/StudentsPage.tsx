import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import StudentList from '../components/StudentList';
import StudentProfile from '../components/StudentProfile';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import StudentAnalytics from '../components/StudentAnalytics';
import StudentCredentials from '../components/StudentCredentials';
import StudentBulkOperations from '../components/StudentBulkOperations';
import StudentEnrollment from '../components/StudentEnrollment';
import StudentPayments from '../components/StudentPayments';
import StudentProgress from '../components/StudentProgress';
import StudentCommunication from '../components/StudentCommunication';
import StudentPersonalMushaf from '../components/StudentPersonalMushaf';
import StudentWeeklyEvaluations from '../components/StudentWeeklyEvaluations';
import Card from '../components/Card';

const StudentsPage: React.FC = () => {
  // useData() from DataContext already re-exports useBackendData, so it has all the backend data
  const { students, deleteStudent, refreshData } = useData();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [showStudentAnalytics, setShowStudentAnalytics] = useState(false);
  const [showStudentCredentials, setShowStudentCredentials] = useState(false);
  const [showStudentBulkOperations, setShowStudentBulkOperations] = useState(false);
  const [showStudentEnrollment, setShowStudentEnrollment] = useState(false);
  const [showStudentPayments, setShowStudentPayments] = useState(false);
  const [showStudentProgress, setShowStudentProgress] = useState(false);
  const [showStudentCommunication, setShowStudentCommunication] = useState(false);
  const [showStudentPersonalMushaf, setShowStudentPersonalMushaf] = useState(false);
  const [showStudentWeeklyEvaluations, setShowStudentWeeklyEvaluations] = useState(false);

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    setShowStudentProfile(true);
  };

  const handleEditStudent = (student: any) => {
    setSelectedStudent(student);
    setShowStudentProfile(false);
    setShowStudentForm(true);
  };

  const handleDeleteStudentWrapper = async (studentId: string) => {
    if (!studentId) {
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this student? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      if (deleteStudent) {
        await deleteStudent(studentId);
      }
      alert('✅ Student deleted successfully.');
      setSelectedStudent(null);
      setShowStudentProfile(false);
      if (refreshData) {
        await refreshData();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete student';
      console.error('❌ Failed to delete student:', err);
      alert(`❌ Failed to delete student: ${errorMessage}`);
    }
  };

  const studentsCount = students.length;
  const activeStudentsCount = students.filter((s) => s.status === 'active').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Student List */}
        <StudentList
          onStudentSelect={handleStudentSelect}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudentWrapper}
          onAddStudent={() => {
            setSelectedStudent(null);
            setShowStudentForm(true);
          }}
          onCredentials={(student) => {
            setSelectedStudent(student);
            setShowStudentCredentials(true);
          }}
          onAnalytics={(student) => {
            setSelectedStudent(student);
            setShowStudentAnalytics(true);
          }}
          onBulkOperations={() => setShowStudentBulkOperations(true)}
          onPersonalMushaf={(student) => {
            setSelectedStudent(student);
            setShowStudentPersonalMushaf(true);
          }}
        />
      </div>

      {/* Modals */}
      {showStudentForm && (
        <StudentRegistrationForm
          onClose={() => {
            setShowStudentForm(false);
            setSelectedStudent(null);
            if (refreshData) {
              refreshData();
            }
          }}
          student={selectedStudent}
          isEdit={!!selectedStudent}
        />
      )}

      {showStudentProfile && selectedStudent && (
        <StudentProfile
          student={selectedStudent}
          onClose={() => {
            setShowStudentProfile(false);
            setSelectedStudent(null);
          }}
          onEdit={(student) => {
            setSelectedStudent(student);
            setShowStudentProfile(false);
            setShowStudentForm(true);
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
          onWeeklyEvaluations={() => {
            setShowStudentProfile(false);
            setShowStudentWeeklyEvaluations(true);
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

      {showStudentCredentials && (
        <StudentCredentials
          student={selectedStudent || { id: 'general', name: 'System Access Management' }}
          onClose={() => {
            setShowStudentCredentials(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentAnalytics && (
        <StudentAnalytics
          student={selectedStudent || { id: 'general', name: 'System Analytics' }}
          onClose={() => {
            setShowStudentAnalytics(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentBulkOperations && (
        <StudentBulkOperations
          onClose={() => {
            setShowStudentBulkOperations(false);
            if (refreshData) {
              refreshData();
            }
          }}
        />
      )}

      {showStudentPersonalMushaf && selectedStudent && (
        <StudentPersonalMushaf
          studentId={selectedStudent.id}
          studentName={selectedStudent.fullName}
          onClose={() => {
            setShowStudentPersonalMushaf(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showStudentWeeklyEvaluations && selectedStudent && (
        <StudentWeeklyEvaluations
          studentId={selectedStudent.id}
          studentName={selectedStudent.fullName}
          onClose={() => {
            setShowStudentWeeklyEvaluations(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

export default StudentsPage;
