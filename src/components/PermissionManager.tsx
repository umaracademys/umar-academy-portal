import React, { useEffect, useMemo, useState } from 'react';
import {
  Teacher,
  Admin,
  TeacherPermissions,
  AdminPermissions,
} from '../types';
import { useData } from '../contexts/DataContext';
import { 
  ALL_TEACHER_PERMISSIONS, 
  ALL_ADMIN_PERMISSIONS,
  TeacherPermissionKey,
  AdminPermissionKey,
  PERMISSION_MAP,
  PermissionDefinition as SharedPermissionDefinition
} from '../shared/permissions';

type PermissionManagerDefinition<K extends string> = {
  key: K;
  label: string;
  description: string;
  group: string;
  icon?: string;
  helper?: string;
  defaultView?: boolean;
  risk?: 'low' | 'medium' | 'high';
  order?: number;
};

// SIMPLIFIED: Only show core permission groups
const TEACHER_PERMISSION_GROUP_METADATA: Record<
  string,
  { icon: string; description: string }
> = {
  'Homework Module': {
    icon: '📚',
    description:
      'Manage homework creation, grading, and submission review permissions.',
  },
  'Assignments Module': {
    icon: '📋',
    description:
      'Control assignment creation, editing, and deletion capabilities.',
  },
  'Tickets Module': {
    icon: '🎫',
    description:
      'Manage ticket-based recitation workflow access and review permissions.',
  },
  'Messages Module': {
    icon: '💌',
    description:
      'Manage access to messaging system for teacher-student and teacher-parent communication.',
  },
};

// SIMPLIFIED: Only show core permission groups for admins
const ADMIN_PERMISSION_GROUP_METADATA: Record<
  string,
  { icon: string; description: string }
> = {
  'People Operations': {
    icon: '👥',
    description:
      'Manage students and teachers - create, update, and manage accounts.',
  },
  'Homework Module': {
    icon: '📚',
    description:
      'Manage homework system access and view all homework submissions.',
  },
  'Assignments Module': {
    icon: '📋',
    description:
      'Control assignment management and system-wide assignment capabilities.',
  },
  'Tickets Module': {
    icon: '🎫',
    description:
      'Manage ticket workflow, creation, review, and finalization permissions.',
  },
  'Messages Module': {
    icon: '💌',
    description:
      'Manage messaging system access, moderation, and oversight capabilities.',
  },
  'Attendance Module': {
    icon: '📅',
    description:
      'Manage teacher attendance recording, viewing, and reporting permissions.',
  },
};

/**
 * Phase 4: Convert shared permissions to PermissionManager format
 * Maps modules to groups and adds UI metadata
 */
function mapModuleToGroup(module: string): string {
  const moduleToGroupMap: Record<string, string> = {
    'assessments': 'Assessments & Grading',
    'evaluations': 'Progress & Evaluations',
    'scheduling': 'Scheduling & Logistics',
    'financial': 'Finance & Billing',
    'communication': 'Family Communication',
    'student-info': 'Student Information',
    'messages': 'Messages Module',
    'pdf': 'PDF Module',
    'homework': 'Homework Module',
    'tickets': 'Tickets Module',
    'attendance': 'Attendance Module',
    'recordings': 'Recordings Module',
    'mushaf': 'Mushaf Module',
    'qaidah': 'Qaidah Module',
    'assignments': 'Assignments Module',
    'student-assignment': 'People Operations',
    'notifications': 'Notifications Module',
    'reports': 'Reports & Analytics',
    'people': 'People Operations',
    'security': 'Security & Governance',
  };
  return moduleToGroupMap[module] || 'Other';
}

/**
 * SIMPLIFIED: Only show core permissions
 * Student, Teacher, Homework, Assignment, Ticket, Message, Attendance
 */
const CORE_TEACHER_PERMISSION_KEYS = [
  // Student Information
  'canViewStudentPersonalInfo',
  // Homework
  'canAccessHomework',
  'canCreateHomework',
  'canGradeHomework',
  'canViewHomeworkSubmissions',
  // Assignment
  'canAccessAssignments',
  'canCreateAssignments',
  'canEditAssignments',
  'canDeleteAssignments',
  // Ticket
  'canAccessTickets',
  'canCreateTickets',
  'canReviewTickets',
  'canApproveTickets',
  // Message
  'canAccessMessages',
  'canSendMessages',
  'canViewAllMessages',
  // Attendance
  'canAccessAttendance',
  'canRecordAttendance',
  'canViewAttendanceReports',
];

const CORE_ADMIN_PERMISSION_KEYS = [
  // Student & Teacher Management
  'canManageStudents',
  'canManageTeachers',
  // Homework
  'canAccessHomework',
  'canManageHomework',
  'canViewAllHomework',
  // Assignment
  'canAccessAssignments',
  'canManageAssignments',
  // Ticket
  'canAccessTickets',
  'canCreateTickets',
  'canReviewTickets',
  'canApproveTickets',
  // Message
  'canAccessMessages',
  'canViewAllMessages',
  'canModerateMessages',
  // Attendance
  'canAccessAttendance',
  'canManageAttendance',
  'canViewAttendanceReports',
];

// Filter to only show core permissions for teachers
const TEACHER_PERMISSION_DEFINITIONS = ALL_TEACHER_PERMISSIONS
  .filter(perm => CORE_TEACHER_PERMISSION_KEYS.includes(perm.key))
  .map((perm, index) => ({
    key: perm.key as TeacherPermissionKey,
    label: perm.label,
    description: perm.description || '',
    group: mapModuleToGroup(perm.module),
    icon: '🔑',
    defaultView: perm.defaultTeacher,
    risk: perm.risk,
    order: index + 1,
  }));

// Legacy TEACHER_PERMISSION_DEFINITIONS (replaced above) - keeping for reference:
const _LEGACY_TEACHER_PERMISSION_DEFINITIONS = [
  {
    key: 'canViewAssessments',
    label: 'View assessments',
    description: 'See assessment results, grading history, and teacher notes.',
    group: 'Assessments & Grading',
    icon: '👁️',
    defaultView: true,
    order: 1,
  },
  {
    key: 'canEditAssessments',
    label: 'Edit assessments',
    description: 'Create, modify, and delete assessment entries.',
    group: 'Assessments & Grading',
    icon: '✏️',
    risk: 'medium',
    order: 2,
  },
  {
    key: 'canViewEvaluations',
    label: 'View evaluations',
    description: 'Review long-term progress logs and qualitative feedback.',
    group: 'Progress & Evaluations',
    icon: '📄',
    defaultView: true,
    order: 3,
  },
  {
    key: 'canEditEvaluations',
    label: 'Edit evaluations',
    description: 'Log new evaluations or update existing progress records.',
    group: 'Progress & Evaluations',
    icon: '🛠️',
    risk: 'medium',
    order: 4,
  },
  {
    key: 'canManageSchedule',
    label: 'Manage schedules',
    description: 'Adjust assigned slots, classes, and daily recitation timings.',
    group: 'Scheduling & Logistics',
    icon: '🗂️',
    risk: 'medium',
    order: 5,
  },
  {
    key: 'canViewFinancials',
    label: 'View student financials',
    description: 'Access tuition balances, invoices, and payment history.',
    group: 'Finance & Billing',
    icon: '💳',
    risk: 'high',
    order: 6,
  },
  {
    key: 'canContactParents',
    label: 'Contact parents/guardians',
    description: 'Send messages or alerts to guardians from within the portal.',
    helper: 'Recommended for homeroom or lead teachers only.',
    group: 'Family Communication',
    icon: '📨',
    defaultView: true,
    order: 7,
  },
  {
    key: 'canViewStudentEmail',
    label: 'View student email',
    description: 'See student email addresses in student profiles and lists.',
    group: 'Student Information',
    icon: '📧',
    defaultView: true,
    risk: 'medium',
    order: 8,
  },
  {
    key: 'canViewStudentContact',
    label: 'View student contact',
    description: 'See student phone numbers and contact information.',
    group: 'Student Information',
    icon: '📱',
    defaultView: true,
    risk: 'medium',
    order: 9,
  },
  {
    key: 'canViewStudentPersonalInfo',
    label: 'View personal information',
    description: 'See parent names, siblings, and other personal student details.',
    group: 'Student Information',
    icon: '🔒',
    defaultView: true,
    risk: 'medium',
    order: 10,
  },
  // Messages Module
  {
    key: 'canAccessMessages',
    label: 'Access messages',
    description: 'View and access the messaging system.',
    group: 'Messages Module',
    icon: '💌',
    defaultView: true,
    order: 11,
  },
  {
    key: 'canSendMessages',
    label: 'Send messages',
    description: 'Send messages to students and parents.',
    group: 'Messages Module',
    icon: '📤',
    defaultView: true,
    order: 12,
  },
  {
    key: 'canViewAllMessages',
    label: 'View all messages',
    description: 'View messages from all conversations (not just assigned students).',
    group: 'Messages Module',
    icon: '👁️',
    risk: 'medium',
    order: 13,
  },
  // PDF Module
  {
    key: 'canAccessPdf',
    label: 'Access PDF documents',
    description: 'View and access PDF documents.',
    group: 'PDF Module',
    icon: '📄',
    defaultView: true,
    order: 14,
  },
  {
    key: 'canUploadPdf',
    label: 'Upload PDF documents',
    description: 'Upload new PDF documents to the library.',
    group: 'PDF Module',
    icon: '⬆️',
    risk: 'medium',
    order: 15,
  },
  {
    key: 'canAnnotatePdf',
    label: 'Annotate PDF documents',
    description: 'Add annotations and markings to PDF documents.',
    group: 'PDF Module',
    icon: '✏️',
    defaultView: true,
    order: 16,
  },
  {
    key: 'canViewPdfAnnotations',
    label: 'View PDF annotations',
    description: 'View annotations made by other users on PDF documents.',
    group: 'PDF Module',
    icon: '👁️',
    defaultView: true,
    order: 17,
  },
  // Homework Module
  {
    key: 'canAccessHomework',
    label: 'Access homework',
    description: 'View and access homework assignments.',
    group: 'Homework Module',
    icon: '📚',
    defaultView: true,
    order: 18,
  },
  {
    key: 'canCreateHomework',
    label: 'Create homework',
    description: 'Create new homework assignments for students.',
    group: 'Homework Module',
    icon: '➕',
    defaultView: true,
    order: 19,
  },
  {
    key: 'canGradeHomework',
    label: 'Grade homework',
    description: 'Grade and provide feedback on homework submissions.',
    group: 'Homework Module',
    icon: '✅',
    defaultView: true,
    order: 20,
  },
  {
    key: 'canViewHomeworkSubmissions',
    label: 'View homework submissions',
    description: 'View all homework submissions from students.',
    group: 'Homework Module',
    icon: '📥',
    defaultView: true,
    order: 21,
  },
  // Evaluation Module
  {
    key: 'canAccessEvaluations',
    label: 'Access evaluations',
    description: 'View and access evaluation system.',
    group: 'Evaluation Module',
    icon: '✅',
    defaultView: true,
    order: 22,
  },
  {
    key: 'canCreateEvaluations',
    label: 'Create evaluations',
    description: 'Create new evaluation forms and questions.',
    group: 'Evaluation Module',
    icon: '📝',
    risk: 'medium',
    order: 23,
  },
  {
    key: 'canReviewEvaluations',
    label: 'Review evaluations',
    description: 'Review submitted evaluations from teachers.',
    group: 'Evaluation Module',
    icon: '🔍',
    risk: 'medium',
    order: 24,
  },
  {
    key: 'canApproveEvaluations',
    label: 'Approve evaluations',
    description: 'Approve or reject submitted evaluations.',
    group: 'Evaluation Module',
    icon: '✓',
    risk: 'high',
    order: 25,
  },
  // Tickets Module
  {
    key: 'canAccessTickets',
    label: 'Access tickets',
    description: 'View and access ticket-based workflow system.',
    group: 'Tickets Module',
    icon: '🎫',
    defaultView: true,
    order: 26,
  },
  {
    key: 'canCreateTickets',
    label: 'Create tickets',
    description: 'Create new tickets for recitation review workflow.',
    group: 'Tickets Module',
    icon: '➕',
    defaultView: true,
    risk: 'medium',
    order: 27,
  },
  {
    key: 'canReviewTickets',
    label: 'Review tickets',
    description: 'Review submitted tickets from teachers.',
    group: 'Tickets Module',
    icon: '🔍',
    defaultView: true,
    order: 28,
  },
  {
    key: 'canApproveTickets',
    label: 'Approve tickets',
    description: 'Approve tickets and move them to next workflow step.',
    group: 'Tickets Module',
    icon: '✓',
    defaultView: true,
    risk: 'medium',
    order: 29,
  },
  {
    key: 'canFinalizeTickets',
    label: 'Finalize tickets',
    description: 'Finalize tickets and convert them to assignments.',
    group: 'Tickets Module',
    icon: '🏁',
    risk: 'high',
    order: 30,
  },
  // Attendance Module
  {
    key: 'canAccessAttendance',
    label: 'Access attendance',
    description: 'View and access attendance system.',
    group: 'Attendance Module',
    icon: '📅',
    defaultView: true,
    order: 31,
  },
  {
    key: 'canRecordAttendance',
    label: 'Record attendance',
    description: 'Record attendance for students or teachers.',
    group: 'Attendance Module',
    icon: '✏️',
    defaultView: true,
    order: 32,
  },
  {
    key: 'canViewAttendanceReports',
    label: 'View attendance reports',
    description: 'View attendance reports and statistics.',
    group: 'Attendance Module',
    icon: '📊',
    defaultView: true,
    order: 33,
  },
  // Recordings Module
  {
    key: 'canAccessRecordings',
    label: 'Access recordings',
    description: 'View and access audio recordings.',
    group: 'Recordings Module',
    icon: '🎙️',
    defaultView: true,
    order: 34,
  },
  {
    key: 'canUploadRecordings',
    label: 'Upload recordings',
    description: 'Upload new audio recordings.',
    group: 'Recordings Module',
    icon: '⬆️',
    defaultView: true,
    order: 35,
  },
  {
    key: 'canDeleteRecordings',
    label: 'Delete recordings',
    description: 'Delete audio recordings.',
    group: 'Recordings Module',
    icon: '🗑️',
    risk: 'medium',
    order: 36,
  },
  {
    key: 'canViewAllRecordings',
    label: 'View all recordings',
    description: 'View recordings from all users (not just assigned students).',
    group: 'Recordings Module',
    icon: '👁️',
    risk: 'medium',
    order: 37,
  },
  // Mushaf Module
  {
    key: 'canAccessMushaf',
    label: 'Access Mushaf',
    description: 'View and access Interactive Mushaf system.',
    group: 'Mushaf Module',
    icon: '📖',
    defaultView: true,
    order: 38,
  },
  {
    key: 'canMarkMistakes',
    label: 'Mark mistakes in Mushaf',
    description: 'Mark mistakes while reviewing recitation in Mushaf.',
    group: 'Mushaf Module',
    icon: '✏️',
    defaultView: true,
    order: 39,
  },
  {
    key: 'canViewMistakeHistory',
    label: 'View mistake history',
    description: 'View historical mistakes marked for students.',
    group: 'Mushaf Module',
    icon: '📜',
    defaultView: true,
    order: 40,
  },
  {
    key: 'canManageMistakeLibrary',
    label: 'Manage mistake library',
    description: 'Manage the mistake type library and categories.',
    group: 'Mushaf Module',
    icon: '📚',
    risk: 'medium',
    order: 41,
  },
  // Qaidah Module
  {
    key: 'canAccessQaidah',
    label: 'Access Qaidah',
    description: 'View and access Qaidah learning system.',
    group: 'Qaidah Module',
    icon: '🔤',
    defaultView: true,
    order: 42,
  },
  {
    key: 'canManageQaidah',
    label: 'Manage Qaidah',
    description: 'Manage Qaidah content and learning objectives.',
    group: 'Qaidah Module',
    icon: '⚙️',
    risk: 'medium',
    order: 43,
  },
  {
    key: 'canViewQaidahProgress',
    label: 'View Qaidah progress',
    description: 'View student progress in Qaidah learning.',
    group: 'Qaidah Module',
    icon: '📈',
    defaultView: true,
    order: 44,
  },
  // Assignments Module
  {
    key: 'canAccessAssignments',
    label: 'Access assignments',
    description: 'View and access assignment system.',
    group: 'Assignments Module',
    icon: '📋',
    defaultView: true,
    order: 45,
  },
  {
    key: 'canCreateAssignments',
    label: 'Create assignments',
    description: 'Create new assignments for students.',
    group: 'Assignments Module',
    icon: '➕',
    defaultView: true,
    order: 46,
  },
  {
    key: 'canEditAssignments',
    label: 'Edit assignments',
    description: 'Edit existing assignments.',
    group: 'Assignments Module',
    icon: '✏️',
    risk: 'medium',
    order: 47,
  },
  {
    key: 'canDeleteAssignments',
    label: 'Delete assignments',
    description: 'Delete assignments.',
    group: 'Assignments Module',
    icon: '🗑️',
    risk: 'high',
    order: 48,
  },
  // Teacher-Student Assignment
  {
    key: 'canManageStudentAssignments',
    label: 'Manage student assignments',
    description: 'Assign and reassign students to teachers.',
    group: 'People Operations',
    icon: '👥',
    risk: 'medium',
    order: 49,
  },
  // Reports & Analytics
  {
    key: 'canViewReports',
    label: 'View reports',
    description: 'View various reports and analytics.',
    group: 'Reports & Analytics',
    icon: '📊',
    defaultView: true,
    order: 50,
  },
  {
    key: 'canViewAnalytics',
    label: 'View analytics',
    description: 'View detailed analytics and statistics.',
    group: 'Reports & Analytics',
    icon: '📈',
    defaultView: true,
    order: 51,
  },
  {
    key: 'canExportReports',
    label: 'Export reports',
    description: 'Export reports to various formats (PDF, Excel, etc.).',
    group: 'Reports & Analytics',
    icon: '💾',
    risk: 'medium',
    order: 52,
  },
] satisfies PermissionManagerDefinition<TeacherPermissionKey>[];

/**
 * Phase 4: Generate admin permission definitions from shared permissions
 */
// Filter to only show core permissions for admins
const ADMIN_PERMISSION_DEFINITIONS = ALL_ADMIN_PERMISSIONS
  .filter(perm => CORE_ADMIN_PERMISSION_KEYS.includes(perm.key))
  .map((perm, index) => ({
    key: perm.key as AdminPermissionKey,
    label: perm.label,
    description: perm.description || '',
    group: mapModuleToGroup(perm.module),
    icon: '🔑',
    defaultView: perm.defaultAdmin,
    risk: perm.risk,
    order: index + 1,
  }));

// Legacy ADMIN_PERMISSION_DEFINITIONS (replaced above) - keeping for reference:
const _LEGACY_ADMIN_PERMISSION_DEFINITIONS = [
  {
    key: 'canManageTeachers',
    label: 'Manage teachers',
    description: 'Invite, update, or deactivate teacher records and payroll.',
    group: 'People Operations',
    icon: '🧑‍🏫',
    risk: 'medium',
    order: 1,
  },
  {
    key: 'canManageStudents',
    label: 'Manage students',
    description:
      'Oversee enrollments, transfers, and student lifecycle operations.',
    group: 'People Operations',
    icon: '🎓',
    risk: 'medium',
    order: 2,
  },
  {
    key: 'canManageFinancials',
    label: 'Control finances & billing',
    description: 'Modify tuition plans, settle dues, and reconcile payouts.',
    group: 'Finance & Billing',
    icon: '💵',
    risk: 'high',
    order: 3,
  },
  {
    key: 'canViewReports',
    label: 'View global reports',
    description: 'Access system dashboards, performance analytics, and KPIs.',
    group: 'Insights',
    icon: '📊',
    defaultView: true,
    order: 4,
  },
  {
    key: 'canManagePermissions',
    label: 'Delegate permissions',
    description:
      'Grant or revoke platform access for teachers and fellow admins.',
    group: 'Security & Governance',
    icon: '🔐',
    helper: 'High impact — grant only to trusted super admins.',
    risk: 'high',
    order: 5,
  },
  // Messages Module
  {
    key: 'canAccessMessages',
    label: 'Access messages',
    description: 'View and access the messaging system.',
    group: 'Messages Module',
    icon: '💌',
    defaultView: true,
    order: 6,
  },
  {
    key: 'canViewAllMessages',
    label: 'View all messages',
    description: 'View all messages across the entire system.',
    group: 'Messages Module',
    icon: '👁️',
    risk: 'medium',
    order: 7,
  },
  {
    key: 'canModerateMessages',
    label: 'Moderate messages',
    description: 'Moderate and manage messages across the system.',
    group: 'Messages Module',
    icon: '🛡️',
    risk: 'high',
    order: 8,
  },
  // PDF Module
  {
    key: 'canAccessPdf',
    label: 'Access PDF documents',
    description: 'View and access PDF documents.',
    group: 'PDF Module',
    icon: '📄',
    defaultView: true,
    order: 9,
  },
  {
    key: 'canManagePdfLibrary',
    label: 'Manage PDF library',
    description: 'Manage the entire PDF library (add, edit, delete PDFs).',
    group: 'PDF Module',
    icon: '📚',
    risk: 'medium',
    order: 10,
  },
  {
    key: 'canViewAllPdfAnnotations',
    label: 'View all PDF annotations',
    description: 'View annotations from all users across all PDFs.',
    group: 'PDF Module',
    icon: '👁️',
    risk: 'medium',
    order: 11,
  },
  // Homework Module
  {
    key: 'canAccessHomework',
    label: 'Access homework',
    description: 'View and access homework system.',
    group: 'Homework Module',
    icon: '📚',
    defaultView: true,
    order: 12,
  },
  {
    key: 'canManageHomework',
    label: 'Manage homework',
    description: 'Manage all homework assignments across the system.',
    group: 'Homework Module',
    icon: '⚙️',
    risk: 'medium',
    order: 13,
  },
  {
    key: 'canViewAllHomework',
    label: 'View all homework',
    description: 'View all homework submissions from all students.',
    group: 'Homework Module',
    icon: '👁️',
    risk: 'medium',
    order: 14,
  },
  // Evaluation Module
  {
    key: 'canAccessEvaluations',
    label: 'Access evaluations',
    description: 'View and access evaluation system.',
    group: 'Evaluation Module',
    icon: '✅',
    defaultView: true,
    order: 15,
  },
  {
    key: 'canManageEvaluations',
    label: 'Manage evaluations',
    description: 'Create, edit, and manage evaluation forms.',
    group: 'Evaluation Module',
    icon: '⚙️',
    risk: 'medium',
    order: 16,
  },
  {
    key: 'canApproveEvaluations',
    label: 'Approve evaluations',
    description: 'Approve or reject submitted evaluations.',
    group: 'Evaluation Module',
    icon: '✓',
    risk: 'high',
    order: 17,
  },
  // Tickets Module
  {
    key: 'canAccessTickets',
    label: 'Access tickets',
    description: 'View and access ticket-based workflow system.',
    group: 'Tickets Module',
    icon: '🎫',
    defaultView: true,
    order: 18,
  },
  {
    key: 'canCreateTickets',
    label: 'Create tickets',
    description: 'Create new tickets for recitation review workflow.',
    group: 'Tickets Module',
    icon: '➕',
    defaultView: true,
    order: 19,
  },
  {
    key: 'canReviewTickets',
    label: 'Review tickets',
    description: 'Review submitted tickets from teachers.',
    group: 'Tickets Module',
    icon: '🔍',
    defaultView: true,
    order: 20,
  },
  {
    key: 'canApproveTickets',
    label: 'Approve tickets',
    description: 'Approve tickets and move them to next workflow step.',
    group: 'Tickets Module',
    icon: '✓',
    defaultView: true,
    order: 21,
  },
  {
    key: 'canFinalizeTickets',
    label: 'Finalize tickets',
    description: 'Finalize tickets and convert them to assignments.',
    group: 'Tickets Module',
    icon: '🏁',
    risk: 'high',
    order: 22,
  },
  {
    key: 'canManageTicketWorkflow',
    label: 'Manage ticket workflow',
    description: 'Manage ticket workflow configuration and reassignments.',
    group: 'Tickets Module',
    icon: '⚙️',
    risk: 'high',
    order: 23,
  },
  // Attendance Module
  {
    key: 'canAccessAttendance',
    label: 'Access attendance',
    description: 'View and access attendance system.',
    group: 'Attendance Module',
    icon: '📅',
    defaultView: true,
    order: 24,
  },
  {
    key: 'canManageAttendance',
    label: 'Manage attendance',
    description: 'Manage attendance records for all users.',
    group: 'Attendance Module',
    icon: '⚙️',
    risk: 'medium',
    order: 25,
  },
  {
    key: 'canViewAttendanceReports',
    label: 'View attendance reports',
    description: 'View attendance reports and statistics.',
    group: 'Attendance Module',
    icon: '📊',
    defaultView: true,
    order: 26,
  },
  // Recordings Module
  {
    key: 'canAccessRecordings',
    label: 'Access recordings',
    description: 'View and access audio recordings.',
    group: 'Recordings Module',
    icon: '🎙️',
    defaultView: true,
    order: 27,
  },
  {
    key: 'canManageRecordings',
    label: 'Manage recordings',
    description: 'Manage all recordings across the system.',
    group: 'Recordings Module',
    icon: '⚙️',
    risk: 'medium',
    order: 28,
  },
  {
    key: 'canViewAllRecordings',
    label: 'View all recordings',
    description: 'View recordings from all users.',
    group: 'Recordings Module',
    icon: '👁️',
    risk: 'medium',
    order: 29,
  },
  // Mushaf Module
  {
    key: 'canAccessMushaf',
    label: 'Access Mushaf',
    description: 'View and access Interactive Mushaf system.',
    group: 'Mushaf Module',
    icon: '📖',
    defaultView: true,
    order: 30,
  },
  {
    key: 'canManageMushaf',
    label: 'Manage Mushaf',
    description: 'Manage Mushaf configuration and settings.',
    group: 'Mushaf Module',
    icon: '⚙️',
    risk: 'medium',
    order: 31,
  },
  {
    key: 'canViewAllMistakes',
    label: 'View all mistakes',
    description: 'View all mistakes marked across all students.',
    group: 'Mushaf Module',
    icon: '👁️',
    risk: 'medium',
    order: 32,
  },
  // Qaidah Module
  {
    key: 'canAccessQaidah',
    label: 'Access Qaidah',
    description: 'View and access Qaidah learning system.',
    group: 'Qaidah Module',
    icon: '🔤',
    defaultView: true,
    order: 33,
  },
  {
    key: 'canManageQaidah',
    label: 'Manage Qaidah',
    description: 'Manage Qaidah content and learning objectives.',
    group: 'Qaidah Module',
    icon: '⚙️',
    risk: 'medium',
    order: 34,
  },
  {
    key: 'canViewQaidahReports',
    label: 'View Qaidah reports',
    description: 'View Qaidah progress reports and analytics.',
    group: 'Qaidah Module',
    icon: '📊',
    defaultView: true,
    order: 35,
  },
  // Assignments Module
  {
    key: 'canAccessAssignments',
    label: 'Access assignments',
    description: 'View and access assignment system.',
    group: 'Assignments Module',
    icon: '📋',
    defaultView: true,
    order: 36,
  },
  {
    key: 'canManageAssignments',
    label: 'Manage assignments',
    description: 'Manage all assignments across the system.',
    group: 'Assignments Module',
    icon: '⚙️',
    risk: 'medium',
    order: 37,
  },
  {
    key: 'canBulkCreateAssignments',
    label: 'Bulk create assignments',
    description: 'Create assignments in bulk for multiple students.',
    group: 'Assignments Module',
    icon: '📦',
    risk: 'high',
    order: 38,
  },
  // Teacher-Student Assignment
  {
    key: 'canManageStudentAssignments',
    label: 'Manage student assignments',
    description: 'Assign and reassign students to teachers.',
    group: 'People Operations',
    icon: '👥',
    risk: 'medium',
    order: 39,
  },
  // Notifications Module
  {
    key: 'canManageNotifications',
    label: 'Manage notifications',
    description: 'Create, edit, and delete system notifications.',
    group: 'Notifications Module',
    icon: '🔔',
    risk: 'medium',
    order: 40,
  },
  {
    key: 'canViewNotifications',
    label: 'View notifications',
    description: 'View all system notifications and alerts.',
    group: 'Notifications Module',
    icon: '👁️',
    defaultView: true,
    order: 41,
  },
  {
    key: 'canSendNotifications',
    label: 'Send notifications',
    description: 'Send notifications to users, teachers, or students.',
    group: 'Notifications Module',
    icon: '📤',
    risk: 'medium',
    order: 42,
  },
  // Reports & Analytics
  {
    key: 'canViewAnalytics',
    label: 'View analytics',
    description: 'View detailed analytics and statistics.',
    group: 'Reports & Analytics',
    icon: '📈',
    defaultView: true,
    order: 43,
  },
  {
    key: 'canExportReports',
    label: 'Export reports',
    description: 'Export reports to various formats (PDF, Excel, etc.).',
    group: 'Reports & Analytics',
    icon: '💾',
    risk: 'medium',
    order: 44,
  },
  {
    key: 'canViewSystemStats',
    label: 'View system statistics',
    description: 'View system-wide statistics and performance metrics.',
    group: 'Reports & Analytics',
    icon: '📊',
    risk: 'high',
    order: 45,
  },
] satisfies PermissionManagerDefinition<AdminPermissionKey>[];

const TEACHER_PERMISSION_KEYS = TEACHER_PERMISSION_DEFINITIONS.map(
  (definition) => definition.key,
) as TeacherPermissionKey[];

const ADMIN_PERMISSION_KEYS = ADMIN_PERMISSION_DEFINITIONS.map(
  (definition) => definition.key,
) as AdminPermissionKey[];

const buildTeacherPermissions = (
  permissions?: Partial<TeacherPermissions>,
): TeacherPermissions =>
  TEACHER_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = Boolean(permissions?.[key]);
    return acc;
  }, {} as TeacherPermissions);

const buildAdminPermissions = (
  permissions?: Partial<AdminPermissions>,
): AdminPermissions =>
  ADMIN_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = Boolean(permissions?.[key]);
    return acc;
  }, {} as AdminPermissions);

const TEACHER_DEFINITION_MAP = TEACHER_PERMISSION_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.key] = definition;
    return acc;
  },
  {} as Record<
    TeacherPermissionKey,
    PermissionManagerDefinition<TeacherPermissionKey>
  >,
);

const ADMIN_DEFINITION_MAP = ADMIN_PERMISSION_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.key] = definition;
    return acc;
  },
  {} as Record<AdminPermissionKey, PermissionManagerDefinition<AdminPermissionKey>>,
);

type FeedbackTone = 'success' | 'error' | 'info';

interface PermissionManagerProps {
  onClose?: () => void;
  onUpdate?: () => void;
  isFullPage?: boolean;
}

const PermissionManager: React.FC<PermissionManagerProps> = ({ onClose, onUpdate, isFullPage = false }) => {
  const { teachers, admins, updateTeacher, updateAdmin, refreshData } = useData();
  const [selectedType, setSelectedType] = useState<'teacher' | 'admin'>(
    'teacher',
  );
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Bulk operations state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkPermission, setBulkPermission] = useState<{
    key: string;
    value: boolean;
  } | null>(null);

  // Collapsible groups state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const sortedTeachers = useMemo(
    () =>
      [...teachers].sort((a, b) =>
        (a.fullName ?? '').localeCompare(b.fullName ?? '', 'en'),
      ),
    [teachers],
  );
  const sortedAdmins = useMemo(
    () =>
      [...admins].sort((a, b) =>
        (a.fullName ?? '').localeCompare(b.fullName ?? '', 'en'),
      ),
    [admins],
  );

  const selectedTeacher =
    selectedType === 'teacher'
      ? sortedTeachers.find((teacher) => teacher.id === selectedUser)
      : undefined;
  const selectedAdmin =
    selectedType === 'admin'
      ? sortedAdmins.find((admin) => admin.id === selectedUser)
      : undefined;

  const teacherPermissions = useMemo(
    () => buildTeacherPermissions(selectedTeacher?.permissions),
    [selectedTeacher],
  );

  const adminPermissions = useMemo(
    () => buildAdminPermissions(selectedAdmin?.permissions),
    [selectedAdmin],
  );

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  const applyTeacherPermissions = async (
    teacher: Teacher,
    permissions: TeacherPermissions,
    message: string,
  ) => {
    setIsSaving(true);
    try {
      // CRITICAL: Use Teacher Document ID, not User ID
      let teacherDocId: string;
      if ((teacher as any).teacherDocumentId) {
        teacherDocId = (teacher as any).teacherDocumentId.toString();
      } else if ((teacher as any)._id && (teacher as any)._id.toString() !== teacher.id?.toString()) {
        teacherDocId = (teacher as any)._id.toString();
      } else {
        teacherDocId = teacher.id;
        console.warn('⚠️ Using User ID as fallback for teacher permission update:', {
          teacherName: teacher.fullName,
          teacherId: teacher.id,
        });
      }
      
      console.log('🔐 Applying teacher permissions:', {
        teacherId: teacherDocId,
        teacherName: teacher.fullName,
        permissions,
        permissionCount: Object.keys(permissions).length
      });
      
      await updateTeacher(teacherDocId, { permissions });
      
      // Refresh data from backend to ensure we have latest permissions
      await refreshData();
      
      setFeedback({
        tone: 'success',
        message: `${message} • ${teacher.fullName}`,
      });
      
      // Call onUpdate callback if provided
      if (onUpdate) {
        onUpdate();
      }
      
      // Refresh the teacher data to show updated permissions
      // Force re-render by updating selected user
      const currentSelected = selectedUser;
      setSelectedUser('');
      setTimeout(() => setSelectedUser(currentSelected), 100);
    } catch (error) {
      console.error('❌ Error applying teacher permissions:', error);
      setFeedback({
        tone: 'error',
        message: `Failed to update permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const applyAdminPermissions = async (
    admin: Admin,
    permissions: AdminPermissions,
    message: string,
  ) => {
    setIsSaving(true);
    try {
      console.log('🔐 Applying admin permissions:', {
        adminId: admin.id,
        adminName: admin.fullName,
        permissions,
        permissionCount: Object.keys(permissions).length
      });
      
      await updateAdmin(admin.id, { permissions });
      
      // Refresh data from backend to ensure we have latest permissions
      await refreshData();
      
      setFeedback({
        tone: 'success',
        message: `${message} • ${admin.fullName}`,
      });
      
      // Call onUpdate callback if provided
      if (onUpdate) {
        onUpdate();
      }
      
      // Refresh the admin data to show updated permissions
      // Force re-render by updating selected user
      const currentSelected = selectedUser;
      setSelectedUser('');
      setTimeout(() => setSelectedUser(currentSelected), 100);
    } catch (error) {
      console.error('❌ Error applying admin permissions:', error);
      setFeedback({
        tone: 'error',
        message: `Failed to update permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTeacherPermissionChange = async (
    permission: TeacherPermissionKey,
    value: boolean,
  ) => {
    console.log('🔐 handleTeacherPermissionChange called:', { permission, value, selectedTeacher: !!selectedTeacher, isSaving });
    
    if (!selectedTeacher || isSaving) {
      console.warn('⚠️ Cannot change permission:', { hasTeacher: !!selectedTeacher, isSaving });
      return;
    }

    try {
      const definition = TEACHER_DEFINITION_MAP[permission];
      if (!definition) {
        console.error('❌ Permission definition not found:', permission);
        setFeedback({
          tone: 'error',
          message: `Permission definition not found: ${permission}`,
        });
        return;
      }

      const nextPermissions: TeacherPermissions = {
        ...teacherPermissions,
        [permission]: value,
      };

      console.log('🔐 Applying teacher permissions:', { permission, value, nextPermissions });
      await applyTeacherPermissions(
        selectedTeacher,
        nextPermissions,
        `${definition.label} ${value ? 'enabled' : 'disabled'}`,
      );
    } catch (error) {
      console.error('❌ Error in handleTeacherPermissionChange:', error);
      setFeedback({
        tone: 'error',
        message: `Failed to update permission: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const handleAdminPermissionChange = async (
    permission: AdminPermissionKey,
    value: boolean,
  ) => {
    console.log('🔐 handleAdminPermissionChange called:', { permission, value, selectedAdmin: !!selectedAdmin, isSaving });
    
    if (!selectedAdmin || isSaving) {
      console.warn('⚠️ Cannot change permission:', { hasAdmin: !!selectedAdmin, isSaving });
      return;
    }

    try {
      const definition = ADMIN_DEFINITION_MAP[permission];
      if (!definition) {
        console.error('❌ Permission definition not found:', permission);
        setFeedback({
          tone: 'error',
          message: `Permission definition not found: ${permission}`,
        });
        return;
      }

      const nextPermissions: AdminPermissions = {
        ...adminPermissions,
        [permission]: value,
      };

      console.log('🔐 Applying admin permissions:', { permission, value, nextPermissions });
      await applyAdminPermissions(
        selectedAdmin,
        nextPermissions,
        `${definition.label} ${value ? 'enabled' : 'disabled'}`,
      );
    } catch (error) {
      console.error('❌ Error in handleAdminPermissionChange:', error);
      setFeedback({
        tone: 'error',
        message: `Failed to update permission: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const handleTeacherPreset = async (
    preset: 'all' | 'view' | 'none',
  ): Promise<void> => {
    if (!selectedTeacher || isSaving) {
      console.warn('⚠️ Cannot apply preset: no teacher selected or already saving');
      return;
    }

    console.log('🔐 Applying teacher preset:', preset, 'for teacher:', selectedTeacher.fullName);

    const next = TEACHER_PERMISSION_KEYS.reduce(
      (acc, key) => {
        if (preset === 'all') {
          acc[key] = true;
        } else if (preset === 'none') {
          acc[key] = false;
        } else {
          // View-only: only enable permissions marked with defaultView
          acc[key] = Boolean(
            TEACHER_DEFINITION_MAP[key].defaultView ?? false,
          );
        }
        return acc;
      },
      {} as TeacherPermissions,
    );

    console.log('🔐 Generated permissions object:', {
      preset,
      permissionCount: Object.keys(next).length,
      enabledCount: Object.values(next).filter(v => v === true).length,
      disabledCount: Object.values(next).filter(v => v === false).length,
      samplePermissions: Object.entries(next).slice(0, 5)
    });

    const message =
      preset === 'all'
        ? 'Granted full access'
        : preset === 'view'
          ? 'Applied view-only toolkit'
          : 'Revoked all classroom permissions';

    await applyTeacherPermissions(selectedTeacher, next, message);
  };

  const handleAdminPreset = async (
    preset: 'all' | 'financeReports' | 'none',
  ): Promise<void> => {
    if (!selectedAdmin || isSaving) {
      return;
    }

    const next = ADMIN_PERMISSION_KEYS.reduce(
      (acc, key) => {
        if (preset === 'all') {
          acc[key] = true;
        } else if (preset === 'none') {
          acc[key] = false;
        } else {
          acc[key] =
            key === 'canManageFinancials' || key === 'canViewReports';
        }
        return acc;
      },
      {} as AdminPermissions,
    );

    const message =
      preset === 'all'
        ? 'Granted full administrative control'
        : preset === 'financeReports'
          ? 'Finance & reports access granted'
          : 'Locked down admin permissions';

    await applyAdminPermissions(selectedAdmin, next, message);
  };

  // Bulk operations handlers
  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedUsers(new Set());
    setSelectedUser('');
    setBulkPermission(null);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const selectAllUsers = () => {
    const allIds = selectedType === 'teacher'
      ? sortedTeachers.map(t => t.id)
      : sortedAdmins.map(a => a.id);
    setSelectedUsers(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  const applyBulkPermission = async () => {
    if (!bulkPermission || selectedUsers.size === 0 || isSaving) {
      return;
    }

    setIsSaving(true);
    const results: Array<{ success: boolean; userId: string; userName: string; error?: string }> = [];

    try {
      const users = selectedType === 'teacher'
        ? sortedTeachers.filter(t => selectedUsers.has(t.id))
        : sortedAdmins.filter(a => selectedUsers.has(a.id));

      for (const user of users) {
        try {
          const currentPermissions = selectedType === 'teacher'
            ? buildTeacherPermissions((user as Teacher).permissions)
            : buildAdminPermissions((user as Admin).permissions);

          const updatedPermissions = {
            ...currentPermissions,
            [bulkPermission.key]: bulkPermission.value,
          };

          if (selectedType === 'teacher') {
            // CRITICAL: Use Teacher Document ID, not User ID
            const teacher = user as Teacher;
            let teacherDocId: string;
            if ((teacher as any).teacherDocumentId) {
              teacherDocId = (teacher as any).teacherDocumentId.toString();
            } else if ((teacher as any)._id && (teacher as any)._id.toString() !== teacher.id?.toString()) {
              teacherDocId = (teacher as any)._id.toString();
            } else {
              teacherDocId = teacher.id;
            }
            await updateTeacher(teacherDocId, { permissions: updatedPermissions as TeacherPermissions });
          } else {
            await updateAdmin(user.id, { permissions: updatedPermissions as AdminPermissions });
          }

          results.push({
            success: true,
            userId: user.id,
            userName: user.fullName || user.name || 'Unknown',
          });
        } catch (error) {
          results.push({
            success: false,
            userId: user.id,
            userName: user.fullName || user.name || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      await refreshData();

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        setFeedback({
          tone: 'success',
          message: `Successfully updated ${successCount} ${selectedType}${successCount !== 1 ? 's' : ''}`,
        });
        setSelectedUsers(new Set());
        setBulkPermission(null);
        
        // Call onUpdate callback if provided
        if (onUpdate) {
          onUpdate();
        }
      } else {
        setFeedback({
          tone: 'error',
          message: `Updated ${successCount}, failed ${failCount}. Check console for details.`,
        });
      }
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: `Bulk update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const teacherSummary = useMemo(() => {
    if (!selectedTeacher) {
      return null;
    }

    const activeCount = TEACHER_PERMISSION_KEYS.reduce(
      (sum, key) => (teacherPermissions[key] ? sum + 1 : sum),
      0,
    );
    const highImpactCount = TEACHER_PERMISSION_DEFINITIONS.filter(
      (definition) =>
        definition.risk === 'high' &&
        teacherPermissions[definition.key],
    ).length;
    const communicationEnabled = teacherPermissions.canContactParents;

    return {
      activeCount,
      highImpactCount,
      communicationEnabled,
    };
  }, [selectedTeacher, teacherPermissions]);

  const adminSummary = useMemo(() => {
    if (!selectedAdmin) {
      return null;
    }

    const activeCount = ADMIN_PERMISSION_KEYS.reduce(
      (sum, key) => (adminPermissions[key] ? sum + 1 : sum),
      0,
    );
    const highImpactCount = ADMIN_PERMISSION_DEFINITIONS.filter(
      (definition) =>
        definition.risk === 'high' && adminPermissions[definition.key],
    ).length;

    return {
      activeCount,
      highImpactCount,
      isPermissionAdmin: adminPermissions.canManagePermissions,
    };
  }, [selectedAdmin, adminPermissions]);

  const renderEmptyState = (type: 'teacher' | 'admin') => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-8 py-16 text-center text-gray-500">
      <div className="mb-3 text-3xl">{type === 'teacher' ? '👆' : '🛡️'}</div>
      <p className="text-lg font-semibold text-gray-700">
        Select a {type === 'teacher' ? 'teacher' : 'admin'} to continue
      </p>
      <p className="mt-2 text-sm">
        Use the directory on the left to load an account and adjust its
        privileges.
      </p>
    </div>
  );

  const renderTeacherDetail = () => {
    if (!selectedTeacher || !teacherSummary) {
      return renderEmptyState('teacher');
    }

    const teacherAvatar =
      selectedTeacher.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTeacher.fullName)}&background=E5E7EB&color=111827`;

    const totalPermissions = TEACHER_PERMISSION_KEYS.length;
    const activePercentage = Math.round(
      (teacherSummary.activeCount / totalPermissions) * 100,
    );

    const groupedPermissions = TEACHER_PERMISSION_DEFINITIONS.reduce(
      (groups, definition) => {
        const existing = groups.find(
          (group) => group.name === definition.group,
        );
        const item = {
          definition,
          value: teacherPermissions[definition.key],
        };
        if (existing) {
          existing.items.push(item);
        } else {
          groups.push({
            name: definition.group,
            items: [item],
          });
        }
        return groups;
      },
      [] as Array<{
        name: string;
        items: Array<{
          definition: PermissionManagerDefinition<TeacherPermissionKey>;
          value: boolean;
        }>;
      }>,
    );

  return (
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <img src={teacherAvatar} alt={selectedTeacher.fullName} className="h-14 w-14 rounded-full border-2 border-gray-200 object-cover flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">{selectedTeacher.fullName}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedTeacher.email}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                  <span>{teacherSummary.activeCount} of {totalPermissions} permissions</span>
                  {teacherSummary.highImpactCount > 0 && <span className="text-error-600">{teacherSummary.highImpactCount} high-impact</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleTeacherPreset('all')} disabled={isSaving} className="rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50">Full access</button>
              <button type="button" onClick={() => handleTeacherPreset('view')} disabled={isSaving} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">View-only</button>
              <button type="button" onClick={() => handleTeacherPreset('none')} disabled={isSaving} className="rounded-lg border border-error-200 bg-error-50 px-3 py-1.5 text-sm font-medium text-error-700 hover:bg-error-100 disabled:opacity-50">Revoke all</button>
            </div>
          </div>
        </section>

        {groupedPermissions.map((group) => {
          const metadata = TEACHER_PERMISSION_GROUP_METADATA[group.name] ?? { icon: '⚙️', description: 'Configure related capabilities.' };
          const sortedItems = [...group.items].sort((a, b) => (a.definition.order ?? 0) - (b.definition.order ?? 0));
          const isExpanded = expandedGroups.has(group.name);
          return (
            <section key={group.name} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <button type="button" onClick={() => toggleGroup(group.name)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition">
                <span className="text-lg">{metadata.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900">{group.name}</h4>
                  {isExpanded && <p className="text-xs text-gray-500 mt-0.5">{metadata.description}</p>}
                </div>
                <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                  {sortedItems.map(({ definition }) => {
                    const value = teacherPermissions[definition.key];
                    return (
                      <label key={definition.key} className={`flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer ${value ? 'border-primary/30 bg-primary/5' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`} title={definition.description}>
                        <input type="checkbox" checked={value} onChange={() => handleTeacherPermissionChange(definition.key, !value)} disabled={isSaving || !selectedTeacher} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" aria-label={definition.label} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900">{definition.label}</span>
                          {definition.risk === 'high' && <span className="ml-2 inline-flex rounded-full bg-error/10 px-1.5 py-0.5 text-xs font-medium text-error-700">High</span>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  };

  const renderAdminDetail = () => {
    if (!selectedAdmin || !adminSummary) {
      return renderEmptyState('admin');
    }

    const adminAvatar =
      selectedAdmin.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAdmin.fullName)}&background=FDE68A&color=92400E`;

    const totalPermissions = ADMIN_PERMISSION_KEYS.length;
    const activePercentage = Math.round(
      (adminSummary.activeCount / totalPermissions) * 100,
    );

    const groupedPermissions = ADMIN_PERMISSION_DEFINITIONS.reduce(
      (groups, definition) => {
        const existing = groups.find(
          (group) => group.name === definition.group,
        );
        const item = {
          definition,
          value: adminPermissions[definition.key],
        };
        if (existing) {
          existing.items.push(item);
        } else {
          groups.push({
            name: definition.group,
            items: [item],
          });
        }
        return groups;
      },
      [] as Array<{
        name: string;
        items: Array<{
          definition: PermissionManagerDefinition<AdminPermissionKey>;
          value: boolean;
        }>;
      }>,
    );

    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <img src={adminAvatar} alt={selectedAdmin.fullName} className="h-14 w-14 rounded-full border-2 border-gray-200 object-cover flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">{selectedAdmin.fullName}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedAdmin.email}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                  <span>{adminSummary.activeCount} of {totalPermissions} permissions</span>
                  {adminSummary.highImpactCount > 0 && <span className="text-error-600">{adminSummary.highImpactCount} high-impact</span>}
                  {adminSummary.isPermissionAdmin && <span className="text-primary-600">Can manage permissions</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleAdminPreset('all')} disabled={isSaving} className="rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50">Full control</button>
              <button type="button" onClick={() => handleAdminPreset('financeReports')} disabled={isSaving} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Finance & reports</button>
              <button type="button" onClick={() => handleAdminPreset('none')} disabled={isSaving} className="rounded-lg border border-error-200 bg-error-50 px-3 py-1.5 text-sm font-medium text-error-700 hover:bg-error-100 disabled:opacity-50">Lock down</button>
            </div>
          </div>
        </section>

        {groupedPermissions.map((group) => {
          const metadata = ADMIN_PERMISSION_GROUP_METADATA[group.name] ?? { icon: '⚙️', description: 'Configure related administrative controls.' };
          const sortedItems = [...group.items].sort((a, b) => (a.definition.order ?? 0) - (b.definition.order ?? 0));
          const isExpanded = expandedGroups.has(group.name);
          return (
            <section key={group.name} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <button type="button" onClick={() => toggleGroup(group.name)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition">
                <span className="text-lg">{metadata.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900">{group.name}</h4>
                  {isExpanded && <p className="text-xs text-gray-500 mt-0.5">{metadata.description}</p>}
                </div>
                <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                  {sortedItems.map(({ definition, value }) => (
                    <label key={definition.key} className={`flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer ${value ? 'border-primary/30 bg-primary/5' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`} title={definition.description}>
                      <input type="checkbox" checked={value} onChange={() => handleAdminPermissionChange(definition.key, !value)} disabled={isSaving || !selectedAdmin} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" aria-label={definition.label} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">{definition.label}</span>
                        {definition.risk === 'high' && <span className="ml-2 inline-flex rounded-full bg-error/10 px-1.5 py-0.5 text-xs font-medium text-error-700">High</span>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  };

  const content = (
    <div className={`flex h-full w-full ${isFullPage ? '' : 'max-h-[98vh] max-w-[100vw]'} flex-col overflow-hidden ${isFullPage ? '' : 'rounded-xl'} bg-white ${isFullPage ? '' : 'shadow-xl'} ${isFullPage ? '' : 'sm:max-w-[95vw]'} border border-gray-200`}>
        {/* Header: clean, minimal */}
        <header className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-gray-900">
                  Permission Management Center
                </h1>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bulkMode ? 'bg-accent/20 text-accent-700' : 'bg-primary/10 text-primary-700'}`}>
                  {bulkMode ? 'Bulk' : 'Single'}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {bulkMode ? 'Select users and apply permissions in bulk.' : 'Choose a user and manage their permissions.'}
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="mt-4 flex gap-4 text-sm">
            <span className="text-gray-500">Teachers <strong className="text-gray-700">{teachers.length}</strong></span>
            <span className="text-gray-500">Admins <strong className="text-gray-700">{admins.length}</strong></span>
            {feedback?.message && (
              <span className={`font-medium ${feedback.tone === 'success' ? 'text-success-600' : feedback.tone === 'error' ? 'text-error-600' : 'text-primary-600'}`}>
                {feedback.message}
              </span>
            )}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden sm:gap-6 bg-gray-50/50 lg:grid-cols-[300px_minmax(0,1fr)] px-4 py-4 sm:px-6">
          <aside className="flex flex-col gap-4 overflow-y-auto">
            {/* User type + mode */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">User type</h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedType('teacher'); setSelectedUser(''); setFeedback(null); if (!bulkMode) setSelectedUsers(new Set()); }}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    selectedType === 'teacher' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Teachers ({sortedTeachers.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedType('admin'); setSelectedUser(''); setFeedback(null); if (!bulkMode) setSelectedUsers(new Set()); }}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    selectedType === 'admin' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Admins ({sortedAdmins.length})
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={toggleBulkMode}
                  className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition ${bulkMode ? 'bg-accent/20 text-accent-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {bulkMode ? 'Switch to Single' : 'Switch to Bulk'}
                </button>
              </div>
            </section>

            {bulkMode ? (
              <>
                <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-900">Select users</h2>
                    <span className="text-xs text-gray-500">{selectedUsers.size} selected</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <button type="button" onClick={selectAllUsers} className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Select all</button>
                    <button type="button" onClick={clearSelection} className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Clear</button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1 rounded-lg border border-gray-200 bg-gray-50/50 p-2">
                    {(selectedType === 'teacher' ? sortedTeachers : sortedAdmins).map((user) => (
                      <label key={user.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${selectedUsers.has(user.id) ? 'bg-primary/10 border border-primary/30' : 'bg-white border border-transparent hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={selectedUsers.has(user.id)} onChange={() => toggleUserSelection(user.id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.fullName || user.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
                {selectedUsers.size > 0 && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">Apply permission</h2>
                    <select value={bulkPermission?.key || ''} onChange={(e) => { if (e.target.value) { const p = (selectedType === 'teacher' ? TEACHER_PERMISSION_DEFINITIONS : ADMIN_PERMISSION_DEFINITIONS).find(d => d.key === e.target.value); if (p) setBulkPermission({ key: e.target.value, value: true }); } else setBulkPermission(null); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary focus:border-primary">
                      <option value="">Select permission</option>
                      {(selectedType === 'teacher' ? TEACHER_PERMISSION_DEFINITIONS : ADMIN_PERMISSION_DEFINITIONS).map((def) => <option key={def.key} value={def.key}>{def.label}</option>)}
                    </select>
                    {bulkPermission && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setBulkPermission({ ...bulkPermission, value: true })} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${bulkPermission.value ? 'bg-success text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Enable</button>
                          <button type="button" onClick={() => setBulkPermission({ ...bulkPermission, value: false })} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${!bulkPermission.value ? 'bg-error text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Disable</button>
                        </div>
                        <button type="button" onClick={applyBulkPermission} disabled={isSaving} className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50 flex items-center justify-center gap-2">
                          {isSaving ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : null}
                          Apply to {selectedUsers.size} {selectedType}{selectedUsers.size !== 1 ? 's' : ''}
                        </button>
                      </div>
                    )}
                  </section>
                )}
              </>
            ) : (
              <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">Select user</h2>
                <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary focus:border-primary">
                  <option value="">Choose {selectedType === 'teacher' ? 'teacher' : 'admin'}…</option>
                  {selectedType === 'teacher' ? sortedTeachers.map((t) => <option key={t.id} value={t.id}>{t.fullName} — {t.email}</option>) : sortedAdmins.map((a) => <option key={a.id} value={a.id}>{a.fullName} — {a.email}</option>)}
                </select>
                <p className="mt-2 text-xs text-gray-500">Only grant permissions needed for this role.</p>
              </section>
            )}
          </aside>

          <main className="min-h-0 overflow-y-auto">
            {feedback && !bulkMode && (
              <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${feedback.tone === 'success' ? 'border-success-200 bg-success-50 text-success-800' : feedback.tone === 'error' ? 'border-error-200 bg-error-50 text-error-800' : 'border-primary-200 bg-primary-50 text-primary-800'}`}>
                {feedback.message}
              </div>
            )}
            {bulkMode && selectedUsers.size === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 px-6 text-center">
                <div className="text-4xl text-gray-300 mb-3">👥</div>
                <p className="text-sm font-medium text-gray-700">Bulk mode</p>
                <p className="mt-1 text-sm text-gray-500">Select {selectedType === 'teacher' ? 'teachers' : 'admins'} from the sidebar to apply permissions in bulk.</p>
              </div>
            ) : !bulkMode && !selectedUser ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 px-6 text-center">
                <div className="text-4xl text-gray-300 mb-3">{selectedType === 'teacher' ? '👨‍🏫' : '🛡️'}</div>
                <p className="text-sm font-medium text-gray-700">Select a {selectedType === 'teacher' ? 'teacher' : 'admin'}</p>
                <p className="mt-1 text-sm text-gray-500">Use the sidebar to choose a user and manage their permissions.</p>
              </div>
            ) : selectedType === 'teacher' ? renderTeacherDetail() : renderAdminDetail()}
          </main>
        </div>

        <footer className="flex-shrink-0 flex flex-col sm:flex-row justify-between sm:justify-end items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          {bulkMode && <span className="text-sm text-gray-500">{selectedUsers.size} {selectedType}{selectedUsers.size !== 1 ? 's' : ''} selected</span>}
          <div className="flex gap-2 w-full sm:w-auto">
            {bulkMode && <button type="button" onClick={toggleBulkMode} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Exit bulk</button>}
            {onClose && <button type="button" onClick={onClose} className="flex-1 sm:flex-none rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-800">Done</button>}
          </div>
        </footer>
      </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {content}
    </div>
  );
};

export default PermissionManager;
