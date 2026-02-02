import React, { useState, useMemo, memo } from 'react';
import { FixedSizeList } from 'react-window';
import { useData } from '../contexts/DataContext';
import Button from './ui/Button';

interface TeacherListProps {
  teachers?: any[];
  onTeacherSelect: (teacher: any) => void;
  onEditTeacher: (teacher: any) => void;
  onDeleteTeacher: (teacherId: string) => void | Promise<void>;
  onAddTeacher?: () => void;
  onCredentials?: (teacher: any) => void;
  onAnalytics?: (teacher: any) => void;
  onBulkOperations?: () => void;
}

const TeacherList: React.FC<TeacherListProps> = ({ 
  teachers: teachersProp, 
  onTeacherSelect, 
  onEditTeacher, 
  onDeleteTeacher, 
  onAddTeacher, 
  onCredentials, 
  onAnalytics, 
  onBulkOperations 
}) => {
  const { teachers: teachersFromContext, students, getStudentsByTeacher, refreshData } = useData();
  const teachers = teachersProp || teachersFromContext;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const getAssignedStudentsCount = (teacher: any) => {
    if (!teacher) return 0;
    const teacherDocId = teacher._id || teacher.teacherDocumentId || teacher.id;
    if (!teacherDocId) return 0;
    const assignedStudents = getStudentsByTeacher(teacherDocId);
    return assignedStudents.length;
  };

  const uniqueSpecializations = Array.from(new Set(teachers.map(t => t.department))) as string[];
  const uniqueStatuses = Array.from(new Set(teachers.map(t => t.status || 'active'))) as string[];
  const uniqueLocations = Array.from(new Set(teachers.map(t => t.location))) as string[];

  const filteredTeachers = useMemo(() => {
    let filtered = teachers.filter(teacher => {
      const matchesSearch = (teacher.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (teacher.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (teacher.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSpecialization = selectedSpecialization === 'all' || teacher.department === selectedSpecialization;
      const matchesStatus = selectedStatus === 'all' || (teacher.status || 'active') === selectedStatus;
      const matchesLocation = selectedLocation === 'all' || teacher.location === selectedLocation;
      
      return matchesSearch && matchesSpecialization && matchesStatus && matchesLocation;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = a.fullName;
          bValue = b.fullName;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'students':
          aValue = getAssignedStudentsCount(a);
          bValue = getAssignedStudentsCount(b);
          break;
        case 'salary':
          aValue = a.payroll?.monthlySalary || 0;
          bValue = b.payroll?.monthlySalary || 0;
          break;
        default:
          aValue = a.fullName;
          bValue = b.fullName;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [teachers, searchTerm, selectedSpecialization, selectedStatus, selectedLocation, sortBy, sortOrder, getAssignedStudentsCount]);

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTeachers = filteredTeachers.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      'on-leave': 'bg-amber-100 text-amber-700',
      probation: 'bg-blue-100 text-blue-700',
      suspended: 'bg-red-100 text-red-700'
    };
    
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
        {status.replace('-', ' ')}
      </span>
    );
  };

  const getLocationFlag = (location: string) => {
    const flags: Record<string, string> = {
      'Local': '🇺🇸',
      'Overseas Pakistan': '🇵🇰',
      'UK': '🇬🇧',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺'
    };
    return flags[location] || '🌍';
  };

  const getPerformanceRating = (teacher: any) => {
    const studentCount = getAssignedStudentsCount(teacher);
    const baseRating = Math.min(5, Math.max(1, 3 + (studentCount / 10)));
    return baseRating.toFixed(1);
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Mobile Card Component
  const TeacherCard = memo(({ teacher }: { teacher: any }) => {
    const studentCount = getAssignedStudentsCount(teacher);
    const rating = getPerformanceRating(teacher);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
        {/* Header: Avatar, Name, Admin Badge */}
        <div className="flex items-start gap-3 mb-4">
          <div className="relative flex-shrink-0">
            {teacher.avatar ? (
              <img 
                src={teacher.avatar} 
                alt={teacher.fullName || 'Teacher'} 
                className="h-12 w-12 rounded-full object-cover border-2 border-gray-200" 
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center border-2 border-gray-200">
                <span className="text-primary-700 font-semibold text-sm">
                  {getInitials(teacher.fullName || 'Unknown')}
                </span>
              </div>
            )}
            {teacher.isAdmin && (
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">A</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{teacher.fullName || 'Unknown'}</h3>
              {teacher.isAdmin && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-full whitespace-nowrap flex-shrink-0">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 truncate">{teacher.department || (teacher.isAdmin ? 'Administration' : 'General')}</p>
            <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]" title={teacher.id}>
              ID: {teacher.id}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
          <div>
            <p className="caption mb-0.5">Email</p>
            <p className="body-text text-gray-900 truncate">{teacher.email || 'No email'}</p>
          </div>
          <div>
            <p className="caption mb-0.5">Phone</p>
            <p className="body-text text-gray-900">{teacher.phoneNumber || teacher.contact || 'No contact'}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Students</p>
            <p className="text-sm font-semibold text-blue-600">{studentCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Rating</p>
            <div className="flex items-center gap-1">
              <span className="text-amber-500">⭐</span>
              <span className="text-sm font-semibold text-gray-900">{rating}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Location</p>
            <div className="flex items-center gap-1">
              <span>{getLocationFlag(teacher.location || 'Unknown')}</span>
              <span className="text-sm text-gray-900 truncate">{teacher.location || 'Unknown'}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Status</p>
            {getStatusBadge(teacher.status || 'active')}
          </div>
        </div>

        {/* Salary */}
        {!teacher.isAdmin && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-0.5">Salary</p>
            <p className="text-sm font-semibold text-gray-900">
              {teacher.payroll?.currency === 'USD' ? '$' : 'Rs'}{teacher.payroll?.monthlySalary?.toLocaleString() || '0'}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
          <Button variant="primary" size="md" onClick={() => onTeacherSelect(teacher)} className="w-full sm:w-auto min-h-[44px]" fullWidthMobile>
            View
          </Button>
          {!teacher.isAdmin && (
            <Button variant="outline" size="md" onClick={() => onEditTeacher(teacher)} className="w-full sm:w-auto min-h-[44px]" fullWidthMobile>
              Edit
            </Button>
          )}
          {!teacher.isAdmin && (
            <Button variant="outline" size="md" onClick={() => onDeleteTeacher(teacher.id)} className="w-full sm:w-auto min-h-[44px]" fullWidthMobile>
              Delete
            </Button>
          )}
          {onCredentials && (
            <Button variant="outline" size="md" onClick={() => onCredentials(teacher)} className="w-full sm:w-auto min-h-[44px]" fullWidthMobile>
              Credentials
            </Button>
          )}
          {onAnalytics && (
            <Button variant="outline" size="md" onClick={() => onAnalytics(teacher)} className="w-full sm:w-auto min-h-[44px]" fullWidthMobile>
              Analytics
            </Button>
          )}
        </div>
      </div>
    );
  });
  TeacherCard.displayName = 'TeacherCard';

  // Desktop Table Row Component
  const TeacherRow = memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: any }) => {
    const teacher = data.teachers[index];
    if (!teacher) return null;

    return (
      <tr 
        style={style}
        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {/* Teacher Name & Avatar */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              {teacher.avatar ? (
                <img 
                  src={teacher.avatar} 
                  alt={teacher.fullName || 'Teacher'} 
                  className="h-10 w-10 rounded-full object-cover border border-gray-200" 
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center border border-gray-200">
                  <span className="text-primary-700 font-semibold text-xs">
                    {getInitials(teacher.fullName || 'Unknown')}
                  </span>
                </div>
              )}
              {teacher.isAdmin && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-[7px] text-white font-bold">A</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate">{teacher.fullName || 'Unknown'}</p>
                {teacher.isAdmin && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-100 text-purple-700 rounded-full whitespace-nowrap flex-shrink-0">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{teacher.department || (teacher.isAdmin ? 'Administration' : 'General')}</p>
            </div>
          </div>
        </td>

        {/* ID */}
        <td className="px-4 py-3">
          <p className="text-xs font-mono text-gray-600 truncate max-w-[100px]" title={teacher.id}>
            {teacher.id}
          </p>
        </td>

        {/* Contact */}
        <td className="px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-900 truncate">{teacher.email || 'No email'}</p>
            <p className="text-xs text-gray-500 truncate">{teacher.phoneNumber || teacher.contact || 'No contact'}</p>
          </div>
        </td>

        {/* Specialization */}
        <td className="px-4 py-3">
          <p className="text-sm text-gray-700 truncate">{teacher.department || 'General'}</p>
        </td>

        {/* Location */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex-shrink-0">{getLocationFlag(teacher.location || 'Unknown')}</span>
            <span className="text-sm text-gray-700 truncate">{teacher.location || 'Unknown'}</span>
          </div>
        </td>

        {/* Students */}
        <td className="px-4 py-3">
          <p className="text-sm font-semibold text-blue-600">{data.getAssignedStudentsCount(teacher)}</p>
        </td>

        {/* Performance */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="text-amber-500 flex-shrink-0">⭐</span>
            <span className="text-sm font-semibold text-gray-900">{data.getPerformanceRating(teacher)}</span>
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          {data.getStatusBadge(teacher.status || 'active')}
        </td>

        {/* Salary */}
        <td className="px-4 py-3">
          {teacher.isAdmin ? (
            <span className="text-sm text-gray-400">N/A</span>
          ) : (
            <p className="text-sm font-semibold text-gray-900">
              {teacher.payroll?.currency === 'USD' ? '$' : 'Rs'}{teacher.payroll?.monthlySalary?.toLocaleString() || '0'}
            </p>
          )}
        </td>

        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => data.onTeacherSelect(teacher)} className="min-h-[44px]">
              View
            </Button>
            {!teacher.isAdmin && (
              <Button variant="outline" size="sm" onClick={() => data.onEditTeacher(teacher)} className="min-h-[44px]">
                Edit
              </Button>
            )}
            {!teacher.isAdmin && (
              <Button variant="outline" size="sm" onClick={() => data.onDeleteTeacher(teacher.id)} className="min-h-[44px]">
                Delete
              </Button>
            )}
            {data.onCredentials && (
              <Button variant="outline" size="sm" onClick={() => data.onCredentials(teacher)} className="min-h-[44px]">
                Credentials
              </Button>
            )}
            {data.onAnalytics && (
              <Button variant="outline" size="sm" onClick={() => data.onAnalytics(teacher)} className="min-h-[44px]">
                Analytics
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  });
  TeacherRow.displayName = 'TeacherRow';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="caption text-gray-600">
          <span className="font-medium text-gray-900">{filteredTeachers.length}</span>
          {filteredTeachers.length === 1 ? ' teacher' : ' teachers'}
          {filteredTeachers.length !== teachers.length && ` (from ${teachers.length} total)`}
        </p>
        <div className="flex flex-wrap gap-2">
          {onAddTeacher && (
            <Button onClick={onAddTeacher} variant="primary" size="md" fullWidthMobile className="min-h-[44px]">
              Add teacher
            </Button>
          )}
          {refreshData && (
            <Button
              onClick={async () => { if (refreshData) await refreshData(); }}
              variant="outline"
              size="md"
              className="min-h-[44px]"
              title="Refresh list"
            >
              Refresh
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
        <h2 className="heading-card mb-3">Search and filters</h2>
        
        <div className="space-y-4">
        <div>
          <label className="block body-text font-medium text-gray-700 mb-1">Search by name or email</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search..."
            className="block w-full min-h-[44px] pl-3 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary body-text"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block body-text font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="block w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary body-text bg-white"
            >
              <option value="all">All subjects</option>
              {uniqueSpecializations.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block body-text font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="block w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary body-text bg-white"
            >
              <option value="all">All</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status.replace('-', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block body-text font-medium text-gray-700 mb-1">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="block w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary body-text bg-white"
            >
              <option value="all">All</option>
              {uniqueLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
        </div>

          {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-3">
          <Button
            onClick={() => {
              setSearchTerm('');
              setSelectedSpecialization('all');
              setSelectedStatus('all');
              setSelectedLocation('all');
            }}
            variant="outline"
            size="md"
            className="min-h-[44px]"
          >
            Clear filters
          </Button>
          <Button
            onClick={() => { setSortBy('name'); setSortOrder('asc'); }}
            variant="outline"
            size="md"
            className="min-h-[44px]"
          >
            Reset sort
          </Button>
        </div>
        </div>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {paginatedTeachers.length > 0 ? (
          paginatedTeachers.map((teacher, index) => (
            <TeacherCard key={teacher.id || teacher._id || index} teacher={teacher} />
          ))
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="body-text font-medium text-gray-900">No teachers found</p>
            <p className="caption mt-1">Try changing your search or filters</p>
          </div>
        )}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Teachers</h2>
            <p className="caption">
              Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">{Math.min(startIndex + itemsPerPage, filteredTeachers.length)}</span> of{' '}
              <span className="font-semibold text-gray-900">{filteredTeachers.length}</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-300">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Teacher</span>
                    {sortBy === 'name' && (
                      <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Contact</span>
                    {sortBy === 'email' && (
                      <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('students')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Students</span>
                    {sortBy === 'students' && (
                      <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('salary')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Salary</span>
                    {sortBy === 'salary' && (
                      <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTeachers.length > 0 ? (
                paginatedTeachers.map((teacher, index) => (
                  <TeacherRow
                    key={teacher.id || teacher._id || index}
                    index={index}
                    style={{}}
                    data={{
                      teachers: paginatedTeachers,
                      getLocationFlag,
                      getAssignedStudentsCount,
                      getPerformanceRating,
                      getStatusBadge,
                      onTeacherSelect,
                      onEditTeacher,
                      onDeleteTeacher,
                      onCredentials,
                      onAnalytics
                    }}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="mt-4 text-sm font-medium text-gray-900">No teachers found</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Try adjusting your search or filter criteria
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1 px-4">
                  <span className="text-sm text-gray-700">
                    Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
                    <span className="font-semibold text-gray-900">{totalPages}</span>
                  </span>
                </div>
                
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="md:hidden bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-gray-700">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-1 px-4">
                <span className="text-sm text-gray-700">
                  Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
                  <span className="font-semibold text-gray-900">{totalPages}</span>
                </span>
              </div>
              
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherList;
