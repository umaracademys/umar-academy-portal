import React, { useState, useMemo } from 'react';
import Button from './ui/Button';
import RolePermissionRow from './RolePermissionRow';
import type { RoleId } from '../hooks/usePermissions';
import type { PermissionAction } from '../hooks/usePermissions';

export interface PermissionModulePanelProps {
  moduleName: string;
  moduleId: string;
  actions: PermissionAction[];
  values: Record<RoleId, Record<string, boolean>>;
  onChange: (role: RoleId, key: string, value: boolean) => void;
  onSelectAllForAction?: (role: RoleId, key: string, value: boolean) => void;
  changedKeys?: Set<string>;
  /** Filter permissions by name/key; empty string shows all */
  filterSearch?: string;
  /** When true, on mobile this panel is collapsed by default (accordion) */
  defaultCollapsedOnMobile?: boolean;
}

const ROLES: { id: RoleId; name: string }[] = [
  { id: 'teacher', name: 'Teacher' },
  { id: 'admin', name: 'Admin' },
  { id: 'student', name: 'Student' },
];

function matchesFilter(label: string, key: string, filter?: string): boolean {
  if (!filter || !filter.trim()) return true;
  const q = filter.trim().toLowerCase();
  return label.toLowerCase().includes(q) || key.toLowerCase().includes(q);
}

const PermissionModulePanel: React.FC<PermissionModulePanelProps> = ({
  moduleName,
  moduleId,
  actions,
  values,
  onChange,
  onSelectAllForAction,
  changedKeys = new Set(),
  filterSearch = '',
  defaultCollapsedOnMobile = true,
}) => {
  const [mobileExpanded, setMobileExpanded] = useState(!defaultCollapsedOnMobile);

  const filteredActions = useMemo(() => {
    return actions.filter((a) => matchesFilter(a.label, a.key, filterSearch));
  }, [actions, filterSearch]);

  if (actions.length === 0) return null;
  if (filteredActions.length === 0) return null;

  const tableContent = (
    <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-gray-200">
      <table className="w-full min-w-[320px] border-collapse" role="grid">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="sticky left-0 z-[2] top-0 bg-gray-50 px-3 sm:px-4 py-3 text-left caption font-medium text-gray-700 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] min-w-[100px] sm:min-w-[120px]">
              Role
            </th>
            {filteredActions.map(({ key, label, description }) => (
              <th key={key} className="sticky top-0 z-[2] bg-gray-50 px-2 sm:px-3 py-3 text-left caption font-medium text-gray-700 whitespace-nowrap border-b border-gray-200" title={description || label}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                  <span>{label}</span>
                  {onSelectAllForAction && (
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!min-h-0 !py-0.5 !px-1.5 text-xs"
                        onClick={() => {
                          ROLES.forEach((r) => onSelectAllForAction!(r.id, key, true));
                        }}
                      >
                        All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!min-h-0 !py-0.5 !px-1.5 text-xs"
                        onClick={() => {
                          ROLES.forEach((r) => onSelectAllForAction!(r.id, key, false));
                        }}
                      >
                        None
                      </Button>
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROLES.map(({ id, name }) => (
            <RolePermissionRow
              key={id}
              roleName={name}
              permissions={values[id] ?? {}}
              actions={filteredActions}
              onChange={(key, value) => onChange(id, key, value)}
              changedKeys={changedKeys}
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="bg-white rounded-lg border border-gray-200 overflow-hidden p-4 sm:p-6">
      {/* Desktop: always show header + table. Mobile: accordion header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="heading-section">{moduleName}</h2>
          <p className="caption mt-0.5 text-gray-600">Manage {moduleName.toLowerCase()} permissions</p>
        </div>
        <div className="sm:hidden flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileExpanded((e) => !e)}
            aria-expanded={mobileExpanded}
            aria-controls={`permission-panel-${moduleId}`}
          >
            {mobileExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>
      <div id={`permission-panel-${moduleId}`} className="hidden sm:block">
        {tableContent}
      </div>
      <div className="sm:hidden">
        {mobileExpanded ? tableContent : null}
      </div>
    </section>
  );
};

export default PermissionModulePanel;
