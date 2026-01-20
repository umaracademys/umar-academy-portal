import React, { useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import { Teacher, Admin } from '../../types';
import { UserCard } from './UserCard';
import { SearchBar } from './SearchBar';
import { useDebounce } from './hooks/useDebounce';

interface UserListProps {
  users: (Teacher | Admin)[];
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showCheckboxes?: boolean;
  selectedUserIds?: Set<string>;
  onToggleUser?: (userId: string, checked: boolean) => void;
  type: 'teacher' | 'admin';
}

export const UserList: React.FC<UserListProps> = React.memo(({
  users,
  selectedUserId,
  onSelectUser,
  searchQuery,
  onSearchChange,
  showCheckboxes = false,
  selectedUserIds = new Set(),
  onToggleUser,
  type,
}) => {
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredUsers = useMemo(() => {
    if (!debouncedSearch.trim()) return users;

    const query = debouncedSearch.toLowerCase();
    return users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [users, debouncedSearch]);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const user = filteredUsers[index];
    if (!user) return null;

    return (
      <div style={style}>
        <div className="px-2">
          <UserCard
            user={user}
            isSelected={selectedUserId === user.id}
            onClick={() => onSelectUser(user.id)}
            showCheckbox={showCheckboxes}
            isChecked={selectedUserIds.has(user.id)}
            onCheck={(checked) => onToggleUser?.(user.id, checked)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={`Search ${type === 'teacher' ? 'teachers' : 'admins'}...`}
        />
        <div className="mt-2 text-xs text-gray-500">
          {filteredUsers.length} of {users.length} {type === 'teacher' ? 'teachers' : 'admins'}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm font-medium">No {type === 'teacher' ? 'teachers' : 'admins'} found</p>
            <p className="text-xs mt-1">Try adjusting your search</p>
          </div>
        ) : (
          <FixedSizeList
            height={window.innerHeight - 200} // Dynamic height based on viewport
            itemCount={filteredUsers.length}
            itemSize={80}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {Row}
          </FixedSizeList>
        )}
      </div>
    </div>
  );
});

UserList.displayName = 'UserList';
