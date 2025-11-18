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

  // Calculate statistics
  const stats = useMemo(() => {
    const active = filteredStudents.filter(s => s.status === 'active').length;
    const inactive = filteredStudents.filter(s => s.status === 'inactive').length;
    const totalTuition = filteredStudents.reduce((sum, s) => sum + (s.tuitionFee || 0), 0);
    return { active, inactive, totalTuition, total: filteredStudents.length };
  }, [filteredStudents]);

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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-soft-primary to-primary/30 rounded-2xl p-4 sm:p-5 shadow-xl hover:shadow-2xl transition-all hover:scale-105 border-2 border-primary/40">
          <div>
            <p className="text-primary/80 text-xs sm:text-sm font-semibold mb-1">Total Students</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-primary">{stats.total}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-soft-primary to-primary/30 rounded-2xl p-4 sm:p-5 shadow-xl hover:shadow-2xl transition-all hover:scale-105 border-2 border-primary/40">
          <div>
            <p className="text-primary/80 text-xs sm:text-sm font-semibold mb-1">Active</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-primary">{stats.active}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-soft-primary to-primary/30 rounded-2xl p-4 sm:p-5 shadow-xl hover:shadow-2xl transition-all hover:scale-105 border-2 border-primary/40">
          <div>
            <p className="text-primary/80 text-xs sm:text-sm font-semibold mb-1">Inactive</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-primary">{stats.inactive}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-soft-accent to-accent/30 rounded-2xl p-4 sm:p-5 shadow-xl hover:shadow-2xl transition-all hover:scale-105 border-2 border-accent/40">
          <div>
            <p className="text-primary text-xs sm:text-sm font-semibold mb-1">Total Tuition</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-accent">${stats.totalTuition}</p>
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

      {/* Students Grid - Card Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {paginatedStudents.length > 0 ? (
          paginatedStudents.map((student) => (
            <div
              key={student.id}
              className="bg-soft-primary rounded-xl border-2 border-primary shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] overflow-hidden"
            >
              {/* Horizontal Layout */}
              <div className="flex flex-col sm:flex-row">
                {/* Left Side - Avatar and Status */}
                <div className="bg-primary p-4 sm:p-5 flex flex-col items-center justify-center border-b-2 sm:border-b-0 sm:border-r-2 border-primary sm:w-32">
                  <div className="relative mb-3">
                    <img 
                      src={student.avatar} 
                      alt={student.fullName} 
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-accent shadow-lg" 
                    />
                  </div>
                  <span className={`px-3 py-1 text-xs font-extrabold rounded ${
                    student.status === 'active' 
                      ? 'bg-accent text-primary' 
                      : 'bg-soft-primary text-primary border border-primary'
                  }`}>
                    {student.status || 'active'}
                  </span>
                </div>

                {/* Right Side - Info and Actions */}
                <div className="flex-1 p-4 sm:p-5">
                  {/* Name and Program */}
                  <div className="mb-4">
                    <h3 className="text-lg sm:text-xl font-extrabold text-primary mb-1">
                      {student.fullName}
                    </h3>
                    <p className="text-sm text-primary font-semibold">{student.program}</p>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-soft-primary rounded p-2 border border-primary">
                      <p className="text-xs text-primary font-semibold mb-1">Teacher</p>
                      <p className="text-sm font-extrabold text-primary truncate">{getTeacherName(student.assignedTeacher)}</p>
                    </div>
                    <div className="bg-soft-primary rounded p-2 border border-primary">
                      <p className="text-xs text-primary font-semibold mb-1">Tuition</p>
                      <p className="text-sm font-extrabold text-primary">${student.tuitionFee}</p>
                    </div>
                  </div>

                  {/* Action Buttons - Horizontal */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onStudentSelect(student)}
                      className="flex-1 min-w-[80px] px-4 py-2 bg-primary text-accent rounded font-extrabold hover:scale-105 transition-all shadow-md text-xs sm:text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEditStudent(student)}
                      className="flex-1 min-w-[80px] px-4 py-2 bg-accent text-primary rounded font-extrabold hover:scale-105 transition-all shadow-md text-xs sm:text-sm"
                    >
                      Edit
                    </button>
                    {onCredentials && (
                      <button
                        onClick={() => onCredentials(student)}
                        className="px-3 py-2 bg-soft-primary border border-primary text-primary rounded font-extrabold hover:scale-105 transition-all shadow-md text-xs"
                        title="Credentials"
                      >
                        Credentials
                      </button>
                    )}
                    {onAnalytics && (
                      <button
                        onClick={() => onAnalytics(student)}
                        className="px-3 py-2 bg-soft-primary border border-primary text-primary rounded font-extrabold hover:scale-105 transition-all shadow-md text-xs"
                        title="Analytics"
                      >
                        Analytics
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteStudent(student.id)}
                      className="px-3 py-2 bg-soft-primary border border-primary text-primary rounded font-extrabold hover:scale-105 transition-all shadow-md text-xs"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <div className="text-center py-8 sm:py-12">
                <h3 className="text-xl sm:text-2xl font-extrabold text-primary mb-2">No Students Found</h3>
                <p className="text-sm sm:text-base text-primary-soft mb-4 sm:mb-6">No students match the selected filters.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTeacher('all');
                    setSelectedStatus('all');
                    setSelectedPaymentStatus('all');
                  }}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-full font-extrabold hover:scale-105 transition-all shadow-lg text-sm sm:text-base"
                >
                  Clear All Filters
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <Card>
          <div className="bg-gradient-to-br from-soft-primary to-soft-primary rounded-2xl p-4 sm:p-5 md:p-6 border-2 border-primary/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm font-extrabold text-primary">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 sm:px-4 py-2 border-2 border-primary/30 rounded-full text-xs sm:text-sm font-extrabold text-primary bg-soft-primary focus:ring-2 focus:ring-primary focus:border-primary shadow-md"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs sm:text-sm font-extrabold text-primary">per page</span>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-primary text-white rounded-full font-extrabold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-lg disabled:hover:scale-100 text-xs sm:text-sm"
                >
                  Previous
                </button>
                
                <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-accent/20 rounded-full border-2 border-accent/40">
                  <span className="text-xs sm:text-sm font-extrabold text-primary">
                    Page <span className="text-accent">{currentPage}</span> of <span className="text-accent">{totalPages}</span>
                  </span>
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-primary text-white rounded-full font-extrabold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-lg disabled:hover:scale-100 text-xs sm:text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default StudentList;
