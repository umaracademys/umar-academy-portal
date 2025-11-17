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
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState<number>(1);
  const [viewingMistakesFor, setViewingMistakesFor] = useState<{ assignmentId: string; type: 'sabqi' | 'manzil'; index: number } | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<string | null>(null);
  const [gradeData, setGradeData] = useState({ feedback: '', grade: '' });
  const [isGrading, setIsGrading] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, active, completed, archived
  const [typeFilter, setTypeFilter] = useState<string>('all'); // all, sabq, sabqi, manzil, homework
  const [assignedByFilter, setAssignedByFilter] = useState<string>('all'); // all, admin, super_admin, teacher
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list'); // list or calendar view
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Current month for calendar
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // Selected date in calendar
  const dateAssignmentsRef = React.useRef<HTMLDivElement | null>(null); // Ref for scrolling to assignments

  // Refresh data from backend when component mounts or studentId changes (only once per studentId)
  const lastRefreshedStudentId = React.useRef<string | null>(null);
  useEffect(() => {
    if (lastRefreshedStudentId.current !== studentId) {
      lastRefreshedStudentId.current = studentId;
      refreshData();
    }
  }, [studentId]); // Only depend on studentId, not refreshData

  const student = students.find(s => s.id === studentId);
  const assignments = getStudentAssignments(studentId);

  // Detect duplicate assignments (same student, similar content, created close together)
  const findDuplicates = (assignment: Assignment) => {
    return assignments.filter(a => 
      a.id !== assignment.id &&
      a.studentId === assignment.studentId &&
      Math.abs(new Date(a.createdAt || 0).getTime() - new Date(assignment.createdAt || 0).getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
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
      if (selectedAssignment === assignmentId) {
        setSelectedAssignment(null);
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Get mistakes filtered by workflow step (sabqi/manzil)
  const getMistakesForPhase = (assignment: Assignment, type: 'sabqi' | 'manzil', index: number) => {
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

  // Filter assignments based on filters
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      // Status filter
      if (statusFilter !== 'all' && assignment.status !== statusFilter) {
        return false;
      }
      
      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'homework') {
          if (!assignment.homework?.enabled) {
            return false;
          }
        } else {
          // Check if assignment has the selected classwork type
          const hasType = assignment.classwork[typeFilter as 'sabq' | 'sabqi' | 'manzil']?.length > 0;
          if (!hasType) {
            return false;
          }
        }
      }
      
      // Assigned by filter
      if (assignedByFilter !== 'all' && assignment.assignedByRole !== assignedByFilter) {
        return false;
      }
      
      return true;
    });
  }, [assignments, statusFilter, typeFilter, assignedByFilter]);

  // Group filtered assignments by date
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

  // Get mushaf mistakes for selected assignment or specific phase
  const mushafMistakes = useMemo(() => {
    if (viewingMistakesFor) {
      const assignment = assignments.find(a => a.id === viewingMistakesFor.assignmentId);
      if (!assignment) return [];
      return getMistakesForPhase(assignment, viewingMistakesFor.type, viewingMistakesFor.index);
    }
    
    if (!selectedAssignment) return [];
    const assignment = assignments.find(a => a.id === selectedAssignment);
    if (!assignment?.mushafMistakes) return [];
    
    return assignment.mushafMistakes.map(mistake => ({
      id: mistake.id,
      type: mistake.type || 'other',
      page: mistake.page,
      surah: mistake.surah,
      ayah: mistake.ayah,
      wordIndex: mistake.wordIndex,
      position: mistake.position,
      note: mistake.note,
      audioUrl: mistake.audioUrl,
      workflowStep: mistake.workflowStep,
      markedBy: mistake.markedBy,
      markedByName: mistake.markedByName,
      timestamp: mistake.timestamp
    })) as MushafMistake[];
  }, [selectedAssignment, viewingMistakesFor, assignments]);

  // Get first page from mistakes if available
  const defaultPage = useMemo(() => {
    if (mushafMistakes.length > 0 && mushafMistakes[0].page) {
      return mushafMistakes[0].page;
    }
    return 1;
  }, [mushafMistakes]);

  React.useEffect(() => {
    if (defaultPage !== mushafPage) {
      setMushafPage(defaultPage);
    }
  }, [defaultPage, mushafPage]);

  // Auto-set mushaf page when assignment is selected
  React.useEffect(() => {
    if (selectedAssignment && mushafMistakes.length > 0) {
      const firstMistake = mushafMistakes[0];
      if (firstMistake.page) {
        setMushafPage(firstMistake.page);
      }
    }
  }, [selectedAssignment, mushafMistakes]);

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

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  // Get assignments for a specific date
  const getAssignmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredAssignments.filter(assignment => {
      if (!assignment.createdAt) return false;
      const assignmentDate = new Date(assignment.createdAt);
      const assignmentDateStr = assignmentDate.toISOString().split('T')[0];
      return assignmentDateStr === dateStr;
    });
  };

  // Navigate calendar months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b-4 border-accent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #0f1a12, var(--color-primary), rgba(var(--color-primary-rgb), 0.9))' }}>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg">
              {student?.fullName || 'Student'} - Assignment History
            </h2>
            <p className="text-white mt-2 text-sm sm:text-base font-bold">
              {filteredAssignments.length} of {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            {onCreateAssignment && (
              <button
                onClick={onCreateAssignment}
                className="px-6 py-3 text-sm sm:text-base text-white rounded-full font-extrabold transition-all shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                  e.currentTarget.style.color = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                  e.currentTarget.style.color = 'white';
                }}
              >
                + New Assignment
              </button>
            )}
            <button
              onClick={onClose}
              className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full transition-all text-3xl sm:text-4xl font-extrabold shadow-2xl hover:scale-110 border-2"
              style={{ 
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-primary)',
                borderColor: 'rgba(255, 255, 255, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(var(--color-accent-rgb), 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              }}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* View Toggle and Filters */}
          <div className="mb-6 space-y-4">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-br from-soft-primary to-white rounded-2xl border-2 border-primary/20 shadow-md">
              <h3 className="text-sm font-extrabold text-primary">View Mode</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-md ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'bg-white text-primary border-2 border-primary/30 hover:bg-soft-primary'
                  }`}
                >
                  📋 List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-md ${
                    viewMode === 'calendar'
                      ? 'bg-primary text-white'
                      : 'bg-white text-primary border-2 border-primary/30 hover:bg-soft-primary'
                  }`}
                >
                  📅 Calendar
                </button>
              </div>
            </div>
            
            {/* Filters */}
            <div className="p-4 bg-gradient-to-br from-soft-primary to-white rounded-2xl border-2 border-primary/20 shadow-md">
              <h3 className="text-sm font-extrabold text-primary mb-4">Filters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-primary mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm text-sm font-medium"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              {/* Type Filter */}
              <div>
                <label className="block text-xs font-semibold text-primary mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm text-sm font-medium"
                >
                  <option value="all">All Types</option>
                  <option value="sabq">Sabq</option>
                  <option value="sabqi">Sabqi</option>
                  <option value="manzil">Manzil</option>
                  <option value="homework">Homework</option>
                </select>
              </div>
              
              {/* Assigned By Filter */}
              <div>
                <label className="block text-xs font-semibold text-primary mb-2">Assigned By</label>
                <select
                  value={assignedByFilter}
                  onChange={(e) => setAssignedByFilter(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-primary/30 rounded-2xl bg-white text-primary focus:ring-4 focus:ring-primary/20 focus:border-primary transition shadow-sm text-sm font-medium"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              </div>
            
              {/* Clear Filters Button */}
              {(statusFilter !== 'all' || typeFilter !== 'all' || assignedByFilter !== 'all') && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setTypeFilter('all');
                      setAssignedByFilter('all');
                    }}
                    className="px-4 py-2 text-sm border-2 border-primary/30 text-primary rounded-full font-bold hover:bg-primary hover:text-white transition-all shadow-md hover:shadow-lg"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {viewMode === 'calendar' ? (
            <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-lg p-4 sm:p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="px-4 py-2 bg-primary text-white rounded-full font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-all shadow-md"
                >
                  ← Prev
                </button>
                <h3 className="text-lg sm:text-xl font-extrabold text-primary">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => navigateMonth('next')}
                  className="px-4 py-2 bg-primary text-white rounded-full font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-all shadow-md"
                >
                  Next →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-extrabold text-primary py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
                  const days: React.ReactElement[] = [];
                  
                  // Empty cells for days before month starts
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
                  }
                  
                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const dayAssignments = getAssignmentsForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isDateSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const isSelected = selectedAssignment && dayAssignments.some(a => a.id === selectedAssignment);
                    
                    days.push(
                      <div
                        key={day}
                        className={`aspect-square border-2 rounded-xl p-1 sm:p-2 cursor-pointer transition-all ${
                          isDateSelected
                            ? 'border-primary bg-primary text-white shadow-lg scale-105'
                            : isToday
                            ? 'border-accent bg-soft-accent shadow-md'
                            : dayAssignments.length > 0
                            ? 'border-primary/30 bg-white hover:border-primary hover:shadow-md'
                            : 'border-accent-soft bg-white hover:border-primary/20'
                        }`}
                        onClick={() => {
                          // Select the date to show all assignments for that day
                          if (isDateSelected) {
                            // If already selected, deselect
                            setSelectedDate(null);
                            setSelectedAssignment(null);
                          } else {
                            // Select the date
                            setSelectedDate(date);
                            // If there are assignments, select the first one
                            if (dayAssignments.length > 0) {
                              setSelectedAssignment(dayAssignments[0].id);
                            } else {
                              setSelectedAssignment(null);
                            }
                            // Scroll to assignments section after a brief delay to allow rendering
                            setTimeout(() => {
                              dateAssignmentsRef.current?.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start' 
                              });
                            }, 100);
                          }
                        }}
                      >
                        <div className={`text-xs sm:text-sm font-bold mb-1 ${
                          isDateSelected ? 'text-white' : isToday ? 'text-primary' : 'text-primary-soft'
                        }`}>
                          {day}
                        </div>
                        {dayAssignments.length > 0 && (
                          <div className="space-y-1">
                            {dayAssignments.slice(0, 2).map(assignment => (
                              <div
                                key={assignment.id}
                                className={`text-[10px] px-1 py-0.5 rounded truncate ${
                                  isDateSelected
                                    ? 'bg-white/20 text-white border border-white/30'
                                    : assignment.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : assignment.status === 'archived'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-primary text-white'
                                }`}
                                title={assignment.status || 'active'}
                              >
                                {assignment.classwork.sabq.length > 0 && 'S'}
                                {assignment.classwork.sabqi.length > 0 && 'Q'}
                                {assignment.classwork.manzil.length > 0 && 'M'}
                                {assignment.homework?.enabled && 'H'}
                              </div>
                            ))}
                            {dayAssignments.length > 2 && (
                              <div className={`text-[10px] font-bold ${
                                isDateSelected ? 'text-white/90' : 'text-primary-soft'
                              }`}>
                                +{dayAssignments.length - 2}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  return days;
                })()}
              </div>

              {/* Selected Date Assignments List */}
              {selectedDate && (() => {
                const dateAssignments = getAssignmentsForDate(selectedDate);
                if (dateAssignments.length === 0) {
                  return (
                    <div ref={dateAssignmentsRef} className="mt-6 border-2 border-primary/20 rounded-2xl bg-white shadow-lg p-6 text-center">
                      <h4 className="text-lg font-extrabold text-primary mb-2">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h4>
                      <p className="text-primary-soft">No assignments found for this date.</p>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-full text-sm font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  );
                }
                
                return (
                  <div ref={dateAssignmentsRef} className="mt-6 border-2 border-primary/20 rounded-2xl bg-white shadow-lg">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-primary/20">
                        <div>
                          <h4 className="text-xl sm:text-2xl font-extrabold text-primary mb-1">
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </h4>
                          <p className="text-sm text-primary-soft">All assignments for this date</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-primary text-white rounded-full text-xs font-bold">
                            {dateAssignments.length} assignment{dateAssignments.length !== 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedDate(null);
                              setSelectedAssignment(null);
                            }}
                            className="px-4 py-2 bg-primary text-white rounded-full text-sm font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {dateAssignments.map(assignment => {
                          const isSelected = selectedAssignment === assignment.id;
                          const hasMushafMistakes = assignment.mushafMistakes && assignment.mushafMistakes.length > 0;
                          
                          return (
                            <div
                              key={assignment.id}
                              className={`border rounded-2xl transition-all cursor-pointer ${
                                isSelected 
                                  ? 'border-primary bg-soft-primary shadow-md' 
                                  : 'border-accent-soft hover:border-primary bg-white'
                              }`}
                              onClick={() => setSelectedAssignment(isSelected ? null : assignment.id)}
                            >
                              {/* Assignment Header - Clickable */}
                              <div className="p-3 sm:p-4">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-soft-accent text-primary">
                                        {assignment.status || 'active'}
                                      </span>
                                      {findDuplicates(assignment).length > 0 && (
                                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                                          ⚠️ {findDuplicates(assignment).length} duplicate{findDuplicates(assignment).length !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                      <span className="text-xs text-primary-soft">
                                        Assigned by {assignment.assignedByName} ({assignment.assignedByRole})
                                      </span>
                                    </div>
                                    <p className="text-xs text-primary-soft">
                                      Created: {formatDate(assignment.createdAt)}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {onEditAssignment && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditAssignment(assignment.id);
                                        }}
                                        className="px-3 py-1.5 text-xs sm:text-sm bg-soft-accent text-primary rounded-full hover:bg-accent-soft transition-colors whitespace-nowrap"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAssignment(assignment.id);
                                      }}
                                      className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors whitespace-nowrap"
                                      title="Delete assignment"
                                    >
                                      🗑️ Delete
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAssignment(isSelected ? null : assignment.id);
                                      }}
                                      className="px-3 py-1.5 text-xs sm:text-sm bg-soft-primary text-primary rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.1)] transition-colors whitespace-nowrap"
                                    >
                                      {isSelected ? 'Hide Details' : 'View Details'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Collapsible Content - Same as list view */}
                              {isSelected && (
                                <div className="p-3 sm:p-4 pt-0" onClick={(e) => e.stopPropagation()}>
                                  {/* Classwork Section */}
                                  <div className="mb-3">
                                    <h4 className="text-sm font-semibold text-primary mb-2">Classwork</h4>
                                    <div className="space-y-2">
                                      {assignment.classwork.sabq.length > 0 && (
                                        <div>
                                          <span className="text-xs font-medium text-primary-soft">Sabq:</span>
                                          <ul className="ml-4 mt-1 space-y-1">
                                            {assignment.classwork.sabq.map((phase, idx) => (
                                              <li key={idx} className="text-sm text-primary">
                                                • {phase.assignmentRange}
                                                {phase.details && <span className="text-primary-soft"> - {phase.details}</span>}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {assignment.classwork.sabqi.length > 0 && (
                                        <div>
                                          <span className="text-xs font-medium text-primary-soft">Sabqi:</span>
                                          <ul className="ml-4 mt-1 space-y-1">
                                            {assignment.classwork.sabqi.map((phase, idx) => {
                                              const phaseMistakes = getMistakesForPhase(assignment, 'sabqi', idx);
                                              const hasMistakes = phaseMistakes.length > 0;
                                              return (
                                                <li key={idx} className="text-sm text-primary flex items-center justify-between gap-2">
                                                  <span>
                                                    • {phase.assignmentRange}
                                                    {phase.details && <span className="text-primary-soft"> - {phase.details}</span>}
                                                  </span>
                                                  {hasMistakes && (
                                                    <button
                                                      onClick={() => {
                                                        setViewingMistakesFor({ assignmentId: assignment.id, type: 'sabqi', index: idx });
                                                        setSelectedAssignment(assignment.id);
                                                        if (phaseMistakes.length > 0) {
                                                          setMushafPage(phaseMistakes[0].page);
                                                        }
                                                      }}
                                                      className="px-2 py-1 text-xs bg-primary text-white rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors whitespace-nowrap"
                                                      title={`View ${phaseMistakes.length} mistake(s)`}
                                                    >
                                                      View Mistakes ({phaseMistakes.length})
                                                    </button>
                                                  )}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {assignment.classwork.manzil.length > 0 && (
                                        <div>
                                          <span className="text-xs font-medium text-primary-soft">Manzil:</span>
                                          <ul className="ml-4 mt-1 space-y-1">
                                            {assignment.classwork.manzil.map((phase, idx) => {
                                              const phaseMistakes = getMistakesForPhase(assignment, 'manzil', idx);
                                              const hasMistakes = phaseMistakes.length > 0;
                                              return (
                                                <li key={idx} className="text-sm text-primary flex items-center justify-between gap-2">
                                                  <span>
                                                    • {phase.assignmentRange}
                                                    {phase.details && <span className="text-primary-soft"> - {phase.details}</span>}
                                                  </span>
                                                  {hasMistakes && (
                                                    <button
                                                      onClick={() => {
                                                        setViewingMistakesFor({ assignmentId: assignment.id, type: 'manzil', index: idx });
                                                        setSelectedAssignment(assignment.id);
                                                        if (phaseMistakes.length > 0) {
                                                          setMushafPage(phaseMistakes[0].page);
                                                        }
                                                      }}
                                                      className="px-2 py-1 text-xs bg-primary text-white rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors whitespace-nowrap"
                                                      title={`View ${phaseMistakes.length} mistake(s)`}
                                                    >
                                                      View Mistakes ({phaseMistakes.length})
                                                    </button>
                                                  )}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {assignment.classwork.sabq.length === 0 && 
                                       assignment.classwork.sabqi.length === 0 && 
                                       assignment.classwork.manzil.length === 0 && (
                                        <p className="text-sm text-primary-soft italic">No classwork assigned</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Homework, Comment, and Mushaf sections - same as list view */}
                                  {assignment.homework.enabled && (
                                    <div className="mb-3">
                                      <h4 className="text-sm font-semibold text-primary mb-2">Homework</h4>
                                      {assignment.homework.content && (
                                        <p className="text-sm text-primary mb-2">{assignment.homework.content}</p>
                                      )}
                                      {assignment.homework.link && (
                                        <a
                                          href={assignment.homework.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-primary hover:underline break-all mb-2"
                                        >
                                          🔗 {assignment.homework.link}
                                        </a>
                                      )}
                                      
                                      {assignment.homework.submission?.submitted && (
                                        <div className="mt-4 pt-4 border-t border-accent-soft bg-soft-accent rounded-xl p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <h5 className="text-xs font-semibold text-primary">Student Submission</h5>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                              assignment.homework.submission.status === 'graded' 
                                                ? 'bg-green-100 text-green-800'
                                                : assignment.homework.submission.status === 'returned'
                                                ? 'bg-orange-100 text-orange-800'
                                                : 'bg-blue-100 text-blue-800'
                                            }`}>
                                              {assignment.homework.submission.status === 'graded' 
                                                ? '✓ Graded' 
                                                : assignment.homework.submission.status === 'returned'
                                                ? 'Returned'
                                                : 'Submitted'}
                                            </span>
                                          </div>
                                          
                                          {assignment.homework.submission.submittedAt && (
                                            <p className="text-xs text-primary-soft mb-2">
                                              Submitted: {formatDate(assignment.homework.submission.submittedAt)}
                                            </p>
                                          )}
                                          
                                          {assignment.homework.submission.content && (
                                            <p className="text-sm text-primary mb-2">{assignment.homework.submission.content}</p>
                                          )}
                                          
                                          {assignment.homework.submission.link && (
                                            <a 
                                              href={assignment.homework.submission.link} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2"
                                            >
                                              🔗 {assignment.homework.submission.link}
                                            </a>
                                          )}
                                          
                                          {assignment.homework.submission.audioUrl && (
                                            <div className="mb-2">
                                              <p className="text-xs font-semibold text-primary-soft mb-1">Audio Recording:</p>
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
                                            <div className="mb-2">
                                              <p className="text-xs font-semibold text-primary-soft mb-1">Attachments:</p>
                                              {assignment.homework.submission.attachments.map((att, idx) => (
                                                <a
                                                  key={idx}
                                                  href={att.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 mr-2"
                                                >
                                                  📎 {att.name}
                                                </a>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {assignment.homework.submission.feedback && (
                                            <div className="mt-3 p-2 bg-white rounded-lg border border-primary-soft">
                                              <p className="text-xs font-semibold text-primary mb-1">Feedback:</p>
                                              <p className="text-sm text-primary">{assignment.homework.submission.feedback}</p>
                                              {assignment.homework.submission.gradedByName && (
                                                <p className="text-xs text-primary-soft mt-1">
                                                  - {assignment.homework.submission.gradedByName}
                                                  {assignment.homework.submission.gradedAt && ` (${formatDate(assignment.homework.submission.gradedAt)})`}
                                                </p>
                                              )}
                                            </div>
                                          )}
                                          
                                          {assignment.homework.submission.grade !== undefined && assignment.homework.submission.grade !== null && (
                                            <div className="mt-2">
                                              <span className="text-sm font-semibold text-primary">Grade: </span>
                                              <span className="text-lg font-bold text-primary">{assignment.homework.submission.grade}</span>
                                            </div>
                                          )}
                                          
                                          {assignment.homework.submission.status === 'submitted' && 
                                           (user?.role === 'admin' || user?.role === 'superadmin') && (
                                            <div className="mt-3 pt-3 border-t border-accent-soft">
                                              {gradingAssignment === assignment.id ? (
                                                <div className="space-y-2">
                                                  <div>
                                                    <label className="block text-xs font-medium text-primary mb-1">
                                                      Feedback
                                                    </label>
                                                    <textarea
                                                      value={gradeData.feedback}
                                                      onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
                                                      rows={3}
                                                      className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition text-sm"
                                                      placeholder="Enter feedback for the student..."
                                                    />
                                                  </div>
                                                  <div>
                                                    <label className="block text-xs font-medium text-primary mb-1">
                                                      Grade (Optional)
                                                    </label>
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      max="100"
                                                      value={gradeData.grade}
                                                      onChange={(e) => setGradeData(prev => ({ ...prev, grade: e.target.value }))}
                                                      className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition text-sm"
                                                      placeholder="Enter grade (0-100)"
                                                    />
                                                  </div>
                                                  <div className="flex gap-2">
                                                    <button
                                                      onClick={() => {
                                                        setGradingAssignment(null);
                                                        setGradeData({ feedback: '', grade: '' });
                                                      }}
                                                      className="px-4 py-2 text-sm border-2 border-accent-soft text-primary rounded-full font-bold hover:bg-soft-accent transition-colors shadow-md"
                                                    >
                                                      Cancel
                                                    </button>
                                                    <button
                                                      onClick={() => handleGradeHomework(assignment.id)}
                                                      disabled={isGrading}
                                                      className="px-6 py-2 text-sm bg-primary text-white rounded-full font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
                                                  className="px-6 py-2.5 text-sm bg-primary text-white rounded-full font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors shadow-lg"
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
                                  
                                  {assignment.comment && (
                                    <div className="mb-3">
                                      <h4 className="text-sm font-semibold text-primary mb-2">Comment</h4>
                                      <p className="text-sm text-primary">{assignment.comment}</p>
                                    </div>
                                  )}
                                  
                                  {isSelected && hasMushafMistakes && (
                                    <div className="mt-4 pt-4 border-t-2 border-primary/20 px-3 sm:px-4 pb-3 sm:pb-4" onClick={(e) => e.stopPropagation()}>
                                      {viewingMistakesFor && viewingMistakesFor.assignmentId === assignment.id ? (
                                        <div>
                                          <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-base sm:text-lg font-extrabold text-primary">
                                              Mushaf View - {viewingMistakesFor.type.toUpperCase()} ({mushafMistakes.length} mistake{mushafMistakes.length !== 1 ? 's' : ''})
                                            </h4>
                                            <button
                                              onClick={() => setViewingMistakesFor(null)}
                                              className="px-4 py-2 bg-primary text-white rounded-full text-sm font-extrabold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-all shadow-md"
                                            >
                                              View All Mistakes
                                            </button>
                                          </div>
                                          <div className="bg-gradient-to-br from-soft-primary to-white rounded-3xl p-4 sm:p-6 border-2 border-primary/20 shadow-lg">
                                            <InteractiveMushaf
                                              currentPage={mushafPage}
                                              onPageChange={setMushafPage}
                                              mistakes={mushafMistakes}
                                              onMistakeMark={() => {}}
                                              readOnly={true}
                                              mode="viewing"
                                              studentName={student?.fullName || 'Student'}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <h4 className="text-base sm:text-lg font-extrabold text-primary mb-4">
                                            Mushaf View ({assignment.mushafMistakes?.length || 0} mistake{(assignment.mushafMistakes?.length || 0) !== 1 ? 's' : ''})
                                          </h4>
                                          <div className="bg-gradient-to-br from-soft-primary to-white rounded-3xl p-4 sm:p-6 border-2 border-primary/20 shadow-lg">
                                            <InteractiveMushaf
                                              currentPage={mushafPage}
                                              onPageChange={setMushafPage}
                                              mistakes={mushafMistakes}
                                              onMistakeMark={() => {}}
                                              readOnly={true}
                                              mode="viewing"
                                              studentName={student?.fullName || 'Student'}
                                            />
                                          </div>
                                          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                                            {(assignment.mushafMistakes || []).map((mistake: any, idx: number) => (
                                              <div
                                                key={mistake.id || idx}
                                                className="p-3 bg-white rounded-xl border border-primary/20 text-sm shadow-sm"
                                              >
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-extrabold">
                                                    {mistake.type || 'Mistake'}
                                                  </span>
                                                  <span className="text-primary font-medium">
                                                    Page {mistake.page}, Surah {mistake.surah}, Ayah {mistake.ayah}
                                                  </span>
                                                </div>
                                                {mistake.note && (
                                                  <p className="text-primary-soft italic text-xs mt-1">"{mistake.note}"</p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Selected Assignment Details (for backward compatibility) */}
              {selectedAssignment && !selectedDate && (() => {
                const assignment = filteredAssignments.find(a => a.id === selectedAssignment);
                if (!assignment) return null;
                const isSelected = true;
                const hasMushafMistakes = assignment.mushafMistakes && assignment.mushafMistakes.length > 0;
                
                return (
                  <div className="mt-6 border-2 border-primary/20 rounded-2xl bg-white shadow-lg">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-extrabold text-primary">Assignment Details</h4>
                        <button
                          onClick={() => setSelectedAssignment(null)}
                          className="px-4 py-2 bg-primary text-white rounded-full text-sm font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors"
                        >
                          Close
                        </button>
                      </div>
                      
                      {/* Status and Info */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-soft-accent text-primary">
                          {assignment.status || 'active'}
                        </span>
                        {findDuplicates(assignment).length > 0 && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                            ⚠️ {findDuplicates(assignment).length} duplicate{findDuplicates(assignment).length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs text-primary-soft">
                          Assigned by {assignment.assignedByName} ({assignment.assignedByRole})
                        </span>
                        <span className="text-xs text-primary-soft">
                          Created: {formatDate(assignment.createdAt)}
                        </span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {onEditAssignment && (
                          <button
                            onClick={() => onEditAssignment(assignment.id)}
                            className="px-3 py-1.5 text-xs sm:text-sm bg-soft-accent text-primary rounded-full hover:bg-accent-soft transition-colors whitespace-nowrap"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors whitespace-nowrap"
                          title="Delete assignment"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                      
                      {/* Classwork Section */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-primary mb-2">Classwork</h4>
                        <div className="space-y-2">
                          {assignment.classwork.sabq.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-primary-soft">Sabq:</span>
                              <ul className="ml-4 mt-1 space-y-1">
                                {assignment.classwork.sabq.map((phase, idx) => (
                                  <li key={idx} className="text-sm text-primary">
                                    • {phase.assignmentRange}
                                    {phase.details && <span className="text-primary-soft"> - {phase.details}</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {assignment.classwork.sabqi.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-primary-soft">Sabqi:</span>
                              <ul className="ml-4 mt-1 space-y-1">
                                {assignment.classwork.sabqi.map((phase, idx) => {
                                  const phaseMistakes = getMistakesForPhase(assignment, 'sabqi', idx);
                                  return (
                                    <li key={idx} className="text-sm text-primary flex items-center justify-between gap-2">
                                      <span>
                                        • {phase.assignmentRange}
                                        {phase.details && <span className="text-primary-soft"> - {phase.details}</span>}
                                      </span>
                                      {phaseMistakes.length > 0 && (
                                        <button
                                          onClick={() => {
                                            setViewingMistakesFor({ assignmentId: assignment.id, type: 'sabqi', index: idx });
                                            if (phaseMistakes.length > 0) {
                                              setMushafPage(phaseMistakes[0].page);
                                            }
                                          }}
                                          className="px-2 py-1 text-xs bg-primary text-white rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors"
                                        >
                                          View Mistakes ({phaseMistakes.length})
                                        </button>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                          {assignment.classwork.manzil.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-primary-soft">Manzil:</span>
                              <ul className="ml-4 mt-1 space-y-1">
                                {assignment.classwork.manzil.map((phase, idx) => {
                                  const phaseMistakes = getMistakesForPhase(assignment, 'manzil', idx);
                                  return (
                                    <li key={idx} className="text-sm text-primary flex items-center justify-between gap-2">
                                      <span>
                                        • {phase.assignmentRange}
                                        {phase.details && <span className="text-primary-soft"> - {phase.details}</span>}
                                      </span>
                                      {phaseMistakes.length > 0 && (
                                        <button
                                          onClick={() => {
                                            setViewingMistakesFor({ assignmentId: assignment.id, type: 'manzil', index: idx });
                                            if (phaseMistakes.length > 0) {
                                              setMushafPage(phaseMistakes[0].page);
                                            }
                                          }}
                                          className="px-2 py-1 text-xs bg-primary text-white rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors"
                                        >
                                          View Mistakes ({phaseMistakes.length})
                                        </button>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                          {assignment.classwork.sabq.length === 0 && 
                           assignment.classwork.sabqi.length === 0 && 
                           assignment.classwork.manzil.length === 0 && (
                            <p className="text-sm text-primary-soft italic">No classwork assigned</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Homework Section */}
                      {assignment.homework.enabled && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-primary mb-2">Homework</h4>
                          {assignment.homework.content && (
                            <p className="text-sm text-primary mb-2">{assignment.homework.content}</p>
                          )}
                          {assignment.homework.link && (
                            <a href={assignment.homework.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                              🔗 {assignment.homework.link}
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Comment Section */}
                      {assignment.comment && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-primary mb-2">Comment</h4>
                          <p className="text-sm text-primary">{assignment.comment}</p>
                        </div>
                      )}
                      
                      {/* Mushaf View */}
                      {hasMushafMistakes && (
                        <div className="mt-4 pt-4 border-t-2 border-primary/20">
                          {viewingMistakesFor && viewingMistakesFor.assignmentId === assignment.id ? (
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-base font-extrabold text-primary">
                                  Mushaf View - {viewingMistakesFor.type.toUpperCase()} ({mushafMistakes.length} mistake{mushafMistakes.length !== 1 ? 's' : ''})
                                </h4>
                                <button
                                  onClick={() => setViewingMistakesFor(null)}
                                  className="px-4 py-2 bg-primary text-white rounded-full text-sm font-extrabold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-all shadow-md"
                                >
                                  View All Mistakes
                                </button>
                              </div>
                              <div className="bg-gradient-to-br from-soft-primary to-white rounded-3xl p-4 border-2 border-primary/20 shadow-lg">
                                <InteractiveMushaf
                                  currentPage={mushafPage}
                                  onPageChange={setMushafPage}
                                  mistakes={mushafMistakes}
                                  onMistakeMark={() => {}}
                                  readOnly={true}
                                  mode="viewing"
                                  studentName={student?.fullName || 'Student'}
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-base font-extrabold text-primary mb-4">
                                Mushaf View ({assignment.mushafMistakes?.length || 0} mistake{(assignment.mushafMistakes?.length || 0) !== 1 ? 's' : ''})
                              </h4>
                              <div className="bg-gradient-to-br from-soft-primary to-white rounded-3xl p-4 border-2 border-primary/20 shadow-lg">
                                <InteractiveMushaf
                                  currentPage={mushafPage}
                                  onPageChange={setMushafPage}
                                  mistakes={mushafMistakes}
                                  onMistakeMark={() => {}}
                                  readOnly={true}
                                  mode="viewing"
                                  studentName={student?.fullName || 'Student'}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-primary-soft text-base sm:text-lg mb-4">No assignments found for this student.</p>
              {onCreateAssignment && (
                <button
                  onClick={onCreateAssignment}
                  className="px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors"
                >
                  Create First Assignment
                </button>
              )}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-primary-soft text-base sm:text-lg mb-4">No assignments match the selected filters.</p>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setAssignedByFilter('all');
                }}
                className="px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(groupedAssignments)
                .sort(([dateA], [dateB]) => {
                  const a = new Date(dateA);
                  const b = new Date(dateB);
                  return b.getTime() - a.getTime();
                })
                .map(([date, dayAssignments]) => (
                  <div key={date} className="border border-accent-soft rounded-2xl p-4 sm:p-6 bg-white">
                    <h3 className="text-base sm:text-lg font-semibold text-primary mb-4 pb-2 border-b border-accent-soft">
                      {date}
                    </h3>
                    
                    <div className="space-y-3 sm:space-y-4">
                      {dayAssignments.map(assignment => {
                        const isSelected = selectedAssignment === assignment.id;
                        const hasMushafMistakes = assignment.mushafMistakes && assignment.mushafMistakes.length > 0;
                        
                        return (
                          <div
                            key={assignment.id}
                            className={`border rounded-2xl transition-all cursor-pointer ${
                              isSelected 
                                ? 'border-primary bg-soft-primary shadow-md' 
                                : 'border-accent-soft hover:border-primary bg-white'
                            }`}
                            onClick={() => setSelectedAssignment(isSelected ? null : assignment.id)}
                          >
                            {/* Assignment Header - Clickable */}
                            <div className="p-3 sm:p-4">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-soft-accent text-primary">
                                    {assignment.status || 'active'}
                                  </span>
                                  {findDuplicates(assignment).length > 0 && (
                                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                                      ⚠️ {findDuplicates(assignment).length} duplicate{findDuplicates(assignment).length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  <span className="text-xs text-primary-soft">
                                    Assigned by {assignment.assignedByName} ({assignment.assignedByRole})
                                  </span>
                                </div>
                                <p className="text-xs text-primary-soft">
                                  Created: {formatDate(assignment.createdAt)}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {onEditAssignment && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditAssignment(assignment.id);
                                    }}
                                    className="px-3 py-1.5 text-xs sm:text-sm bg-soft-accent text-primary rounded-full hover:bg-accent-soft transition-colors whitespace-nowrap"
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAssignment(assignment.id);
                                  }}
                                  className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors whitespace-nowrap"
                                  title="Delete assignment"
                                >
                                  🗑️ Delete
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAssignment(isSelected ? null : assignment.id);
                                  }}
                                  className="px-3 py-1.5 text-xs sm:text-sm bg-soft-primary text-primary rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.1)] transition-colors whitespace-nowrap"
                                >
                                  {isSelected ? 'Hide Details' : 'View Details'}
                                </button>
                              </div>
                              </div>
                            </div>

                            {/* Classwork Section */}
                            <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                              <h4 className="text-sm font-semibold text-primary mb-2">Classwork</h4>
                              <div className="space-y-2">
                                {/* Sabq */}
                                {assignment.classwork.sabq.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-primary-soft">Sabq:</span>
                                    <ul className="ml-4 mt-1 space-y-1">
                                      {assignment.classwork.sabq.map((phase, idx) => (
                                        <li key={idx} className="text-sm text-primary">
                                          • {phase.assignmentRange}
                                          {phase.details && <span className="text-primary-soft"> - {phase.details}</span>}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Sabqi */}
                                {assignment.classwork.sabqi.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-primary-soft">Sabqi:</span>
                                    <ul className="ml-4 mt-1 space-y-1">
                                      {assignment.classwork.sabqi.map((phase, idx) => {
                                        const phaseMistakes = getMistakesForPhase(assignment, 'sabqi', idx);
                                        const hasMistakes = phaseMistakes.length > 0;
                                        return (
                                          <li key={idx} className="text-sm text-primary flex items-center justify-between gap-2">
                                            <span>
                                              • {phase.assignmentRange}
                                              {phase.details && <span className="text-primary-soft"> - {phase.details}</span>}
                                            </span>
                                            {hasMistakes && (
                                              <button
                                                onClick={() => {
                                                  setViewingMistakesFor({ assignmentId: assignment.id, type: 'sabqi', index: idx });
                                                  setSelectedAssignment(assignment.id);
                                                  if (phaseMistakes.length > 0) {
                                                    setMushafPage(phaseMistakes[0].page);
                                                  }
                                                }}
                                                className="px-2 py-1 text-xs bg-primary text-white rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors whitespace-nowrap"
                                                title={`View ${phaseMistakes.length} mistake(s)`}
                                              >
                                                View Mistakes ({phaseMistakes.length})
                                              </button>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Manzil */}
                                {assignment.classwork.manzil.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-primary-soft">Manzil:</span>
                                    <ul className="ml-4 mt-1 space-y-1">
                                      {assignment.classwork.manzil.map((phase, idx) => {
                                        const phaseMistakes = getMistakesForPhase(assignment, 'manzil', idx);
                                        const hasMistakes = phaseMistakes.length > 0;
                                        return (
                                          <li key={idx} className="text-sm text-primary flex items-center justify-between gap-2">
                                            <span>
                                              • {phase.assignmentRange}
                                              {phase.details && <span className="text-primary-soft"> - {phase.details}</span>}
                                            </span>
                                            {hasMistakes && (
                                              <button
                                                onClick={() => {
                                                  setViewingMistakesFor({ assignmentId: assignment.id, type: 'manzil', index: idx });
                                                  setSelectedAssignment(assignment.id);
                                                  if (phaseMistakes.length > 0) {
                                                    setMushafPage(phaseMistakes[0].page);
                                                  }
                                                }}
                                                className="px-2 py-1 text-xs bg-primary text-white rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors whitespace-nowrap"
                                                title={`View ${phaseMistakes.length} mistake(s)`}
                                              >
                                                View Mistakes ({phaseMistakes.length})
                                              </button>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                )}

                                {assignment.classwork.sabq.length === 0 && 
                                 assignment.classwork.sabqi.length === 0 && 
                                 assignment.classwork.manzil.length === 0 && (
                                  <p className="text-sm text-primary-soft italic">No classwork assigned</p>
                                )}
                              </div>
                            </div>

                            {/* Homework Section */}
                            {assignment.homework.enabled && (
                              <div className="mb-3">
                                <h4 className="text-sm font-semibold text-primary mb-2">Homework</h4>
                                {assignment.homework.content && (
                                  <p className="text-sm text-primary mb-2">{assignment.homework.content}</p>
                                )}
                                {assignment.homework.link && (
                                  <a
                                    href={assignment.homework.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline break-all mb-2"
                                  >
                                    🔗 {assignment.homework.link}
                                  </a>
                                )}
                                
                                {/* Homework Submission */}
                                {assignment.homework.submission?.submitted && (
                                  <div className="mt-4 pt-4 border-t border-accent-soft bg-soft-accent rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-xs font-semibold text-primary">Student Submission</h5>
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        assignment.homework.submission.status === 'graded' 
                                          ? 'bg-green-100 text-green-800'
                                          : assignment.homework.submission.status === 'returned'
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {assignment.homework.submission.status === 'graded' 
                                          ? '✓ Graded' 
                                          : assignment.homework.submission.status === 'returned'
                                          ? 'Returned'
                                          : 'Submitted'}
                                      </span>
                                    </div>
                                    
                                    {assignment.homework.submission.submittedAt && (
                                      <p className="text-xs text-primary-soft mb-2">
                                        Submitted: {formatDate(assignment.homework.submission.submittedAt)}
                                      </p>
                                    )}
                                    
                                    {assignment.homework.submission.content && (
                                      <p className="text-sm text-primary mb-2">{assignment.homework.submission.content}</p>
                                    )}
                                    
                                    {assignment.homework.submission.link && (
                                      <a 
                                        href={assignment.homework.submission.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2"
                                      >
                                        🔗 {assignment.homework.submission.link}
                                      </a>
                                    )}
                                    
                                    {/* Audio Recording */}
                                    {assignment.homework.submission.audioUrl && (
                                      <div className="mb-2">
                                        <p className="text-xs font-semibold text-primary-soft mb-1">Audio Recording:</p>
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
                                      <div className="mb-2">
                                        <p className="text-xs font-semibold text-primary-soft mb-1">Attachments:</p>
                                        {assignment.homework.submission.attachments.map((att, idx) => (
                                          <a
                                            key={idx}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mr-2"
                                          >
                                            📎 {att.name}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Feedback and Grade */}
                                    {assignment.homework.submission.feedback && (
                                      <div className="mt-3 p-2 bg-white rounded-lg border border-primary-soft">
                                        <p className="text-xs font-semibold text-primary mb-1">Feedback:</p>
                                        <p className="text-sm text-primary">{assignment.homework.submission.feedback}</p>
                                        {assignment.homework.submission.gradedByName && (
                                          <p className="text-xs text-primary-soft mt-1">
                                            - {assignment.homework.submission.gradedByName}
                                            {assignment.homework.submission.gradedAt && ` (${formatDate(assignment.homework.submission.gradedAt)})`}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {assignment.homework.submission.grade !== undefined && assignment.homework.submission.grade !== null && (
                                      <div className="mt-2">
                                        <span className="text-sm font-semibold text-primary">Grade: </span>
                                        <span className="text-lg font-bold text-primary">{assignment.homework.submission.grade}</span>
                                      </div>
                                    )}
                                    
                                    {/* Grade Homework Button (for admins/super admins) */}
                                    {assignment.homework.submission.status === 'submitted' && 
                                     (user?.role === 'admin' || user?.role === 'superadmin') && (
                                      <div className="mt-3 pt-3 border-t border-accent-soft">
                                        {gradingAssignment === assignment.id ? (
                                          <div className="space-y-2">
                                            <div>
                                              <label className="block text-xs font-medium text-primary mb-1">
                                                Feedback
                                              </label>
                                              <textarea
                                                value={gradeData.feedback}
                                                onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition text-sm"
                                                placeholder="Enter feedback for the student..."
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-primary mb-1">
                                                Grade (Optional)
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={gradeData.grade}
                                                onChange={(e) => setGradeData(prev => ({ ...prev, grade: e.target.value }))}
                                                className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition text-sm"
                                                placeholder="Enter grade (0-100)"
                                              />
                                            </div>
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => {
                                                  setGradingAssignment(null);
                                                  setGradeData({ feedback: '', grade: '' });
                                                }}
                                                className="px-4 py-2 text-sm border-2 border-accent-soft text-primary rounded-full font-bold hover:bg-soft-accent transition-colors shadow-md"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                onClick={() => handleGradeHomework(assignment.id)}
                                                disabled={isGrading}
                                                className="px-6 py-2 text-sm bg-primary text-white rounded-full font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
                                            className="px-6 py-2.5 text-sm bg-primary text-white rounded-full font-bold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors shadow-lg"
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
                              <div className="mb-3">
                                <h4 className="text-sm font-semibold text-primary mb-2">Comment</h4>
                                <p className="text-sm text-primary">{assignment.comment}</p>
                              </div>
                            )}

                            {/* Expanded Details with Mushaf - Automatically show when assignment has mistakes */}
                            {isSelected && (
                              <div className="mt-4 pt-4 border-t-2 border-primary/20 px-3 sm:px-4 pb-3 sm:pb-4" onClick={(e) => e.stopPropagation()}>
                                {viewingMistakesFor && viewingMistakesFor.assignmentId === assignment.id ? (
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-base sm:text-lg font-extrabold text-primary">
                                        Mushaf View - {viewingMistakesFor.type.toUpperCase()} ({mushafMistakes.length} mistake{mushafMistakes.length !== 1 ? 's' : ''})
                                      </h4>
                                      <button
                                        onClick={() => setViewingMistakesFor(null)}
                                        className="px-4 py-2 bg-primary text-white rounded-full text-sm font-extrabold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-all shadow-md"
                                      >
                                        View All Mistakes
                                      </button>
                                    </div>
                                    <div className="bg-gradient-to-br from-soft-primary to-white rounded-3xl p-4 sm:p-6 border-2 border-primary/20 shadow-lg">
                                      <InteractiveMushaf
                                        currentPage={mushafPage}
                                        onPageChange={setMushafPage}
                                        mistakes={mushafMistakes}
                                        onMistakeMark={() => {}}
                                        readOnly={true}
                                        mode="viewing"
                                        studentName={student?.fullName || 'Student'}
                                      />
                                    </div>
                                  </div>
                                ) : hasMushafMistakes ? (
                                  <div>
                                    <h4 className="text-base sm:text-lg font-extrabold text-primary mb-4">
                                      Mushaf View ({assignment.mushafMistakes?.length || 0} mistake{(assignment.mushafMistakes?.length || 0) !== 1 ? 's' : ''})
                                    </h4>
                                    <div className="bg-gradient-to-br from-soft-primary to-white rounded-3xl p-4 sm:p-6 border-2 border-primary/20 shadow-lg">
                                      <InteractiveMushaf
                                        currentPage={mushafPage}
                                        onPageChange={setMushafPage}
                                        mistakes={mushafMistakes}
                                        onMistakeMark={() => {}}
                                        readOnly={true}
                                        mode="viewing"
                                        studentName={student?.fullName || 'Student'}
                                      />
                                    </div>
                                    {/* Mistake List Summary */}
                                    <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                                      {(assignment.mushafMistakes || []).map((mistake: any, idx: number) => (
                                        <div
                                          key={mistake.id || idx}
                                          className="p-3 bg-white rounded-xl border border-primary/20 text-sm shadow-sm"
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-extrabold">
                                              {mistake.type || 'Mistake'}
                                            </span>
                                            <span className="text-primary font-medium">
                                              Page {mistake.page}, Surah {mistake.surah}, Ayah {mistake.ayah}
                                            </span>
                                          </div>
                                          {mistake.note && (
                                            <p className="text-primary-soft italic text-xs mt-1">"{mistake.note}"</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-primary-soft italic">No mushaf mistakes recorded for this assignment</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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

