import React from 'react';
import { Teacher, Admin } from '../../types';

interface UserCardProps {
  user: Teacher | Admin;
  isSelected: boolean;
  onClick: () => void;
  showCheckbox?: boolean;
  isChecked?: boolean;
  onCheck?: (checked: boolean) => void;
}

export const UserCard: React.FC<UserCardProps> = React.memo(({
  user,
  isSelected,
  onClick,
  showCheckbox = false,
  isChecked = false,
  onCheck,
}) => {
  const avatar = user.avatar || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=${isSelected ? '6366F1' : 'E5E7EB'}&color=${isSelected ? 'fff' : '111827'}`;

  const handleCheckboxClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onCheck?.(e.target.checked);
  };

  const handleCheckboxClickWrapper = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
        ${isSelected 
          ? 'bg-blue-50 border-blue-300 shadow-sm' 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxClick}
          onClick={handleCheckboxClickWrapper}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      )}
      <img
        src={avatar}
        alt={user.fullName}
        className="w-10 h-10 rounded-full border-2 border-gray-200 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {user.fullName}
          </p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              user.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {user.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {user.email}
        </p>
      </div>
      {isSelected && (
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
});

UserCard.displayName = 'UserCard';
