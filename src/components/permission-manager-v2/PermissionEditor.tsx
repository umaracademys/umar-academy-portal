import React, { useMemo } from 'react';
import { TeacherPermissions, AdminPermissions } from '../../types';
import { 
  ALL_TEACHER_PERMISSIONS, 
  ALL_ADMIN_PERMISSIONS,
  TeacherPermissionKey,
  AdminPermissionKey 
} from '../../shared/permissions';
import { PermissionGroup } from './PermissionGroup';
import { getPermissionSummary } from './utils/permissionHelpers';

interface PermissionEditorProps {
  permissions: TeacherPermissions | AdminPermissions;
  isAdmin: boolean;
  onPermissionChange: (key: string, value: boolean) => Promise<void>;
  disabled?: boolean;
}

const MODULE_TO_GROUP: Record<string, { title: string; icon: string; description: string }> = {
  'people': { title: 'People Operations', icon: '👥', description: 'Manage users and assignments' },
  'financial': { title: 'Finance & Billing', icon: '💰', description: 'Financial records and billing' },
  'reports': { title: 'Reports & Analytics', icon: '📊', description: 'View reports and analytics' },
  'security': { title: 'Security & Governance', icon: '🛡️', description: 'Permission management' },
  'messages': { title: 'Messages Module', icon: '💌', description: 'Messaging system access' },
  'pdf': { title: 'PDF Module', icon: '📄', description: 'PDF document management' },
  'homework': { title: 'Homework Module', icon: '📚', description: 'Homework assignments' },
  'evaluations': { title: 'Evaluation Module', icon: '✅', description: 'Evaluation management' },
  'tickets': { title: 'Tickets Module', icon: '🎫', description: 'Ticket workflow' },
  'attendance': { title: 'Attendance Module', icon: '📅', description: 'Attendance tracking' },
  'recordings': { title: 'Recordings Module', icon: '🎙️', description: 'Audio recordings' },
  'mushaf': { title: 'Mushaf Module', icon: '📖', description: 'Interactive Mushaf' },
  'qaidah': { title: 'Qaidah Module', icon: '🔤', description: 'Qaidah learning system' },
  'assignments': { title: 'Assignments Module', icon: '📋', description: 'Assignment management' },
  'notifications': { title: 'Notifications Module', icon: '🔔', description: 'System notifications' },
  'assessments': { title: 'Assessments & Grading', icon: '📊', description: 'Student assessments' },
  'scheduling': { title: 'Scheduling & Logistics', icon: '🗓️', description: 'Schedule management' },
  'communication': { title: 'Family Communication', icon: '💬', description: 'Parent communication' },
  'student-info': { title: 'Student Information', icon: '👤', description: 'Student data access' },
  'student-assignment': { title: 'Student Assignment', icon: '👥', description: 'Teacher-student assignments' },
};

export const PermissionEditor: React.FC<PermissionEditorProps> = React.memo(({
  permissions,
  isAdmin,
  onPermissionChange,
  disabled = false,
}) => {
  const summary = useMemo(() => getPermissionSummary(permissions, isAdmin), [permissions, isAdmin]);

  const groupedPermissions = useMemo(() => {
    const definitions = isAdmin ? ALL_ADMIN_PERMISSIONS : ALL_TEACHER_PERMISSIONS;
    const groups: Record<string, Array<{
      key: string;
      label: string;
      description: string;
      risk?: 'low' | 'medium' | 'high';
      isDefault?: boolean;
      value: boolean;
    }>> = {};

    definitions.forEach((def) => {
      if (!groups[def.module]) {
        groups[def.module] = [];
      }
      groups[def.module].push({
        key: def.key,
        label: def.label,
        description: def.description || '',
        risk: def.risk,
        isDefault: isAdmin ? def.defaultAdmin : def.defaultTeacher,
        value: permissions[def.key as keyof typeof permissions] || false,
      });
    });

    return groups;
  }, [permissions, isAdmin]);

  return (
    <div className="flex flex-col h-full">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg">
        <h2 className="text-xl font-bold mb-2">Permission Summary</h2>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-blue-100 uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold mt-1">{summary.active}/{summary.total}</p>
            <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${summary.percentage}%` }}
              />
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-blue-100 uppercase tracking-wide">High Risk</p>
            <p className="text-2xl font-bold mt-1">{summary.highRisk}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-blue-100 uppercase tracking-wide">Coverage</p>
            <p className="text-2xl font-bold mt-1">{summary.percentage}%</p>
          </div>
        </div>
      </div>

      {/* Permission Groups */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {Object.entries(groupedPermissions).map(([module, perms]) => {
          const groupInfo = MODULE_TO_GROUP[module] || {
            title: module,
            icon: '⚙️',
            description: 'Module permissions',
          };

          return (
            <PermissionGroup
              key={module}
              title={groupInfo.title}
              icon={groupInfo.icon}
              description={groupInfo.description}
              permissions={perms}
              onPermissionChange={onPermissionChange}
              disabled={disabled}
            />
          );
        })}
      </div>
    </div>
  );
});

PermissionEditor.displayName = 'PermissionEditor';
