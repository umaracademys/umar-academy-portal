import React, { useState, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { ProgramType } from '../types';
import StudentAssignmentHistory from '../components/StudentAssignmentHistory';
import AssignmentForm from '../components/AssignmentForm';
import TicketCreationForm from '../components/TicketCreationForm';
import { Ticket } from '../types/ticket';
import Header from '../components/Header';

const AssignmentManagement: React.FC = () => {
  const { students, assignments } = useBackendData();
  const [selectedProgram, setSelectedProgram] = useState<ProgramType | 'all'>('all');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [prefillTicket, setPrefillTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique programs from students
  const programs = useMemo(() => {
    const programSet = new Set<ProgramType>();
    students.forEach(student => {
      if (student.program) {
        programSet.add(student.program);
      }
    });
    return Array.from(programSet);
  }, [students]);

  // Filter students by program and search
  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    // Filter by program
    if (selectedProgram !== 'all') {
      filtered = filtered.filter(student => student.program === selectedProgram);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(student => 
        student.fullName.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.id.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [students, selectedProgram, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAssignments = assignments.length;
    const studentsWithAssignments = new Set(assignments.map(a => a.studentId)).size;
    const activeAssignments = assignments.filter(a => a.status === 'active').length;
    
    return {
      totalAssignments,
      studentsWithAssignments,
      activeAssignments,
      totalStudents: students.length
    };
  }, [assignments, students]);

  // Get student initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleStudentClick = (studentId: string) => {
    setSelectedStudent(studentId);
  };

  const handleCreateAssignment = (studentId: string) => {
    setSelectedStudent(studentId);
    setEditingAssignment(null);
    setPrefillTicket(null);
    setShowAssignmentForm(true);
  };

  const handleCreateTicket = (studentId: string) => {
    setSelectedStudent(studentId);
    setShowTicketForm(true);
  };

  const handleTicketSuccess = (ticket: Ticket) => {
    // If sabq ticket, pre-fill assignment form
    if (ticket.type === 'sabq') {
      setPrefillTicket(ticket);
      setShowTicketForm(false);
      setShowAssignmentForm(true);
    } else {
      // For sabqi/manzil, just close the form (ticket goes to teacher)
      setShowTicketForm(false);
    }
  };

  const handleEditAssignment = (assignmentId: string) => {
    setEditingAssignment(assignmentId);
    setShowAssignmentForm(true);
  };

  const handleCloseModal = () => {
    setSelectedStudent(null);
    setShowAssignmentForm(false);
    setEditingAssignment(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Prominent Header */}
        <div className="mb-8 rounded-3xl border-4 border-accent bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.9)] px-6 py-8 sm:px-10 sm:py-12 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white/80">Assignment Management System</span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-lg">Assignment Management</h1>
              <p className="text-base sm:text-lg text-white/90 max-w-2xl font-medium">Manage assignments, tickets, and classwork for all students</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (filteredStudents.length > 0) {
                    handleCreateTicket(filteredStudents[0].id);
                    setSelectedStudent(filteredStudents[0].id);
                  }
                }}
                className="px-6 py-3 bg-accent text-primary rounded-full font-extrabold shadow-xl hover:scale-105 transition-all text-sm sm:text-base"
                disabled={filteredStudents.length === 0}
              >
                + Create Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-soft mb-1">Total Students</p>
                <p className="text-3xl font-extrabold text-primary">{stats.totalStudents}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-soft-primary flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-soft mb-1">Total Assignments</p>
                <p className="text-3xl font-extrabold text-primary">{stats.totalAssignments}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-soft-primary flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-soft mb-1">Active Assignments</p>
                <p className="text-3xl font-extrabold text-primary">{stats.activeAssignments}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-soft-accent flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-soft mb-1">Students with Assignments</p>
                <p className="text-3xl font-extrabold text-primary">{stats.studentsWithAssignments}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-soft-primary flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 sm:p-8 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-extrabold text-primary mb-3">
                🔍 Search Students
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or ID..."
                className="w-full px-4 py-3 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm font-medium"
              />
            </div>
            
            {/* Program Filter */}
            <div>
              <label className="block text-sm font-extrabold text-primary mb-3">
                📋 Filter by Program
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value as ProgramType | 'all')}
                className="w-full px-4 py-3 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm font-medium"
              >
                <option value="all">All Programs</option>
                {programs.map(program => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students Grid */}
        <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 sm:p-8 shadow-lg">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-primary mb-2">
                Students
              </h2>
              <p className="text-sm sm:text-base text-primary-soft font-medium">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
                {selectedProgram !== 'all' && ` in ${selectedProgram}`}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-lg font-semibold text-primary mb-2">No students found</p>
              <p className="text-sm text-primary-soft">
                {searchQuery ? 'Try adjusting your search query' : 'No students match the selected filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {filteredStudents.map(student => {
                const studentAssignments = assignments.filter(a => a.studentId === student.id);
                const activeAssignments = studentAssignments.filter(a => a.status === 'active').length;
                const initials = getInitials(student.fullName);
                
                return (
                  <div
                    key={student.id}
                    className="relative group"
                  >
                    {/* Student Card */}
                    <button
                      onClick={() => handleStudentClick(student.id)}
                      className="w-full aspect-square flex flex-col items-center justify-center bg-gradient-to-br from-white to-soft-primary rounded-2xl border-2 border-primary/20 hover:border-primary transition-all duration-300 shadow-md hover:shadow-xl relative overflow-hidden"
                    >
                      {/* Hover gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* Avatar/Initials */}
                      <div className="relative z-10 w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-primary to-[rgba(var(--color-primary-rgb),0.8)] text-white flex items-center justify-center text-lg sm:text-xl font-extrabold mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        {student.avatar ? (
                          <img
                            src={student.avatar}
                            alt={student.fullName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      
                      {/* Name */}
                      <p className="relative z-10 text-xs sm:text-sm font-extrabold text-primary text-center px-2 truncate w-full mb-1">
                        {student.fullName}
                      </p>
                      
                      {/* Program Badge */}
                      {student.program && (
                        <p className="relative z-10 text-[10px] sm:text-xs font-semibold text-primary text-center px-2 truncate w-full">
                          {student.program}
                        </p>
                      )}
                      
                      {/* Assignment Count Badge */}
                      {studentAssignments.length > 0 && (
                        <span className="absolute top-2 right-2 bg-accent text-primary text-xs font-extrabold rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shadow-lg border-2 border-white z-10">
                          {activeAssignments > 0 ? activeAssignments : studentAssignments.length}
                        </span>
                      )}
                    </button>

                    {/* Quick Actions (on hover) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/95 to-[rgba(var(--color-primary-rgb),0.95)] rounded-2xl flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateTicket(student.id);
                        }}
                        className="w-full px-4 py-2.5 bg-accent text-primary text-xs sm:text-sm font-extrabold rounded-full shadow-xl hover:scale-105 transition-all whitespace-nowrap"
                        title="Create Ticket (Sabq/Sabqi/Manzil)"
                      >
                        + Create Ticket
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateAssignment(student.id);
                        }}
                        className="w-full px-4 py-2.5 bg-white border-2 border-accent text-primary text-xs sm:text-sm font-extrabold rounded-full shadow-xl hover:scale-105 transition-all whitespace-nowrap"
                        title="Manual Assignment"
                      >
                        + Assignment
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStudentClick(student.id);
                        }}
                        className="w-full px-4 py-2.5 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-primary text-xs sm:text-sm font-extrabold rounded-full shadow-xl hover:scale-105 transition-all whitespace-nowrap"
                        title="View Assignments"
                      >
                        View History
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Student Assignment History Modal */}
      {selectedStudent && !showAssignmentForm && (
        <StudentAssignmentHistory
          studentId={selectedStudent}
          onClose={handleCloseModal}
          onEditAssignment={handleEditAssignment}
          onCreateAssignment={() => {
            setShowAssignmentForm(true);
            setEditingAssignment(null);
          }}
        />
      )}

      {/* Ticket Creation Form Modal */}
      {showTicketForm && selectedStudent && (
        <TicketCreationForm
          studentId={selectedStudent}
          onClose={() => {
            setShowTicketForm(false);
          }}
          onSuccess={handleTicketSuccess}
        />
      )}

      {/* Assignment Form Modal */}
      {showAssignmentForm && (
        <AssignmentForm
          studentId={selectedStudent || ''}
          assignmentId={editingAssignment}
          prefillTicket={prefillTicket}
          onClose={() => {
            setShowAssignmentForm(false);
            setEditingAssignment(null);
            setPrefillTicket(null);
            if (!selectedStudent) {
              setSelectedStudent(null);
            }
          }}
          onSave={() => {
            setShowAssignmentForm(false);
            setEditingAssignment(null);
            setPrefillTicket(null);
          }}
        />
      )}
    </div>
  );
};

export default AssignmentManagement;

