import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ProgramType } from '../types';
import StudentAssignmentHistory from '../components/StudentAssignmentHistory';
import EnhancedAssignmentForm from '../components/EnhancedAssignmentForm';
import TicketCreationForm from '../components/TicketCreationForm';
import AfterSchoolStudentView from '../components/AfterSchoolStudentView';
import HomeworkAssignmentForm from '../components/HomeworkAssignmentForm';
import { Ticket } from '../types/ticket';
import { HomeworkItem } from '../types/assignment';
import Header from '../components/Header';

const AssignmentManagement: React.FC = () => {
  const { students: allStudents, assignments, getStudentAssignments, getTeacherPairs, getPairStudents, refreshData } = useBackendData();
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
  const [viewMode, setViewMode] = useState<'students' | 'completed'>('students');
  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [homeworkAssignmentId, setHomeworkAssignmentId] = useState<string | null>(null);

  const currentTeacher = useMemo(() => {
    if (!user || !teachers) return null;
    return teachers.find(t => t.email === user.email) || null;
  }, [user, teachers]);

  useEffect(() => {
    const loadPairStudents = async () => {
      if (!currentTeacher) {
        setPairStudents([]);
        return;
      }
      
      try {
        const pairs = await getTeacherPairs();
        const teacherDocId = (currentTeacher as any)._id || (currentTeacher as any).teacherDocumentId || currentTeacher.id;
        const teacherIdStr = teacherDocId.toString();
        
        const filteredPairs = pairs.filter((pair: any) => {
          const pairTeacher1Id = pair.teacher1?._id?.toString() || pair.teacher1?.toString();
          const pairTeacher2Id = pair.teacher2?._id?.toString() || pair.teacher2?.toString();
          return pairTeacher1Id === teacherIdStr || pairTeacher2Id === teacherIdStr;
        });
        
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

  const assignedStudents = useMemo(() => {
    if (!currentTeacher?.id) return allStudents;
    
    const directAssigned = getStudentsByTeacher(currentTeacher.id);
    const pairStudentIds = new Set(
      pairStudents
        .map(ps => ps.student?._id?.toString() || ps.student?.toString() || ps.student)
        .filter(Boolean)
    );
    
    const pairStudentsList = allStudents.filter(s => 
      pairStudentIds.has(s.id?.toString()) || pairStudentIds.has((s as any)._id?.toString())
    );
    
    const allAssigned = [...directAssigned, ...pairStudentsList];
    const uniqueAssigned = allAssigned.filter((student, index, self) => 
      index === self.findIndex(s => s.id === student.id || (s as any)._id === (student as any)._id)
    );
    
    return uniqueAssigned;
  }, [currentTeacher, allStudents, getStudentsByTeacher, pairStudents]);

  const programs = useMemo(() => {
    // Normalize program names to prevent duplicates (trim whitespace, handle case variations)
    const programSet = new Set<string>();
    assignedStudents.forEach(student => {
      if (student.program) {
        const normalized = student.program.trim();
        if (normalized) {
          programSet.add(normalized);
        }
      }
    });
    return Array.from(programSet).sort(); // Sort alphabetically for better UX
  }, [assignedStudents]);

  const filteredStudents = useMemo(() => {
    let filtered = assignedStudents;
    
    // Filter by program - handle case sensitivity and exact matching
    if (selectedProgram !== 'all') {
      filtered = filtered.filter(student => {
        if (!student.program) return false;
        // Normalize program names for comparison (handle variations)
        const studentProgram = student.program.trim();
        const selectedProgramNormalized = selectedProgram.trim();
        return studentProgram === selectedProgramNormalized;
      });
    }
    
    // Filter by search query - handle undefined/null values safely
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(student => {
        // Check fullName
        const fullName = student.fullName?.toLowerCase() || '';
        if (fullName.includes(query)) return true;
        
        // Check email
        const email = student.email?.toLowerCase() || '';
        if (email.includes(query)) return true;
        
        // Check id (convert to string safely)
        const id = String(student.id || (student as any)._id || '').toLowerCase();
        if (id.includes(query)) return true;
        
        // Check program
        const program = student.program?.toLowerCase() || '';
        if (program.includes(query)) return true;
        
        // Check contact/phone
        const contact = student.contact?.toLowerCase() || '';
        if (contact.includes(query)) return true;
        
        return false;
      });
    }
    
    return filtered;
  }, [assignedStudents, selectedProgram, searchQuery]);

  const stats = useMemo(() => {
    const assignedStudentIds = new Set(assignedStudents.map(s => s.id));
    const relevantAssignments = assignments.filter(a => assignedStudentIds.has(a.studentId));
    const totalAssignments = relevantAssignments.length;
    const studentsWithAssignments = new Set(relevantAssignments.map(a => a.studentId)).size;
    const activeAssignments = relevantAssignments.filter(a => a.status === 'active').length;
    const completedAssignments = relevantAssignments.filter((a: any) => {
      // Explicitly completed
      if (a.status === 'completed') return true;
      // Archived assignments
      if (a.status === 'archived') return true;
      // Homework that has been graded
      if (a.homework?.enabled && 
          a.homework?.submission?.submitted && 
          a.homework?.submission?.status === 'graded') return true;
      // Homework that has feedback (even if status isn't 'graded')
      if (a.homework?.enabled && 
          a.homework?.submission?.submitted && 
          a.homework?.submission?.feedback) return true;
      return false;
    }).length;
    const pendingHomework = relevantAssignments.filter((a: any) => 
      a.homework?.enabled && 
      a.homework?.submission?.submitted && 
      a.homework?.submission?.status === 'submitted'
    ).length;
    const completionRate = totalAssignments > 0 
      ? Math.round((completedAssignments / totalAssignments) * 100) 
      : 0;
    
    return {
      totalAssignments,
      studentsWithAssignments,
      activeAssignments,
      completedAssignments,
      pendingHomework,
      completionRate,
      totalStudents: assignedStudents.length
    };
  }, [assignments, assignedStudents]);

  // Get completed assignments for display
  const completedAssignmentsList = useMemo(() => {
    const assignedStudentIds = new Set(assignedStudents.map(s => s.id));
    return assignments
      .filter((a: any) => assignedStudentIds.has(a.studentId))
      .filter((assignment: any) => {
        // Explicitly completed
        if (assignment.status === 'completed') return true;
        // Archived assignments
        if (assignment.status === 'archived') return true;
        // Homework that has been graded
        if (assignment.homework?.enabled && 
            assignment.homework?.submission?.submitted && 
            assignment.homework?.submission?.status === 'graded') return true;
        // Homework that has feedback (even if status isn't 'graded')
        if (assignment.homework?.enabled && 
            assignment.homework?.submission?.submitted && 
            assignment.homework?.submission?.feedback) return true;
        return false;
      })
      .sort((a: any, b: any) => {
        const dateA = a.completedAt || a.homework?.submission?.gradedAt || a.updatedAt || a.createdAt;
        const dateB = b.completedAt || b.homework?.submission?.gradedAt || b.updatedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }, [assignments, assignedStudents]);

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

  // Check if After School is selected
  const isAfterSchoolSelected = selectedProgram === 'After School';

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
    if (ticket.type === 'sabq') {
      setPrefillTicket(ticket);
      setShowTicketForm(false);
      setShowAssignmentForm(true);
    } else {
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

  const handleAssignHomework = (assignmentId: string, studentId: string) => {
    setHomeworkAssignmentId(assignmentId);
    setSelectedStudent(studentId);
    setShowHomeworkForm(true);
  };

  const handleSaveHomework = async (homeworkItems: HomeworkItem[], notes: string) => {
    if (!homeworkAssignmentId) return;

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      
      // Get current assignment
      const assignmentResponse = await fetch(`${API_BASE}/assignments/${homeworkAssignmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!assignmentResponse.ok) {
        throw new Error('Failed to fetch assignment');
      }

      const assignment = await assignmentResponse.json();

      // Update assignment with homework items
      const updateResponse = await fetch(`${API_BASE}/assignments/${homeworkAssignmentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...assignment,
          homework: {
            ...assignment.homework,
            enabled: homeworkItems.length > 0,
            items: homeworkItems,
            notes: notes
          }
        })
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || 'Failed to save homework');
      }

      // Refresh data
      await refreshData();
    } catch (error) {
      console.error('Error saving homework:', error);
      throw error;
    }
  };

  const handleCloseHomeworkForm = () => {
    setShowHomeworkForm(false);
    setHomeworkAssignmentId(null);
    setSelectedStudent(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Assignment Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            {currentTeacher 
              ? `Manage assignments for ${stats.totalStudents} assigned students`
              : `Manage assignments for ${stats.totalStudents} students`}
          </p>
        </div>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total Assignments</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
            <p className="text-xs text-gray-600 mt-1">{stats.studentsWithAssignments} students</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Active</p>
            <p className="text-2xl font-bold text-blue-600">{stats.activeAssignments}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completedAssignments}</p>
            <p className="text-xs text-gray-600 mt-1">{stats.completionRate}% rate</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Students</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            {stats.pendingHomework > 0 && (
              <p className="text-xs text-orange-600 mt-1">{stats.pendingHomework} pending homework</p>
            )}
          </div>
        </section>

        {/* View Mode Toggle */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('students')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'students'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setViewMode('completed')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'completed'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed ({stats.completedAssignments})
              {stats.pendingHomework > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs">
                  {stats.pendingHomework} pending
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value as ProgramType | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            >
              <option value="all">All Programs</option>
              {programs.map(program => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Students List or Completed Assignments */}
        {viewMode === 'students' ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {currentTeacher ? 'My Students' : 'All Students'}
              </h2>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-gray-600">No students found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredStudents.map(student => {
                  // Use getStudentAssignments for consistent filtering logic
                  const studentAssignments = getStudentAssignments(student.id);
                  const activeAssignments = studentAssignments.filter(a => a.status === 'active').length;
                  const initials = getInitials(student.fullName);
                  
                  return (
                    <div
                      key={student.id}
                      className="px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
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
                          
                          {/* Student Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{student.fullName}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {student.program && <span>{student.program}</span>}
                              {studentAssignments.length > 0 && (
                                <span className="text-primary font-medium">
                                  {activeAssignments > 0 ? activeAssignments : studentAssignments.length} assignment{studentAssignments.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!isAfterSchoolSelected && (
                            <button
                              onClick={() => handleCreateTicket(student.id)}
                              className="px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                            >
                              Ticket
                            </button>
                          )}
                          {!isAfterSchoolSelected && (
                            <button
                              onClick={() => handleCreateAssignment(student.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              Assignment
                            </button>
                          )}
                          <button
                            onClick={() => handleStudentClick(student.id)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            {isAfterSchoolSelected ? 'Review' : 'View'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                ✅ Completed Assignments & Homework
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {completedAssignmentsList.length} completed assignment{completedAssignmentsList.length !== 1 ? 's' : ''}
              </p>
            </div>

            {completedAssignmentsList.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-gray-600">No completed assignments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Completed</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {completedAssignmentsList.map((assignment: any) => {
                      const isCompleted = assignment.status === 'completed';
                      const isArchived = assignment.status === 'archived';
                      const isGraded = assignment.homework?.submission?.status === 'graded';
                      const hasFeedback = !!assignment.homework?.submission?.feedback;
                      const completedDate = assignment.completedAt || 
                                           assignment.homework?.submission?.gradedAt || 
                                           assignment.updatedAt || 
                                           assignment.createdAt;
                      const grade = assignment.homework?.submission?.grade;
                      const student = allStudents.find((s: any) => s.id === assignment.studentId);
                      
                      return (
                        <tr key={assignment.id || assignment._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-sm">
                              {assignment.studentName || student?.fullName || 'Unknown'}
                            </div>
                            {student?.program && (
                              <div className="text-xs text-gray-500 mt-1">{student.program}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">
                              {assignment.homework?.enabled ? 'Homework' : 'Assignment'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isArchived ? (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-300">
                                Archived
                              </span>
                            ) : isCompleted ? (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-300">
                                Completed
                              </span>
                            ) : isGraded ? (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                                Graded
                              </span>
                            ) : hasFeedback ? (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                                Reviewed
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {completedDate ? new Date(completedDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            {grade !== null && grade !== undefined ? (
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
                                {grade}/100
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStudent(assignment.studentId);
                                  handleStudentClick(assignment.studentId);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                View
                              </button>
                              {assignment.status === 'active' && (
                                <button
                                  onClick={() => handleAssignHomework(assignment.id || assignment._id, assignment.studentId)}
                                  className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-colors"
                                >
                                  Assign Homework
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {/* After School Student View */}
      {selectedStudent && !showAssignmentForm && isAfterSchoolSelected && (
        <AfterSchoolStudentView
          studentId={selectedStudent}
          onClose={handleCloseModal}
        />
      )}

      {/* Regular Student Assignment History (for non-After School) */}
      {selectedStudent && !showAssignmentForm && !isAfterSchoolSelected && (
        <StudentAssignmentHistory
          studentId={selectedStudent}
          onClose={handleCloseModal}
          onEditAssignment={handleEditAssignment}
          onCreateAssignment={() => {
            setShowAssignmentForm(true);
            setEditingAssignment(null);
          }}
          onAssignHomework={handleAssignHomework}
        />
      )}

      {showTicketForm && selectedStudent && (
        <TicketCreationForm
          studentId={selectedStudent}
          onClose={() => {
            setShowTicketForm(false);
          }}
          onSuccess={handleTicketSuccess}
        />
      )}

      {showAssignmentForm && (
        <EnhancedAssignmentForm
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
          onSave={async () => {
            // Refresh data and wait for it to complete
            await refreshData();
            setShowAssignmentForm(false);
            setEditingAssignment(null);
            setPrefillTicket(null);
          }}
        />
      )}

      {showHomeworkForm && selectedStudent && homeworkAssignmentId && (
        <HomeworkAssignmentForm
          studentId={selectedStudent}
          assignmentId={homeworkAssignmentId}
          onSave={handleSaveHomework}
          onClose={handleCloseHomeworkForm}
        />
      )}
    </div>
  );
};

export default AssignmentManagement;
