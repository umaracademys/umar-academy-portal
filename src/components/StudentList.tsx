import React, { useState, useMemo, useEffect, memo } from 'react';
import { useData } from '../contexts/DataContext';
import Card from './Card';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './ui/ToastContainer';
import Button from './Button';

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

const StudentList: React.FC<StudentListProps> = ({ 
  onStudentSelect, 
  onEditStudent, 
  onDeleteStudent, 
  onAddStudent, 
  onCredentials, 
  onAnalytics, 
  onBulkOperations, 
  onPersonalMushaf 
}) => {
  const { students: rawStudents, teachers, addStudent, refreshData } = useData();
  // Defensive: ensure students is always an array
  const students = Array.isArray(rawStudents) ? rawStudents : [];
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
    
    const teacher = teachers.find(t => 
      t.id === teacherId || 
      (t as any)._id === teacherId ||
      (t as any).teacherId === teacherId ||
      (t as any).userId === teacherId
    );
    
    return teacher?.fullName || teacherId;
  };

  // Get unique values for filters
  const uniqueTeachers = useMemo(() => {
    const teacherMap = new Map<string, string>();
    students.forEach(student => {
      if (!student) return;
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
  
  // Normalize program names
  const normalizeProgramName = (program: string | undefined): string | null => {
    if (!program) return null;
    const trimmed = program.trim();
    if (!trimmed) return null;
    const normalized = trimmed.toLowerCase();
    
    if (normalized.includes('full') && normalized.includes('time')) {
      return 'Full-Time HQ';
    }
    if (normalized.includes('part') && normalized.includes('time')) {
      return 'Part-Time HQ';
    }
    if (normalized.includes('after') && normalized.includes('school')) {
      return 'After School';
    }
    
    if (trimmed === 'Full-Time HQ' || trimmed === 'Part-Time HQ' || trimmed === 'After School') {
      return trimmed;
    }
    
    return trimmed;
  };
  
  const uniquePrograms = useMemo(() => {
    const programSet = new Set<string>();
    students.forEach(student => {
      if (!student) return;
      if (student.program) {
        const normalized = normalizeProgramName(student.program);
        if (normalized) {
          programSet.add(normalized);
        }
      }
    });
    return Array.from(programSet).sort();
  }, [students]);

  // Fetch user password status
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
          const usersPayload = await response.json();
          const users = Array.isArray(usersPayload) ? usersPayload : (usersPayload.users || []);
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
      if (!student) return false;
      const matchesSearch = student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           false;
      const matchesTeacher = selectedTeacher === 'all' || student.assignedTeacher === selectedTeacher;
      const matchesProgram = selectedProgram === 'all' || normalizeProgramName(student.program) === selectedProgram;
      const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
      
      return matchesSearch && matchesTeacher && matchesProgram && matchesStatus;
    });

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
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      pending: 'bg-amber-100 text-amber-700',
      suspended: 'bg-red-100 text-red-700'
    };
    
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
        {status}
      </span>
    );
  };

  const getPasswordStatusBadge = (student: any) => {
    const email = student.email?.toLowerCase();
    const status = email ? userPasswordStatus[email] : null;
    
    if (!status || !status.hasPassword) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          No Password
        </span>
      );
    }
    if (status.passwordChangeRequired) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700" title="Student needs to change password">
          Change Required
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700" title="Password has been changed">
        Changed
      </span>
    );
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Mobile Card Component
  const StudentCard = memo(({ student }: { student: any }) => {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Header: Avatar, Name */}
        <div className="flex items-start gap-3 mb-4">
          <div className="relative flex-shrink-0">
            {student.avatar ? (
              <img 
                src={student.avatar} 
                alt={student.fullName || 'Student'} 
                className="h-12 w-12 rounded-full object-cover border-2 border-gray-200" 
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center border-2 border-gray-200">
                <span className="text-primary-700 font-semibold text-sm">
                  {getInitials(student.fullName || 'Unknown')}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate mb-1">{student.fullName || 'Unknown'}</h3>
            <p className="text-sm text-gray-600 truncate">{student.program || 'No program'}</p>
            <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]" title={student.id}>
              ID: {student.id}
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Email</p>
            <p className="text-sm text-gray-900 truncate">{student.email || 'No email'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Phone</p>
            <p className="text-sm text-gray-900">{student.contact || 'No contact'}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Teacher</p>
            <p className="text-sm text-gray-900 truncate">{getTeacherName(student.assignedTeacher)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Tuition</p>
            <p className="text-sm font-semibold text-gray-900">
              ${student.tuitionFee?.toLocaleString() || '0'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Status</p>
            {getStatusBadge(student.status || 'active')}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Password</p>
            {getPasswordStatusBadge(student)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => onStudentSelect(student)}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            View
          </button>
          <button
            onClick={() => onEditStudent(student)}
            className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDeleteStudent(student.id)}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
          {onCredentials && (
            <button
              onClick={() => onCredentials(student)}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              Credentials
            </button>
          )}
          {onAnalytics && (
            <button
              onClick={() => onAnalytics(student)}
              className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
            >
              Analytics
            </button>
          )}
          {onPersonalMushaf && (
            <button
              onClick={() => onPersonalMushaf(student)}
              className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
            >
              Mushaf
            </button>
          )}
        </div>
      </div>
    );
  });
  StudentCard.displayName = 'StudentCard';

  // Desktop Table Row Component
  const StudentRow = memo(({ student }: { student: any }) => {
    return (
      <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
        {/* Student Name & Avatar */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              {student.avatar ? (
                <img 
                  src={student.avatar} 
                  alt={student.fullName || 'Student'} 
                  className="h-10 w-10 rounded-full object-cover border border-gray-200" 
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center border border-gray-200">
                  <span className="text-primary-700 font-semibold text-xs">
                    {getInitials(student.fullName || 'Unknown')}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{student.fullName || 'Unknown'}</p>
              <p className="text-xs text-gray-500 truncate">{student.program || 'No program'}</p>
            </div>
          </div>
        </td>

        {/* ID */}
        <td className="px-4 py-3">
          <p className="text-xs font-mono text-gray-600 truncate max-w-[100px]" title={student.id}>
            {student.id}
          </p>
        </td>

        {/* Contact */}
        <td className="px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-900 truncate">{student.email || 'No email'}</p>
            <p className="text-xs text-gray-500 truncate">{student.contact || 'No contact'}</p>
          </div>
        </td>

        {/* Program */}
        <td className="px-4 py-3">
          <p className="text-sm text-gray-700 truncate">{student.program || 'N/A'}</p>
        </td>

        {/* Teacher */}
        <td className="px-4 py-3">
          <p className="text-sm text-gray-700 truncate">{getTeacherName(student.assignedTeacher)}</p>
        </td>

        {/* Tuition */}
        <td className="px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">
            ${student.tuitionFee?.toLocaleString() || '0'}
          </p>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          {getStatusBadge(student.status || 'active')}
        </td>

        {/* Password Status */}
        <td className="px-4 py-3">
          {getPasswordStatusBadge(student)}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStudentSelect(student)}
              className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            >
              View
            </button>
            <button
              onClick={() => onEditStudent(student)}
              className="px-2 py-1 text-xs font-medium text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDeleteStudent(student.id)}
              className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
            >
              Del
            </button>
            {onCredentials && (
              <button
                onClick={() => onCredentials(student)}
                className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              >
                Credentials
              </button>
            )}
            {onAnalytics && (
              <button
                onClick={() => onAnalytics(student)}
                className="px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
              >
                Analytics
              </button>
            )}
            {onPersonalMushaf && (
              <button
                onClick={() => onPersonalMushaf(student)}
                className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                title="View Personal Mushaf with Mistakes"
              >
                Mushaf
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  });
  StudentRow.displayName = 'StudentRow';

  // Generate secure password
  const generateSecurePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Reset passwords
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

      for (const student of filteredStudents) {
        try {
          const user = users.find((u: any) => 
            u.email?.toLowerCase() === student.email?.toLowerCase()
          );

          if (!user) {
            failures.push({ email: student.email || 'Unknown', reason: `No User account found for email ${student.email}` });
            failCount++;
            continue;
          }

          const newPassword = generateSecurePassword();
          const userId = user._id || user.id;

          if (!userId) {
            failures.push({ email: student.email || 'Unknown', reason: `No user ID found for ${student.email}` });
            failCount++;
            continue;
          }

          const response = await fetch(`${API_BASE}/users/${userId}/password`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: newPassword })
          });

          if (response.ok) {
            newPasswords[student.id || student.email] = newPassword;
            successCount++;
          } else {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            const reason = errorData.error || errorData.details || `HTTP ${response.status}`;
            failures.push({ email: student.email || 'Unknown', reason });
            failCount++;
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'Unknown error';
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

    if (exportFields.password && Object.keys(generatedPasswords).length === 0) {
      showToast('Please generate/reset passwords first before exporting with password field', 'warning');
      return;
    }

    const headers: string[] = [];
    if (exportFields.fullName) headers.push('Full Name');
    if (exportFields.email) headers.push('Email');
    if (exportFields.password) headers.push('Password');

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

    const csvContent = [
      headers.join(','),
      ...rows
    ].join('\n');

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

    setShowExportModal(false);
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

      <div className="space-y-6 bg-gray-50 min-h-screen py-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Directory</h1>
              <p className="text-gray-600">
                Manage and view all registered students
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {onAddStudent && (
                <Button
                  onClick={onAddStudent}
                  variant="primary"
                  size="md"
                >
                  <span className="mr-2">+</span>
                  Add Student
                </Button>
              )}
              {refreshData && (
                <Button
                  onClick={async () => {
                    if (refreshData) {
                      await refreshData();
                    }
                  }}
                  variant="outline"
                  size="md"
                  title="Refresh data from database"
                >
                  🔄 Refresh
                </Button>
              )}
              {students.length === 0 && (
                <Button
                  onClick={addSampleStudents}
                  variant="outline"
                  size="md"
                >
                  Add Sample
                </Button>
              )}
              <Button
                onClick={() => setShowPasswordModal(true)}
                variant="outline"
                size="md"
              >
                {Object.keys(generatedPasswords).length > 0 ? '🔑 Passwords Generated' : '🔑 Generate Passwords'}
              </Button>
              <Button
                onClick={() => setShowExportModal(true)}
                variant="outline"
                size="md"
              >
                Export
              </Button>
              <Button variant="outline" size="md">
                Import
              </Button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{filteredStudents.length}</span>
              <span>{filteredStudents.length === 1 ? 'student' : 'students'} found</span>
              {filteredStudents.length !== students.length && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">Filtered from {students.length} total</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Search & Filters</h2>
            <p className="text-sm text-gray-500">Refine your search to find specific students</p>
          </div>
          
          <div className="space-y-4">
            {/* Search Bar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Students
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or ID..."
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                />
              </div>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Program
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm bg-white"
                >
                  <option value="all">All Programs</option>
                  {uniquePrograms.map(program => (
                    <option key={program} value={program}>{program}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teacher
                </label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm bg-white"
                >
                  <option value="all">All Teachers</option>
                  {uniqueTeachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm bg-white"
                >
                  <option value="all">All Status</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedTeacher('all');
                  setSelectedProgram('all');
                  setSelectedStatus('all');
                  setSelectedPaymentStatus('all');
                }}
                variant="secondary"
                size="sm"
              >
                Clear Filters
              </Button>
              <Button
                onClick={() => {
                  setSortBy('name');
                  setSortOrder('asc');
                }}
                variant="secondary"
                size="sm"
              >
                Reset Sort
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-4">
          {paginatedStudents.length > 0 ? (
            paginatedStudents.map((student, index) => {
              if (!student) return null;
              return <StudentCard key={student.id || student._id || index} student={student} />;
            })
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Students</h2>
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-gray-900">{Math.min(startIndex + itemsPerPage, filteredStudents.length)}</span> of{' '}
                <span className="font-semibold text-gray-900">{filteredStudents.length}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-300">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Student</span>
                      {sortBy === 'name' && (
                        <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Contact</span>
                      {sortBy === 'email' && (
                        <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('tuitionFee')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Tuition</span>
                      {sortBy === 'tuitionFee' && (
                        <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Password</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length > 0 ? (
                  paginatedStudents.map((student, index) => {
                    if (!student) return null;
                    return <StudentRow key={student.id || student._id || index} student={student} />;
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <h3 className="mt-4 text-sm font-medium text-gray-900">No students found</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Try adjusting your search or filter criteria
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-white"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-700">per page</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1 px-4">
                    <span className="text-sm text-gray-700">
                      Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
                      <span className="font-semibold text-gray-900">{totalPages}</span>
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="md:hidden bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1 px-4">
                  <span className="text-sm text-gray-700">
                    Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
                    <span className="font-semibold text-gray-900">{totalPages}</span>
                  </span>
                </div>
                
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

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
                    Export
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
