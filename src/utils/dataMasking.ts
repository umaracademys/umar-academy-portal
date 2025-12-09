/**
 * Data Masking Utility
 * Masks personal information for developer/test accounts to protect user privacy
 */

interface MaskingOptions {
  maskNames?: boolean;
  maskEmails?: boolean;
  maskPhones?: boolean;
  maskAddresses?: boolean;
  preserveStructure?: boolean; // Keep data structure but mask values
}

const defaultOptions: MaskingOptions = {
  maskNames: true,
  maskEmails: true,
  maskPhones: true,
  maskAddresses: true,
  preserveStructure: true,
};

/**
 * Generate a masked name
 */
const maskName = (original: string, index: number = 0): string => {
  const names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma', 'Robert', 'Olivia'];
  const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore'];
  
  const nameIndex = index % names.length;
  const surnameIndex = Math.floor(index / names.length) % surnames.length;
  
  return `${names[nameIndex]} ${surnames[surnameIndex]}`;
};

/**
 * Generate a masked email
 */
const maskEmail = (original: string, index: number = 0): string => {
  const domains = ['example.com', 'test.com', 'demo.org', 'sample.net'];
  const domainIndex = index % domains.length;
  return `user${index + 1}@${domains[domainIndex]}`;
};

/**
 * Generate a masked phone number
 */
const maskPhone = (original: string, index: number = 0): string => {
  // Format: (555) 000-XXXX where XXXX is based on index
  const lastFour = String(index + 1000).padStart(4, '0');
  return `(555) 000-${lastFour}`;
};

/**
 * Mask a string value
 */
const maskString = (value: string, type: 'name' | 'email' | 'phone', index: number): string => {
  if (!value || typeof value !== 'string') return value;
  
  switch (type) {
    case 'name':
      return maskName(value, index);
    case 'email':
      return maskEmail(value, index);
    case 'phone':
      return maskPhone(value, index);
    default:
      return value;
  }
};

/**
 * Mask student data
 */
export const maskStudent = (student: any, index: number = 0, options: MaskingOptions = defaultOptions): any => {
  if (!student) return student;
  
  const masked = { ...student };
  
  if (options.maskNames) {
    if (masked.fullName) masked.fullName = maskName(masked.fullName, index);
    if (masked.parentName) masked.parentName = maskName(masked.parentName, index + 1000);
  }
  
  if (options.maskEmails && masked.email) {
    masked.email = maskEmail(masked.email, index);
  }
  
  if (options.maskPhones && masked.contact) {
    masked.contact = maskPhone(masked.contact, index);
  }
  
  if (options.maskAddresses) {
    if (masked.address) masked.address = `123 Test Street, City ${index + 1}, State 12345`;
  }
  
  return masked;
};

/**
 * Mask teacher data
 */
export const maskTeacher = (teacher: any, index: number = 0, options: MaskingOptions = defaultOptions): any => {
  if (!teacher) return teacher;
  
  const masked = { ...teacher };
  
  if (options.maskNames && masked.fullName) {
    masked.fullName = maskName(masked.fullName, index);
  }
  
  if (options.maskEmails && masked.email) {
    masked.email = maskEmail(masked.email, index);
  }
  
  if (options.maskPhones && masked.contact) {
    masked.contact = maskPhone(masked.contact, index);
  }
  
  if (options.maskAddresses && masked.address) {
    masked.address = `456 Demo Avenue, City ${index + 1}, State 54321`;
  }
  
  return masked;
};

/**
 * Mask user/admin data
 */
export const maskUser = (user: any, index: number = 0, options: MaskingOptions = defaultOptions): any => {
  if (!user) return user;
  
  const masked = { ...user };
  
  if (options.maskNames && masked.name) {
    masked.name = maskName(masked.name, index);
  }
  
  if (options.maskEmails && masked.email) {
    masked.email = maskEmail(masked.email, index);
  }
  
  return masked;
};

/**
 * Mask an array of students
 */
export const maskStudents = (students: any[], options: MaskingOptions = defaultOptions): any[] => {
  return students.map((student, index) => maskStudent(student, index, options));
};

/**
 * Mask an array of teachers
 */
export const maskTeachers = (teachers: any[], options: MaskingOptions = defaultOptions): any[] => {
  return teachers.map((teacher, index) => maskTeacher(teacher, index, options));
};

/**
 * Mask assignment data (may contain student/teacher references)
 */
export const maskAssignment = (assignment: any, studentIndex: number = 0, options: MaskingOptions = defaultOptions): any => {
  if (!assignment) return assignment;
  
  const masked = { ...assignment };
  
  // Mask assignedByName if present
  if (options.maskNames && masked.assignedByName) {
    masked.assignedByName = maskName(masked.assignedByName, studentIndex);
  }
  
  return masked;
};

/**
 * Check if current user is a developer/test account
 */
export const isDeveloperAccount = (user: any): boolean => {
  if (!user) return false;
  
  // Check for developer role or test account flag
  const email = (user.email || '').toLowerCase();
  const role = (user.role || '').toLowerCase();
  
  return (
    role === 'developer' ||
    role === 'test' ||
    email.includes('@developer') ||
    email.includes('@test') ||
    email.includes('@demo') ||
    (user as any).isDeveloper === true ||
    (user as any).isTestAccount === true
  );
};

/**
 * Apply masking to data if user is a developer
 */
export const applyMaskingIfNeeded = <T>(data: T, user: any, maskFn: (item: any, index: number) => any): T => {
  if (!isDeveloperAccount(user)) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map((item, index) => maskFn(item, index)) as T;
  }
  
  return maskFn(data, 0) as T;
};

