import React, { useState, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import StudentAssignmentHistory from './StudentAssignmentHistory';
import Button from './ui/Button';
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
  
  // Filter students based on view type - teachers can now see all students
  const students = useMemo(() => {
    // Teachers can now see all students
    return allStudents;
  }, [allStudents]);
  
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-4 py-6">
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <header className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="heading-page">Student reports</h2>
              <p className="caption mt-1 text-gray-600">View assignment history by student</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={handleNavigateToAssignments}>
                Manage assignments
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="min-w-[44px] min-h-[44px] p-0 text-gray-500 hover:text-gray-700">
                <span aria-hidden>×</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-gray-50">
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="heading-card">Search and filters</h3>
                {(selectedProgram || searchQuery || statusFilter !== 'all') && (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block body-text font-medium text-gray-700 mb-1">Program</label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => {
                      setSelectedProgram(e.target.value);
                      setSelectedStudent(null);
                    }}
                    className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">All programs</option>
                    {programs.map(program => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block body-text font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name, email, or contact..."
                    className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block body-text font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="all">All</option>
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
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="heading-section">Students</h3>
                  <p className="caption mt-0.5 text-gray-600">
                    Tap a student to view their assignment history · {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
                  </p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {filteredStudents.map(student => {
                    const assignmentCount = getAssignmentCount(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleStudentClick(student.id)}
                        className={`rounded-lg border p-4 text-center transition min-h-[44px] flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                          selectedStudent === student.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 rounded-full flex items-center justify-center text-base font-medium body-text ${
                          selectedStudent === student.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getInitials(student.fullName)}
                        </div>
                        <div className="body-text font-medium text-gray-900 truncate w-full mb-0.5">
                          {student.fullName}
                        </div>
                        <div className="caption text-gray-600 truncate w-full mb-2">
                          {student.email}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <span className="caption px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            {student.status}
                          </span>
                          {assignmentCount > 0 && (
                            <span className="caption px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
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
              <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-10 text-center">
                {selectedProgram || searchQuery || statusFilter !== 'all' ? (
                  <>
                    <p className="body-text text-gray-700 mb-2">No students found</p>
                    <p className="caption text-gray-600 mb-4">No students match your current filters.</p>
                    <Button variant="primary" size="md" onClick={handleClearFilters}>
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="body-text text-gray-700 mb-2">No students yet</p>
                    <p className="caption text-gray-600">Use the filters above to search or select a program.</p>
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
