import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ProgramType } from '../types';
import StudentAssignmentHistory from '../components/StudentAssignmentHistory';
import AssignmentForm from '../components/AssignmentForm';
import TicketCreationForm from '../components/TicketCreationForm';
import { Ticket } from '../types/ticket';
import Header from '../components/Header';

const AssignmentManagement: React.FC = () => {
  const { students: allStudents, assignments, getTeacherPairs, getPairStudents } = useBackendData();
  const { teachers, getStudentsByTeacher } = useData();
  const { user } = useAuth();
  const [pairStudents, setPairStudents] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<ProgramType | 'all'>('all');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [prefillTicket, setPrefillTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if current user is a teacher
  const currentTeacher = useMemo(() => {
    if (!user || !teachers) return null;
    return teachers.find(t => t.email === user.email) || null;
  }, [user, teachers]);

  // Load pair students for teacher
  useEffect(() => {
    const loadPairStudents = async () => {
      if (!currentTeacher) {
        setPairStudents([]);
        return;
      }
      
      try {
        const pairs = await getTeacherPairs();
        // Use Teacher document ID for filtering
        const teacherDocId = (currentTeacher as any)._id || (currentTeacher as any).teacherDocumentId || currentTeacher.id;
        const teacherIdStr = teacherDocId.toString();
        
        const filteredPairs = pairs.filter((pair: any) => {
          const pairTeacher1Id = pair.teacher1?._id?.toString() || pair.teacher1?.toString();
          const pairTeacher2Id = pair.teacher2?._id?.toString() || pair.teacher2?.toString();
          return pairTeacher1Id === teacherIdStr || pairTeacher2Id === teacherIdStr;
        });
        
        // Get all pair students from these pairs
        const allPairStudents: any[] = [];
        for (const pair of filteredPairs) {
          try {
            const students = await getPairStudents({ pair: pair._id, status: 'active' });
            allPairStudents.push(...students);
          } catch (error) {
            console.error(`Error loading students for pair ${pair._id}:`, error);
          }
        }
        setPairStudents(allPairStudents);
      } catch (error) {
        console.error('Error loading pair students:', error);
        setPairStudents([]);
      }
    };
    
    loadPairStudents();
  }, [currentTeacher, getTeacherPairs, getPairStudents]);

  // Get assigned students for teacher (including pair students)
  const assignedStudents = useMemo(() => {
    if (!currentTeacher?.id) return allStudents; // If not a teacher, show all students
    
    const directAssigned = getStudentsByTeacher(currentTeacher.id);
    
    // Get pair student IDs
    const pairStudentIds = new Set(
      pairStudents
        .map(ps => ps.student?._id?.toString() || ps.student?.toString() || ps.student)
        .filter(Boolean)
    );
    
    // Get pair students from allStudents
    const pairStudentsList = allStudents.filter(s => 
      pairStudentIds.has(s.id?.toString()) || pairStudentIds.has((s as any)._id?.toString())
    );
    
    // Combine direct assigned and pair students, remove duplicates
    const allAssigned = [...directAssigned, ...pairStudentsList];
    const uniqueAssigned = allAssigned.filter((student, index, self) => 
      index === self.findIndex(s => s.id === student.id || (s as any)._id === (student as any)._id)
    );
    
    return uniqueAssigned;
  }, [currentTeacher, allStudents, getStudentsByTeacher, pairStudents]);

  // Get unique programs from assigned students
  const programs = useMemo(() => {
    const programSet = new Set<ProgramType>();
    assignedStudents.forEach(student => {
      if (student.program) {
        programSet.add(student.program);
      }
    });
    return Array.from(programSet);
  }, [assignedStudents]);

  // Filter students by program and search
  const filteredStudents = useMemo(() => {
    let filtered = assignedStudents;
    
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
  }, [assignedStudents, selectedProgram, searchQuery]);

  // Calculate statistics (only for assigned students if teacher)
  const stats = useMemo(() => {
    const assignedStudentIds = new Set(assignedStudents.map(s => s.id));
    const relevantAssignments = assignments.filter(a => assignedStudentIds.has(a.studentId));
    const totalAssignments = relevantAssignments.length;
    const studentsWithAssignments = new Set(relevantAssignments.map(a => a.studentId)).size;
    const activeAssignments = relevantAssignments.filter(a => a.status === 'active').length;
    
    return {
      totalAssignments,
      studentsWithAssignments,
      activeAssignments,
      totalStudents: assignedStudents.length
    };
  }, [assignments, assignedStudents]);

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      
      {/* Content Area */}
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
        {/* Modern Prominent Header */}
        <div className="mb-4 rounded-xl border-2 border-accent/50 bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] px-3 py-3 sm:px-4 sm:py-4 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-lg">📋</span>
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-white/90">Assignment Management System</span>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg mt-0.5">Assignment Management</h1>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-white/95 max-w-2xl font-bold">
                {currentTeacher 
                  ? `Manage assignments, tickets, and classwork for your assigned students` 
                  : `Manage assignments, tickets, and classwork for all students`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (filteredStudents.length > 0) {
                    handleCreateTicket(filteredStudents[0].id);
                    setSelectedStudent(filteredStudents[0].id);
                  }
                }}
                className="px-3 py-1.5 bg-accent text-primary rounded-lg font-extrabold shadow-lg hover:scale-105 transition-all text-xs border-2 border-white/30"
                disabled={filteredStudents.length === 0}
              >
                + Create Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-primary-soft mb-0.5">Total Students</p>
                <p className="text-lg font-extrabold text-primary">{stats.totalStudents}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-soft-primary flex items-center justify-center">
                <span className="text-sm">👥</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-primary-soft mb-0.5">Total Assignments</p>
                <p className="text-lg font-extrabold text-primary">{stats.totalAssignments}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-soft-primary flex items-center justify-center">
                <span className="text-sm">📝</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-primary-soft mb-0.5">Active Assignments</p>
                <p className="text-lg font-extrabold text-primary">{stats.activeAssignments}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-soft-accent flex items-center justify-center">
                <span className="text-sm">✅</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-primary-soft mb-0.5">Students with Assignments</p>
                <p className="text-lg font-extrabold text-primary">{stats.studentsWithAssignments}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-soft-primary flex items-center justify-center">
                <span className="text-sm">📚</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border-2 border-primary/20 p-3 sm:p-4 shadow-md mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {/* Search */}
            <div>
              <label className="block text-xs font-extrabold text-primary mb-1.5">
                🔍 Search Students
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or ID..."
                className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-white text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-sm text-xs font-medium"
              />
            </div>
            
            {/* Program Filter */}
            <div>
              <label className="block text-xs font-extrabold text-primary mb-1.5">
                📋 Filter by Program
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value as ProgramType | 'all')}
                className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-white text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-sm text-xs font-medium"
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
        <div className="bg-white rounded-xl border-2 border-primary/20 p-3 sm:p-4 shadow-md">
          <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-primary mb-1">
                {currentTeacher ? 'My Assigned Students' : 'Students'}
              </h2>
              <p className="text-xs text-primary-soft font-medium">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
                {currentTeacher && ' (your assigned students)'}
                {selectedProgram !== 'all' && ` in ${selectedProgram}`}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
              {currentTeacher && (
                <div className="mt-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-xs font-semibold text-primary">
                    👤 Viewing only students assigned to you: <span className="font-bold">{currentTeacher.fullName}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm font-semibold text-primary mb-1">No students found</p>
              <p className="text-xs text-primary-soft">
                {searchQuery ? 'Try adjusting your search query' : 'No students match the selected filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
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
                      className="w-full aspect-square flex flex-col items-center justify-center bg-gradient-to-br from-white to-soft-primary rounded-xl border-2 border-primary/20 hover:border-primary transition-all duration-300 shadow-md hover:shadow-lg relative overflow-hidden"
                    >
                      {/* Hover gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* Avatar/Initials */}
                      <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-[rgba(var(--color-primary-rgb),0.8)] text-white flex items-center justify-center text-sm sm:text-base font-extrabold mb-2 shadow-md group-hover:scale-110 transition-transform duration-300">
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
                      <p className="relative z-10 text-[10px] sm:text-xs font-extrabold text-primary text-center px-1 truncate w-full mb-0.5">
                        {student.fullName}
                      </p>
                      
                      {/* Program Badge */}
                      {student.program && (
                        <p className="relative z-10 text-[9px] font-semibold text-primary text-center px-1 truncate w-full">
                          {student.program}
                        </p>
                      )}
                      
                      {/* Assignment Count Badge */}
                      {studentAssignments.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-accent text-primary text-[10px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center shadow-md border-2 border-white z-10">
                          {activeAssignments > 0 ? activeAssignments : studentAssignments.length}
                        </span>
                      )}
                    </button>

                    {/* Quick Actions (on hover) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/95 to-[rgba(var(--color-primary-rgb),0.95)] rounded-xl flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 p-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateTicket(student.id);
                        }}
                        className="w-full px-2 py-1.5 bg-accent text-primary text-[10px] font-extrabold rounded-lg shadow-lg hover:scale-105 transition-all whitespace-nowrap"
                        title="Create Ticket (Sabq/Sabqi/Manzil)"
                      >
                        + Create Ticket
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateAssignment(student.id);
                        }}
                        className="w-full px-2 py-1.5 bg-white border-2 border-accent text-primary text-[10px] font-extrabold rounded-lg shadow-lg hover:scale-105 transition-all whitespace-nowrap"
                        title="Manual Assignment"
                      >
                        + Assignment
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStudentClick(student.id);
                        }}
                        className="w-full px-2 py-1.5 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-primary text-[10px] font-extrabold rounded-lg shadow-lg hover:scale-105 transition-all whitespace-nowrap"
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

