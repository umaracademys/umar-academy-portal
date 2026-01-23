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
      [...teachers].sort((a, b) => a.fullName.localeCompare(b.fullName, 'en')),
    [teachers],
  );
  const sortedAdmins = useMemo(
    () =>
      [...admins].sort((a, b) => a.fullName.localeCompare(b.fullName, 'en')),
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
            userName: user.fullName,
          });
        } catch (error) {
          results.push({
            success: false,
            userId: user.id,
            userName: user.fullName,
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
      <div className="space-y-1.5">
        <section className="rounded border border-gray-200 bg-white p-1.5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <img
                src={teacherAvatar}
                alt={selectedTeacher.fullName}
                className="h-8 w-8 rounded-full border border-gray-200 object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <h3 className="text-xs font-semibold text-gray-900">
                    {selectedTeacher.fullName}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                      selectedTeacher.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {selectedTeacher.status === 'active'
                      ? 'Active'
                      : 'Inactive'}
                  </span>
                </div>
                <p className="text-[9px] text-gray-600 truncate">
                  {selectedTeacher.department} • {selectedTeacher.email}
                </p>
                <p className="text-[9px] text-gray-500">
                  Students: {selectedTeacher.assignedStudents.length}
                </p>
              </div>
        </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleTeacherPreset('all')}
                disabled={isSaving}
                className="inline-flex items-center gap-0.5 rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
              >
                Full access
              </button>
              <button
                type="button"
                onClick={() => handleTeacherPreset('view')}
                disabled={isSaving}
                className="inline-flex items-center gap-0.5 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
              >
                View-only
              </button>
              <button
                type="button"
                onClick={() => handleTeacherPreset('none')}
                disabled={isSaving}
                className="inline-flex items-center gap-0.5 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                Revoke all
              </button>
            </div>
          </div>

          <div className="mt-1.5 grid gap-1 grid-cols-3">
            <div className="rounded border border-gray-200 bg-gray-50 p-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                Active
              </p>
              <p className="mt-0.5 text-xs font-semibold text-gray-900">
                {teacherSummary.activeCount}/{totalPermissions}
              </p>
              <div className="mt-1 h-1 w-full rounded-full bg-gray-200">
                <div
                  className="h-1 rounded-full bg-purple-500 transition-all"
                  style={{ width: `${activePercentage}%` }}
                />
              </div>
            </div>
            <div className="rounded border border-red-100 bg-red-50 p-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-red-500">
                High-impact
              </p>
              <p className="mt-0.5 text-xs font-semibold text-red-700">
                {teacherSummary.highImpactCount}
              </p>
            </div>
            <div className="rounded border border-blue-200 bg-blue-50 p-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-blue-500">
                Comms
              </p>
              <p className="mt-0.5 text-xs font-semibold text-blue-700">
                {teacherSummary.communicationEnabled ? 'Allowed' : 'Restricted'}
              </p>
            </div>
          </div>
        </section>

        {groupedPermissions.map((group) => {
          const metadata =
            TEACHER_PERMISSION_GROUP_METADATA[group.name] ?? {
              icon: '⚙️',
              description: 'Configure related capabilities.',
            };
          const sortedItems = [...group.items].sort(
            (a, b) =>
              (a.definition.order ?? 0) - (b.definition.order ?? 0),
          );
          const isExpanded = expandedGroups.has(group.name);

          return (
            <section
              key={group.name}
              className="rounded border border-gray-200 bg-white p-1.5 shadow-sm"
            >
              <header 
                className="flex items-start gap-1 cursor-pointer"
                onClick={() => toggleGroup(group.name)}
              >
                <span className="text-sm flex-shrink-0">{metadata.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {group.name}
                    </h4>
                    <span className="text-[9px] text-gray-400">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                  {isExpanded && (
                    <p className="text-[9px] text-gray-600 mt-0.5">
                      {metadata.description}
                    </p>
                  )}
                </div>
              </header>
              {isExpanded && (
                <div className="mt-1 space-y-1">
                  {sortedItems.map(({ definition }) => {
                    const value = teacherPermissions[definition.key];
                    return (
                      <div
                        key={definition.key}
                        className={`rounded border px-1.5 py-1 transition ${
                          value
                            ? 'border-purple-200 bg-purple-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-1">
                          {definition.icon && (
                            <span className="mt-0.5 text-xs text-gray-500 flex-shrink-0">
                              {definition.icon}
                            </span>
                          )}
                    <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1">
                                <p className="text-[10px] font-semibold text-gray-900">
                                  {definition.label}
                                </p>
                                {definition.risk === 'high' && (
                                  <span className="inline-flex items-center rounded-full bg-red-100 px-1 py-0.5 text-[8px] font-semibold text-red-700">
                                    High
                                  </span>
                                )}
                                {definition.defaultView && (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-1 py-0.5 text-[8px] font-semibold text-blue-700">
                                    View
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[9px] text-gray-600">
                                {definition.description}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🔘 Teacher permission button clicked:', { key: definition.key, currentValue: value, newValue: !value });
                                handleTeacherPermissionChange(
                                  definition.key,
                                  !value,
                                );
                              }}
                              disabled={isSaving || !selectedTeacher}
                              role="switch"
                              aria-checked={value}
                              className={`relative inline-flex h-4 w-7 items-center rounded-full transition flex-shrink-0 ${
                                value ? 'bg-purple-600' : 'bg-gray-300'
                              } ${isSaving || !selectedTeacher ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-80'}`}
                            >
                              <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                                  value ? 'translate-x-3' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
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
      <div className="space-y-1.5">
        <section className="rounded border border-amber-200 bg-amber-50 p-1.5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <img
                src={adminAvatar}
                alt={selectedAdmin.fullName}
                className="h-8 w-8 rounded-full border border-amber-300 object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <h3 className="text-xs font-semibold text-amber-900">
                    {selectedAdmin.fullName}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                      selectedAdmin.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {selectedAdmin.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                    </div>
                <p className="text-[9px] text-amber-900/80 truncate">{selectedAdmin.email}</p>
                <p className="text-[9px] text-amber-900/60">
                  Depts: {selectedAdmin.assignedDepartments.join(', ')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleAdminPreset('all')}
                disabled={isSaving}
                className="inline-flex items-center gap-0.5 rounded border border-amber-400 bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"
              >
                Full control
              </button>
              <button
                type="button"
                onClick={() => handleAdminPreset('financeReports')}
                disabled={isSaving}
                className="inline-flex items-center gap-0.5 rounded border border-blue-300 bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-800 transition hover:bg-blue-200 disabled:opacity-50"
              >
                Finance & reports
              </button>
              <button
                type="button"
                onClick={() => handleAdminPreset('none')}
                disabled={isSaving}
                className="inline-flex items-center gap-0.5 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Lock down
              </button>
            </div>
          </div>

          <div className="mt-1.5 grid gap-1 grid-cols-3">
            <div className="rounded border border-amber-200 bg-white p-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                Active
              </p>
              <p className="mt-0.5 text-xs font-semibold text-amber-900">
                {adminSummary.activeCount}/{totalPermissions}
              </p>
              <div className="mt-1 h-1 w-full rounded-full bg-amber-100">
                <div
                  className="h-1 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${activePercentage}%` }}
                />
              </div>
            </div>
            <div className="rounded border border-red-200 bg-red-50 p-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-red-600">
                High-impact
              </p>
              <p className="mt-0.5 text-xs font-semibold text-red-700">
                {adminSummary.highImpactCount}
              </p>
            </div>
            <div className="rounded border border-indigo-200 bg-indigo-50 p-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-indigo-500">
                Perm admin
              </p>
              <p className="mt-0.5 text-xs font-semibold text-indigo-700">
                {adminSummary.isPermissionAdmin ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </section>

        {groupedPermissions.map((group) => {
          const metadata =
            ADMIN_PERMISSION_GROUP_METADATA[group.name] ?? {
              icon: '⚙️',
              description: 'Configure related administrative controls.',
            };
          const sortedItems = [...group.items].sort(
            (a, b) =>
              (a.definition.order ?? 0) - (b.definition.order ?? 0),
          );
          const isExpanded = expandedGroups.has(group.name);

          return (
            <section
              key={group.name}
              className="rounded border border-amber-200 bg-white p-1.5 shadow-sm"
            >
              <header 
                className="flex items-start gap-1 cursor-pointer"
                onClick={() => toggleGroup(group.name)}
              >
                <span className="text-sm flex-shrink-0">{metadata.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      {group.name}
                    </h4>
                    <span className="text-[9px] text-gray-400">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                  {isExpanded && (
                    <p className="text-[9px] text-amber-900/80 mt-0.5">
                      {metadata.description}
                    </p>
                  )}
                </div>
              </header>
              {isExpanded && (
                <div className="mt-1 space-y-1">
                  {sortedItems.map(({ definition, value }) => (
                    <div
                      key={definition.key}
                      className={`rounded border px-1.5 py-1 transition ${
                        value
                          ? 'border-amber-300 bg-amber-100'
                          : 'border-amber-100 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-1">
                        {definition.icon && (
                          <span className="mt-0.5 text-xs text-amber-600 flex-shrink-0">
                            {definition.icon}
                          </span>
                        )}
                    <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1">
                              <p className="text-[10px] font-semibold text-amber-900">
                                {definition.label}
                              </p>
                              {definition.risk === 'high' && (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-1 py-0.5 text-[8px] font-semibold text-red-700">
                                  Escalated
                                </span>
                              )}
                              {definition.defaultView && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-1 py-0.5 text-[8px] font-semibold text-blue-700">
                                  Analytics
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[9px] text-amber-900/80">
                              {definition.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('🔘 Admin permission button clicked:', { key: definition.key, currentValue: value, newValue: !value });
                              handleAdminPermissionChange(definition.key, !value);
                            }}
                            disabled={isSaving || !selectedAdmin}
                            role="switch"
                            aria-checked={value}
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition flex-shrink-0 ${
                              value ? 'bg-amber-600' : 'bg-amber-200'
                            } ${isSaving || !selectedAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-80'}`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                                value ? 'translate-x-3' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
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
    <div className={`flex h-full w-full ${isFullPage ? '' : 'max-h-[98vh] max-w-[100vw]'} flex-col overflow-hidden ${isFullPage ? '' : 'rounded-lg'} bg-white ${isFullPage ? '' : 'shadow-2xl'} ${isFullPage ? '' : 'sm:max-w-[95vw]'}`}>
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-4 text-white shadow-lg">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-widest text-blue-200 font-semibold">
                    🔐 Permission Control
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    bulkMode 
                      ? 'bg-yellow-500 text-yellow-900' 
                      : 'bg-blue-500/30 text-blue-100'
                  }`}>
                    {bulkMode ? '📦 Bulk Mode' : '👤 Single Mode'}
                  </span>
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="text-white hover:text-blue-200 transition text-sm p-1 rounded hover:bg-white/10"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                )}
              </div>
              <h2 className="text-lg font-bold mb-1">
                Permission Management Center
              </h2>
              <p className="text-sm text-blue-100">
                {bulkMode 
                  ? 'Select multiple users and apply permissions in bulk for faster management.'
                  : 'Manage individual user permissions with precision and control.'}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                <p className="font-semibold text-white text-xs mb-1">👨‍🏫 Teachers</p>
                <p className="text-white text-xl font-bold">{teachers.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                <p className="font-semibold text-white text-xs mb-1">🛡️ Admins</p>
                <p className="text-white text-xl font-bold">{admins.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                <p className="font-semibold text-white text-xs mb-1">📊 Active Mode</p>
                <p className="text-white text-lg font-bold truncate">
                  {selectedType === 'teacher' ? 'Teachers' : 'Admins'}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                <p className="font-semibold text-white text-xs mb-1">✓ Status</p>
                <p className="text-white text-lg font-bold truncate">
                  {feedback?.message ? '✓ Updated' : 'Ready'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex flex-col space-y-3 overflow-y-auto">
            <section className="flex-shrink-0 rounded-lg border-2 border-gray-200 bg-white p-3 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-900">User Type</p>
                <button
                  type="button"
                  onClick={toggleBulkMode}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-sm ${
                    bulkMode
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 shadow-yellow-200'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
                  }`}
                >
                  {bulkMode ? '📦 Bulk Mode' : '👤 Single Mode'}
                </button>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                {bulkMode
                  ? 'Select multiple users to apply permissions in bulk for faster management.'
                  : 'Select a single user to manage their permissions individually.'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('teacher');
                    setSelectedUser('');
                    setFeedback(null);
                    if (!bulkMode) {
                      setSelectedUsers(new Set());
                    }
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all shadow-sm ${
                    selectedType === 'teacher'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-purple-200'
                      : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  👨‍🏫 Teachers
                  <span className="ml-1 text-xs opacity-75">({sortedTeachers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('admin');
                    setSelectedUser('');
                    setFeedback(null);
                    if (!bulkMode) {
                      setSelectedUsers(new Set());
                    }
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all shadow-sm ${
                    selectedType === 'admin'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-200'
                      : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  🛡️ Admins
                  <span className="ml-1 text-xs opacity-75">({sortedAdmins.length})</span>
                </button>
              </div>
            </section>

            {bulkMode ? (
              <>
                <section className="flex-shrink-0 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-900">
                      Select {selectedType === 'teacher' ? 'Teachers' : 'Admins'}
                      <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">
                        {selectedUsers.size} selected
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllUsers}
                        className="px-3 py-1.5 rounded-lg border-2 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 text-xs font-semibold transition shadow-sm"
                      >
                        ✓ Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="px-3 py-1.5 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold transition shadow-sm"
                      >
                        ✕ Clear
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2 border-2 border-blue-200 rounded-lg p-2 bg-white">
                    {(selectedType === 'teacher' ? sortedTeachers : sortedAdmins).map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border-2 transition cursor-pointer ${
                          selectedUsers.has(user.id)
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:ring-2"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user.fullName}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {user.email}
                          </p>
                        </div>
                        {selectedUsers.has(user.id) && (
                          <span className="text-blue-600 text-lg">✓</span>
                        )}
                      </label>
                    ))}
                  </div>
                </section>

                {selectedUsers.size > 0 && (
                  <section className="flex-shrink-0 rounded-lg border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-bold text-gray-900">
                        Apply Permission to {selectedUsers.size} {selectedType}{selectedUsers.size !== 1 ? 's' : ''}
                      </label>
                      <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-semibold">
                        Ready
                      </span>
                    </div>
                    <div className="space-y-3">
                      <select
                        value={bulkPermission?.key || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            const permission = selectedType === 'teacher'
                              ? TEACHER_PERMISSION_DEFINITIONS.find(d => d.key === e.target.value)
                              : ADMIN_PERMISSION_DEFINITIONS.find(d => d.key === e.target.value);
                            if (permission) {
                              setBulkPermission({ key: e.target.value, value: true });
                            }
                          } else {
                            setBulkPermission(null);
                          }
                        }}
                        className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white font-medium"
                      >
                        <option value="">— Select a permission —</option>
                        {(selectedType === 'teacher' ? TEACHER_PERMISSION_DEFINITIONS : ADMIN_PERMISSION_DEFINITIONS).map((def) => (
                          <option key={def.key} value={def.key}>
                            {def.icon} {def.label}
                          </option>
                        ))}
                      </select>
                      {bulkPermission && (
                        <>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setBulkPermission({ ...bulkPermission, value: true })}
                              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all shadow-sm ${
                                bulkPermission.value
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                              }`}
                            >
                              ✓ Enable
                            </button>
                            <button
                              type="button"
                              onClick={() => setBulkPermission({ ...bulkPermission, value: false })}
                              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all shadow-sm ${
                                !bulkPermission.value
                                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                              }`}
                            >
                              ✕ Disable
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={applyBulkPermission}
                            disabled={isSaving}
                            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                          >
                            {isSaving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Applying...
                              </>
                            ) : (
                              <>
                                <span>🚀</span>
                                Apply to {selectedUsers.size} {selectedType}{selectedUsers.size !== 1 ? 's' : ''}
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </section>
                )}
              </>
            ) : (
            <section className="flex-shrink-0 rounded-lg border-2 border-gray-200 bg-white p-3 shadow-md">
              <label className="text-sm font-bold text-gray-900 mb-2 block">
                Select {selectedType === 'teacher' ? 'Teacher' : 'Admin'}
              </label>
              <select
                value={selectedUser}
                onChange={(event) => setSelectedUser(event.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white font-medium"
              >
                <option value="">— Choose a user —</option>
                {selectedType === 'teacher'
                  ? sortedTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.fullName} — {teacher.email}
                      </option>
                    ))
                  : sortedAdmins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.fullName} — {admin.email}
                      </option>
                    ))}
              </select>
              <p className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded-lg border border-blue-200">
                💡 <strong>Tip:</strong> {selectedType === 'teacher'
                  ? 'Assign only the permissions needed for each teacher\'s role.'
                  : 'Reserve elevated permissions for trusted administrators only.'}
              </p>
            </section>
            )}

            <section className="flex-shrink-0 rounded border border-gray-200 bg-white p-1.5 shadow-sm">
              <p className="text-[10px] font-semibold text-gray-900">
                Safety checklist
              </p>
              <ul className="mt-1 space-y-0.5 text-[9px] text-gray-600">
                <li>• Review high-impact toggles regularly.</li>
                <li>• Pair communication access with accountability.</li>
                <li>• Keep permission presets aligned with policy.</li>
              </ul>
            </section>
          </aside>

          <main className="min-h-0 overflow-y-auto space-y-1.5">
            {feedback && (
              <div
                className={`flex-shrink-0 rounded border px-2 py-1 text-[10px] ${
                  feedback.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : feedback.tone === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {feedback.message}
            </div>
          )}
            {bulkMode && selectedUsers.size === 0 ? (
              <div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-2 py-8 text-center text-gray-500">
                <div className="mb-2 text-2xl">📦</div>
                <p className="text-xs font-semibold text-gray-700">
                  Bulk Mode Active
                </p>
                <p className="mt-1 text-[10px] max-w-md">
                  Select {selectedType === 'teacher' ? 'teachers' : 'admins'} from the sidebar to apply permissions in bulk.
                </p>
              </div>
            ) : !bulkMode && !selectedUser ? (
              <div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-2 py-8 text-center text-gray-500">
                <div className="mb-2 text-2xl">{selectedType === 'teacher' ? '👆' : '🛡️'}</div>
                <p className="text-xs font-semibold text-gray-700">
                  Select a {selectedType === 'teacher' ? 'teacher' : 'admin'} to continue
                </p>
                <p className="mt-1 text-[10px] max-w-md">
                  Use the directory on the left to load an account and adjust its privileges.
                </p>
              </div>
            ) : selectedType === 'teacher'
              ? renderTeacherDetail()
              : renderAdminDetail()}
          </main>
        </div>

        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between sm:justify-end gap-1 border-t border-gray-200 bg-white px-1.5 py-1.5">
          {bulkMode && (
            <div className="flex items-center gap-1 text-[10px] text-gray-600">
              <span className="font-semibold">{selectedUsers.size}</span>
              <span>{selectedType}{selectedUsers.size !== 1 ? 's' : ''} selected</span>
            </div>
          )}
          <div className="flex gap-1">
            {bulkMode && (
              <button
                type="button"
                onClick={toggleBulkMode}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-[10px] font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Exit Bulk
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none rounded bg-gray-900 px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-gray-700"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-1">
      {content}
    </div>
  );
};

export default PermissionManager;
