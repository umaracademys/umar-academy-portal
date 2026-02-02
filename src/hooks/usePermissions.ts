/**
 * usePermissions – load and save role-based permissions (Teacher, Admin).
 * Data comes from useBackendData (teachers, admins); apply updates each teacher/admin via updateTeacher/updateAdmin.
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useLoadingState } from './useLoadingState';
import {
  ALL_TEACHER_PERMISSIONS,
  ALL_ADMIN_PERMISSIONS,
  type PermissionDefinition,
} from '../shared/permissions';
import type { TeacherPermissions } from '../types';
import type { AdminPermissions } from '../types';

export type RoleId = 'teacher' | 'admin' | 'student';

export interface PermissionAction {
  key: string;
  label: string;
  description?: string;
}

export interface PermissionModuleConfig {
  id: string;
  name: string;
  actions: PermissionAction[];
}

/** Build module list for UI: People, Assignments, Attendance, Messages, Reports, Tickets, Mushaf, Settings */
const MODULE_ORDER = [
  'people',
  'assignments',
  'attendance',
  'messages',
  'reports',
  'tickets',
  'mushaf',
  'settings',
] as const;

const MODULE_DISPLAY: Record<string, string> = {
  people: 'People (Students & Teachers)',
  assignments: 'Assignments',
  attendance: 'Attendance',
  messages: 'Messages',
  reports: 'Reports',
  tickets: 'Tickets',
  mushaf: 'Mushaf',
  settings: 'Settings',
  security: 'Settings',
  financial: 'Settings',
  notifications: 'Settings',
};

function collectModules(): PermissionModuleConfig[] {
  const byModule = new Map<string, PermissionAction[]>();

  const add = (def: PermissionDefinition) => {
    const mod = def.module in MODULE_DISPLAY ? def.module : 'settings';
    const displayMod = MODULE_ORDER.includes(mod as (typeof MODULE_ORDER)[number]) ? mod : 'settings';
    if (!byModule.has(displayMod)) byModule.set(displayMod, []);
    const list = byModule.get(displayMod)!;
    if (!list.some((a) => a.key === def.key)) list.push({ key: def.key, label: def.label, description: def.description });
  };

  ALL_TEACHER_PERMISSIONS.forEach(add);
  ALL_ADMIN_PERMISSIONS.forEach(add);

  return MODULE_ORDER.filter((id) => byModule.has(id)).map((id) => ({
    id,
    name: MODULE_DISPLAY[id] || id,
    actions: byModule.get(id) || [],
  }));
}

const MODULES = collectModules();

function allPermissionKeys(): string[] {
  const set = new Set<string>();
  ALL_TEACHER_PERMISSIONS.forEach((p) => set.add(p.key));
  ALL_ADMIN_PERMISSIONS.forEach((p) => set.add(p.key));
  return Array.from(set);
}

function defaultTeacherValues(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  ALL_TEACHER_PERMISSIONS.forEach((p) => (out[p.key] = p.defaultTeacher));
  return out;
}

function defaultAdminValues(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  ALL_ADMIN_PERMISSIONS.forEach((p) => (out[p.key] = p.defaultAdmin));
  allPermissionKeys().forEach((k) => {
    if (out[k] === undefined) out[k] = false;
  });
  return out;
}

function defaultStudentValues(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  allPermissionKeys().forEach((k) => (out[k] = false));
  return out;
}

function mergePerms(
  target: Record<string, boolean>,
  source: Record<string, boolean> | undefined,
  defaults: Record<string, boolean>
): Record<string, boolean> {
  const out = { ...defaults };
  allPermissionKeys().forEach((k) => {
    if (source && typeof source[k] === 'boolean') out[k] = source[k];
    else if (typeof target[k] === 'boolean') out[k] = target[k];
  });
  return out;
}

export interface UsePermissionsState {
  values: Record<RoleId, Record<string, boolean>>;
  loading: boolean;
  error: string | null;
  unsavedChanges: boolean;
  modules: PermissionModuleConfig[];
  setPermission: (role: RoleId, key: string, value: boolean) => void;
  setAllForAction: (role: RoleId, key: string, value: boolean) => void;
  apply: () => Promise<boolean>;
  reset: () => void;
  refresh: () => Promise<void>;
  changedKeys: Set<string>;
}

export function usePermissions(): UsePermissionsState {
  const { teachers, admins, updateTeacher, updateAdmin, refreshData } = useBackendData();
  const { loading, error, clearError, run } = useLoadingState(false);

  const keys = useMemo(() => allPermissionKeys(), []);
  const defaultTeacher = useMemo(() => defaultTeacherValues(), []);
  const defaultAdmin = useMemo(() => defaultAdminValues(), []);

  const initialValuesRef = useRef<Record<RoleId, Record<string, boolean>> | null>(null);

  const [values, setValues] = useState<Record<RoleId, Record<string, boolean>>>(() => ({
    teacher: { ...defaultTeacher },
    admin: { ...defaultAdmin },
    student: { ...defaultStudentValues() },
  }));

  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());

  const defaultStudent = useMemo(() => defaultStudentValues(), []);

  useEffect(() => {
    const teacherPerms = (teachers && teachers[0]?.permissions) as TeacherPermissions | undefined;
    const adminPerms = (admins && admins[0]?.permissions) as AdminPermissions | undefined;
    const teacher = mergePerms(defaultTeacher, teacherPerms as Record<string, boolean> | undefined, defaultTeacher);
    const admin = mergePerms(defaultAdmin, adminPerms as Record<string, boolean> | undefined, defaultAdmin);
    const next = { teacher, admin, student: { ...defaultStudent } };
    setValues(next);
    if (initialValuesRef.current === null) initialValuesRef.current = JSON.parse(JSON.stringify(next));
    else initialValuesRef.current = JSON.parse(JSON.stringify(next));
    setChangedKeys(new Set());
  }, [teachers, admins, defaultTeacher, defaultAdmin, defaultStudent]);

  const unsavedChanges = useMemo(() => {
    const init = initialValuesRef.current;
    if (!init) return false;
    for (const role of ['teacher', 'admin', 'student'] as RoleId[]) {
      for (const k of keys) {
        if (values[role]?.[k] !== init[role]?.[k]) return true;
      }
    }
    return false;
  }, [values, keys]);

  const setPermission = useCallback((role: RoleId, key: string, value: boolean) => {
    setValues((prev) => ({
      ...prev,
      [role]: { ...prev[role], [key]: value },
    }));
    setChangedKeys((prev) => new Set(prev).add(key));
  }, []);

  const setAllForAction = useCallback((role: RoleId, key: string, value: boolean) => {
    setValues((prev) => ({
      ...prev,
      [role]: { ...prev[role], [key]: value },
    }));
    setChangedKeys((prev) => new Set(prev).add(key));
  }, []);

  const refresh = useCallback(async () => {
    clearError();
    await run(async () => {
      await refreshData();
    });
  }, [run, refreshData, clearError]);

  const reset = useCallback(() => {
    if (initialValuesRef.current) {
      setValues(JSON.parse(JSON.stringify(initialValuesRef.current)));
      setChangedKeys(new Set());
    } else {
      setValues({
        teacher: { ...defaultTeacher },
        admin: { ...defaultAdmin },
        student: defaultStudentValues(),
      });
      setChangedKeys(new Set());
    }
  }, [defaultTeacher, defaultAdmin]);

  const apply = useCallback(async (): Promise<boolean> => {
    if (!updateTeacher || !updateAdmin) return false;
    clearError();
    const ok = await run(async () => {
      const teacherPerms = { ...values.teacher };
      const adminPerms = { ...values.admin };
      for (const t of teachers || []) {
        if (t.id) await updateTeacher(t.id, { permissions: teacherPerms as TeacherPermissions });
      }
      for (const a of admins || []) {
        if (a.id) await updateAdmin(a.id, { permissions: adminPerms as AdminPermissions });
      }
      await refreshData();
      initialValuesRef.current = JSON.parse(JSON.stringify(values));
      setChangedKeys(new Set());
    });
    return !!ok;
  }, [values, teachers, admins, updateTeacher, updateAdmin, refreshData, run, clearError]);

  return {
    values,
    loading,
    error,
    unsavedChanges,
    modules: MODULES,
    setPermission,
    setAllForAction,
    apply,
    reset,
    refresh,
    changedKeys,
  };
}
