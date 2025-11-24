import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import { Assignment } from '../types/assignment';

interface StudentAssignmentHistoryProps {
  studentId: string;
  onClose: () => void;
  onEditAssignment?: (assignmentId: string) => void;
  onCreateAssignment?: () => void;
}

const StudentAssignmentHistory: React.FC<StudentAssignmentHistoryProps> = ({
  studentId,
  onClose,
  onEditAssignment,
  onCreateAssignment
}) => {
  const { students, getStudentAssignments, deleteAssignment, refreshData } = useBackendData();
  const { user } = useAuth();
  
  // Track which assignments are expanded (all expanded by default)
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set());
  const [expandedMushafFor, setExpandedMushafFor] = useState<Record<string, { type: 'sabq' | 'sabqi' | 'manzil'; index: number } | null>>({});
  const [mushafPages, setMushafPages] = useState<Record<string, number>>({});
  const [gradingAssignment, setGradingAssignment] = useState<string | null>(null);
  const [gradeData, setGradeData] = useState({ feedback: '', grade: '' });
  const [isGrading, setIsGrading] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [assignedByFilter, setAssignedByFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Refresh data from backend when component mounts or studentId changes
  const lastRefreshedStudentId = React.useRef<string | null>(null);
  useEffect(() => {
    if (lastRefreshedStudentId.current !== studentId) {
      lastRefreshedStudentId.current = studentId;
      refreshData();
    }
  }, [studentId, refreshData]);

  const student = students.find(s => s.id === studentId);
  const assignments = getStudentAssignments(studentId);

  // Expand all assignments by default
  useEffect(() => {
    if (assignments.length > 0 && expandedAssignments.size === 0) {
      setExpandedAssignments(new Set(assignments.map(a => a.id)));
    }
  }, [assignments, expandedAssignments.size]);

  const toggleAssignment = (assignmentId: string) => {
    setExpandedAssignments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assignmentId)) {
        newSet.delete(assignmentId);
      } else {
        newSet.add(assignmentId);
      }
      return newSet;
    });
  };

  const toggleMushaf = (assignmentId: string, type: 'sabq' | 'sabqi' | 'manzil', index: number, phase?: any) => {
    const key = `${assignmentId}-${type}-${index}`;
    const current = expandedMushafFor[assignmentId];
    const isCurrentlyOpen = current?.type === type && current?.index === index;
    
    setExpandedMushafFor(prev => ({
      ...prev,
      [assignmentId]: isCurrentlyOpen ? null : { type, index }
    }));

    // Set page when opening - prioritize phase.fromPage, then first mistake page, then default to 1
    if (!isCurrentlyOpen) {
      let defaultPage = 1;
      
      // Try to get page from phase.fromPage
      if (phase?.fromPage) {
        defaultPage = phase.fromPage;
      } else {
        // Try to get from first mistake
        const assignment = assignments.find(a => a.id === assignmentId);
        if (assignment?.mushafMistakes) {
          const phaseMistakes = assignment.mushafMistakes.filter(m => m.workflowStep === type);
          if (phaseMistakes.length > 0 && phaseMistakes[0].page) {
            defaultPage = phaseMistakes[0].page;
          }
        }
      }
      
      setMushafPages(prev => ({
        ...prev,
        [key]: defaultPage
      }));
    }
  };

  const findDuplicates = (assignment: Assignment) => {
    return assignments.filter(a => 
      a.id !== assignment.id &&
      a.studentId === assignment.studentId &&
      Math.abs(new Date(a.createdAt || 0).getTime() - new Date(assignment.createdAt || 0).getTime()) < 24 * 60 * 60 * 1000
    );
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const duplicates = findDuplicates(assignment);
    let confirmMessage = `Are you sure you want to delete this assignment?`;
    if (duplicates.length > 0) {
      confirmMessage += `\n\n⚠️ Warning: There ${duplicates.length === 1 ? 'is' : 'are'} ${duplicates.length} similar assignment(s) that might be duplicates.`;
    }
    confirmMessage += '\n\nThis action cannot be undone.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await deleteAssignment(assignmentId);
      alert('Assignment deleted successfully!');
      await refreshData();
      setExpandedAssignments(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getMistakesForPhase = (assignment: Assignment, type: 'sabq' | 'sabqi' | 'manzil', index: number) => {
    if (!assignment.mushafMistakes) return [];
    return assignment.mushafMistakes
      .filter(m => m.workflowStep === type)
      .map(m => ({
        id: m.id,
        type: m.type || 'other',
        page: m.page,
        surah: m.surah,
        ayah: m.ayah,
        wordIndex: m.wordIndex,
        position: m.position,
        note: m.note,
        audioUrl: m.audioUrl,
        workflowStep: m.workflowStep,
        markedBy: m.markedBy,
        markedByName: m.markedByName,
        timestamp: m.timestamp
      })) as MushafMistake[];
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      if (statusFilter !== 'all' && assignment.status !== statusFilter) {
        return false;
      }
      
      if (typeFilter !== 'all') {
        if (typeFilter === 'homework') {
          if (!assignment.homework?.enabled) {
            return false;
          }
        } else {
          const hasType = assignment.classwork[typeFilter as 'sabq' | 'sabqi' | 'manzil']?.length > 0;
          if (!hasType) {
            return false;
          }
        }
      }
      
      if (assignedByFilter !== 'all' && assignment.assignedByRole !== assignedByFilter) {
        return false;
      }
      
      return true;
    });
  }, [assignments, statusFilter, typeFilter, assignedByFilter]);

  const groupedAssignments = useMemo(() => {
    const grouped: Record<string, Assignment[]> = {};
    filteredAssignments.forEach(assignment => {
      const date = assignment.createdAt 
        ? new Date(assignment.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'Unknown Date';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(assignment);
    });
    return grouped;
  }, [filteredAssignments]);

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleGradeHomework = async (assignmentId: string) => {
    if (!user) {
      alert('User information not found');
      return;
    }

    if (!gradeData.feedback.trim() && !gradeData.grade.trim()) {
      alert('Please provide feedback or grade');
      return;
    }

    setIsGrading(true);
    try {
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/grade-homework`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback: gradeData.feedback,
          grade: gradeData.grade ? parseFloat(gradeData.grade) : undefined,
          gradedBy: user.id,
          gradedByName: user.name || user.email || 'Admin'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to grade homework');
      }

      alert('Homework graded successfully!');
      setGradingAssignment(null);
      setGradeData({ feedback: '', grade: '' });
      await refreshData();
    } catch (error) {
      console.error('Error grading homework:', error);
      alert(`Failed to grade homework: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border-4 border-accent/30 my-4">
        {/* Modern Header */}
        <div className="px-6 sm:px-8 py-5 sm:py-6 border-b-4 border-accent/50 bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] shadow-lg flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-lg">
                  {student?.fullName || 'Student'} - Assignment History
                </h2>
                <p className="text-white/90 text-sm sm:text-base mt-1 font-medium">
                  {filteredAssignments.length} of {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onCreateAssignment && (
                <button
                  onClick={onCreateAssignment}
                  className="px-6 py-3 bg-accent text-primary rounded-xl font-extrabold transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-white/30"
                >
                  + New Assignment
                </button>
              )}
              <button
                onClick={onClose}
                className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all hover:scale-110 text-2xl sm:text-3xl font-bold shadow-lg border-2 border-white/30"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          {/* Filters */}
          <div className="mb-6 p-4 bg-white rounded-2xl border-2 border-gray-200 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-extrabold text-primary mb-2 uppercase tracking-wide">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition font-medium shadow-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-extrabold text-primary mb-2 uppercase tracking-wide">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition font-medium shadow-sm"
                >
                  <option value="all">All Types</option>
                  <option value="sabq">Sabq</option>
                  <option value="sabqi">Sabqi</option>
                  <option value="manzil">Manzil</option>
                  <option value="homework">Homework</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-extrabold text-primary mb-2 uppercase tracking-wide">Assigned By</label>
                <select
                  value={assignedByFilter}
                  onChange={(e) => setAssignedByFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition font-medium shadow-sm"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            </div>
            
            {(statusFilter !== 'all' || typeFilter !== 'all' || assignedByFilter !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setAssignedByFilter('all');
                }}
                className="px-4 py-2 text-sm border-2 border-gray-300 text-primary rounded-xl font-extrabold hover:bg-gray-50 transition-all shadow-md"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Assignments List - All Expanded */}
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              </div>
              <p className="text-xl font-bold text-primary mb-2">No Assignments Found</p>
              <p className="text-base text-primary/70">
                {assignments.length === 0 
                  ? 'This student has no assignments yet.'
                  : 'No assignments match the selected filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(Object.entries(groupedAssignments) as [string, Assignment[]][])
                .sort(([dateA], [dateB]) => {
                  const a = new Date(dateA);
                  const b = new Date(dateB);
                  return b.getTime() - a.getTime();
                })
                .map(([date, dayAssignments]) => (
                  <div key={date} className="space-y-4">
                    {/* Date Header */}
                    <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-primary/90 text-white px-6 py-3 rounded-xl shadow-lg border-2 border-primary/50">
                      <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                        {date}
                        <span className="text-sm font-medium opacity-90">
                          ({dayAssignments.length} assignment{dayAssignments.length !== 1 ? 's' : ''})
                        </span>
                      </h3>
                    </div>
                    
                    {/* Assignments for this date */}
                    {dayAssignments.map(assignment => {
                      const isExpanded = expandedAssignments.has(assignment.id);
                      const mushafState = expandedMushafFor[assignment.id];
                      const duplicates = findDuplicates(assignment);
                      
                      return (
                        <div
                          key={assignment.id}
                          className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all"
                        >
                          {/* Assignment Header */}
                          <div className="p-5 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className={`px-3 py-1.5 rounded-lg text-xs font-extrabold text-white shadow-md ${
                                    assignment.status === 'active' ? 'bg-primary' :
                                    assignment.status === 'completed' ? 'bg-accent' :
                                    'bg-gray-500'
                                  }`}>
                                    {assignment.status?.toUpperCase() || 'ACTIVE'}
                                  </span>
                                  {duplicates.length > 0 && (
                                    <span className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-orange-500 text-white shadow-md">
                                      {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  <span className="text-xs text-primary/70 font-semibold">
                                    Assigned by {assignment.assignedByName} ({assignment.assignedByRole})
                                  </span>
                                </div>
                                <p className="text-xs text-primary/60 font-medium">
                                  Created: {formatDate(assignment.createdAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {onEditAssignment && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditAssignment(assignment.id);
                                    }}
                                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-extrabold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all shadow-md"
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAssignment(assignment.id);
                                  }}
                                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-extrabold hover:bg-red-600 transition-all shadow-md"
                                  title="Delete assignment"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => toggleAssignment(assignment.id)}
                                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-extrabold hover:bg-primary/90 transition-all shadow-md"
                                >
                                  {isExpanded ? '▲ Collapse' : '▼ Expand'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content - Always visible when expanded */}
                          {isExpanded && (
                            <div className="p-5 space-y-5">
                              {/* Classwork Section */}
                              <div>
                                <h4 className="text-base font-extrabold text-primary mb-3 flex items-center gap-2">
                                  <span>📖</span> Classwork
                                </h4>
                                <div className="space-y-4">
                                  {/* Sabq */}
                                  {assignment.classwork.sabq.length > 0 && (
                                    <div className="bg-soft-primary border-l-4 border-primary rounded-xl p-4">
                                      <h5 className="text-sm font-extrabold text-primary mb-3 uppercase tracking-wide">
                                        Sabq ({assignment.classwork.sabq.length})
                                      </h5>
                                      <div className="space-y-3">
                                        {assignment.classwork.sabq.map((phase, idx) => {
                                          const phaseMistakes = getMistakesForPhase(assignment, 'sabq', idx);
                                          const mushafKey = `${assignment.id}-sabq-${idx}`;
                                          const isMushafOpen = mushafState?.type === 'sabq' && mushafState?.index === idx;
                                          const defaultPage = phase.fromPage || (phaseMistakes.length > 0 ? phaseMistakes[0].page : 1);
                                          const mushafPage = mushafPages[mushafKey] || defaultPage;
                                          
                                          return (
                                            <div key={idx} className="bg-white rounded-lg p-4 border border-primary/30">
                                              <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                  <p className="text-sm font-bold text-primary mb-1">
                                                    {phase.assignmentRange}
                                                  </p>
                                                  {phase.details && (
                                                    <p className="text-xs text-primary/70 italic">{phase.details}</p>
                                                  )}
                                                </div>
                                                <button
                                                  onClick={() => toggleMushaf(assignment.id, 'sabq', idx, phase)}
                                                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-extrabold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all shadow-md whitespace-nowrap ml-3"
                                                >
                                                  {isMushafOpen ? '▲ Hide' : 'View'} Mushaf {phaseMistakes.length > 0 && `(${phaseMistakes.length})`}
                                                </button>
                                              </div>
                                              
                                              {/* Inline Mushaf View - Always show when open */}
                                              {isMushafOpen && (
                                                <div className="mt-4 pt-4 border-t-2 border-green-300">
                                                  <div className="mb-3 flex items-center justify-between">
                                                    <h6 className="text-sm font-extrabold text-green-800">
                                                      Mushaf View {phaseMistakes.length > 0 && `- ${phaseMistakes.length} mistake${phaseMistakes.length !== 1 ? 's' : ''}`}
                                                    </h6>
                                                    <span className="text-xs text-primary font-semibold">
                                                      Page {mushafPage}
                                                    </span>
                                                  </div>
                                                  <div className="bg-white rounded-xl p-3 border-2 border-primary/30">
                                                    <InteractiveMushaf
                                                      currentPage={mushafPage}
                                                      onPageChange={(page) => setMushafPages(prev => ({ ...prev, [mushafKey]: page }))}
                                                      mistakes={phaseMistakes}
                                                      onMistakeMark={() => {}}
                                                      readOnly={true}
                                                      mode="viewing"
                                                      studentName={student?.fullName || 'Student'}
                                                    />
                                                  </div>
                                                  {/* Mistake List - Only show if there are mistakes */}
                                                  {phaseMistakes.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                      <h6 className="text-xs font-extrabold text-primary mb-2">Mistakes:</h6>
                                                      {phaseMistakes.map((mistake, mIdx) => (
                                                        <div key={mistake.id || mIdx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-primary/30 text-xs">
                                                          <span className="px-2 py-1 bg-primary text-white rounded-lg font-extrabold">
                                                            {mistake.type}
                                                          </span>
                                                          <span className="text-primary font-semibold">
                                                            Page {mistake.page}, Surah {mistake.surah}, Ayah {mistake.ayah}
                                                          </span>
                                                          {mistake.note && (
                                                            <span className="text-primary/70 italic">"{mistake.note}"</span>
                                                          )}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                  {phaseMistakes.length === 0 && (
                                                    <div className="mt-3 p-3 bg-soft-primary rounded-lg border border-primary/30">
                                                      <p className="text-xs text-primary font-semibold text-center">
                                                        ✓ No mistakes recorded for this assignment
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Sabqi */}
                                  {assignment.classwork.sabqi.length > 0 && (
                                    <div className="bg-accent/10 border-l-4 border-accent rounded-xl p-4">
                                      <h5 className="text-sm font-extrabold text-accent mb-3 uppercase tracking-wide">
                                        Sabqi ({assignment.classwork.sabqi.length})
                                      </h5>
                                      <div className="space-y-3">
                                        {assignment.classwork.sabqi.map((phase, idx) => {
                                          const phaseMistakes = getMistakesForPhase(assignment, 'sabqi', idx);
                                          const mushafKey = `${assignment.id}-sabqi-${idx}`;
                                          const isMushafOpen = mushafState?.type === 'sabqi' && mushafState?.index === idx;
                                          const defaultPage = phase.fromPage || (phaseMistakes.length > 0 ? phaseMistakes[0].page : 1);
                                          const mushafPage = mushafPages[mushafKey] || defaultPage;
                                          
                                          return (
                                            <div key={idx} className="bg-white rounded-lg p-4 border border-accent/30">
                                              <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                  <p className="text-sm font-bold text-primary mb-1">
                                                    {phase.assignmentRange}
                                                  </p>
                                                  {phase.details && (
                                                    <p className="text-xs text-primary/70 italic">{phase.details}</p>
                                                  )}
                                                </div>
                                                <button
                                                  onClick={() => toggleMushaf(assignment.id, 'sabqi', idx, phase)}
                                                  className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-extrabold hover:bg-accent/90 transition-all shadow-md whitespace-nowrap ml-3"
                                                >
                                                  {isMushafOpen ? '▲ Hide' : 'View'} Mushaf {phaseMistakes.length > 0 && `(${phaseMistakes.length})`}
                                                </button>
                                              </div>
                                              
                                              {/* Inline Mushaf View - Always show when open */}
                                              {isMushafOpen && (
                                                <div className="mt-4 pt-4 border-t-2 border-blue-300">
                                                  <div className="mb-3 flex items-center justify-between">
                                                    <h6 className="text-sm font-extrabold text-blue-800">
                                                      Mushaf View {phaseMistakes.length > 0 && `- ${phaseMistakes.length} mistake${phaseMistakes.length !== 1 ? 's' : ''}`}
                                                    </h6>
                                                    <span className="text-xs text-accent font-semibold">
                                                      Page {mushafPage}
                                                    </span>
                                                  </div>
                                                  <div className="bg-white rounded-xl p-3 border-2 border-accent/30">
                                                    <InteractiveMushaf
                                                      currentPage={mushafPage}
                                                      onPageChange={(page) => setMushafPages(prev => ({ ...prev, [mushafKey]: page }))}
                                                      mistakes={phaseMistakes}
                                                      onMistakeMark={() => {}}
                                                      readOnly={true}
                                                      mode="viewing"
                                                      studentName={student?.fullName || 'Student'}
                                                    />
                                                  </div>
                                                  {/* Mistake List - Only show if there are mistakes */}
                                                  {phaseMistakes.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                      <h6 className="text-xs font-extrabold text-accent mb-2">Mistakes:</h6>
                                                      {phaseMistakes.map((mistake, mIdx) => (
                                                        <div key={mistake.id || mIdx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-accent/30 text-xs">
                                                          <span className="px-2 py-1 bg-accent text-white rounded-lg font-extrabold">
                                                            {mistake.type}
                                                          </span>
                                                          <span className="text-primary font-semibold">
                                                            Page {mistake.page}, Surah {mistake.surah}, Ayah {mistake.ayah}
                                                          </span>
                                                          {mistake.note && (
                                                            <span className="text-primary/70 italic">"{mistake.note}"</span>
                                                          )}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                  {phaseMistakes.length === 0 && (
                                                    <div className="mt-3 p-3 bg-accent/10 rounded-lg border border-accent/30">
                                                      <p className="text-xs text-accent font-semibold text-center">
                                                        ✓ No mistakes recorded for this assignment
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Manzil */}
                                  {assignment.classwork.manzil.length > 0 && (
                                    <div className="bg-purple-50 border-l-4 border-purple-500 rounded-xl p-4">
                                      <h5 className="text-sm font-extrabold text-purple-800 mb-3 uppercase tracking-wide">
                                        📿 Manzil ({assignment.classwork.manzil.length})
                                      </h5>
                                      <div className="space-y-3">
                                        {assignment.classwork.manzil.map((phase, idx) => {
                                          const phaseMistakes = getMistakesForPhase(assignment, 'manzil', idx);
                                          const mushafKey = `${assignment.id}-manzil-${idx}`;
                                          const isMushafOpen = mushafState?.type === 'manzil' && mushafState?.index === idx;
                                          const defaultPage = phase.fromPage || (phaseMistakes.length > 0 ? phaseMistakes[0].page : 1);
                                          const mushafPage = mushafPages[mushafKey] || defaultPage;
                                          
                                          return (
                                            <div key={idx} className="bg-white rounded-lg p-4 border border-purple-200">
                                              <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                  <p className="text-sm font-bold text-primary mb-1">
                                                    {phase.assignmentRange}
                                                  </p>
                                                  {phase.details && (
                                                    <p className="text-xs text-primary/70 italic">{phase.details}</p>
                                                  )}
                                                </div>
                                                <button
                                                  onClick={() => toggleMushaf(assignment.id, 'manzil', idx, phase)}
                                                  className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-extrabold hover:bg-purple-600 transition-all shadow-md whitespace-nowrap ml-3"
                                                >
                                                  {isMushafOpen ? '▲ Hide' : 'View'} Mushaf {phaseMistakes.length > 0 && `(${phaseMistakes.length})`}
                                                </button>
                                              </div>
                                              
                                              {/* Inline Mushaf View - Always show when open */}
                                              {isMushafOpen && (
                                                <div className="mt-4 pt-4 border-t-2 border-purple-300">
                                                  <div className="mb-3 flex items-center justify-between">
                                                    <h6 className="text-sm font-extrabold text-purple-800">
                                                      Mushaf View {phaseMistakes.length > 0 && `- ${phaseMistakes.length} mistake${phaseMistakes.length !== 1 ? 's' : ''}`}
                                                    </h6>
                                                    <span className="text-xs text-purple-700 font-semibold">
                                                      Page {mushafPage}
                                                    </span>
                                                  </div>
                                                  <div className="bg-white rounded-xl p-3 border-2 border-purple-200">
                                                    <InteractiveMushaf
                                                      currentPage={mushafPage}
                                                      onPageChange={(page) => setMushafPages(prev => ({ ...prev, [mushafKey]: page }))}
                                                      mistakes={phaseMistakes}
                                                      onMistakeMark={() => {}}
                                                      readOnly={true}
                                                      mode="viewing"
                                                      studentName={student?.fullName || 'Student'}
                                                    />
                                                  </div>
                                                  {/* Mistake List - Only show if there are mistakes */}
                                                  {phaseMistakes.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                      <h6 className="text-xs font-extrabold text-purple-800 mb-2">Mistakes:</h6>
                                                      {phaseMistakes.map((mistake, mIdx) => (
                                                        <div key={mistake.id || mIdx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-purple-200 text-xs">
                                                          <span className="px-2 py-1 bg-purple-500 text-white rounded-lg font-extrabold">
                                                            {mistake.type}
                                                          </span>
                                                          <span className="text-primary font-semibold">
                                                            Page {mistake.page}, Surah {mistake.surah}, Ayah {mistake.ayah}
                                                          </span>
                                                          {mistake.note && (
                                                            <span className="text-primary/70 italic">"{mistake.note}"</span>
                                                          )}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                  {phaseMistakes.length === 0 && (
                                                    <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                      <p className="text-xs text-purple-700 font-semibold text-center">
                                                        ✓ No mistakes recorded for this assignment
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {assignment.classwork.sabq.length === 0 && 
                                   assignment.classwork.sabqi.length === 0 && 
                                   assignment.classwork.manzil.length === 0 && (
                                    <p className="text-sm text-primary/70 italic p-4 bg-gray-50 rounded-lg">No classwork assigned</p>
                                  )}
                                </div>
                              </div>

                              {/* Homework Section */}
                              {assignment.homework.enabled && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-xl p-4">
                                  <h4 className="text-base font-extrabold text-yellow-800 mb-3 flex items-center gap-2">
                                    <span>📝</span> Homework
                                  </h4>
                                  {assignment.homework.content && (
                                    <p className="text-sm text-primary mb-3 bg-white p-3 rounded-lg border border-yellow-200">
                                      {assignment.homework.content}
                                    </p>
                                  )}
                                  {assignment.homework.link && (
                                    <a
                                      href={assignment.homework.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline break-all inline-flex items-center gap-1 mb-3 bg-white p-3 rounded-lg border border-yellow-200"
                                    >
                                      {assignment.homework.link}
                                    </a>
                                  )}
                                  
                                  {/* Homework Submission */}
                                  {assignment.homework.submission?.submitted && (
                                    <div className="mt-4 pt-4 border-t-2 border-yellow-300 bg-white rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <h5 className="text-sm font-extrabold text-primary">Student Submission</h5>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-extrabold text-white ${
                                          assignment.homework.submission.status === 'graded' 
                                            ? 'bg-green-500'
                                            : assignment.homework.submission.status === 'returned'
                                            ? 'bg-orange-500'
                                            : 'bg-blue-500'
                                        }`}>
                                          {assignment.homework.submission.status === 'graded' 
                                            ? '✓ Graded' 
                                            : assignment.homework.submission.status === 'returned'
                                            ? 'Returned'
                                            : 'Submitted'}
                                        </span>
                                      </div>
                                      
                                      {assignment.homework.submission.submittedAt && (
                                        <p className="text-xs text-primary/70 mb-2 font-medium">
                                          Submitted: {formatDate(assignment.homework.submission.submittedAt)}
                                        </p>
                                      )}
                                      
                                      {assignment.homework.submission.content && (
                                        <p className="text-sm text-primary mb-2 bg-gray-50 p-3 rounded-lg">{assignment.homework.submission.content}</p>
                                      )}
                                      
                                      {assignment.homework.submission.link && (
                                        <a 
                                          href={assignment.homework.submission.link} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-sm text-primary hover:underline break-all inline-flex items-center gap-1 mb-2"
                                        >
                                          {assignment.homework.submission.link}
                                        </a>
                                      )}
                                      
                                      {assignment.homework.submission.audioUrl && (
                                        <div className="mb-3">
                                          <p className="text-xs font-extrabold text-primary mb-1">Audio Recording:</p>
                                          <audio
                                            controls
                                            src={assignment.homework.submission.audioUrl}
                                            className="w-full max-w-md"
                                          >
                                            Your browser does not support the audio element.
                                          </audio>
                                        </div>
                                      )}
                                      
                                      {assignment.homework.submission.attachments && assignment.homework.submission.attachments.length > 0 && (
                                        <div className="mb-3">
                                          <p className="text-xs font-extrabold text-primary mb-2">Attachments:</p>
                                          <div className="flex flex-wrap gap-2">
                                            {assignment.homework.submission.attachments.map((att, idx) => (
                                              <a
                                                key={idx}
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline px-2 py-1 bg-soft-primary rounded-lg border border-primary/30"
                                              >
                                                {att.name}
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {assignment.homework.submission.feedback && (
                                        <div className="mt-3 p-3 bg-soft-primary border-l-4 border-primary rounded-lg">
                                          <p className="text-xs font-extrabold text-primary mb-1">Feedback:</p>
                                          <p className="text-sm text-primary">{assignment.homework.submission.feedback}</p>
                                          {assignment.homework.submission.gradedByName && (
                                            <p className="text-xs text-primary mt-1 font-semibold">
                                              - {assignment.homework.submission.gradedByName}
                                              {assignment.homework.submission.gradedAt && ` (${formatDate(assignment.homework.submission.gradedAt)})`}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      
                                      {assignment.homework.submission.grade !== undefined && assignment.homework.submission.grade !== null && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                          <span className="text-sm font-extrabold text-primary">Grade: </span>
                                          <span className="text-2xl font-extrabold text-blue-600">{assignment.homework.submission.grade}</span>
                                        </div>
                                      )}
                                      
                                      {/* Grading Form */}
                                      {assignment.homework.submission.status === 'submitted' && 
                                       (user?.role === 'admin' || user?.role === 'superadmin') && (
                                        <div className="mt-4 pt-4 border-t-2 border-yellow-300">
                                          {gradingAssignment === assignment.id ? (
                                            <div className="space-y-3">
                                              <div>
                                                <label className="block text-xs font-extrabold text-primary mb-2">Feedback</label>
                                                <textarea
                                                  value={gradeData.feedback}
                                                  onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
                                                  rows={4}
                                                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition font-medium shadow-sm resize-none"
                                                  placeholder="Enter feedback for the student..."
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-extrabold text-primary mb-2">Grade (Optional)</label>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={gradeData.grade}
                                                  onChange={(e) => setGradeData(prev => ({ ...prev, grade: e.target.value }))}
                                                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition font-medium shadow-sm"
                                                  placeholder="Enter grade (0-100)"
                                                />
                                              </div>
                                              <div className="flex gap-3">
                                                <button
                                                  onClick={() => {
                                                    setGradingAssignment(null);
                                                    setGradeData({ feedback: '', grade: '' });
                                                  }}
                                                  className="px-6 py-3 border-2 border-gray-300 text-primary rounded-xl font-extrabold hover:bg-gray-50 transition-all shadow-md"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  onClick={() => handleGradeHomework(assignment.id)}
                                                  disabled={isGrading}
                                                  className="px-6 py-3 bg-green-500 text-white rounded-xl font-extrabold hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                                >
                                                  {isGrading ? 'Grading...' : 'Submit Grade'}
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                setGradingAssignment(assignment.id);
                                                const submission = assignment.homework.submission;
                                                setGradeData({ 
                                                  feedback: submission?.feedback || '', 
                                                  grade: submission?.grade?.toString() || '' 
                                                });
                                              }}
                                              className="px-6 py-3 bg-primary text-white rounded-xl font-extrabold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all shadow-lg"
                                            >
                                              {assignment.homework.submission.grade !== undefined && assignment.homework.submission.grade !== null 
                                                ? 'Update Grade' 
                                                : 'Grade Homework'}
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Comment Section */}
                              {assignment.comment && (
                                <div className="bg-gray-50 border-l-4 border-gray-400 rounded-xl p-4">
                                  <h4 className="text-base font-extrabold text-primary mb-2 flex items-center gap-2">
                                    <span>💬</span> Comment
                                  </h4>
                                  <p className="text-sm text-primary bg-white p-3 rounded-lg border border-gray-200">{assignment.comment}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAssignmentHistory;
