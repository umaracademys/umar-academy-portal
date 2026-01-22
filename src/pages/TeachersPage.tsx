import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import TeacherList from '../components/TeacherList';
import TeacherProfile from '../components/TeacherProfile';
import TeacherRegistrationForm from '../components/TeacherRegistrationForm';
import TeacherCredentials from '../components/TeacherCredentials';

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
  const [showTeacherCredentials, setShowTeacherCredentials] = useState(false);

  // Refresh data when page loads to ensure accuracy
  useEffect(() => {
    if (refreshData) {
      refreshData();
    }
  }, [refreshData]);

  // Combine teachers and admins, marking admins with a flag
  // ✅ FIX: Improved deduplication - prioritize admins over teachers when same email exists
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
    
    // Create maps for efficient lookup
    const teachersByEmail = new Map<string, any>();
    const teachersById = new Map<string, any>();
    const adminsByEmail = new Map<string, any>();
    const adminsById = new Map<string, any>();
    
    // Index teachers by email and ID
    teachersList.forEach(teacher => {
      const email = teacher.email?.toLowerCase().trim();
      const id = (teacher as any)._id?.toString() || teacher.id?.toString() || '';
      if (email) teachersByEmail.set(email, teacher);
      if (id) teachersById.set(id, teacher);
    });
    
    // Index admins by email and ID
    adminsList.forEach(admin => {
      const email = admin.email?.toLowerCase().trim();
      const id = (admin as any)._id?.toString() || admin.id?.toString() || '';
      if (email) adminsByEmail.set(email, admin);
      if (id) adminsById.set(id, admin);
    });
    
    // Build deduplicated list - prioritize admins over teachers
    const deduplicated: any[] = [];
    const seenEmails = new Set<string>();
    const seenIds = new Set<string>();
    const duplicates: any[] = [];
    
    // First, add all admins (they take priority)
    for (const admin of adminsList) {
      const email = admin.email?.toLowerCase().trim();
      const id = (admin as any)._id?.toString() || admin.id?.toString() || '';
      
      if (email) seenEmails.add(email);
      if (id) seenIds.add(id);
      deduplicated.push(admin);
    }
    
    // Then, add teachers only if they don't conflict with admins
    for (const teacher of teachersList) {
      const email = teacher.email?.toLowerCase().trim();
      const id = (teacher as any)._id?.toString() || teacher.id?.toString() || '';
      
      const isDuplicateByEmail = email && seenEmails.has(email);
      const isDuplicateById = id && seenIds.has(id);
      
      if (isDuplicateByEmail || isDuplicateById) {
        duplicates.push(teacher);
        if (import.meta.env.DEV) {
          console.warn('⚠️ Duplicate teacher/admin in combined list:', {
            fullName: teacher.fullName,
            email: teacher.email,
            id: id,
            isAdmin: false,
            duplicateBy: isDuplicateByEmail ? 'email' : 'id',
            reason: 'Teacher record exists but admin record with same email/ID already added'
          });
        }
      } else {
        if (email) seenEmails.add(email);
        if (id) seenIds.add(id);
        deduplicated.push(teacher);
      }
    }
    
    if (duplicates.length > 0 && import.meta.env.DEV) {
      console.warn(`⚠️ Removed ${duplicates.length} duplicate teacher/admin(s) from combined list (prioritized admins over teachers)`);
    }
    
    return deduplicated;
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

  const handleAddTeacher = () => {
    setSelectedTeacher(null);
    setShowTeacherForm(true);
  };

  const handleCredentials = (teacher: any) => {
    setSelectedTeacher(teacher);
    setShowTeacherCredentials(true);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Teacher List (includes admins) */}
        <TeacherList
          teachers={combinedTeachers}
          onTeacherSelect={handleTeacherSelect}
          onEditTeacher={handleEditTeacher}
          onDeleteTeacher={handleDeleteTeacher}
          onAddTeacher={handleAddTeacher}
          onCredentials={handleCredentials}
        />
      </div>

      {/* Teacher Profile Modal */}
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

      {/* Edit Teacher Form Modal */}
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

      {/* Teacher Credentials Modal */}
      {showTeacherCredentials && selectedTeacher && (
        <TeacherCredentials
          teacher={selectedTeacher}
          onClose={() => {
            setShowTeacherCredentials(false);
            setSelectedTeacher(null);
          }}
        />
      )}
    </div>
  );
};

export default TeachersPage;
