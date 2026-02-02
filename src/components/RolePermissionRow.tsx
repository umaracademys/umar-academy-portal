import React from 'react';

export interface RolePermissionRowProps {
  roleName: string;
  permissions: Record<string, boolean>;
  actions: { key: string; label: string; description?: string }[];
  onChange: (key: string, value: boolean) => void;
  changedKeys?: Set<string>;
}

const RolePermissionRow: React.FC<RolePermissionRowProps> = ({
  roleName,
  permissions,
  actions,
  onChange,
  changedKeys = new Set(),
}) => {
  return (
    <tr className="group border-b border-gray-200 last:border-b-0 bg-white hover:bg-gray-50/50">
      <td className="sticky left-0 z-[1] bg-white group-hover:bg-gray-50/50 px-3 sm:px-4 py-3 align-middle border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] min-w-[100px] sm:min-w-[120px]">
        <span className="body-text text-gray-800 font-medium">{roleName}</span>
      </td>
      {actions.map(({ key, label, description }) => {
        const checked = !!permissions[key];
        const changed = changedKeys.has(key);
        const tooltip = description || label;
        return (
          <td key={key} className="px-2 sm:px-3 py-2 align-middle">
            <label
              className={`flex items-center justify-center min-h-[44px] cursor-pointer rounded border border-transparent px-2 ${changed ? 'bg-amber-50' : ''}`}
              title={tooltip}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                aria-label={`${roleName} – ${label}`}
              />
            </label>
          </td>
        );
      })}
    </tr>
  );
};

export default RolePermissionRow;
