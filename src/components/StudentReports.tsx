import React, { useState, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import StudentAssignmentHistory from './StudentAssignmentHistory';
import { useNavigate } from 'react-router-dom';

interface StudentReportsProps {
  onClose: () => void;
  teacherView?: boolean; // If true, only show students assigned to current teacher
}

const StudentReports: React.FC<StudentReportsProps> = ({ onClose, teacherView = false }) => {
  const { students: allStudents, getStudentAssignments, teachers, getStudentsByTeacher } = useBackendData();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Get current teacher if in teacher view
  const currentTeacher = teacherView && user ? (teachers.find(t => t.email === user.email) || teachers[0]) : null;
  const assignedStudentIds = currentTeacher?.id ? getStudentsByTeacher(currentTeacher.id).map(s => s.id) : [];
  
  // Filter students based on view type
  const students = useMemo(() => {
    if (teacherView && currentTeacher) {
      // Only show students assigned to this teacher
      return allStudents.filter(student => assignedStudentIds.includes(student.id));
    }
    return allStudents;
  }, [allStudents, teacherView, currentTeacher, assignedStudentIds]);
  
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, active, inactive

  // Get unique programs from students
  const programs = useMemo(() => {
    const uniquePrograms = new Set<string>();
    students.forEach(student => {
      if (student.program) {
        uniquePrograms.add(student.program);
      }
    });
    return Array.from(uniquePrograms).sort();
  }, [students]);

  // Filter students by program, search query, and status
  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    // Filter by program
    if (selectedProgram) {
      filtered = filtered.filter(student => student.program === selectedProgram);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(student => 
        student.fullName.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.contact?.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(student => student.status === statusFilter);
    }
    
    return filtered;
  }, [students, selectedProgram, searchQuery, statusFilter]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalStudents = filteredStudents.length;
    const activeStudents = filteredStudents.filter(s => s.status === 'active').length;
    const totalAssignments = filteredStudents.reduce((sum, student) => {
      const assignments = getStudentAssignments(student.id);
      return sum + assignments.length;
    }, 0);
    const studentsWithAssignments = filteredStudents.filter(student => {
      const assignments = getStudentAssignments(student.id);
      return assignments.length > 0;
    }).length;
    
    return {
      totalStudents,
      activeStudents,
      totalAssignments,
      studentsWithAssignments,
      averageAssignments: totalStudents > 0 ? (totalAssignments / totalStudents).toFixed(1) : '0'
    };
  }, [filteredStudents, getStudentAssignments]);

  const handleStudentClick = (studentId: string) => {
    setSelectedStudent(studentId);
    setShowHistory(true);
  };

  const handleCloseHistory = () => {
    setShowHistory(false);
    setSelectedStudent(null);
  };

  const handleNavigateToAssignments = () => {
    onClose();
    navigate('/assignments');
  };

  const handleClearFilters = () => {
    setSelectedProgram('');
    setSearchQuery('');
    setStatusFilter('all');
  };

  // Get student initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get assignment count for a student
  const getAssignmentCount = (studentId: string) => {
    if (!studentId) return 0;
    try {
      const studentAssignments = getStudentAssignments(studentId);
      return studentAssignments.length;
    } catch (error) {
      console.error('Error getting assignment count:', error);
      return 0;
    }
  };

  if (showHistory && selectedStudent) {
    return (
      <StudentAssignmentHistory
        studentId={selectedStudent}
        onClose={handleCloseHistory}
        onEditAssignment={(assignmentId) => {
          handleCloseHistory();
          navigate('/assignments', { state: { editAssignmentId: assignmentId } });
        }}
        onCreateAssignment={() => {
          handleCloseHistory();
          navigate('/assignments', { state: { createForStudentId: selectedStudent } });
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <header className="bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.9)] px-6 sm:px-8 py-6 sm:py-8 border-b-4 border-accent shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-lg">Student Reports</h2>
              <p className="text-white/95 mt-2 text-sm sm:text-base font-medium">View and manage student assignment history</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNavigateToAssignments}
                className="px-5 sm:px-7 py-2.5 sm:py-3.5 bg-accent text-primary rounded-full text-sm sm:text-base font-extrabold transition-all shadow-2xl hover:scale-110 hover:bg-accent/90 border-2 border-white/40 whitespace-nowrap"
              >
                Manage Assignments
              </button>
              <button
                onClick={onClose}
                className="w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center bg-accent text-primary rounded-full transition-all text-2xl sm:text-3xl font-extrabold shadow-2xl hover:scale-110 hover:bg-accent/90 border-2 border-white/40"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-gradient-to-b from-background to-white">
          <div className="space-y-6">
            {/* Statistics Cards */}
            {selectedProgram && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-soft-primary to-white p-4 sm:p-5 shadow-lg">
                  <div className="text-2xl sm:text-3xl font-extrabold text-primary mb-1">
                    {statistics.totalStudents}
                  </div>
                  <div className="text-xs sm:text-sm text-primary/70 font-semibold">
                    Total Students
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-soft-primary to-white p-4 sm:p-5 shadow-lg">
                  <div className="text-2xl sm:text-3xl font-extrabold text-primary mb-1">
                    {statistics.activeStudents}
                  </div>
                  <div className="text-xs sm:text-sm text-primary/70 font-semibold">
                    Active
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-soft-accent to-white p-4 sm:p-5 shadow-lg">
                  <div className="text-2xl sm:text-3xl font-extrabold text-accent mb-1">
                    {statistics.totalAssignments}
                  </div>
                  <div className="text-xs sm:text-sm text-primary/70 font-semibold">
                    Total Assignments
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-soft-primary to-white p-4 sm:p-5 shadow-lg">
                  <div className="text-2xl sm:text-3xl font-extrabold text-primary mb-1">
                    {statistics.averageAssignments}
                  </div>
                  <div className="text-xs sm:text-sm text-primary/70 font-semibold">
                    Avg per Student
                  </div>
                </div>
              </div>
            )}

            {/* Filters Section */}
            <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-white to-soft-primary p-5 sm:p-7 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                <h3 className="text-lg sm:text-xl font-extrabold text-primary">Filters & Search</h3>
                {(selectedProgram || searchQuery || statusFilter !== 'all') && (
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 bg-accent text-primary rounded-lg text-sm font-extrabold hover:bg-accent/90 transition-all shadow-md"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Program Selection */}
                <div>
                  <label className="block text-sm font-extrabold text-primary mb-2">
                    Program
                  </label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => {
                      setSelectedProgram(e.target.value);
                      setSelectedStudent(null);
                    }}
                    className="w-full rounded-xl border-2 border-primary/30 bg-white px-4 py-2.5 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-md transition-all hover:border-primary/50"
                  >
                    <option value="">All Programs</option>
                    {programs.map(program => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-sm font-extrabold text-primary mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name, email, or contact..."
                    className="w-full rounded-xl border-2 border-primary/30 bg-white px-4 py-2.5 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-md transition-all hover:border-primary/50 placeholder:text-primary/40"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-extrabold text-primary mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-xl border-2 border-primary/30 bg-white px-4 py-2.5 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-md transition-all hover:border-primary/50"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Student List */}
            {filteredStudents.length > 0 && (
              <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-white to-soft-primary p-5 sm:p-7 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-primary mb-1">
                      Students
                    </h3>
                    <p className="text-xs sm:text-sm text-primary/70">
                      Click on a student to view their assignment history
                    </p>
                  </div>
                  <span className="px-4 py-2 bg-primary text-white rounded-full text-xs sm:text-sm font-extrabold shadow-md">
                    {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                  {filteredStudents.map(student => {
                    const assignmentCount = getAssignmentCount(student.id);
                    return (
                      <button
                        key={student.id}
                        onClick={() => handleStudentClick(student.id)}
                        className={`rounded-2xl border-2 p-4 sm:p-5 text-center transition-all shadow-lg hover:shadow-xl transform ${
                          selectedStudent === student.id
                            ? 'border-primary bg-gradient-to-br from-soft-primary to-primary/10 scale-105 ring-4 ring-primary/20'
                            : 'border-primary/30 bg-white hover:border-primary hover:bg-gradient-to-br hover:from-soft-primary hover:to-white hover:scale-102'
                        }`}
                      >
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-lg sm:text-xl font-extrabold shadow-md transition-all ${
                          selectedStudent === student.id
                            ? 'bg-gradient-to-br from-primary to-[rgba(var(--color-primary-rgb),0.8)] text-white scale-110'
                            : 'bg-gradient-to-br from-accent to-[rgba(var(--color-accent-rgb),0.8)] text-primary hover:scale-105'
                        }`}>
                          {getInitials(student.fullName)}
                        </div>
                        <div className={`font-extrabold text-xs sm:text-sm truncate transition-colors mb-1 ${
                          selectedStudent === student.id ? 'text-primary' : 'text-primary'
                        }`}>
                          {student.fullName}
                        </div>
                        <div className="text-[10px] sm:text-xs text-primary/60 truncate mb-2">
                          {student.email}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <span className={`text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full ${
                            student.status === 'active'
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-soft-primary text-primary/70 border border-primary/20'
                          }`}>
                            {student.status}
                          </span>
                          {assignmentCount > 0 && (
                            <span className="text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                              {assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredStudents.length === 0 && (
              <div className="rounded-3xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-soft-primary to-white p-10 sm:p-14 text-center shadow-lg">
                {selectedProgram || searchQuery || statusFilter !== 'all' ? (
                  <>
                    <p className="text-primary text-lg sm:text-xl font-extrabold mb-2">No students found</p>
                    <p className="text-primary/70 text-sm sm:text-base mb-4">
                      No students match your current filters.
                    </p>
                    <button
                      onClick={handleClearFilters}
                      className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-extrabold hover:bg-primary/90 transition-all shadow-md"
                    >
                      Clear Filters
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-primary text-lg sm:text-xl font-extrabold mb-2">No students available</p>
                    <p className="text-primary/70 text-sm sm:text-base">
                      Use the filters above to search for students or select a program.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentReports;
