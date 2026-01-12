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

const TEACHER_PERMISSION_GROUP_METADATA: Record<
  string,
  { icon: string; description: string }
> = {
  'Assessments & Grading': {
    icon: '📊',
    description:
      'Control visibility and editing rights for academic assessments.',
  },
  'Progress & Evaluations': {
    icon: '📝',
    description:
      'Decide who can review and log qualitative progress updates.',
  },
  'Scheduling & Logistics': {
    icon: '🗓️',
    description:
      'Grant authority to adjust daily schedules and operational logistics.',
  },
  'Finance & Billing': {
    icon: '💳',
    description:
      'Sensitive access to tuition, invoices, and other financial records.',
  },
  'Family Communication': {
    icon: '💬',
    description:
      'Control direct messaging channels with parents and guardians.',
  },
  'Student Information': {
    icon: '👤',
    description:
      'Control what personal information teachers can view about students.',
  },
  'Messages Module': {
    icon: '💌',
    description:
      'Manage access to messaging system for teacher-student and teacher-parent communication.',
  },
  'PDF Module': {
    icon: '📄',
    description:
      'Control PDF document access, upload, annotation, and viewing capabilities.',
  },
  'Homework Module': {
    icon: '📚',
    description:
      'Manage homework creation, grading, and submission review permissions.',
  },
  'Evaluation Module': {
    icon: '✅',
    description:
      'Control access to evaluation creation, review, and approval workflows.',
  },
  'Tickets Module': {
    icon: '🎫',
    description:
      'Manage ticket-based recitation workflow access and review permissions.',
  },
  'Attendance Module': {
    icon: '📅',
    description:
      'Control attendance recording and report viewing capabilities.',
  },
  'Recordings Module': {
    icon: '🎙️',
    description:
      'Manage audio recording upload, access, and deletion permissions.',
  },
  'Mushaf Module': {
    icon: '📖',
    description:
      'Control access to Interactive Mushaf for mistake marking and history viewing.',
  },
  'Qaidah Module': {
    icon: '🔤',
    description:
      'Manage Qaidah learning system access and progress tracking permissions.',
  },
  'Assignments Module': {
    icon: '📋',
    description:
      'Control assignment creation, editing, and deletion capabilities.',
  },
  'Notifications Module': {
    icon: '🔔',
    description:
      'Manage notification creation, viewing, and sending capabilities.',
  },
  'Reports & Analytics': {
    icon: '📈',
    description:
      'Manage access to reports, analytics, and data export features.',
  },
};

const ADMIN_PERMISSION_GROUP_METADATA: Record<
  string,
  { icon: string; description: string }
> = {
  'People Operations': {
    icon: '👥',
    description:
      'Create, update, and retire staff and student profiles across the platform.',
  },
  'Finance & Billing': {
    icon: '💰',
    description:
      'Access school-wide financial reports, payouts, and tuition management.',
  },
  Insights: {
    icon: '📈',
    description:
      'Unlock system-wide analytics, dashboards, and performance insights.',
  },
  'Security & Governance': {
    icon: '🛡️',
    description:
      'Delegate who can elevate roles or alter other administrators\' access.',
  },
  'Messages Module': {
    icon: '💌',
    description:
      'Manage messaging system access, moderation, and oversight capabilities.',
  },
  'PDF Module': {
    icon: '📄',
    description:
      'Control PDF library management and annotation viewing across all users.',
  },
  'Homework Module': {
    icon: '📚',
    description:
      'Manage homework system access and view all homework submissions.',
  },
  'Evaluation Module': {
    icon: '✅',
    description:
      'Control evaluation management and approval workflows across the system.',
  },
  'Tickets Module': {
    icon: '🎫',
    description:
      'Manage ticket workflow, creation, review, and finalization permissions.',
  },
  'Attendance Module': {
    icon: '📅',
    description:
      'Control attendance management and report generation capabilities.',
  },
  'Recordings Module': {
    icon: '🎙️',
    description:
      'Manage recording access and oversight across all users.',
  },
  'Mushaf Module': {
    icon: '📖',
    description:
      'Control Mushaf access and mistake management across the system.',
  },
  'Qaidah Module': {
    icon: '🔤',
    description:
      'Manage Qaidah system access and report generation.',
  },
  'Assignments Module': {
    icon: '📋',
    description:
      'Control assignment management and bulk creation capabilities.',
  },
  'Notifications Module': {
    icon: '🔔',
    description:
      'Manage notification system access, creation, and distribution.',
  },
  'Reports & Analytics': {
    icon: '📊',
    description:
      'Manage analytics access, report export, and system statistics viewing.',
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
 * Phase 4: Generate permission definitions from shared permissions
 * This ensures we use the single source of truth
 */
const TEACHER_PERMISSION_DEFINITIONS = ALL_TEACHER_PERMISSIONS.map((perm, index) => ({
  key: perm.key as TeacherPermissionKey,
  label: perm.label,
  description: perm.description || '',
  group: mapModuleToGroup(perm.module),
  icon: '🔑', // Default icon - can be customized per permission if needed
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
const ADMIN_PERMISSION_DEFINITIONS = ALL_ADMIN_PERMISSIONS.map((perm, index) => ({
  key: perm.key as AdminPermissionKey,
  label: perm.label,
  description: perm.description || '',
  group: mapModuleToGroup(perm.module),
  icon: '🔑', // Default icon - can be customized per permission if needed
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
  onClose: () => void;
}

const PermissionManager: React.FC<PermissionManagerProps> = ({ onClose }) => {
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
      console.log('🔐 Applying teacher permissions:', {
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        permissions,
        permissionCount: Object.keys(permissions).length
      });
      
      await updateTeacher(teacher.id, { permissions });
      
      // Refresh data from backend to ensure we have latest permissions
      await refreshData();
      
      setFeedback({
        tone: 'success',
        message: `${message} • ${teacher.fullName}`,
      });
      
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
    if (!selectedTeacher || isSaving) {
      return;
    }

    const definition = TEACHER_DEFINITION_MAP[permission];
    const nextPermissions: TeacherPermissions = {
      ...teacherPermissions,
      [permission]: value,
    };

    await applyTeacherPermissions(
      selectedTeacher,
      nextPermissions,
      `${definition.label} ${value ? 'enabled' : 'disabled'}`,
    );
  };

  const handleAdminPermissionChange = async (
    permission: AdminPermissionKey,
    value: boolean,
  ) => {
    if (!selectedAdmin || isSaving) {
      return;
    }

    const definition = ADMIN_DEFINITION_MAP[permission];
    const nextPermissions: AdminPermissions = {
      ...adminPermissions,
      [permission]: value,
    };

    await applyAdminPermissions(
      selectedAdmin,
      nextPermissions,
      `${definition.label} ${value ? 'enabled' : 'disabled'}`,
    );
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
            await updateTeacher(user.id, { permissions: updatedPermissions as TeacherPermissions });
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
      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img
                src={teacherAvatar}
                alt={selectedTeacher.fullName}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-gray-200 object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                    {selectedTeacher.fullName}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {selectedTeacher.department} • {selectedTeacher.email}
                </p>
                <p className="text-xs text-gray-500">
                  Assigned students: {selectedTeacher.assignedStudents.length}
                </p>
              </div>
        </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handleTeacherPreset('all')}
                disabled={isSaving}
                className="inline-flex items-center gap-1 sm:gap-2 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
              >
                Grant full access
              </button>
              <button
                type="button"
                onClick={() => handleTeacherPreset('view')}
                disabled={isSaving}
                className="inline-flex items-center gap-1 sm:gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
              >
                Apply view-only
              </button>
              <button
                type="button"
                onClick={() => handleTeacherPreset('none')}
                disabled={isSaving}
                className="inline-flex items-center gap-1 sm:gap-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                Revoke all
              </button>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Active permissions
              </p>
              <p className="mt-2 text-xl sm:text-2xl font-semibold text-gray-900">
                {teacherSummary.activeCount}/{totalPermissions}
              </p>
              <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-purple-500 transition-all"
                  style={{ width: `${activePercentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {activePercentage}% of capabilities in use
              </p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                High-impact toggles
              </p>
              <p className="mt-2 text-xl sm:text-2xl font-semibold text-red-700">
                {teacherSummary.highImpactCount}
              </p>
              <p className="mt-1 text-xs text-red-600">
                Financial and scheduling access is closely monitored.
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                Guardian comms
              </p>
              <p className="mt-2 text-xl sm:text-2xl font-semibold text-blue-700">
                {teacherSummary.communicationEnabled ? 'Allowed' : 'Restricted'}
              </p>
              <p className="mt-1 text-xs text-blue-600">
                Direct parent messaging is{' '}
                {teacherSummary.communicationEnabled ? 'enabled' : 'disabled'}.
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

          return (
            <section
              key={group.name}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <header className="mb-3 sm:mb-4 flex items-start gap-2 sm:gap-3">
                <span className="text-lg sm:text-xl flex-shrink-0">{metadata.icon}</span>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
                    {group.name}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {metadata.description}
                  </p>
                </div>
              </header>
              <div className="space-y-2 sm:space-y-3">
                {sortedItems.map(({ definition }) => {
                  const value = teacherPermissions[definition.key];
                  return (
                    <div
                      key={definition.key}
                      className={`rounded-lg border px-3 py-2 sm:px-4 sm:py-3 transition ${
                        value
                          ? 'border-purple-200 bg-purple-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        {definition.icon && (
                          <span className="mt-0.5 sm:mt-1 text-sm sm:text-base text-gray-500 flex-shrink-0">
                            {definition.icon}
                          </span>
                        )}
                    <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900">
                              {definition.label}
                            </p>
                            {definition.risk === 'high' && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                High impact
                              </span>
                            )}
                            {definition.defaultView && (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                View preset
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs sm:text-sm text-gray-600">
                            {definition.description}
                          </p>
                          {definition.helper && (
                            <p className="mt-1.5 sm:mt-2 text-xs text-gray-500">
                              {definition.helper}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleTeacherPermissionChange(
                              definition.key,
                              !value,
                            )
                          }
                          disabled={isSaving}
                          role="switch"
                          aria-checked={value}
                          className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition flex-shrink-0 ${
                            value ? 'bg-purple-600' : 'bg-gray-300'
                          } ${isSaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition ${
                              value ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0.5 sm:translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img
                src={adminAvatar}
                alt={selectedAdmin.fullName}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-amber-300 object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-semibold text-amber-900">
                    {selectedAdmin.fullName}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      selectedAdmin.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {selectedAdmin.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                    </div>
                <p className="text-xs sm:text-sm text-amber-900/80 truncate">{selectedAdmin.email}</p>
                <p className="text-xs text-amber-900/60">
                  Departments: {selectedAdmin.assignedDepartments.join(', ')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handleAdminPreset('all')}
                disabled={isSaving}
                className="inline-flex items-center gap-1 sm:gap-2 rounded-lg border border-amber-400 bg-amber-100 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"
              >
                Full control
              </button>
              <button
                type="button"
                onClick={() => handleAdminPreset('financeReports')}
                disabled={isSaving}
                className="inline-flex items-center gap-1 sm:gap-2 rounded-lg border border-blue-300 bg-blue-100 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-blue-800 transition hover:bg-blue-200 disabled:opacity-50"
              >
                Finance & reports
              </button>
              <button
                type="button"
                onClick={() => handleAdminPreset('none')}
                disabled={isSaving}
                className="inline-flex items-center gap-1 sm:gap-2 rounded-lg border border-gray-300 bg-white px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Lock down
              </button>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
            <div className="rounded-lg border border-amber-200 bg-white p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Active permissions
              </p>
              <p className="mt-2 text-xl sm:text-2xl font-semibold text-amber-900">
                {adminSummary.activeCount}/{totalPermissions}
              </p>
              <div className="mt-3 h-2 w-full rounded-full bg-amber-100">
                <div
                  className="h-2 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${activePercentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-amber-800">
                {activePercentage}% of admin capabilities granted
              </p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                High impact toggles
              </p>
              <p className="mt-2 text-xl sm:text-2xl font-semibold text-red-700">
                {adminSummary.highImpactCount}
              </p>
              <p className="mt-1 text-xs text-red-600">
                Includes finance access and permission delegation.
              </p>
            </div>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                Permission admin
              </p>
              <p className="mt-2 text-xl sm:text-2xl font-semibold text-indigo-700">
                {adminSummary.isPermissionAdmin ? 'Yes' : 'No'}
              </p>
              <p className="mt-1 text-xs text-indigo-600">
                {adminSummary.isPermissionAdmin
                  ? 'This user can elevate other accounts.'
                  : 'Cannot delegate platform access.'}
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

          return (
            <section
              key={group.name}
              className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <header className="mb-3 sm:mb-4 flex items-start gap-2 sm:gap-3">
                <span className="text-lg sm:text-xl flex-shrink-0">{metadata.icon}</span>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-amber-700">
                    {group.name}
                  </h4>
                  <p className="text-xs sm:text-sm text-amber-900/80">
                    {metadata.description}
                  </p>
                </div>
              </header>
              <div className="space-y-2 sm:space-y-3">
                {sortedItems.map(({ definition, value }) => (
                  <div
                    key={definition.key}
                    className={`rounded-lg border px-3 py-2 sm:px-4 sm:py-3 transition ${
                      value
                        ? 'border-amber-300 bg-amber-100'
                        : 'border-amber-100 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      {definition.icon && (
                        <span className="mt-0.5 sm:mt-1 text-sm sm:text-base text-amber-600 flex-shrink-0">
                          {definition.icon}
                        </span>
                      )}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-amber-900">
                            {definition.label}
                          </p>
                          {definition.risk === 'high' && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                              Escalated
                            </span>
                          )}
                          {definition.defaultView && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                              Analytics preset
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs sm:text-sm text-amber-900/80">
                          {definition.description}
                        </p>
                        {definition.helper && (
                          <p className="mt-1.5 sm:mt-2 text-xs text-amber-900/70">
                            {definition.helper}
                          </p>
                        )}
                    </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleAdminPermissionChange(definition.key, !value)
                        }
                        disabled={isSaving}
                        role="switch"
                        aria-checked={value}
                        className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition flex-shrink-0 ${
                          value ? 'bg-amber-600' : 'bg-amber-200'
                        } ${isSaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition ${
                            value ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0.5 sm:translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-1 sm:p-2 md:p-4 lg:p-6">
      <div className="flex h-full w-full max-h-[98vh] sm:max-h-[95vh] max-w-[100vw] sm:max-w-[95vw] flex-col overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl bg-white shadow-2xl sm:max-w-7xl lg:max-w-[90vw] xl:max-w-7xl">
        <div className="flex-shrink-0 bg-gradient-to-r from-red-600 to-red-800 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 text-white">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between sm:block">
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-red-200">
                Control Center
              </span>
                <button
                  onClick={onClose}
                  className="sm:hidden text-white hover:text-red-200 transition"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mt-1">
                🔐 Permission Management Center
              </h2>
              <p className="mt-1 text-[11px] sm:text-xs md:text-sm text-red-100">
                Micro-manage user access, reduce risk, and keep teams aligned.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs md:text-sm text-red-50 sm:grid-cols-4 lg:flex-shrink-0">
              <div className="bg-red-700/30 rounded-lg p-2 sm:p-3">
                <p className="font-semibold text-white text-[10px] sm:text-xs">Teachers</p>
                <p className="text-red-100 text-sm sm:text-base font-bold">{teachers.length}</p>
              </div>
              <div className="bg-red-700/30 rounded-lg p-2 sm:p-3">
                <p className="font-semibold text-white text-[10px] sm:text-xs">Admins</p>
                <p className="text-red-100 text-sm sm:text-base font-bold">{admins.length}</p>
              </div>
              <div className="bg-red-700/30 rounded-lg p-2 sm:p-3">
                <p className="font-semibold text-white text-[10px] sm:text-xs">Active role</p>
                <p className="text-red-100 text-sm sm:text-base font-bold truncate">
                  {selectedType === 'teacher' ? 'Teachers' : 'Admins'}
                </p>
              </div>
              <div className="bg-red-700/30 rounded-lg p-2 sm:p-3">
                <p className="font-semibold text-white text-[10px] sm:text-xs">Last action</p>
                <p className="text-red-100 text-sm sm:text-base font-bold truncate">
                  {feedback?.message ? 'Updated' : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 sm:gap-4 overflow-hidden bg-gray-50 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="flex flex-col space-y-3 sm:space-y-4 overflow-y-auto">
            <section className="flex-shrink-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm font-semibold text-gray-900">Role type</p>
                <button
                  type="button"
                  onClick={toggleBulkMode}
                  className={`text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-semibold transition ${
                    bulkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {bulkMode ? '📦 Bulk' : '👤 Single'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3 sm:mb-4">
                {bulkMode
                  ? 'Select multiple users to apply permissions in bulk.'
                  : 'Switch between teacher and admin directories to start managing their access.'}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                  className={`rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold transition ${
                    selectedType === 'teacher'
                      ? 'bg-purple-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  👨‍🏫 Teachers
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
                  className={`rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold transition ${
                    selectedType === 'admin'
                      ? 'bg-amber-500 text-white'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🛡️ Admins
                </button>
              </div>
            </section>

            {bulkMode ? (
              <>
                <section className="flex-shrink-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <label className="text-xs sm:text-sm font-semibold text-gray-900">
                      Select {selectedType === 'teacher' ? 'teachers' : 'admins'} ({selectedUsers.size})
                    </label>
                    <div className="flex gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={selectAllUsers}
                        className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                    {(selectedType === 'teacher' ? sortedTeachers : sortedAdmins).map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {user.fullName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                {selectedUsers.size > 0 && (
                  <section className="flex-shrink-0 rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm sm:p-4">
                    <label className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 block">
                      Apply permission to {selectedUsers.size} {selectedType}{selectedUsers.size !== 1 ? 's' : ''}
                    </label>
                    <div className="space-y-2">
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
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">— Select permission —</option>
                        {(selectedType === 'teacher' ? TEACHER_PERMISSION_DEFINITIONS : ADMIN_PERMISSION_DEFINITIONS).map((def) => (
                          <option key={def.key} value={def.key}>
                            {def.icon} {def.label}
                          </option>
                        ))}
                      </select>
                      {bulkPermission && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setBulkPermission({ ...bulkPermission, value: true })}
                            className={`flex-1 rounded-lg px-2 py-1.5 text-xs sm:text-sm font-semibold transition ${
                              bulkPermission.value
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Enable
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkPermission({ ...bulkPermission, value: false })}
                            className={`flex-1 rounded-lg px-2 py-1.5 text-xs sm:text-sm font-semibold transition ${
                              !bulkPermission.value
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Disable
                          </button>
                        </div>
                      )}
                      {bulkPermission && (
                        <button
                          type="button"
                          onClick={applyBulkPermission}
                          disabled={isSaving}
                          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isSaving ? 'Applying...' : `Apply to ${selectedUsers.size} ${selectedType}${selectedUsers.size !== 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                  </section>
                )}
              </>
            ) : (
            <section className="flex-shrink-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
              <label className="text-xs sm:text-sm font-semibold text-gray-900">
                Select {selectedType === 'teacher' ? 'teacher' : 'admin'}
              </label>
              <select
                value={selectedUser}
                onChange={(event) => setSelectedUser(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
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
              <p className="mt-3 text-xs text-gray-500">
                {selectedType === 'teacher'
                  ? 'Tip: Assign only the permissions needed for their classroom responsibilities.'
                  : 'Tip: Reserve elevated permissions for trusted senior admins.'}
              </p>
            </section>
            )}

            <section className="flex-shrink-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
              <p className="text-xs sm:text-sm font-semibold text-gray-900">
                Safety checklist
              </p>
              <ul className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs text-gray-600">
                <li>• Review high-impact toggles regularly.</li>
                <li>• Pair communication access with accountability.</li>
                <li>• Keep permission presets aligned with school policy.</li>
              </ul>
            </section>
          </aside>

          <main className="min-h-0 overflow-y-auto space-y-3 sm:space-y-4 md:space-y-6">
            {feedback && (
              <div
                className={`flex-shrink-0 rounded-lg border px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm ${
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
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-12 sm:py-16 text-center text-gray-500">
                <div className="mb-3 text-4xl">📦</div>
                <p className="text-base sm:text-lg font-semibold text-gray-700">
                  Bulk Mode Active
                </p>
                <p className="mt-2 text-xs sm:text-sm max-w-md">
                  Select {selectedType === 'teacher' ? 'teachers' : 'admins'} from the sidebar to apply permissions in bulk.
                </p>
              </div>
            ) : !bulkMode && !selectedUser ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-12 sm:py-16 text-center text-gray-500">
                <div className="mb-3 text-4xl">{selectedType === 'teacher' ? '👆' : '🛡️'}</div>
                <p className="text-base sm:text-lg font-semibold text-gray-700">
                  Select a {selectedType === 'teacher' ? 'teacher' : 'admin'} to continue
                </p>
                <p className="mt-2 text-xs sm:text-sm max-w-md">
                  Use the directory on the left to load an account and adjust its privileges.
                </p>
              </div>
            ) : selectedType === 'teacher'
              ? renderTeacherDetail()
              : renderAdminDetail()}
          </main>
        </div>

        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between sm:justify-end gap-2 sm:gap-3 border-t border-gray-200 bg-white px-3 py-3 sm:px-4 sm:py-3 md:px-6 md:py-4">
          {bulkMode && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <span className="font-semibold">{selectedUsers.size}</span>
              <span>{selectedType}{selectedUsers.size !== 1 ? 's' : ''} selected</span>
            </div>
          )}
          <div className="flex gap-2 sm:gap-3">
            {bulkMode && (
              <button
                type="button"
                onClick={toggleBulkMode}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Exit Bulk Mode
              </button>
            )}
            <button
            type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-lg bg-gray-900 px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionManager;
