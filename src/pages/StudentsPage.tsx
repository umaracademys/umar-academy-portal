import React, { useState, useEffect } from 'react';
import StudentList from '../components/StudentList';
import StudentProfile from '../components/StudentProfile';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import StudentCredentials from '../components/StudentCredentials';
import { useData } from '../contexts/DataContext';

const StudentsPage: React.FC = () => {
  const { deleteStudent, refreshData, students } = useData();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  // Refresh data when page loads to ensure accuracy
  useEffect(() => {
    if (refreshData) {
      refreshData();
    }
  }, [refreshData]);

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
    
    const confirmed = window.confirm('Are you sure you want to delete this student? This action cannot be undone.');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StudentList
          onStudentSelect={handleView}
          onEditStudent={handleEdit}
          onDeleteStudent={handleDelete}
          onAddStudent={handleAddStudent}
          onCredentials={handleCredentials}
        />
      </div>

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
    </div>
  );
};

export default StudentsPage;
