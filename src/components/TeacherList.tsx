import React, { useState, useMemo, memo } from 'react';
import { FixedSizeList } from 'react-window';
import { useData } from '../contexts/DataContext';
import Button from './Button';

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
  const { teachers: teachersFromContext, students, getStudentsByTeacher } = useData();
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
    if (!teacher || !teacher.id) return 0;
    const assignedStudents = getStudentsByTeacher(teacher.id);
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
          aValue = a.assignedStudents?.length || 0;
          bValue = b.assignedStudents?.length || 0;
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
  }, [teachers, searchTerm, selectedSpecialization, selectedStatus, selectedLocation, sortBy, sortOrder]);

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
      active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      inactive: 'bg-gray-50 text-gray-700 border-gray-200',
      'on-leave': 'bg-amber-50 text-amber-700 border-amber-200',
      probation: 'bg-blue-50 text-blue-700 border-blue-200',
      suspended: 'bg-red-50 text-red-700 border-red-200'
    };
    
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
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
    // Use the actual assigned students count from getAssignedStudentsCount
    const studentCount = getAssignedStudentsCount(teacher);
    const baseRating = Math.min(5, Math.max(1, 3 + (studentCount / 10)));
    return baseRating.toFixed(1);
  };

  const TeacherRow = memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: any }) => {
    const teacher = data.teachers[index];
    if (!teacher) return null;

    return (
      <div 
        style={style} 
        className="grid grid-cols-[2fr,1fr,2fr,1fr,1.5fr,1fr,1fr,1.5fr,2fr] gap-0 border-b border-gray-200 hover:bg-gray-50 items-center"
      >
        {/* Teacher Name & Info */}
        <div className="px-2 py-2">
          <div className="flex items-center">
            <div className="relative mr-2">
              <img 
                src={teacher.avatar || '/default-avatar.png'} 
                alt={teacher.fullName || 'Teacher'} 
                className="h-7 w-7 rounded-full object-cover" 
              />
              {teacher.isAdmin && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-purple-500 rounded-full border border-white flex items-center justify-center">
                  <span className="text-[6px] text-white font-bold">A</span>
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-xs">{teacher.fullName || 'Unknown'}</p>
              <p className="text-[10px] text-gray-500">{teacher.department || (teacher.isAdmin ? 'Administration' : 'General')}</p>
            </div>
          </div>
        </div>
        
        {/* ID */}
        <div className="px-2 py-2 text-[10px] font-mono text-gray-600 truncate" title={teacher.id}>{teacher.id}</div>
        
        {/* Contact Info */}
        <div className="px-2 py-2 text-xs">
          <div>
            <p className="text-gray-900">{teacher.email || 'No email'}</p>
            <p className="text-[10px] text-gray-500">{teacher.phoneNumber || teacher.contact || 'No contact'}</p>
          </div>
        </div>
        
        {/* Specialization */}
        <div className="px-2 py-2 text-xs">{teacher.department || 'General'}</div>
        
        {/* Location */}
        <div className="px-2 py-2 text-xs">
          <div className="flex items-center gap-1">
            <span>{data.getLocationFlag(teacher.location || 'Unknown')}</span>
            <span>{teacher.location || 'Unknown'}</span>
          </div>
        </div>
        
        {/* Students Count */}
        <div className="px-2 py-2 text-xs font-semibold text-blue-600">{data.getAssignedStudentsCount(teacher)}</div>
        
        {/* Performance Rating */}
        <div className="px-2 py-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-amber-500">⭐</span>
            <span className="font-semibold text-gray-900">{data.getPerformanceRating(teacher)}</span>
          </div>
        </div>
        
        {/* Status */}
        <div className="px-2 py-2">{data.getStatusBadge(teacher.status || 'active')}</div>
        
        {/* Salary */}
        <div className="px-2 py-2 text-xs font-semibold">
          {teacher.isAdmin ? (
            <span className="text-gray-400">N/A</span>
          ) : (
            <>
              {teacher.payroll?.currency === 'USD' ? '$' : 'Rs'}{teacher.payroll?.monthlySalary?.toLocaleString() || '0'}
            </>
          )}
        </div>
        
        {/* Actions - All in one column like StudentList */}
        <div className="px-2 py-2">
          <div className="flex space-x-1">
            <button
              onClick={() => data.onTeacherSelect(teacher)}
              className="text-primary-600 hover:text-primary-800 text-xs font-medium"
            >
              View
            </button>
            {!teacher.isAdmin && (
              <button
                onClick={() => data.onEditTeacher(teacher)}
                className="text-gold-600 hover:text-gold-800 text-xs font-medium"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => data.onDeleteTeacher(teacher.id)}
              className="text-red-600 hover:text-red-800 text-xs font-medium"
            >
              Del
            </button>
            {data.onCredentials && (
              <button
                onClick={() => data.onCredentials(teacher)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Credentials
              </button>
            )}
            {data.onAnalytics && (
              <button
                onClick={() => data.onAnalytics(teacher)}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                Analytics
              </button>
            )}
          </div>
        </div>
      </div>
    );
  });
  TeacherRow.displayName = 'TeacherRow';

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Directory</h1>
            <p className="text-gray-600">
              Manage and view all registered teachers and administrators
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {onAddTeacher && (
              <Button
                onClick={onAddTeacher}
                variant="primary"
                size="md"
              >
                <span className="mr-2">+</span>
                Add Teacher
              </Button>
            )}
            <Button variant="outline" size="md">
              Export
            </Button>
            <Button variant="outline" size="md">
              Import
            </Button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{filteredTeachers.length}</span>
            <span>{filteredTeachers.length === 1 ? 'teacher' : 'teachers'} found</span>
            {filteredTeachers.length !== teachers.length && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">Filtered from {teachers.length} total</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modern Filter Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Search & Filters</h2>
          <p className="text-sm text-gray-500">Refine your search to find specific teachers</p>
        </div>
        
        <div className="space-y-4">
          {/* Search Bar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Teachers
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or ID..."
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
              />
            </div>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialization
              </label>
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm bg-white"
              >
                <option value="all">All Specializations</option>
                {uniqueSpecializations.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm bg-white"
              >
                <option value="all">All Status</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status.replace('-', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm bg-white"
              >
                <option value="all">All Locations</option>
                {uniqueLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={() => {
                setSearchTerm('');
                setSelectedSpecialization('all');
                setSelectedStatus('all');
                setSelectedLocation('all');
              }}
              variant="secondary"
              size="sm"
            >
              Clear Filters
            </Button>
            <Button
              onClick={() => {
                setSortBy('name');
                setSortOrder('asc');
              }}
              variant="secondary"
              size="sm"
            >
              Reset Sort
            </Button>
          </div>
        </div>
        </div>

      {/* Modern Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Teachers</h2>
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">{Math.min(startIndex + itemsPerPage, filteredTeachers.length)}</span> of{' '}
              <span className="font-semibold text-gray-900">{filteredTeachers.length}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr,1fr,2fr,1fr,1.5fr,1fr,1fr,1.5fr,2fr] gap-0 bg-gray-50 border-b-2 border-gray-300">
            <div 
              className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center space-x-1">
                <span>Teacher</span>
                {sortBy === 'name' && (
                  <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">ID</div>
            <div 
              className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('email')}
            >
              <div className="flex items-center space-x-1">
                <span>Contact</span>
                {sortBy === 'email' && (
                  <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Specialization</div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Location</div>
            <div 
              className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('students')}
            >
              <div className="flex items-center space-x-1">
                <span>Students</span>
                {sortBy === 'students' && (
                  <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Performance</div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Status</div>
            <div 
              className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('salary')}
            >
              <div className="flex items-center space-x-1">
                <span>Salary</span>
                {sortBy === 'salary' && (
                  <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </div>
            <div className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Actions</div>
          </div>

          {/* Virtualized Body */}
          {paginatedTeachers.length > 0 ? (
            <FixedSizeList
              height={Math.min(600, paginatedTeachers.length * 60)}
              itemCount={paginatedTeachers.length}
              itemSize={60}
              width="100%"
              itemData={{
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
              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {TeacherRow}
            </FixedSizeList>
          ) : (
            <div className="px-6 py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-gray-900">No teachers found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
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
    </div>
  );
};

export default TeacherList;
