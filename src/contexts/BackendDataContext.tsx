import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, Teacher, Admin, RecitationReview, AdminNotification, AssignmentTicket } from '../types';

interface BackendDataContextType {
  students: Student[];
  teachers: Teacher[];
  admins: Admin[];
  addStudent: (student: Student) => Promise<void>;
  addTeacher: (teacher: Teacher) => Promise<void>;
  addAdmin: (admin: Admin) => Promise<void>;
  updateStudent: (id: string, student: Partial<Student>) => Promise<void>;
  updateTeacher: (id: string, teacher: Partial<Teacher>) => Promise<void>;
  updateAdmin: (id: string, admin: Partial<Admin>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  deleteAdmin: (id: string) => Promise<void>;
  getStudentsByTeacher: (teacherId: string) => Student[];
  getTeacherById: (id: string) => Teacher | undefined;
  getStudentByEmail: (email: string) => Student | undefined;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  // Assignment management
  assignments: any[];
  addAssignment: (assignment: any) => Promise<void>;
  updateAssignment: (id: string, assignment: any) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  addAssignmentSubmission: (assignmentId: string, submission: any) => Promise<void>;
  // Recitation Review management
  recitationReviews: RecitationReview[];
  addRecitationReview: (review: RecitationReview) => Promise<void>;
  updateRecitationReview: (id: string, review: Partial<RecitationReview>) => Promise<void>;
  convertRecitationReviewToAssignment: (reviewId: string) => Promise<any>;
  // Admin Notifications
  adminNotifications: AdminNotification[];
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  // Ticket-based workflow
  tickets: AssignmentTicket[];
  addTicket: (ticket: AssignmentTicket) => Promise<void>;
  updateTicket: (id: string, ticket: Partial<AssignmentTicket>) => Promise<void>;
  assignTicketToNextTeacher: (ticketId: string, teacherId: string, teacherName: string) => Promise<AssignmentTicket>;
  approveTicket: (ticketId: string, reviewedBy: string) => Promise<any>;
  assignTicketToNext: (ticketId: string, teacherId: string, teacherName: string) => Promise<any>;
  approveAndAdvanceTicket: (ticketId: string, reviewedBy: string, nextTeacherId?: string, nextTeacherName?: string) => Promise<any>;
  finalizeTicket: (ticketId: string, data: { finalReport: string; homework: string; homeworkLink?: string; reviewedBy: string }) => Promise<any>;
  // Personal Mushaf
  getStudentPersonalMushaf: (studentId: string) => Promise<any>;
  getStudentPersonalMushafFiltered: (studentId: string, filters?: { page?: number; surah?: number; ayah?: number }) => Promise<any>;
}

const BackendDataContext = createContext<BackendDataContextType | undefined>(undefined);

export const useBackendData = () => {
  const context = useContext(BackendDataContext);
  if (!context) {
    throw new Error('useBackendData must be used within a BackendDataProvider');
  }
  return context;
};

// API base URL - uses environment variable in production, localhost in development
const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

export const BackendDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [recitationReviews, setRecitationReviews] = useState<RecitationReview[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [tickets, setTickets] = useState<AssignmentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from backend API
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading data from backend...');

      // Load users from backend
      const usersResponse = await fetch(`${API_BASE}/users`);
      console.log('📡 Backend response status:', usersResponse.status);
      
      if (!usersResponse.ok) {
        throw new Error(`Failed to fetch users: ${usersResponse.status}`);
      }
      const users = await usersResponse.json();
      console.log('👥 Users loaded from backend:', users.length);

      // Load actual teacher records from /api/teachers endpoint
      let teacherRecords: any[] = [];
      try {
        const teachersResponse = await fetch(`${API_BASE}/teachers`);
        if (teachersResponse.ok) {
          teacherRecords = await teachersResponse.json();
          console.log('👨‍🏫 Teacher records loaded from /api/teachers:', teacherRecords.length);
          
          // Merge teacher data with user data
          teacherRecords.forEach((teacher: any) => {
            const user = users.find((u: any) => 
              u._id === teacher.userId?._id || 
              u._id === teacher.userId ||
              (teacher.userId && typeof teacher.userId === 'object' && teacher.userId._id === u._id)
            );
            if (user) {
              user.teacherProfile = teacher;
            }
          });
        }
      } catch (err) {
        console.warn('⚠️ Could not load teacher records:', err);
      }

      // Load assignments from backend
      const assignmentsResponse = await fetch(`${API_BASE}/assignments`);
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        console.log('📝 Assignments loaded from backend:', assignmentsData.length);
        // Map MongoDB _id to id for frontend compatibility
        const mappedAssignments = assignmentsData.map((assignment: any) => ({
          ...assignment,
          id: assignment._id || assignment.id,
          dueDate: assignment.dueDate ? new Date(assignment.dueDate) : new Date(),
          createdAt: assignment.createdAt ? new Date(assignment.createdAt) : new Date(),
          updatedAt: assignment.updatedAt ? new Date(assignment.updatedAt) : new Date()
        }));
        setAssignments(mappedAssignments);
      }

      // Load recitation reviews
      const reviewsResponse = await fetch(`${API_BASE}/recitation-reviews`);
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        console.log('📖 Recitation reviews loaded:', reviewsData.length);
        setRecitationReviews(reviewsData);
      }

      // Load admin notifications
      const notificationsResponse = await fetch(`${API_BASE}/admin-notifications`);
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        console.log('🔔 Admin notifications loaded:', notificationsData.length);
        setAdminNotifications(notificationsData);
      }

      // Load tickets
      const ticketsResponse = await fetch(`${API_BASE}/tickets`);
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        console.log('🎫 Tickets loaded:', ticketsData.length);
        // Map MongoDB _id to id for frontend compatibility
        const mappedTickets = ticketsData.map((ticket: any) => ({
          ...ticket,
          id: ticket._id || ticket.id,
          createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
          updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(),
          reviewedAt: ticket.reviewedAt ? new Date(ticket.reviewedAt) : undefined,
          completedAt: ticket.completedAt ? new Date(ticket.completedAt) : undefined
        }));
        setTickets(mappedTickets);
      }

      // Load actual student records from /api/students endpoint
      let studentRecords: any[] = [];
      try {
        const studentsResponse = await fetch(`${API_BASE}/students`);
        if (studentsResponse.ok) {
          studentRecords = await studentsResponse.json();
          console.log('📚 Student records loaded from /api/students:', studentRecords.length);
        }
      } catch (err) {
        console.warn('⚠️ Could not load student records:', err);
      }

      // Separate users by role and map to expected format
      const studentsData = users
        .filter((user: any) => user.role === 'student')
        .map((user: any) => {
          // Find matching student record to get actual data
          const studentRecord = studentRecords.find((sr: any) => 
            sr.userId?._id === user._id || 
            sr.userId?._id?.toString() === user._id?.toString() ||
            (sr.userId && typeof sr.userId === 'object' && sr.userId._id === user._id)
          );
          
          return {
            id: user._id,
            fullName: user.name || user.fullName || studentRecord?.fullName || 'Unknown',
            email: user.email,
            phone: user.phone || '',
            address: user.address || '',
            dateOfBirth: user.dateOfBirth || new Date().toISOString(),
            enrollmentDate: user.enrollmentDate || studentRecord?.enrolledDate || new Date().toISOString(),
            level: user.level || studentRecord?.level || 'beginner',
            status: user.status || studentRecord?.status || 'active',
            assignedTeacher: user.assignedTeacher || studentRecord?.assignedTeacher || '',
            paymentStatus: user.paymentStatus || studentRecord?.paymentStatus || 'pending',
            avatar: user.avatar || studentRecord?.avatar || '',
            courses: user.courses || [],
            assignments: user.assignments || [],
            payments: user.payments || [],
            progress: user.progress || { completed: 0, total: 0, percentage: 0 },
            attendance: user.attendance || { present: 0, absent: 0, total: 0 },
            grades: user.grades || [],
            notes: user.notes || []
          };
        });

      const teachersData = users
        .filter((user: any) => user.role === 'teacher')
        .map((user: any) => {
          // Find matching teacher record to get actual data
          const teacherRecord = teacherRecords.find((tr: any) => 
            tr.userId?._id === user._id || 
            tr.userId?._id?.toString() === user._id?.toString() ||
            (tr.userId && typeof tr.userId === 'object' && tr.userId._id === user._id) ||
            tr._id === user._id ||
            tr._id?.toString() === user._id?.toString()
          );
          
          const teacherProfile = user.teacherProfile || teacherRecord || {};
          return {
            id: user._id,
            fullName: user.name || user.fullName || teacherProfile.fullName || teacherRecord?.fullName || 'Unknown',
            email: user.email,
            phone: user.phone || teacherProfile.contact || '',
            contact: user.contact || user.phone || teacherProfile.contact || '',
            address: user.address || '',
            dateOfBirth: user.dateOfBirth || new Date().toISOString(),
            hireDate: user.hireDate || new Date().toISOString(),
            specialization: teacherProfile.specialization || user.specialization || 'General',
            department: user.department || teacherProfile.department || 'General',
            experience: teacherProfile.experience || user.experience || 0,
            salary: teacherProfile.salary || user.salary || 0,
            status: user.status || teacherProfile.status || 'active',
            avatar: user.avatar || teacherProfile.avatar || '',
            location: user.location || teacherProfile.location || 'Unknown',
            courses: user.courses || teacherProfile.courses || [],
            students: user.students || [],
            assignedStudents: teacherRecord?.assignedStudents || teacherProfile.assignedStudents || user.assignedStudents || [],
            performance: user.performance || teacherProfile.performance || { rating: 0, reviews: [] },
            attendance: user.attendance || { present: 0, absent: 0, total: 0 },
            assignments: user.assignments || [],
            payroll: user.payroll || teacherProfile.payroll || { 
              baseSalary: 0, 
              bonuses: 0, 
              deductions: 0, 
              netPay: 0,
              monthlySalary: 0,
              currency: 'USD'
            }
          };
        });

      const adminsData = users
        .filter((user: any) => user.role === 'admin' || user.role === 'superadmin')
        .map((user: any) => ({
          id: user._id,
          fullName: user.name || user.fullName || 'Unknown',
          email: user.email,
          phone: user.phone || '',
          address: user.address || '',
          dateOfBirth: user.dateOfBirth || new Date().toISOString(),
          hireDate: user.hireDate || new Date().toISOString(),
          role: user.role,
          permissions: user.permissions || [],
          status: user.status || 'active',
          avatar: user.avatar || ''
        }));

      console.log('📊 Data separated and mapped:', { students: studentsData.length, teachers: teachersData.length, admins: adminsData.length });

      setStudents(studentsData);
      setTeachers(teachersData);
      setAdmins(adminsData);

    } catch (err) {
      setError('Failed to load data from backend');
      console.error('❌ Error loading data:', err);
      
      // Fallback to localStorage if backend is not available
      console.log('🔄 Falling back to localStorage...');
      const savedStudents = localStorage.getItem('umar_academy_students');
      const savedTeachers = localStorage.getItem('umar_academy_teachers');
      const savedAdmins = localStorage.getItem('umar_academy_admins');

      setStudents(savedStudents ? JSON.parse(savedStudents) : []);
      setTeachers(savedTeachers ? JSON.parse(savedTeachers) : []);
      setAdmins(savedAdmins ? JSON.parse(savedAdmins) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Student operations
  const addStudent = async (student: Student) => {
    try {
      // Create user first
      const userResponse = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: student.fullName,
          email: student.email,
          role: 'student',
          password: 'password123', // Default password for students
          avatar: student.avatar
        }),
      });

      if (!userResponse.ok) {
        throw new Error('Failed to create user');
      }

      const newUser = await userResponse.json();

      // Create student profile
      const studentResponse = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          userId: newUser._id,
          level: 'beginner', // Default level
          paymentStatus: 'pending', // Default payment status
          enrollmentDate: new Date()
        }),
      });

      if (!studentResponse.ok) {
        throw new Error('Failed to create student profile');
      }

      // Update local state
      setStudents(prev => [...prev, { ...student, id: newUser._id }]);
      
      // Also save to localStorage as backup
      const updatedStudents = [...students, { ...student, id: newUser._id }];
      localStorage.setItem('umar_academy_students', JSON.stringify(updatedStudents));

    } catch (err) {
      setError('Failed to add student');
      console.error('Error adding student:', err);
      
      // Fallback to localStorage
      setStudents(prev => [...prev, student]);
      localStorage.setItem('umar_academy_students', JSON.stringify([...students, student]));
    }
  };

  const updateStudent = async (id: string, student: Partial<Student>) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(student),
      });

      if (!response.ok) {
        throw new Error('Failed to update student');
      }

      setStudents(prev => prev.map(s => s.id === id ? { ...s, ...student } : s));
      
      // Update localStorage
      const updatedStudents = students.map(s => s.id === id ? { ...s, ...student } : s);
      localStorage.setItem('umar_academy_students', JSON.stringify(updatedStudents));

    } catch (err) {
      setError('Failed to update student');
      console.error('Error updating student:', err);
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete student');
      }

      setStudents(prev => prev.filter(s => s.id !== id));
      
      // Update localStorage
      const updatedStudents = students.filter(s => s.id !== id);
      localStorage.setItem('umar_academy_students', JSON.stringify(updatedStudents));

    } catch (err) {
      setError('Failed to delete student');
      console.error('Error deleting student:', err);
    }
  };

  // Teacher operations
  const addTeacher = async (teacher: Teacher) => {
    try {
      // Create user first
      const userResponse = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teacher.fullName,
          email: teacher.email,
          role: 'teacher',
          password: 'password123', // Default password for teachers
          avatar: teacher.avatar
        }),
      });

      if (!userResponse.ok) {
        throw new Error('Failed to create user');
      }

      const newUser = await userResponse.json();

      // Create teacher profile
      const teacherResponse = await fetch(`${API_BASE}/teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: teacher.id,
          userId: newUser._id,
          specialization: 'General', // Default specialization
          experience: 0, // Default experience
          salary: 0 // Default salary
        }),
      });

      if (!teacherResponse.ok) {
        const errorText = await teacherResponse.text();
        console.error('Teacher creation failed:', errorText);
        throw new Error(`Failed to create teacher profile: ${errorText}`);
      }

      // Update local state
      setTeachers(prev => [...prev, { ...teacher, id: newUser._id }]);
      
      // Also save to localStorage as backup
      const updatedTeachers = [...teachers, { ...teacher, id: newUser._id }];
      localStorage.setItem('umar_academy_teachers', JSON.stringify(updatedTeachers));

    } catch (err) {
      setError('Failed to add teacher');
      console.error('Error adding teacher:', err);
      
      // Fallback to localStorage
      setTeachers(prev => [...prev, teacher]);
      localStorage.setItem('umar_academy_teachers', JSON.stringify([...teachers, teacher]));
    }
  };

  const updateTeacher = async (id: string, teacher: Partial<Teacher>) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teacher),
      });

      if (!response.ok) {
        throw new Error('Failed to update teacher');
      }

      setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...teacher } : t));
      
      // Update localStorage
      const updatedTeachers = teachers.map(t => t.id === id ? { ...t, ...teacher } : t);
      localStorage.setItem('umar_academy_teachers', JSON.stringify(updatedTeachers));

    } catch (err) {
      setError('Failed to update teacher');
      console.error('Error updating teacher:', err);
    }
  };

  const deleteTeacher = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete teacher');
      }

      setTeachers(prev => prev.filter(t => t.id !== id));
      
      // Update localStorage
      const updatedTeachers = teachers.filter(t => t.id !== id);
      localStorage.setItem('umar_academy_teachers', JSON.stringify(updatedTeachers));

    } catch (err) {
      setError('Failed to delete teacher');
      console.error('Error deleting teacher:', err);
    }
  };

  // Admin operations
  const addAdmin = async (admin: Admin) => {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: admin.fullName,
          email: admin.email,
          role: 'admin', // Default role
          password: 'password123', // Default password for admins
          avatar: admin.avatar
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create admin');
      }

      const newUser = await response.json();
      setAdmins(prev => [...prev, { ...admin, id: newUser._id }]);
      
      // Also save to localStorage as backup
      const updatedAdmins = [...admins, { ...admin, id: newUser._id }];
      localStorage.setItem('umar_academy_admins', JSON.stringify(updatedAdmins));

    } catch (err) {
      setError('Failed to add admin');
      console.error('Error adding admin:', err);
      
      // Fallback to localStorage
      setAdmins(prev => [...prev, admin]);
      localStorage.setItem('umar_academy_admins', JSON.stringify([...admins, admin]));
    }
  };

  const updateAdmin = async (id: string, admin: Partial<Admin>) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(admin),
      });

      if (!response.ok) {
        throw new Error('Failed to update admin');
      }

      setAdmins(prev => prev.map(a => a.id === id ? { ...a, ...admin } : a));
      
      // Update localStorage
      const updatedAdmins = admins.map(a => a.id === id ? { ...a, ...admin } : a);
      localStorage.setItem('umar_academy_admins', JSON.stringify(updatedAdmins));

    } catch (err) {
      setError('Failed to update admin');
      console.error('Error updating admin:', err);
    }
  };

  const deleteAdmin = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete admin');
      }

      setAdmins(prev => prev.filter(a => a.id !== id));
      
      // Update localStorage
      const updatedAdmins = admins.filter(a => a.id !== id);
      localStorage.setItem('umar_academy_admins', JSON.stringify(updatedAdmins));

    } catch (err) {
      setError('Failed to delete admin');
      console.error('Error deleting admin:', err);
    }
  };

  // Helper functions
  const getStudentsByTeacher = (teacherId: string) => {
    console.log('🔍 getStudentsByTeacher called with teacherId:', teacherId);
    
    // Find the teacher to get their assignedStudents array
    const teacher = teachers.find(t => t.id === teacherId || (t as any)._id === teacherId);
    if (!teacher) {
      console.log('🔍 Teacher not found for ID:', teacherId);
      return [];
    }
    
    const teacherName = teacher.fullName?.trim() || '';
    const assignedStudentIds = (teacher as any).assignedStudents || [];
    
    console.log('🔍 Teacher found:', teacherName, 'assignedStudents:', assignedStudentIds);
    
    // Filter students by checking multiple criteria
    const filteredStudents = students.filter(student => {
      const studentId = student.id || (student as any)._id;
      const userId = (student as any).userId?._id || (student as any).userId?.toString();
      const assignedTeacher = (student.assignedTeacher || (student as any).assignedTeacher || '').trim();
      
      // Check 1: If student ID or user ID is in teacher's assignedStudents array
      const isAssignedById = assignedStudentIds.some((assignedId: string) => {
        const assignedIdStr = assignedId?.toString();
        return assignedIdStr === studentId?.toString() || 
               assignedIdStr === userId?.toString() ||
               assignedIdStr === (student as any)._id?.toString();
      });
      
      // Check 2: If student's assignedTeacher field matches teacher's name (handle trailing spaces)
      const hasAssignedTeacher = assignedTeacher === teacherName || 
                                 assignedTeacher === teacher.fullName?.trim() ||
                                 assignedTeacher === teacherId ||
                                 (teacherName && assignedTeacher.toLowerCase() === teacherName.toLowerCase());
      
      // Check 3: If student's assignedTeacher field matches teacher ID (if stored as ID)
      const hasAssignedTeacherId = assignedTeacher === teacherId ||
                                   (student as any).assignedTeacherId === teacherId;
      
      const matches = isAssignedById || hasAssignedTeacher || hasAssignedTeacherId;
      
      if (matches) {
        console.log('✅ Student matched:', student.fullName || (student as any).fullName, 
          '- assignedTeacher:', assignedTeacher, 
          '- teacherName:', teacherName,
          '- isAssignedById:', isAssignedById,
          '- hasAssignedTeacher:', hasAssignedTeacher);
      }
      
      return matches;
    });
    
    console.log('🔍 Filtered students for teacher:', filteredStudents.length, filteredStudents.map(s => s.fullName || (s as any).fullName));
    return filteredStudents;
  };

  const getTeacherById = (id: string) => {
    return teachers.find(teacher => teacher.id === id);
  };

  const getStudentByEmail = (email: string) => {
    return students.find(student => student.email === email);
  };

  const refreshData = async () => {
    await loadData();
  };

  // Assignment management functions
  const addAssignment = async (assignment: any) => {
    try {
      const response = await fetch(`${API_BASE}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create assignment');
      }
      
      const newAssignment = await response.json();
      // Map _id to id for consistency
      const mappedAssignment = {
        ...newAssignment,
        id: newAssignment._id || newAssignment.id
      };
      setAssignments(prev => [...prev, mappedAssignment]);
    } catch (error) {
      console.error('Error adding assignment:', error);
      throw error;
    }
  };

  const updateAssignment = async (id: string, assignment: any) => {
    try {
      const response = await fetch(`${API_BASE}/assignments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update assignment');
      }
      
      setAssignments(prev => prev.map(a => {
        const aId = a._id || a.id;
        return aId === id ? { ...a, ...assignment } : a;
      }));
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/assignments/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete assignment');
      }
      
      setAssignments(prev => prev.filter(a => {
        const aId = a._id || a.id;
        return aId !== id;
      }));
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  };

  const addAssignmentSubmission = async (assignmentId: string, submission: any) => {
    try {
      if (!assignmentId) {
        throw new Error('Assignment ID is required');
      }
      
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Submission error response:', errorText);
        throw new Error('Failed to submit assignment');
      }
      
      const savedSubmission = await response.json();
      
      // Update the assignment with the new submission
      setAssignments(prev => prev.map(a => {
        const aId = a._id || a.id;
        return aId === assignmentId 
          ? { ...a, submissions: [...(a.submissions || []), savedSubmission] }
          : a;
      }));
    } catch (error) {
      console.error('Error submitting assignment:', error);
      throw error;
    }
  };

  // Recitation Review Functions
  const addRecitationReview = async (review: RecitationReview) => {
    try {
      const response = await fetch(`${API_BASE}/recitation-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit recitation review');
      }
      
      const newReview = await response.json();
      setRecitationReviews(prev => [...prev, newReview]);
      
      // Refresh notifications after new review
      const notificationsResponse = await fetch(`${API_BASE}/admin-notifications`);
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setAdminNotifications(notificationsData);
      }
      
      await refreshData(); // Refresh all data
    } catch (error) {
      console.error('Error submitting recitation review:', error);
      throw error;
    }
  };

  const updateRecitationReview = async (id: string, review: Partial<RecitationReview>) => {
    try {
      const response = await fetch(`${API_BASE}/recitation-reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update recitation review');
      }
      
      const updatedReview = await response.json();
      setRecitationReviews(prev => prev.map(r => (r.id === id || r.id === updatedReview._id) ? updatedReview : r));
    } catch (error) {
      console.error('Error updating recitation review:', error);
      throw error;
    }
  };

  const convertRecitationReviewToAssignment = async (reviewId: string) => {
    try {
      const response = await fetch(`${API_BASE}/recitation-reviews/${reviewId}/convert-to-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to convert recitation review to assignment');
      }
      
      const assignment = await response.json();
      setAssignments(prev => [...prev, assignment]);
      
      // Update review status
      await updateRecitationReview(reviewId, { 
        status: 'converted_to_assignment',
        convertedToAssignmentId: assignment._id || assignment.id
      });
      
      // Refresh notifications and data
      const notificationsResponse = await fetch(`${API_BASE}/admin-notifications`);
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setAdminNotifications(notificationsData);
      }
      
      await refreshData();
      
      return assignment;
    } catch (error) {
      console.error('Error converting recitation review:', error);
      throw error;
    }
  };

  // Notification Functions
  const refreshNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin-notifications`);
      if (response.ok) {
        const notifications = await response.json();
        setAdminNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin-notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      const updatedNotification = await response.json();
      setAdminNotifications(prev => prev.map(n => 
        (n.id === notificationId || n.id === updatedNotification._id) ? updatedNotification : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin-notifications/read-all`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  // Ticket Functions
  const addTicket = async (ticket: AssignmentTicket) => {
    try {
      const response = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }
      
      const newTicket = await response.json();
      // Map MongoDB _id to id for consistency
      const mappedTicket = {
        ...newTicket,
        id: newTicket._id || newTicket.id,
        createdAt: newTicket.createdAt ? new Date(newTicket.createdAt) : new Date(),
        updatedAt: newTicket.updatedAt ? new Date(newTicket.updatedAt) : new Date()
      };
      setTickets(prev => [...prev, mappedTicket]);
      await refreshData();
      return mappedTicket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  };

  const updateTicket = async (id: string, ticket: Partial<AssignmentTicket>) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update ticket');
      }
      
      const updatedTicket = await response.json();
      // Map MongoDB _id to id for consistency
      const mappedTicket = {
        ...updatedTicket,
        id: updatedTicket._id || updatedTicket.id,
        createdAt: updatedTicket.createdAt ? new Date(updatedTicket.createdAt) : new Date(),
        updatedAt: updatedTicket.updatedAt ? new Date(updatedTicket.updatedAt) : new Date(),
        reviewedAt: updatedTicket.reviewedAt ? new Date(updatedTicket.reviewedAt) : undefined,
        completedAt: updatedTicket.completedAt ? new Date(updatedTicket.completedAt) : undefined
      };
      setTickets(prev => prev.map(t => 
        (t.id === id || t.id === updatedTicket._id || (t as any)._id === updatedTicket._id) ? mappedTicket : t
      ));
      
      await refreshNotifications();
      await refreshData();
      
      return mappedTicket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };

  const assignTicketToNextTeacher = async (ticketId: string, teacherId: string, teacherName: string) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/assign-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTeacherId: teacherId, assignedTeacherName: teacherName })
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign ticket to next teacher');
      }
      
      const newTicket = await response.json();
      // Map MongoDB _id to id for consistency
      const mappedTicket = {
        ...newTicket,
        id: newTicket._id || newTicket.id,
        createdAt: newTicket.createdAt ? new Date(newTicket.createdAt) : new Date(),
        updatedAt: newTicket.updatedAt ? new Date(newTicket.updatedAt) : new Date()
      };
      setTickets(prev => [...prev, mappedTicket]);
      await refreshData();
      return mappedTicket;
    } catch (error) {
      console.error('Error assigning ticket to next teacher:', error);
      throw error;
    }
  };

  const approveTicket = async (ticketId: string, reviewedBy: string) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy })
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve ticket');
      }
      
      const result = await response.json();
      await refreshData();
      return result;
    } catch (error) {
      console.error('Error approving ticket:', error);
      throw error;
    }
  };

  const assignTicketToNext = async (ticketId: string, teacherId: string, teacherName: string) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/assign-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignedTeacherId: teacherId,
          assignedTeacherName: teacherName
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign ticket to next teacher');
      }
      
      const result = await response.json();
      await refreshData();
      return result;
    } catch (error) {
      console.error('Error assigning ticket to next teacher:', error);
      throw error;
    }
  };

  const approveAndAdvanceTicket = async (ticketId: string, reviewedBy: string, nextTeacherId?: string, nextTeacherName?: string) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/approve-and-advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reviewedBy,
          nextTeacherId,
          nextTeacherName
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve and advance ticket');
      }
      
      const result = await response.json();
      await refreshData();
      return result;
    } catch (error) {
      console.error('Error approving and advancing ticket:', error);
      throw error;
    }
  };

  const finalizeTicket = async (ticketId: string, data: { finalReport: string; homework: string; homeworkLink?: string; reviewedBy: string }) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to finalize ticket');
      }
      
      const result = await response.json();
      
      // Update ticket and add assignment
      setTickets(prev => prev.map(t => 
        t.id === ticketId || t.id === result.ticket._id ? result.ticket : t
      ));
      setAssignments(prev => [...prev, result.assignment]);
      
      await refreshData();
      return result;
    } catch (error) {
      console.error('Error finalizing ticket:', error);
      throw error;
    }
  };

  // Get student's personal Mushaf (all historical mistakes)
  const getStudentPersonalMushaf = async (studentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/students/${studentId}/personal-mushaf`);
      if (!response.ok) {
        throw new Error('Failed to fetch personal Mushaf');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching personal Mushaf:', error);
      return { studentId, studentName: '', mistakes: [] };
    }
  };

  // Get student's personal Mushaf mistakes filtered by page/surah/ayah
  const getStudentPersonalMushafFiltered = async (studentId: string, filters?: { page?: number; surah?: number; ayah?: number }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.surah) params.append('surah', filters.surah.toString());
      if (filters?.ayah) params.append('ayah', filters.ayah.toString());
      
      const url = `${API_BASE}/students/${studentId}/personal-mushaf/filter${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch filtered personal Mushaf');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching filtered personal Mushaf:', error);
      return { mistakes: [] };
    }
  };

  const value: BackendDataContextType = {
    students,
    teachers,
    admins,
    addStudent,
    addTeacher,
    addAdmin,
    updateStudent,
    updateTeacher,
    updateAdmin,
    deleteStudent,
    deleteTeacher,
    deleteAdmin,
    getStudentsByTeacher,
    getTeacherById,
    getStudentByEmail,
    loading,
    error,
    refreshData,
    assignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    addAssignmentSubmission,
    recitationReviews,
    addRecitationReview,
    updateRecitationReview,
    convertRecitationReviewToAssignment,
    adminNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshNotifications,
    tickets,
    addTicket,
    updateTicket,
    assignTicketToNextTeacher,
    approveTicket,
    assignTicketToNext,
    approveAndAdvanceTicket,
    finalizeTicket,
    getStudentPersonalMushaf,
    getStudentPersonalMushafFiltered
  };

  return (
    <BackendDataContext.Provider value={value}>
      {children}
    </BackendDataContext.Provider>
  );
};
