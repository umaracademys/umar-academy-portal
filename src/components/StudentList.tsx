import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import Card from './Card';

interface StudentListProps {
  onStudentSelect: (student: any) => void;
  onEditStudent: (student: any) => void;
  onDeleteStudent: (studentId: string) => void | Promise<void>;
  onAddStudent?: () => void;
  onCredentials?: (student: any) => void;
  onAnalytics?: (student: any) => void;
  onBulkOperations?: () => void;
}

const StudentList: React.FC<StudentListProps> = ({ onStudentSelect, onEditStudent, onDeleteStudent, onAddStudent, onCredentials, onAnalytics, onBulkOperations }) => {
  const { students, teachers, addStudent } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Helper function to get teacher name from ID
  const getTeacherName = (teacherId: string | undefined | null): string => {
    if (!teacherId) return 'Unassigned';
    
    // Try to find teacher by various ID fields
    const teacher = teachers.find(t => 
      t.id === teacherId || 
      (t as any)._id === teacherId ||
      (t as any).teacherId === teacherId ||
      (t as any).userId === teacherId
    );
    
    return teacher?.fullName || teacherId; // Return ID if teacher not found
  };

  // Get unique values for filters
  const uniqueTeachers = Array.from(new Set(students.map(s => s.assignedTeacher)));
  const uniqueStatuses = Array.from(new Set(students.map(s => s.status)));
  const uniquePrograms = Array.from(new Set(students.map(s => s.program)));

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(student => {
      const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTeacher = selectedTeacher === 'all' || student.assignedTeacher === selectedTeacher;
      const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
      
      return matchesSearch && matchesTeacher && matchesStatus;
    });

    // Sort students
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
        case 'enrolledDate':
          aValue = new Date(a.enrolledDate);
          bValue = new Date(b.enrolledDate);
          break;
        case 'tuitionFee':
          aValue = a.tuitionFee;
          bValue = b.tuitionFee;
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
  }, [students, searchTerm, selectedTeacher, selectedStatus, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

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
      active: 'bg-primary text-white border-primary', // Keep white text on dark green for contrast
      inactive: 'bg-soft-primary text-primary border-primary/30',
      pending: 'bg-accent/30 text-primary border-accent/50',
      suspended: 'bg-soft-primary text-primary border-primary/20'
    };
    
    return (
      <span className={`px-2 sm:px-3 py-1 text-xs font-extrabold rounded-full border-2 ${statusColors[status as keyof typeof statusColors] || statusColors.inactive}`}>
        {status}
      </span>
    );
  };

  const getPaymentStatus = (student: any) => {
    // Mock payment status - in real app, this would come from payment data
    const isOverdue = Math.random() > 0.8;
    const isPending = Math.random() > 0.9;
    
    if (isOverdue) {
      return <span className="text-primary text-xs font-extrabold">Overdue</span>;
    } else if (isPending) {
      return <span className="text-primary text-xs font-extrabold">Pending</span>;
    } else {
      return <span className="text-primary text-xs font-extrabold">Current</span>;
    }
  };

  const addSampleStudents = () => {
    const sampleStudents = [
      {
        id: 'S001',
        fullName: 'Ahmed Hassan',
        parentName: 'Hassan Ali',
        email: 'ahmed.hassan@student.com',
        contact: '+1-555-0201',
        program: 'Full Time HQ',
        tuitionFee: 200,
        registrationAmount: 100,
        assignedTeacher: 'Umar Farooq',
        schedule: { days: ['Monday', 'Wednesday', 'Friday'], startTime: '09:00', endTime: '12:00' },
        enrolledDate: '2024-01-15',
        status: 'active',
        avatar: 'https://ui-avatars.com/api/?name=Ahmed+Hassan&background=2E4D32&color=fff'
      },
      {
        id: 'S002',
        fullName: 'Fatima Khan',
        parentName: 'Khan Family',
        email: 'fatima.khan@student.com',
        contact: '+1-555-0203',
        program: 'Part Time HQ',
        tuitionFee: 150,
        registrationAmount: 75,
        assignedTeacher: 'Aisha Ahmed',
        schedule: { days: ['Tuesday', 'Thursday'], startTime: '14:00', endTime: '16:00' },
        enrolledDate: '2024-02-01',
        status: 'active',
        avatar: 'https://ui-avatars.com/api/?name=Fatima+Khan&background=2E4D32&color=fff'
      },
      {
        id: 'S003',
        fullName: 'Omar Ali',
        parentName: 'Ali Family',
        email: 'omar.ali@student.com',
        contact: '+1-555-0205',
        program: 'After School Reading',
        tuitionFee: 100,
        registrationAmount: 50,
        assignedTeacher: 'Umar Farooq',
        schedule: { days: ['Saturday', 'Sunday'], startTime: '10:00', endTime: '12:00' },
        enrolledDate: '2024-01-20',
        status: 'inactive',
        avatar: 'https://ui-avatars.com/api/?name=Omar+Ali&background=2E4D32&color=fff'
      }
    ];

    sampleStudents.forEach(student => {
      if (!students.find(s => s.id === student.id)) {
        addStudent(student as any);
      }
    });
  };


  return (
    <div className="space-y-6">
      {/* Prominent Header */}
      <div className="bg-gradient-to-r from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.9)] rounded-3xl p-4 sm:p-6 md:p-8 border-b-4 border-accent shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 drop-shadow-lg">
              Student Directory
            </h2>
            <p className="text-white/90 text-sm sm:text-base md:text-lg font-semibold">
              Manage all registered students • {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'} found
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {onAddStudent && (
              <button 
                onClick={onAddStudent}
                className="px-6 sm:px-7 py-2.5 sm:py-3 bg-accent text-primary rounded-full font-extrabold hover:scale-110 transition-all shadow-xl hover:shadow-2xl text-sm sm:text-base md:text-lg"
                style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)' }}
              >
                Add Student
              </button>
            )}
            {students.length === 0 && (
            <button 
              onClick={addSampleStudents}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-accent/30 text-primary rounded-full font-extrabold hover:bg-accent/40 transition-all shadow-lg hover:scale-105 text-xs sm:text-sm md:text-base"
            >
              Add Sample
            </button>
            )}
            <button className="px-4 sm:px-6 py-2.5 sm:py-3 bg-accent/30 text-primary rounded-full font-extrabold hover:bg-accent/40 transition-all shadow-lg hover:scale-105 text-xs sm:text-sm md:text-base">
              Export
            </button>
            <button className="px-4 sm:px-6 py-2.5 sm:py-3 bg-accent/30 text-primary rounded-full font-extrabold hover:bg-accent/40 transition-all shadow-lg hover:scale-105 text-xs sm:text-sm md:text-base">
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <Card>
        <div className="bg-gradient-to-br from-soft-primary to-soft-primary rounded-2xl p-4 sm:p-5 md:p-6 border-2 border-primary/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs sm:text-sm font-extrabold text-primary mb-2">Search Students</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or ID..."
                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 border-2 border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition bg-white text-primary font-extrabold shadow-lg text-sm sm:text-base placeholder:text-primary/50"
              />
            </div>

            {/* Teacher Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-primary mb-2">Teacher</label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 border-2 border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition bg-white text-primary font-extrabold shadow-lg text-sm sm:text-base"
              >
                <option value="all">All Teachers</option>
                {uniqueTeachers.map(teacher => (
                  <option key={teacher} value={teacher}>{teacher}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-primary mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 border-2 border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition bg-white text-primary font-extrabold shadow-lg text-sm sm:text-base"
              >
                <option value="all">All Status</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4 pt-4 border-t-2 border-primary/20">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedTeacher('all');
                  setSelectedStatus('all');
                  setSelectedPaymentStatus('all');
                }}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-primary text-white rounded-full font-extrabold hover:scale-105 transition-all shadow-lg hover:shadow-xl text-xs sm:text-sm"
              >
                Clear Filters
              </button>
              <button
                onClick={() => {
                  setSortBy('name');
                  setSortOrder('asc');
                }}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-accent text-primary rounded-full font-extrabold hover:scale-105 transition-all shadow-lg hover:shadow-xl text-xs sm:text-sm"
              >
                Reset Sort
              </button>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-primary">
              Showing <span className="text-accent">{filteredStudents.length}</span> of <span className="text-accent">{students.length}</span> students
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || selectedTeacher !== 'all' || selectedStatus !== 'all' || selectedPaymentStatus !== 'all') && (
            <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4 bg-accent/20 border-2 border-accent/40 rounded-2xl mt-4">
              <span className="text-xs sm:text-sm font-extrabold text-primary">Active Filters:</span>
              {searchTerm && (
                <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-primary text-white text-xs font-extrabold rounded-full shadow-md">
                  Search: "{searchTerm}"
                </span>
              )}
              {selectedTeacher !== 'all' && (
                <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-primary text-white text-xs font-extrabold rounded-full shadow-md">
                  Teacher: {selectedTeacher}
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-primary text-white text-xs font-extrabold rounded-full shadow-md">
                  Status: {selectedStatus}
                </span>
              )}
              {selectedPaymentStatus !== 'all' && (
                <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-primary text-white text-xs font-extrabold rounded-full shadow-md">
                  Payment: {selectedPaymentStatus}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Students Table */}
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
                    <span>Student</span>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('tuitionFee')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Tuition</span>
                    {sortBy === 'tuitionFee' && (
                      <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <img 
                          src={student.avatar || '/default-avatar.png'} 
                          alt={student.fullName || 'Student'} 
                          className="h-10 w-10 rounded-full mr-3" 
                        />
                        <div>
                          <p className="font-medium text-gray-900">{student.fullName || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{student.program || 'No program'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-gray-600">{student.id}</td>
                    <td className="px-4 py-4 text-sm">
                      <div>
                        <p className="text-gray-900">{student.email || 'No email'}</p>
                        <p className="text-gray-500">{student.contact || 'No contact'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">{student.program || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm">{getTeacherName(student.assignedTeacher)}</td>
                    <td className="px-4 py-4 text-sm font-semibold">
                      ${student.tuitionFee?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(student.status || 'active')}</td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onStudentSelect(student)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => onEditStudent(student)}
                          className="text-gold-600 hover:text-gold-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                        {onCredentials && (
                          <button
                            onClick={() => onCredentials(student)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Credentials
                          </button>
                        )}
                        {onAnalytics && (
                          <button
                            onClick={() => onAnalytics(student)}
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
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <p className="text-lg font-semibold mb-2">No students found</p>
                      <p className="text-sm">No students match the selected filters.</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedTeacher('all');
                          setSelectedStatus('all');
                          setSelectedPaymentStatus('all');
                        }}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                      >
                        Clear All Filters
                      </button>
                    </div>
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
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
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

export default StudentList;
