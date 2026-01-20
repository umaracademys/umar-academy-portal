import React, { useState } from 'react';
import { PermissionToggle } from './PermissionToggle';
import { TeacherPermissions, AdminPermissions } from '../../types';

interface PermissionItem {
  key: string;
  label: string;
  description: string;
  risk?: 'low' | 'medium' | 'high';
  isDefault?: boolean;
  value: boolean;
}

interface PermissionGroupProps {
  title: string;
  icon?: string;
  description?: string;
  permissions: PermissionItem[];
  onPermissionChange: (key: string, value: boolean) => Promise<void>;
  disabled?: boolean;
}

export const PermissionGroup: React.FC<PermissionGroupProps> = React.memo(({
  title,
  icon = '⚙️',
  description,
  permissions,
  onPermissionChange,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const activeCount = permissions.filter(p => p.value).length;
  const totalCount = permissions.length;

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {activeCount}/{totalCount} active
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-4">
          {permissions.map((permission) => (
            <PermissionToggle
              key={permission.key}
              label={permission.label}
              description={permission.description}
              value={permission.value}
              onChange={(value) => onPermissionChange(permission.key, value)}
              risk={permission.risk}
              isDefault={permission.isDefault}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
});

PermissionGroup.displayName = 'PermissionGroup';
