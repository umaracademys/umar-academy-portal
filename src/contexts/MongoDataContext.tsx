import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, Teacher, Admin } from '../types';

interface MongoDataContextType {
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
}

const MongoDataContext = createContext<MongoDataContextType | undefined>(undefined);

export const useMongoData = () => {
  const context = useContext(MongoDataContext);
  if (!context) {
    throw new Error('useMongoData must be used within a MongoDataProvider');
  }
  return context;
};

// API base URL - you'll need to create a backend API
const API_BASE = 'http://localhost:3001/api';

export const MongoDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from MongoDB via API
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, we'll use localStorage as fallback
      // TODO: Replace with actual API calls to your backend
      const savedStudents = localStorage.getItem('umar_academy_students');
      const savedTeachers = localStorage.getItem('umar_academy_teachers');
      const savedAdmins = localStorage.getItem('umar_academy_admins');

      setStudents(savedStudents ? JSON.parse(savedStudents) : []);
      setTeachers(savedTeachers ? JSON.parse(savedTeachers) : []);
      setAdmins(savedAdmins ? JSON.parse(savedAdmins) : []);

    } catch (err) {
      setError('Failed to load data');
      console.error('Error loading data:', err);
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
      setStudents(prev => [...prev, student]);
      localStorage.setItem('umar_academy_students', JSON.stringify([...students, student]));
      // TODO: Add API call to save to MongoDB
    } catch (err) {
      setError('Failed to add student');
      console.error('Error adding student:', err);
    }
  };

  const updateStudent = async (id: string, student: Partial<Student>) => {
    try {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, ...student } : s));
      const updatedStudents = students.map(s => s.id === id ? { ...s, ...student } : s);
      localStorage.setItem('umar_academy_students', JSON.stringify(updatedStudents));
      // TODO: Add API call to update in MongoDB
    } catch (err) {
      setError('Failed to update student');
      console.error('Error updating student:', err);
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      setStudents(prev => prev.filter(s => s.id !== id));
      const updatedStudents = students.filter(s => s.id !== id);
      localStorage.setItem('umar_academy_students', JSON.stringify(updatedStudents));
      // TODO: Add API call to delete from MongoDB
    } catch (err) {
      setError('Failed to delete student');
      console.error('Error deleting student:', err);
    }
  };

  // Teacher operations
  const addTeacher = async (teacher: Teacher) => {
    try {
      setTeachers(prev => [...prev, teacher]);
      localStorage.setItem('umar_academy_teachers', JSON.stringify([...teachers, teacher]));
      // TODO: Add API call to save to MongoDB
    } catch (err) {
      setError('Failed to add teacher');
      console.error('Error adding teacher:', err);
    }
  };

  const updateTeacher = async (id: string, teacher: Partial<Teacher>) => {
    try {
      setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...teacher } : t));
      const updatedTeachers = teachers.map(t => t.id === id ? { ...t, ...teacher } : t);
      localStorage.setItem('umar_academy_teachers', JSON.stringify(updatedTeachers));
      // TODO: Add API call to update in MongoDB
    } catch (err) {
      setError('Failed to update teacher');
      console.error('Error updating teacher:', err);
    }
  };

  const deleteTeacher = async (id: string) => {
    try {
      setTeachers(prev => prev.filter(t => t.id !== id));
      const updatedTeachers = teachers.filter(t => t.id !== id);
      localStorage.setItem('umar_academy_teachers', JSON.stringify(updatedTeachers));
      // TODO: Add API call to delete from MongoDB
    } catch (err) {
      setError('Failed to delete teacher');
      console.error('Error deleting teacher:', err);
    }
  };

  // Admin operations
  const addAdmin = async (admin: Admin) => {
    try {
      setAdmins(prev => [...prev, admin]);
      localStorage.setItem('umar_academy_admins', JSON.stringify([...admins, admin]));
      // TODO: Add API call to save to MongoDB
    } catch (err) {
      setError('Failed to add admin');
      console.error('Error adding admin:', err);
    }
  };

  const updateAdmin = async (id: string, admin: Partial<Admin>) => {
    try {
      setAdmins(prev => prev.map(a => a.id === id ? { ...a, ...admin } : a));
      const updatedAdmins = admins.map(a => a.id === id ? { ...a, ...admin } : a);
      localStorage.setItem('umar_academy_admins', JSON.stringify(updatedAdmins));
      // TODO: Add API call to update in MongoDB
    } catch (err) {
      setError('Failed to update admin');
      console.error('Error updating admin:', err);
    }
  };

  const deleteAdmin = async (id: string) => {
    try {
      setAdmins(prev => prev.filter(a => a.id !== id));
      const updatedAdmins = admins.filter(a => a.id !== id);
      localStorage.setItem('umar_academy_admins', JSON.stringify(updatedAdmins));
      // TODO: Add API call to delete from MongoDB
    } catch (err) {
      setError('Failed to delete admin');
      console.error('Error deleting admin:', err);
    }
  };

  // Helper functions
  const getStudentsByTeacher = (teacherId: string) => {
    return students.filter(student => student.teacherId === teacherId);
  };

  const getTeacherById = (id: string) => {
    return teachers.find(teacher => teacher.id === id);
  };

  const getStudentByEmail = (email: string) => {
    return students.find(student => student.email === email);
  };

  const value: MongoDataContextType = {
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
    error
  };

  return (
    <MongoDataContext.Provider value={value}>
      {children}
    </MongoDataContext.Provider>
  );
};






