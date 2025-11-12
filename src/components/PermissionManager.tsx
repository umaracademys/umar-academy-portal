import React, { useEffect, useMemo, useState } from 'react';
import {
  Teacher,
  Admin,
  TeacherPermissions,
  AdminPermissions,
} from '../types';
import { useData } from '../contexts/DataContext';

type TeacherPermissionKey = keyof TeacherPermissions;
type AdminPermissionKey = keyof AdminPermissions;

type PermissionDefinition<K extends string> = {
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
      'Delegate who can elevate roles or alter other administrators’ access.',
  },
};

const TEACHER_PERMISSION_DEFINITIONS = [
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
] satisfies PermissionDefinition<TeacherPermissionKey>[];

const ADMIN_PERMISSION_DEFINITIONS = [
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
] satisfies PermissionDefinition<AdminPermissionKey>[];

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
    PermissionDefinition<TeacherPermissionKey>
  >,
);

const ADMIN_DEFINITION_MAP = ADMIN_PERMISSION_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.key] = definition;
    return acc;
  },
  {} as Record<AdminPermissionKey, PermissionDefinition<AdminPermissionKey>>,
);

type FeedbackTone = 'success' | 'error' | 'info';

interface PermissionManagerProps {
  onClose: () => void;
}

const PermissionManager: React.FC<PermissionManagerProps> = ({ onClose }) => {
  const { teachers, admins, updateTeacher, updateAdmin } = useData();
  const [selectedType, setSelectedType] = useState<'teacher' | 'admin'>(
    'teacher',
  );
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      await updateTeacher(teacher.id, { permissions });
      setFeedback({
        tone: 'success',
        message: `${message} • ${teacher.fullName}`,
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
      await updateAdmin(admin.id, { permissions });
      setFeedback({
        tone: 'success',
        message: `${message} • ${admin.fullName}`,
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
      return;
    }

    const next = TEACHER_PERMISSION_KEYS.reduce(
      (acc, key) => {
        if (preset === 'all') {
          acc[key] = true;
        } else if (preset === 'none') {
          acc[key] = false;
        } else {
          acc[key] = Boolean(
            TEACHER_DEFINITION_MAP[key].defaultView ?? false,
          );
        }
        return acc;
      },
      {} as TeacherPermissions,
    );

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
          value: selectedTeacher.permissions[definition.key],
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
          definition: PermissionDefinition<TeacherPermissionKey>;
          value: boolean;
        }>;
      }>,
    );

  return (
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src={teacherAvatar}
                alt={selectedTeacher.fullName}
                className="h-14 w-14 rounded-full border border-gray-200 object-cover"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-900">
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
                <p className="text-sm text-gray-600">
                  {selectedTeacher.department} • {selectedTeacher.email}
                </p>
                <p className="text-xs text-gray-500">
                  Assigned students: {selectedTeacher.assignedStudents.length}
                </p>
              </div>
        </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleTeacherPreset('all')}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
              >
                Grant full access
              </button>
              <button
                type="button"
                onClick={() => handleTeacherPreset('view')}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
              >
                Apply view-only
              </button>
              <button
                type="button"
                onClick={() => handleTeacherPreset('none')}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                Revoke all
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Active permissions
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
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
            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                High-impact toggles
              </p>
              <p className="mt-2 text-2xl font-semibold text-red-700">
                {teacherSummary.highImpactCount}
              </p>
              <p className="mt-1 text-xs text-red-600">
                Financial and scheduling access is closely monitored.
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                Guardian comms
              </p>
              <p className="mt-2 text-2xl font-semibold text-blue-700">
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
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <header className="mb-4 flex items-start gap-3">
                <span className="text-xl">{metadata.icon}</span>
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    {group.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {metadata.description}
                  </p>
                </div>
              </header>
              <div className="space-y-3">
                {sortedItems.map(({ definition }) => {
                  const value = teacherPermissions[definition.key];
                  return (
                    <div
                      key={definition.key}
                      className={`rounded-lg border px-4 py-3 transition ${
                        value
                          ? 'border-purple-200 bg-purple-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {definition.icon && (
                          <span className="mt-1 text-base text-gray-500">
                            {definition.icon}
                          </span>
                        )}
                    <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
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
                          <p className="mt-1 text-sm text-gray-600">
                            {definition.description}
                          </p>
                          {definition.helper && (
                            <p className="mt-2 text-xs text-gray-500">
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
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            value ? 'bg-purple-600' : 'bg-gray-300'
                          } ${isSaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              value ? 'translate-x-5' : 'translate-x-1'
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
          definition: PermissionDefinition<AdminPermissionKey>;
          value: boolean;
        }>;
      }>,
    );

    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src={adminAvatar}
                alt={selectedAdmin.fullName}
                className="h-14 w-14 rounded-full border border-amber-300 object-cover"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-amber-900">
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
                <p className="text-sm text-amber-900/80">{selectedAdmin.email}</p>
                <p className="text-xs text-amber-900/60">
                  Departments: {selectedAdmin.assignedDepartments.join(', ')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAdminPreset('all')}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"
              >
                Full control
              </button>
              <button
                type="button"
                onClick={() => handleAdminPreset('financeReports')}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-200 disabled:opacity-50"
              >
                Finance & reports
              </button>
              <button
                type="button"
                onClick={() => handleAdminPreset('none')}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Lock down
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-amber-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Active permissions
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">
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
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                High impact toggles
              </p>
              <p className="mt-2 text-2xl font-semibold text-red-700">
                {adminSummary.highImpactCount}
              </p>
              <p className="mt-1 text-xs text-red-600">
                Includes finance access and permission delegation.
              </p>
            </div>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                Permission admin
              </p>
              <p className="mt-2 text-2xl font-semibold text-indigo-700">
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
              className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm"
            >
              <header className="mb-4 flex items-start gap-3">
                <span className="text-xl">{metadata.icon}</span>
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                    {group.name}
                  </h4>
                  <p className="text-sm text-amber-900/80">
                    {metadata.description}
                  </p>
                </div>
              </header>
              <div className="space-y-3">
                {sortedItems.map(({ definition, value }) => (
                  <div
                    key={definition.key}
                    className={`rounded-lg border px-4 py-3 transition ${
                      value
                        ? 'border-amber-300 bg-amber-100'
                        : 'border-amber-100 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {definition.icon && (
                        <span className="mt-1 text-base text-amber-600">
                          {definition.icon}
                        </span>
                      )}
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-amber-900">
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
                        <p className="mt-1 text-sm text-amber-900/80">
                          {definition.description}
                        </p>
                        {definition.helper && (
                          <p className="mt-2 text-xs text-amber-900/70">
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
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          value ? 'bg-amber-600' : 'bg-amber-200'
                        } ${isSaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            value ? 'translate-x-5' : 'translate-x-1'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-6 text-white sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-sm uppercase tracking-widest text-red-200">
                Control Center
              </span>
              <h2 className="text-3xl font-bold">
                🔐 Permission Management Center
              </h2>
              <p className="mt-1 text-sm text-red-100">
                Micro-manage user access, reduce risk, and keep teams aligned.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-red-50 sm:grid-cols-4">
              <div>
                <p className="font-semibold text-white">Teachers</p>
                <p className="text-red-100">{teachers.length}</p>
              </div>
              <div>
                <p className="font-semibold text-white">Admins</p>
                <p className="text-red-100">{admins.length}</p>
              </div>
              <div>
                <p className="font-semibold text-white">Active role</p>
                <p className="text-red-100">
                  {selectedType === 'teacher' ? 'Teachers' : 'Admins'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Last action</p>
                <p className="text-red-100">
                  {feedback?.message ? 'Updated' : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto bg-gray-50 px-6 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
          <aside className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Role type</p>
              <p className="mt-1 text-xs text-gray-500">
                Switch between teacher and admin directories to start managing
                their access.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('teacher');
                    setSelectedUser('');
                    setFeedback(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
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
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    selectedType === 'admin'
                      ? 'bg-amber-500 text-white'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🛡️ Admins
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <label className="text-sm font-semibold text-gray-900">
                Select {selectedType === 'teacher' ? 'teacher' : 'admin'}
              </label>
              <select
                value={selectedUser}
                onChange={(event) => setSelectedUser(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
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

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">
                Safety checklist
              </p>
              <ul className="mt-3 space-y-2 text-xs text-gray-600">
                <li>• Review high-impact toggles regularly.</li>
                <li>• Pair communication access with accountability.</li>
                <li>• Keep permission presets aligned with school policy.</li>
              </ul>
            </section>
          </aside>

          <main className="space-y-6">
            {feedback && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
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
            {selectedType === 'teacher'
              ? renderTeacherDetail()
              : renderAdminDetail()}
          </main>
        </div>

        <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-4">
            <button
            type="button"
              onClick={onClose}
            className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionManager;
