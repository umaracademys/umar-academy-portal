import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  isDeveloperAccount,
  maskStudent,
  maskTeacher,
  maskUser,
  maskStudents,
  maskTeachers,
  maskAssignment,
  applyMaskingIfNeeded,
} from '../utils/dataMasking';

/**
 * Hook to apply data masking for developer accounts
 */
export const useDataMasking = () => {
  const { user } = useAuth();
  const isDeveloper = useMemo(() => isDeveloperAccount(user), [user]);

  const maskStudentData = (student: any, index: number = 0) => {
    if (!isDeveloper) return student;
    return maskStudent(student, index);
  };

  const maskTeacherData = (teacher: any, index: number = 0) => {
    if (!isDeveloper) return teacher;
    return maskTeacher(teacher, index);
  };

  const maskUserData = (userData: any, index: number = 0) => {
    if (!isDeveloper) return userData;
    return maskUser(userData, index);
  };

  const maskStudentsData = (students: any[]) => {
    if (!isDeveloper) return students;
    return maskStudents(students);
  };

  const maskTeachersData = (teachers: any[]) => {
    if (!isDeveloper) return teachers;
    return maskTeachers(teachers);
  };

  const maskAssignmentData = (assignment: any, studentIndex: number = 0) => {
    if (!isDeveloper) return assignment;
    return maskAssignment(assignment, studentIndex);
  };

  return {
    isDeveloper,
    maskStudentData,
    maskTeacherData,
    maskUserData,
    maskStudentsData,
    maskTeachersData,
    maskAssignmentData,
    applyMaskingIfNeeded,
  };
};

