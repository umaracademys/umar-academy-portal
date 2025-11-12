import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import Card from './Card';

interface TeacherListProps {
  onTeacherSelect: (teacher: any) => void;
  onEditTeacher: (teacher: any) => void;
  onDeleteTeacher: (teacherId: string) => void | Promise<void>;
  onAddTeacher?: () => void;
  onCredentials?: (teacher: any) => void;
  onAnalytics?: (teacher: any) => void;
  onBulkOperations?: () => void;
}

const TeacherList: React.FC<TeacherListProps> = ({ onTeacherSelect, onEditTeacher, onDeleteTeacher, onAddTeacher, onCredentials, onAnalytics, onBulkOperations }) => {
  const { teachers, students } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Get unique values for filters
  const uniqueSpecializations = Array.from(new Set(teachers.map(t => t.department))) as string[];
  const uniqueStatuses = Array.from(new Set(teachers.map(t => t.status || 'active'))) as string[];
  const uniqueLocations = Array.from(new Set(teachers.map(t => t.location))) as string[];

  // Filter and sort teachers
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

    // Sort teachers
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
          aValue = a.payroll.monthlySalary;
          bValue = b.payroll.monthlySalary;
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

  // Pagination
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
      active: 'bg-green-100 text-green-800 border-green-300',
      inactive: 'bg-gray-100 text-gray-800 border-gray-300',
      'on-leave': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      probation: 'bg-blue-100 text-blue-800 border-blue-300',
      suspended: 'bg-red-100 text-red-800 border-red-300'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
        {status.replace('-', ' ')}
      </span>
    );
  };

  const getLocationFlag = (location: string) => {
    const flags = {
      'Local': '🇺🇸',
      'Overseas Pakistan': '🇵🇰',
      'UK': '🇬🇧',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺'
    };
    return flags[location as keyof typeof flags] || '🌍';
  };

  const getPerformanceRating = (teacher: any) => {
    // Mock performance rating based on assigned students and other factors
    const studentCount = teacher.assignedStudents?.length || 0;
    const baseRating = Math.min(5, Math.max(1, 3 + (studentCount / 10)));
    return baseRating.toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Teacher Directory</h2>
          <p className="text-gray-600 mt-1">Manage all registered teachers ({filteredTeachers.length} total)</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={onAddTeacher}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            + Add Teacher
          </button>
          <button className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition">
            📊 Export
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
            📥 Import
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, email, or ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Specialization Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Specializations</option>
              {uniqueSpecializations.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status.replace('-', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || selectedSpecialization !== 'all' || selectedStatus !== 'all' || selectedLocation !== 'all') && (
          <div className="flex items-center space-x-2 p-3 bg-cream-100 border border-gold-300 rounded-lg">
            <span className="text-sm text-primary-800 font-medium">Active Filters:</span>
            {searchTerm && (
              <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                Search: "{searchTerm}"
              </span>
            )}
            {selectedSpecialization !== 'all' && (
              <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                Specialization: {selectedSpecialization}
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                Status: {selectedStatus}
              </span>
            )}
            {selectedLocation !== 'all' && (
              <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                Location: {selectedLocation}
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSpecialization('all');
                setSelectedStatus('all');
                setSelectedLocation('all');
              }}
              className="ml-2 text-xs text-primary-600 hover:text-primary-800 underline"
            >
              Clear All
            </button>
          </div>
        )}
      </Card>

      {/* Teachers Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
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
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
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
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
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
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
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
            <tbody className="divide-y divide-gray-200">
              {paginatedTeachers.length > 0 ? (
                paginatedTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <img 
                          src={teacher.avatar || '/default-avatar.png'} 
                          alt={teacher.fullName || 'Teacher'} 
                          className="h-10 w-10 rounded-full mr-3" 
                        />
                        <div>
                          <p className="font-medium text-gray-900">{teacher.fullName || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{teacher.department || 'General'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-gray-600">{teacher.id}</td>
                    <td className="px-4 py-4 text-sm">
                      <div>
                        <p className="text-gray-900">{teacher.email || 'No email'}</p>
                        <p className="text-gray-500">{teacher.phoneNumber || 'No contact'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">{teacher.department || 'General'}</td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <span>{getLocationFlag(teacher.location || 'Unknown')}</span>
                        <span>{teacher.location || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-primary-600">{teacher.assignedStudents?.length || 0}</span>
                        <span className="text-gray-500">students</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <span className="text-gold-600">⭐</span>
                        <span className="font-semibold">{getPerformanceRating(teacher)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(teacher.status || 'active')}</td>
                    <td className="px-4 py-4 text-sm font-semibold">
                      {teacher.payroll?.currency === 'USD' ? '$' : 'Rs'}{teacher.payroll?.monthlySalary?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onTeacherSelect(teacher)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => onEditTeacher(teacher)}
                          className="text-gold-600 hover:text-gold-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteTeacher(teacher.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                        {onCredentials && (
                          <button
                            onClick={() => onCredentials(teacher)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Credentials
                          </button>
                        )}
                        {onAnalytics && (
                          <button
                            onClick={() => onAnalytics(teacher)}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                          >
                            Analytics
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No teachers found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TeacherList;
