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

  // Filter students by program
  const filteredStudents = useMemo(() => {
    if (selectedProgram === 'all') {
      return students;
    }
    return students.filter(student => student.program === selectedProgram);
  }, [students, selectedProgram]);

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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6 rounded-3xl border border-accent-soft bg-white px-6 py-6 sm:px-10 sm:py-8 shadow-sm">
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">Assignment System</span>
                <h1 className="text-3xl font-semibold text-primary">Assignment Management</h1>
                <p className="text-sm text-primary-soft max-w-xl">Manage assignments for students by program</p>
              </div>
            </div>

        {/* Program Filter */}
        <div className="rounded-3xl border border-accent-soft bg-white px-6 py-6 sm:px-10 sm:py-8 shadow-sm mb-6">
          <label className="block text-sm font-medium text-primary mb-3">
            Filter by Program
          </label>
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value as ProgramType | 'all')}
            className="w-full sm:w-64 px-4 py-3 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition"
          >
            <option value="all">All Programs</option>
            {programs.map(program => (
              <option key={program} value={program}>{program}</option>
            ))}
          </select>
        </div>

        {/* Students Grid */}
        <div className="rounded-3xl border border-accent-soft bg-white px-6 py-6 sm:px-10 sm:py-8 shadow-sm">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-primary">
                Students
              </h2>
              <p className="text-sm text-primary-soft mt-1">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                {selectedProgram !== 'all' && ` in ${selectedProgram}`}
              </p>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-primary-soft">No students found for the selected program.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredStudents.map(student => {
                const studentAssignments = assignments.filter(a => a.studentId === student.id);
                const initials = getInitials(student.fullName);
                
                return (
                  <div
                    key={student.id}
                    className="relative group"
                  >
                    {/* Student Card */}
                    <button
                      onClick={() => handleStudentClick(student.id)}
                      className="w-full aspect-square flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-accent-soft hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md relative"
                    >
                      {/* Avatar/Initials */}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-soft-primary text-primary flex items-center justify-center text-lg sm:text-xl font-semibold mb-2">
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
                      <p className="text-xs sm:text-sm font-medium text-primary text-center px-2 truncate w-full">
                        {student.fullName}
                      </p>
                      
                      {/* Assignment Count Badge */}
                      {studentAssignments.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-accent text-primary text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                          {studentAssignments.length}
                        </span>
                      )}
                    </button>

                    {/* Quick Actions (on hover) */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateTicket(student.id);
                        }}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-primary text-white text-xs font-medium rounded-full shadow-lg hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors whitespace-nowrap"
                        title="Create Ticket (Sabq/Sabqi/Manzil)"
                      >
                        + Ticket
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateAssignment(student.id);
                        }}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-primary text-primary text-xs font-medium rounded-full shadow-lg hover:bg-soft-primary transition-colors whitespace-nowrap"
                        title="Manual Assignment"
                      >
                        + Assignment
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

