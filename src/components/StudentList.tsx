import React, { useState, useMemo, useEffect, memo } from 'react';
import { FixedSizeList } from 'react-window';
import { useData } from '../contexts/DataContext';
import Card from './Card';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './ui/ToastContainer';

interface StudentListProps {
  onStudentSelect: (student: any) => void;
  onEditStudent: (student: any) => void;
  onDeleteStudent: (studentId: string) => void | Promise<void>;
  onAddStudent?: () => void;
  onCredentials?: (student: any) => void;
  onAnalytics?: (student: any) => void;
  onBulkOperations?: () => void;
  onPersonalMushaf?: (student: any) => void;
}

const StudentList: React.FC<StudentListProps> = ({ onStudentSelect, onEditStudent, onDeleteStudent, onAddStudent, onCredentials, onAnalytics, onBulkOperations, onPersonalMushaf }) => {
  const { students, teachers, addStudent } = useData();
  const { showToast, toasts, removeToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFields, setExportFields] = useState({ fullName: true, email: true, password: false });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPasswords, setGeneratedPasswords] = useState<Record<string, string>>({});
  const [resettingPasswords, setResettingPasswords] = useState(false);
  const [userPasswordStatus, setUserPasswordStatus] = useState<Record<string, { passwordChangeRequired: boolean; hasPassword: boolean }>>({});
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  // Helper function to get teacher name from ID
  const getTeacherName = (teacherId: string | undefined | null): string => {
    if (!teacherId) return 'Unassigned';
    
    // Try to find teacher by various ID fields
    const teacher = teachers.find(t => 
      t.id === teacherId || 
      (t as any)._id === teacherId ||
      (t as any).teacherId === teacherId ||
      (t as any).userId === teacherId
    );
    
    return teacher?.fullName || teacherId; // Return ID if teacher not found
  };

  // Get unique values for filters
  const uniqueTeachers = useMemo(() => {
    const teacherMap = new Map<string, string>();
    students.forEach(student => {
      if (student.assignedTeacher) {
        const teacherName = getTeacherName(student.assignedTeacher);
        if (!teacherMap.has(student.assignedTeacher)) {
          teacherMap.set(student.assignedTeacher, teacherName);
        }
      }
    });
    return Array.from(teacherMap.entries()).map(([id, name]) => ({ id, name }));
  }, [students, teachers]);

  const uniqueStatuses = Array.from(new Set(students.map(s => s.status).filter(Boolean)));
  
  // Normalize program names to canonical ProgramType values to prevent duplicates
  const normalizeProgramName = (program: string | undefined): string | null => {
    if (!program) return null;
    const trimmed = program.trim();
    if (!trimmed) return null;
    const normalized = trimmed.toLowerCase();
    
    // Map variations to canonical ProgramType values
    if (normalized.includes('full') && normalized.includes('time')) {
      return 'Full-Time HQ';
    }
    if (normalized.includes('part') && normalized.includes('time')) {
      return 'Part-Time HQ';
    }
    if (normalized.includes('after') && normalized.includes('school')) {
      return 'After School';
    }
    
    // If it matches exactly, return as-is
    if (trimmed === 'Full-Time HQ' || trimmed === 'Part-Time HQ' || trimmed === 'After School') {
      return trimmed;
    }
    
    // Return the original program name if it doesn't match known patterns
    // This ensures we don't lose any programs
    return trimmed;
  };
  
  // Get unique programs - use normalized names for filtering but show all unique values
  const uniquePrograms = useMemo(() => {
    const programSet = new Set<string>();
    students.forEach(student => {
      if (student.program) {
        const normalized = normalizeProgramName(student.program);
        if (normalized) {
          programSet.add(normalized);
        }
      }
    });
    return Array.from(programSet).sort(); // Sort alphabetically for better UX
  }, [students]);

  // Fetch user password status for all students
  useEffect(() => {
    const fetchUserPasswordStatus = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
        const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
        
        const response = await fetch(`${apiUrl}/users`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const users = await response.json();
          const statusMap: Record<string, { passwordChangeRequired: boolean; hasPassword: boolean }> = {};
          
          users.forEach((user: any) => {
            if (user.role === 'student' && user.email) {
              statusMap[user.email.toLowerCase()] = {
                passwordChangeRequired: user.passwordChangeRequired || false,
                hasPassword: user.hasPassword !== false
              };
            }
          });
          
          setUserPasswordStatus(statusMap);
        }
      } catch (error) {
        console.error('Error fetching user password status:', error);
      }
    };

    if (students.length > 0) {
      fetchUserPasswordStatus();
    }
  }, [students]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(student => {
      const matchesSearch = student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           false;
      const matchesTeacher = selectedTeacher === 'all' || student.assignedTeacher === selectedTeacher;
      const matchesProgram = selectedProgram === 'all' || normalizeProgramName(student.program) === selectedProgram;
      const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
      
      return matchesSearch && matchesTeacher && matchesProgram && matchesStatus;
    });

    // Sort students based on sortBy and sortOrder
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          const nameA = (a.fullName || '').toLowerCase();
          const nameB = (b.fullName || '').toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case 'email':
          const emailA = (a.email || '').toLowerCase();
          const emailB = (b.email || '').toLowerCase();
          comparison = emailA.localeCompare(emailB);
          break;
        case 'tuitionFee':
          const feeA = a.tuitionFee || 0;
          const feeB = b.tuitionFee || 0;
          comparison = feeA - feeB;
          break;
        default:
          const defaultNameA = (a.fullName || '').toLowerCase();
          const defaultNameB = (b.fullName || '').toLowerCase();
          comparison = defaultNameA.localeCompare(defaultNameB);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [students, searchTerm, selectedTeacher, selectedProgram, selectedStatus, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  // Virtualized row component for StudentList
  // Using div-based layout to work with react-window while maintaining table appearance
  const StudentRow = memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: any }) => {
    const student = data.students[index];
    if (!student) return null;

    return (
      <div 
        style={style} 
        className="grid grid-cols-[2fr,1fr,2fr,1fr,1.5fr,1fr,1fr,1.5fr,2fr] gap-0 border-b border-gray-200 hover:bg-gray-50 items-center"
      >
        <div className="px-2 py-2">
          <div className="flex items-center">
            <img 
              src={student.avatar || '/default-avatar.png'} 
              alt={student.fullName || 'Student'} 
              className="h-7 w-7 rounded-full mr-2" 
            />
            <div>
              <p className="font-medium text-gray-900 text-xs">{student.fullName || 'Unknown'}</p>
              <p className="text-[10px] text-gray-500">{student.program || 'No program'}</p>
            </div>
          </div>
        </div>
        <div className="px-2 py-2 text-[10px] font-mono text-gray-600">{student.id}</div>
        <div className="px-2 py-2 text-xs">
          <div>
            <p className="text-gray-900">{student.email || 'No email'}</p>
            <p className="text-[10px] text-gray-500">{student.contact || 'No contact'}</p>
          </div>
        </div>
        <div className="px-2 py-2 text-xs">{student.program || 'N/A'}</div>
        <div className="px-2 py-2 text-xs">{data.getTeacherName(student.assignedTeacher)}</div>
        <div className="px-2 py-2 text-xs font-semibold">
          ${student.tuitionFee?.toLocaleString() || '0'}
        </div>
        <div className="px-2 py-2">{data.getStatusBadge(student.status || 'active')}</div>
        <div className="px-2 py-2">
          {(() => {
            const email = student.email?.toLowerCase();
            const status = email ? data.userPasswordStatus[email] : null;
            if (!status || !status.hasPassword) {
              return (
                <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-800 border border-red-300">
                  No Password
                </span>
              );
            }
            if (status.passwordChangeRequired) {
              return (
                <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300" title="Student needs to change password">
                  Change Required
                </span>
              );
            }
            return (
              <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-800 border border-green-300" title="Password has been changed">
                Changed
              </span>
            );
          })()}
        </div>
        <div className="px-2 py-2">
          <div className="flex space-x-1">
            <button
              onClick={() => data.onStudentSelect(student)}
              className="text-primary-600 hover:text-primary-800 text-xs font-medium"
            >
              View
            </button>
            <button
              onClick={() => data.onEditStudent(student)}
              className="text-gold-600 hover:text-gold-800 text-xs font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => data.onDeleteStudent(student.id)}
              className="text-red-600 hover:text-red-800 text-xs font-medium"
            >
              Del
            </button>
            {data.onCredentials && (
              <button
                onClick={() => data.onCredentials(student)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Credentials
              </button>
            )}
            {data.onAnalytics && (
              <button
                onClick={() => data.onAnalytics(student)}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                Analytics
              </button>
            )}
            {data.onPersonalMushaf && (
              <button
                onClick={() => data.onPersonalMushaf(student)}
                className="text-green-600 hover:text-green-800 text-xs font-medium"
                title="View Personal Mushaf with Mistakes"
              >
                Mushaf
              </button>
            )}
          </div>
        </div>
      </div>
    );
  });
  StudentRow.displayName = 'StudentRow';

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-primary text-white border-primary', // Keep white text on dark green for contrast
      inactive: 'bg-soft-primary text-primary border-primary/30',
      pending: 'bg-accent/30 text-primary border-accent/50',
      suspended: 'bg-soft-primary text-primary border-primary/20'
    };
    
    return (
      <span className={`px-2 sm:px-3 py-1 text-xs font-extrabold rounded-full border-2 ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
        {status}
      </span>
    );
  };

  // Generate secure password
  const generateSecurePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = '';
    // Ensure at least one of each required character type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Reset passwords for all filtered students
  const handleResetPasswords = async () => {
    if (filteredStudents.length === 0) {
      showToast('No students to reset passwords for', 'warning');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Reset Passwords',
      description: `Are you sure you want to generate new passwords for ${filteredStudents.length} student(s)? This will reset their current passwords.`,
      danger: false,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        await performPasswordReset();
    }
    });
  };

  const performPasswordReset = async () => {

    setResettingPasswords(true);
    const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
    const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
    
    const newPasswords: Record<string, string> = {};
    let successCount = 0;
    let failCount = 0;
    const failures: Array<{ email: string; reason: string }> = [];

    try {
      // First, check database connection
      const healthResponse = await fetch(`${API_BASE}/health`);
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        if (health.database?.status !== 'connected' || !health.database?.ping) {
          showToast(
            `Database Connection Issue: Status: ${health.database?.status || 'unknown'}, Ping: ${health.database?.ping ? 'OK' : 'Failed'}. Please ensure MongoDB is connected and try again.`,
            'error',
            6000
          );
          setResettingPasswords(false);
          return;
        }
      }

      // Get all users to find userIds for students
      const usersResponse = await fetch(`${API_BASE}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!usersResponse.ok) {
        if (usersResponse.status === 503) {
          const errorData = await usersResponse.json().catch(() => ({}));
          throw new Error(`Database connection unavailable: ${errorData.details || 'MongoDB is not connected'}`);
        }
        const errorText = await usersResponse.text();
        throw new Error(`Failed to fetch users: ${usersResponse.status} ${errorText}`);
      }

      const users = await usersResponse.json();

      // Process each filtered student
      for (const student of filteredStudents) {
        try {
          // Find user by email
          const user = users.find((u: any) => 
            u.email?.toLowerCase() === student.email?.toLowerCase()
          );

          if (!user) {
            const reason = `No User account found for email ${student.email}`;
            console.warn(reason);
            failures.push({ email: student.email || 'Unknown', reason });
            failCount++;
            continue;
          }

          // Generate new password
          const newPassword = generateSecurePassword();
          const userId = user._id || user.id;

          if (!userId) {
            const reason = `No user ID found for ${student.email}`;
            console.error(reason);
            failures.push({ email: student.email || 'Unknown', reason });
            failCount++;
            continue;
          }

          // Reset password via API (admin reset - no current password needed)
          const response = await fetch(`${API_BASE}/users/${userId}/password`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: newPassword })
          });

          if (response.ok) {
            const result = await response.json();
            newPasswords[student.id || student.email] = newPassword;
            successCount++;
            console.log(`✅ Password reset for ${student.email} - Saved to MongoDB`);
            console.log(`   Password: ${newPassword} (will be hashed in database)`);
            console.log(`   User ID: ${userId}`);
          } else {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            const reason = errorData.error || errorData.details || `HTTP ${response.status}`;
            console.error(`❌ Failed to reset password for ${student.email}:`, errorData);
            failures.push({ email: student.email || 'Unknown', reason });
            failCount++;
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Error resetting password for ${student.email}:`, error);
          failures.push({ email: student.email || 'Unknown', reason });
          failCount++;
        }
      }

      setGeneratedPasswords(newPasswords);
      
      if (successCount > 0) {
        showToast(
          `Successfully reset passwords for ${successCount} student(s)${failCount > 0 ? `. ${failCount} failed.` : ''}`,
          failCount > 0 ? 'warning' : 'success',
          5000
        );
        if (failCount > 0) {
          const failureDetails = failures.slice(0, 5).map(f => `${f.email}: ${f.reason}`).join(', ');
          const moreCount = failures.length > 5 ? ` and ${failures.length - 5} more` : '';
          showToast(`Failures: ${failureDetails}${moreCount}. Check console for details.`, 'error', 8000);
        }
        // Enable password in export fields
        setExportFields({ ...exportFields, password: true });
        setShowPasswordModal(false);
      } else {
        const failureDetails = failures.slice(0, 5).map(f => `${f.email}: ${f.reason}`).join(', ');
        const moreCount = failures.length > 5 ? ` and ${failures.length - 5} more` : '';
        showToast(
          `Failed to reset passwords for all students. ${failureDetails}${moreCount}. Check console for details.`,
          'error',
          8000
        );
      }
    } catch (error) {
      console.error('❌ Error resetting passwords:', error);
      showToast(
        `Error: ${error instanceof Error ? error.message : 'Failed to reset passwords'}. Check browser console for details.`,
        'error',
        6000
      );
    } finally {
      setResettingPasswords(false);
    }
  };

  // Export function
  const handleExport = () => {
    if (!exportFields.fullName && !exportFields.email && !exportFields.password) {
      showToast('Please select at least one field to export', 'warning');
      return;
    }

    // Check if password is selected but not generated
    if (exportFields.password && Object.keys(generatedPasswords).length === 0) {
      showToast('Please generate/reset passwords first before exporting with password field', 'warning');
      return;
    }

    // Prepare headers
    const headers: string[] = [];
    if (exportFields.fullName) headers.push('Full Name');
    if (exportFields.email) headers.push('Email');
    if (exportFields.password) headers.push('Password');

    // Prepare data rows
    const rows = filteredStudents.map(student => {
      const row: string[] = [];
      if (exportFields.fullName) row.push(`"${(student.fullName || '').replace(/"/g, '""')}"`);
      if (exportFields.email) row.push(`"${(student.email || '').replace(/"/g, '""')}"`);
      if (exportFields.password) {
        const password = generatedPasswords[student.id || student.email] || 'N/A';
        row.push(`"${password.replace(/"/g, '""')}"`);
      }
      return row.join(',');
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const filename = exportFields.password 
      ? `students-with-passwords-${new Date().toISOString().split('T')[0]}.csv`
      : `students-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Close modal
    setShowExportModal(false);
  };

  const getPaymentStatus = (student: any) => {
    // Mock payment status - in real app, this would come from payment data
    const isOverdue = Math.random() > 0.8;
    const isPending = Math.random() > 0.9;
    
    if (isOverdue) {
      return <span className="text-primary text-xs font-extrabold">Overdue</span>;
    } else if (isPending) {
      return <span className="text-primary text-xs font-extrabold">Pending</span>;
    } else {
      return <span className="text-primary text-xs font-extrabold">Current</span>;
    }
  };

  const addSampleStudents = () => {
    const sampleStudents = [
      {
        id: 'S001',
        fullName: 'Ahmed Hassan',
        parentName: 'Hassan Ali',
        email: 'ahmed.hassan@student.com',
        contact: '+1-555-0201',
        program: 'Full-Time HQ',
        tuitionFee: 200,
        registrationAmount: 100,
        assignedTeacher: 'Umar Farooq',
        schedule: { days: ['Monday', 'Wednesday', 'Friday'], startTime: '09:00', endTime: '12:00' },
        enrolledDate: '2024-01-15',
        status: 'active',
        avatar: 'https://ui-avatars.com/api/?name=Ahmed+Hassan&background=2E4D32&color=fff'
      },
      {
        id: 'S002',
        fullName: 'Fatima Khan',
        parentName: 'Khan Family',
        email: 'fatima.khan@student.com',
        contact: '+1-555-0203',
        program: 'Part-Time HQ',
        tuitionFee: 150,
        registrationAmount: 75,
        assignedTeacher: 'Aisha Ahmed',
        schedule: { days: ['Tuesday', 'Thursday'], startTime: '14:00', endTime: '16:00' },
        enrolledDate: '2024-02-01',
        status: 'active',
        avatar: 'https://ui-avatars.com/api/?name=Fatima+Khan&background=2E4D32&color=fff'
      },
      {
        id: 'S003',
        fullName: 'Omar Ali',
        parentName: 'Ali Family',
        email: 'omar.ali@student.com',
        contact: '+1-555-0205',
        program: 'After School',
        tuitionFee: 100,
        registrationAmount: 50,
        assignedTeacher: 'Umar Farooq',
        schedule: { days: ['Saturday', 'Sunday'], startTime: '10:00', endTime: '12:00' },
        enrolledDate: '2024-01-20',
        status: 'inactive',
        avatar: 'https://ui-avatars.com/api/?name=Omar+Ali&background=2E4D32&color=fff'
      }
    ];

    sampleStudents.forEach(student => {
      if (!students.find(s => s.id === student.id)) {
        addStudent(student as any);
      }
    });
  };


  return (
    <>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        danger={confirmModal.danger}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

    <div className="space-y-6">
      {/* Prominent Header */}
      <div className="bg-gradient-to-r from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.9)] rounded-2xl p-3 sm:p-4 border-b-4 border-accent shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-1 drop-shadow-lg">
              Student Directory
            </h2>
            <p className="text-white/90 text-xs sm:text-sm font-semibold">
              Manage all registered students • {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'} found
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {onAddStudent && (
              <button 
                onClick={onAddStudent}
                className="px-4 sm:px-5 py-1.5 sm:py-2 bg-accent text-primary rounded-full font-bold hover:scale-105 transition-all shadow-lg text-xs sm:text-sm"
                style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}
              >
                Add Student
              </button>
            )}
            {students.length === 0 && (
            <button 
              onClick={addSampleStudents}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-accent/30 text-primary rounded-full font-bold hover:bg-accent/40 transition-all shadow-md hover:scale-105 text-xs"
            >
              Add Sample
            </button>
            )}
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition-all shadow-md hover:scale-105 text-xs"
            >
              {Object.keys(generatedPasswords).length > 0 ? '🔑 Passwords Generated' : '🔑 Generate Passwords'}
            </button>
            <button 
              onClick={() => setShowExportModal(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-accent/30 text-primary rounded-full font-bold hover:bg-accent/40 transition-all shadow-md hover:scale-105 text-xs"
            >
              Export
            </button>
            <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-accent/30 text-primary rounded-full font-bold hover:bg-accent/40 transition-all shadow-md hover:scale-105 text-xs">
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <Card>
        <div className="bg-gradient-to-br from-soft-primary to-soft-primary rounded-xl p-3 sm:p-4 border-2 border-primary/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 mb-3">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-bold text-primary mb-1.5">Search Students</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or ID..."
                className="w-full px-3 sm:px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition bg-white text-primary font-bold shadow-md text-xs sm:text-sm placeholder:text-primary/50"
              />
            </div>

            {/* Program Filter */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">Program</label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition bg-white text-primary font-bold shadow-md text-xs sm:text-sm"
              >
                <option value="all">All Programs</option>
                {uniquePrograms.map(program => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
            </div>

            {/* Teacher Filter */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">Teacher</label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition bg-white text-primary font-bold shadow-md text-xs sm:text-sm"
              >
                <option value="all">All Teachers</option>
                {uniqueTeachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition bg-white text-primary font-bold shadow-md text-xs sm:text-sm"
              >
                <option value="all">All Status</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-3 pt-3 border-t-2 border-primary/20">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedTeacher('all');
                  setSelectedProgram('all');
                  setSelectedStatus('all');
                  setSelectedPaymentStatus('all');
                }}
                className="px-3 sm:px-4 py-1.5 bg-primary text-white rounded-full font-bold hover:scale-105 transition-all shadow-md hover:shadow-lg text-xs"
              >
                Clear Filters
              </button>
              <button
                onClick={() => {
                  setSortBy('name');
                  setSortOrder('asc');
                }}
                className="px-3 sm:px-4 py-1.5 bg-accent text-primary rounded-full font-bold hover:scale-105 transition-all shadow-md hover:shadow-lg text-xs"
              >
                Reset Sort
              </button>
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-primary">
              Showing <span className="text-accent">{filteredStudents.length}</span> of <span className="text-accent">{students.length}</span> students
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || selectedTeacher !== 'all' || selectedStatus !== 'all' || selectedPaymentStatus !== 'all') && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-accent/20 border-2 border-accent/40 rounded-lg mt-3">
              <span className="text-[10px] font-bold text-primary">Active Filters:</span>
              {searchTerm && (
                <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full shadow-sm">
                  Search: "{searchTerm}"
                </span>
              )}
              {selectedTeacher !== 'all' && (
                <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full shadow-sm">
                  Teacher: {selectedTeacher}
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full shadow-sm">
                  Status: {selectedStatus}
                </span>
              )}
              {selectedPaymentStatus !== 'all' && (
                <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-primary text-white text-xs font-extrabold rounded-full shadow-md">
                  Payment: {selectedPaymentStatus}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Students Table */}
      <Card>
        <div className="overflow-x-auto">
          {/* Table Header - using grid to match row layout */}
          <div className="grid grid-cols-[2fr,1fr,2fr,1fr,1.5fr,1fr,1fr,1.5fr,2fr] gap-0 bg-gray-50 border-b-2 border-gray-200">
            <div 
                  className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Student</span>
                    {sortBy === 'name' && (
                      <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
            </div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">ID</div>
            <div 
                  className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Contact</span>
                    {sortBy === 'email' && (
                      <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
            </div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Program</div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Teacher</div>
            <div 
                  className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('tuitionFee')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Tuition</span>
                    {sortBy === 'tuitionFee' && (
                      <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                        </div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Status</div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Password</div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Actions</div>
                      </div>

          {/* Virtualized Body */}
          {paginatedStudents.length > 0 ? (
            <FixedSizeList
              height={Math.min(600, paginatedStudents.length * 60)}
              itemCount={paginatedStudents.length}
              itemSize={60}
              width="100%"
              itemData={{
                students: paginatedStudents,
                getTeacherName,
                getStatusBadge,
                userPasswordStatus,
                onStudentSelect,
                onEditStudent,
                onDeleteStudent,
                onCredentials,
                onAnalytics,
                onPersonalMushaf
              }}
              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {StudentRow}
            </FixedSizeList>
              ) : (
            <div className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <p className="text-lg font-semibold mb-2">No students found</p>
                      <p className="text-sm">No students match the selected filters.</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedTeacher('all');
                          setSelectedStatus('all');
                          setSelectedPaymentStatus('all');
                        }}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                      >
                        Clear All Filters
                      </button>
                    </div>
            </div>
              )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Generate/Reset Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Generate/Reset Passwords</h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Warning:</strong> This will reset passwords for <strong>{filteredStudents.length}</strong> student(s). 
                  Generated passwords will be available for export. Make sure to export and save them securely.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Password Requirements:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Minimum 8 characters</li>
                    <li>Uppercase, lowercase, number, and special character</li>
                    <li>Passwords will be generated automatically</li>
                  </ul>
                </p>
              </div>

              {Object.keys(generatedPasswords).length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <strong>✅ Success:</strong> {Object.keys(generatedPasswords).length} password(s) have been generated. 
                    You can now export them with student data.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleResetPasswords}
                  disabled={resettingPasswords}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resettingPasswords ? 'Generating...' : 'Generate Passwords for All'}
                </button>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  {Object.keys(generatedPasswords).length > 0 ? 'Done' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Export Students</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Select Fields to Export</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
                    <input
                      type="checkbox"
                      checked={exportFields.fullName}
                      onChange={(e) => setExportFields({ ...exportFields, fullName: e.target.checked })}
                      className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-900">Full Name</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
                    <input
                      type="checkbox"
                      checked={exportFields.email}
                      onChange={(e) => setExportFields({ ...exportFields, email: e.target.checked })}
                      className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-900">Email</span>
                  </label>
                  <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border border-gray-200 ${Object.keys(generatedPasswords).length === 0 ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={exportFields.password}
                      onChange={(e) => setExportFields({ ...exportFields, password: e.target.checked })}
                      disabled={Object.keys(generatedPasswords).length === 0}
                      className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary disabled:opacity-50"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      Password {Object.keys(generatedPasswords).length > 0 && `(${Object.keys(generatedPasswords).length} generated)`}
                    </span>
                  </label>
                </div>
              </div>

              {Object.keys(generatedPasswords).length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <strong>✅ Passwords Generated:</strong> {Object.keys(generatedPasswords).length} password(s) have been generated and can be included in the export.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The export will include all {filteredStudents.length} filtered students.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleExport}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-md"
                >
                  Generate for All & Export
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default StudentList;
