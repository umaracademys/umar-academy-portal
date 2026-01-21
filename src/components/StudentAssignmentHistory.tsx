import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import { Assignment } from '../types/assignment';
import HomeworkDisplay from './HomeworkDisplay';
import { MistakeBadgeHighlight } from './workflow/MistakeBadgeHighlight';
import ClassworkEntryCard from './ClassworkEntryCard';

interface StudentAssignmentHistoryProps {
  studentId: string;
  onClose: () => void;
  onEditAssignment?: (assignmentId: string) => void;
  onCreateAssignment?: () => void;
  onAssignHomework?: (assignmentId: string, studentId: string) => void;
}

const StudentAssignmentHistory: React.FC<StudentAssignmentHistoryProps> = ({
  studentId,
  onClose,
  onEditAssignment,
  onCreateAssignment,
  onAssignHomework
}) => {
  const { students, getStudentAssignments, deleteAssignment, refreshDataLight, assignments: allAssignments } = useBackendData();
  const { user } = useAuth();
  
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set());
  const [expandedMushafFor, setExpandedMushafFor] = useState<Record<string, { type: 'sabq' | 'sabqi' | 'manzil'; index: number } | null>>({});
  const [mushafPages, setMushafPages] = useState<Record<string, number>>({});
  const [gradingAssignment, setGradingAssignment] = useState<string | null>(null);
  const [gradeData, setGradeData] = useState({ feedback: '', grade: '' });
  const [isGrading, setIsGrading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const lastRefreshedStudentId = React.useRef<string | null>(null);
  const refreshIntervalRef = React.useRef<number | null>(null);
  
  // Force refresh when component mounts or studentId changes
  useEffect(() => {
    if (lastRefreshedStudentId.current !== studentId) {
      lastRefreshedStudentId.current = studentId;
      refreshDataLight(); // Use lightweight refresh for faster loading
    }
    
    // Set up periodic refresh to catch newly created assignments (only when component is visible)
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    // Only refresh if document is visible (not in background tab)
    refreshIntervalRef.current = window.setInterval(() => {
      if (!document.hidden) {
        refreshDataLight(); // Use lightweight refresh for faster periodic updates
      }
    }, 30000); // Refresh every 30 seconds (reduced frequency to prevent flickering)
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [studentId, refreshDataLight]);
  
  // Listen for storage events (when assignment is updated in another tab/component)
  useEffect(() => {
    const handleStorageChange = () => {
      refreshDataLight(); // Use lightweight refresh for faster updates
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom refresh event
    window.addEventListener('assignmentUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('assignmentUpdated', handleStorageChange);
    };
  }, [refreshDataLight]);

  const student = students.find(s => s.id === studentId);
  
  // Memoize assignments to prevent unnecessary re-renders
  const assignments = React.useMemo(() => {
    return getStudentAssignments(studentId);
  }, [studentId, getStudentAssignments, allAssignments.length]); // Only recalculate when studentId or total assignments count changes
  
  // Auto-expand all assignments by default for read-only view
  useEffect(() => {
    if (assignments.length > 0 && expandedAssignments.size === 0) {
      const allIds = new Set(assignments.map(a => a.id));
      setExpandedAssignments(allIds);
    }
  }, [assignments.length, expandedAssignments.size]);
  
  // Debug logging (only in dev mode and only when assignments actually change)
  useEffect(() => {
    if (import.meta.env.DEV && studentId && assignments.length > 0) {
      const assignmentIds = assignments.map(a => a.id).join(',');
      const prevIds = React.useRef<string>('');
      
      // Only log if assignment IDs actually changed
      if (prevIds.current !== assignmentIds) {
        prevIds.current = assignmentIds;
        console.log('🔍 StudentAssignmentHistory for student:', {
          studentId: studentId,
          studentName: student?.fullName,
          assignmentsFound: assignments.length,
          assignmentIds: assignments.map(a => a.id),
        });
      }
    }
  }, [studentId, assignments.length, student?.fullName]);

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

    if (!isCurrentlyOpen) {
      let defaultPage = 1;
      if (phase?.fromPage) {
        defaultPage = phase.fromPage;
      } else {
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

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteAssignment(assignmentId);
      alert('Assignment deleted successfully!');
      await refreshDataLight(); // Use lightweight refresh for faster update
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
    if (statusFilter === 'all') return assignments;
    return assignments.filter(a => a.status === statusFilter);
  }, [assignments, statusFilter]);

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
      await refreshDataLight(); // Use lightweight refresh for faster update
    } catch (error) {
      console.error('Error grading homework:', error);
      alert(`Failed to grade homework: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Compact Header */}
        <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Assignment History
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {student?.fullName || 'Student'} • {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => {
                  await refreshDataLight();
                }}
                className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                Refresh
              </button>
              {onCreateAssignment && (
                <button
                  onClick={onCreateAssignment}
                  className="px-2.5 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  + New
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Compact Filter */}
        <div className="px-4 py-2 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Compact Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600">No assignments found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(Object.entries(groupedAssignments) as [string, Assignment[]][])
                .sort(([dateA], [dateB]) => {
                  const a = new Date(dateA);
                  const b = new Date(dateB);
                  return b.getTime() - a.getTime();
                })
                .map(([date, dayAssignments]) => (
                  <div key={date} className="space-y-2">
                    {/* Compact Date Header */}
                    <div className="sticky top-0 z-10 bg-gray-100 px-2 py-1 rounded text-xs">
                      <h3 className="font-semibold text-gray-900">
                        {date} ({dayAssignments.length})
                      </h3>
                    </div>
                    
                    {/* Compact Assignments */}
                    {dayAssignments.map(assignment => {
                      // Auto-expand to show classwork and homework (read-only view)
                      const isExpanded = expandedAssignments.has(assignment.id);
                      const mushafState = expandedMushafFor[assignment.id];
                      
                      return (
                        <div
                          key={assignment.id}
                          className="border border-gray-200 rounded overflow-hidden"
                        >
                          {/* Compact Assignment Header */}
                          <div
                            className="px-3 py-2 bg-white hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleAssignment(assignment.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  assignment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                  assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {assignment.status || 'active'}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {formatDate(assignment.createdAt)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {assignment.assignedByName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {onEditAssignment && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditAssignment(assignment.id);
                                    }}
                                    className="px-2 py-0.5 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAssignment(assignment.id);
                                  }}
                                  className="px-2 py-0.5 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                                >
                                  Delete
                                </button>
                                <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Compact Expanded Content - Always show classwork and homework */}
                          {isExpanded && (
                            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 space-y-3">
                              {/* Compact Classwork */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Classwork</h4>
                                <div className="space-y-2">
                                  {/* Compact Sabq */}
                                  {assignment.classwork.sabq.length > 0 && (
                                    <div className="bg-white rounded border border-gray-200 p-3">
                                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Sabq</h5>
                                      <div className="space-y-2">
                                        {assignment.classwork.sabq.map((phase, idx) => {
                                          const phaseMistakes = getMistakesForPhase(assignment, 'sabq', idx);
                                          const mushafKey = `${assignment.id}-sabq-${idx}`;
                                          const isMushafOpen = mushafState?.type === 'sabq' && mushafState?.index === idx;
                                          const defaultPage = phase.fromPage || (phaseMistakes.length > 0 ? phaseMistakes[0].page : 1);
                                          const mushafPage = mushafPages[mushafKey] || defaultPage;
                                          
                                          // Check if this is a homework entry (has "Homework:" prefix)
                                          const isHomework = phase.assignmentRange?.includes('Homework:');
                                          
                                          return (
                                            <div key={idx} className="space-y-2">
                                              {/* ✅ FIX: Use standardized ClassworkEntryCard */}
                                              <ClassworkEntryCard
                                                phase={phase}
                                                type="sabq"
                                                index={idx}
                                                showDate={true}
                                                className="mb-2"
                                              />
                                              
                                              {/* Mushaf View Button */}
                                              {phaseMistakes.length > 0 && (
                                                <div className="flex justify-end">
                                                  <button
                                                    onClick={() => toggleMushaf(assignment.id, 'sabq', idx, phase)}
                                                    className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-300 rounded hover:bg-purple-100 transition-colors"
                                                  >
                                                    {isMushafOpen ? 'Hide Mushaf' : 'View Mushaf'} ({phaseMistakes.length})
                                                  </button>
                                                </div>
                                              )}
                                              
                                              {isMushafOpen && (
                                                <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                                                  {/* Mistakes List */}
                                                  {phaseMistakes.length > 0 && (
                                                    <div className="bg-gray-50 rounded border border-gray-200 p-2">
                                                      <h6 className="text-[10px] font-semibold text-gray-700 mb-1.5">Marked Mistakes ({phaseMistakes.length})</h6>
                                                      <div className="space-y-1 max-h-32 overflow-y-auto">
                                                        {phaseMistakes.map((mistake) => (
                                                          <MistakeBadgeHighlight
                                                            key={mistake.id || `mistake-${idx}-${mistake.page}-${mistake.wordIndex}`}
                                                            mistake={mistake}
                                                            isNew={false}
                                                            showTimestamp={false}
                                                            onRemove={undefined}
                                                            wordText={mistake.wordText}
                                                          />
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {/* Interactive Mushaf */}
                                                  <div className="bg-white rounded border border-gray-200 p-2" style={{ maxHeight: '400px', overflow: 'auto' }}>
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
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Compact Sabqi */}
                                  {assignment.classwork.sabqi.length > 0 && (
                                    <div className="bg-white rounded border border-gray-200 p-3">
                                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Sabqi</h5>
                                      <div className="space-y-2">
                                        {assignment.classwork.sabqi.map((phase, idx) => {
                                          const phaseMistakes = getMistakesForPhase(assignment, 'sabqi', idx);
                                          const mushafKey = `${assignment.id}-sabqi-${idx}`;
                                          const isMushafOpen = mushafState?.type === 'sabqi' && mushafState?.index === idx;
                                          const defaultPage = phase.fromPage || (phaseMistakes.length > 0 ? phaseMistakes[0].page : 1);
                                          const mushafPage = mushafPages[mushafKey] || defaultPage;
                                          
                                          return (
                                            <div key={idx} className="space-y-2">
                                              {/* ✅ FIX: Use standardized ClassworkEntryCard */}
                                              <ClassworkEntryCard
                                                phase={phase}
                                                type="sabqi"
                                                index={idx}
                                                showDate={true}
                                                className="mb-2"
                                              />
                                              
                                              {/* Mushaf View Button */}
                                              {phaseMistakes.length > 0 && (
                                                <div className="flex justify-end">
                                                  <button
                                                    onClick={() => toggleMushaf(assignment.id, 'sabqi', idx, phase)}
                                                    className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-300 rounded hover:bg-blue-100 transition-colors"
                                                  >
                                                    {isMushafOpen ? 'Hide Mushaf' : 'View Mushaf'} ({phaseMistakes.length})
                                                  </button>
                                                </div>
                                              )}
                                              
                                              {isMushafOpen && (
                                                <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                                                  {/* Mistakes List */}
                                                  {phaseMistakes.length > 0 && (
                                                    <div className="bg-gray-50 rounded border border-gray-200 p-2">
                                                      <h6 className="text-[10px] font-semibold text-gray-700 mb-1.5">Marked Mistakes ({phaseMistakes.length})</h6>
                                                      <div className="space-y-1 max-h-32 overflow-y-auto">
                                                        {phaseMistakes.map((mistake) => (
                                                          <MistakeBadgeHighlight
                                                            key={mistake.id || `mistake-${idx}-${mistake.page}-${mistake.wordIndex}`}
                                                            mistake={mistake}
                                                            isNew={false}
                                                            showTimestamp={false}
                                                            onRemove={undefined}
                                                            wordText={mistake.wordText}
                                                          />
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {/* Interactive Mushaf */}
                                                  <div className="bg-white rounded border border-gray-200 p-2" style={{ maxHeight: '400px', overflow: 'auto' }}>
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
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Compact Manzil */}
                                  {assignment.classwork.manzil.length > 0 && (
                                    <div className="bg-white rounded border border-gray-200 p-3">
                                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Manzil</h5>
                                      <div className="space-y-2">
                                        {assignment.classwork.manzil.map((phase, idx) => {
                                          const phaseMistakes = getMistakesForPhase(assignment, 'manzil', idx);
                                          const mushafKey = `${assignment.id}-manzil-${idx}`;
                                          const isMushafOpen = mushafState?.type === 'manzil' && mushafState?.index === idx;
                                          const defaultPage = phase.fromPage || (phaseMistakes.length > 0 ? phaseMistakes[0].page : 1);
                                          const mushafPage = mushafPages[mushafKey] || defaultPage;
                                          
                                          return (
                                            <div key={idx} className="space-y-2">
                                              {/* ✅ FIX: Use standardized ClassworkEntryCard */}
                                              <ClassworkEntryCard
                                                phase={phase}
                                                type="manzil"
                                                index={idx}
                                                showDate={true}
                                                className="mb-2"
                                              />
                                              
                                              {/* Mushaf View Button */}
                                              {phaseMistakes.length > 0 && (
                                                <div className="flex justify-end">
                                                  <button
                                                    onClick={() => toggleMushaf(assignment.id, 'manzil', idx, phase)}
                                                    className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-300 rounded hover:bg-green-100 transition-colors"
                                                  >
                                                    {isMushafOpen ? 'Hide Mushaf' : 'View Mushaf'} ({phaseMistakes.length})
                                                  </button>
                                                </div>
                                              )}
                                              
                                              {isMushafOpen && (
                                                <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                                                  {/* Mistakes List */}
                                                  {phaseMistakes.length > 0 && (
                                                    <div className="bg-gray-50 rounded border border-gray-200 p-2">
                                                      <h6 className="text-[10px] font-semibold text-gray-700 mb-1.5">Marked Mistakes ({phaseMistakes.length})</h6>
                                                      <div className="space-y-1 max-h-32 overflow-y-auto">
                                                        {phaseMistakes.map((mistake) => (
                                                          <MistakeBadgeHighlight
                                                            key={mistake.id || `mistake-${idx}-${mistake.page}-${mistake.wordIndex}`}
                                                            mistake={mistake}
                                                            isNew={false}
                                                            showTimestamp={false}
                                                            onRemove={undefined}
                                                            wordText={mistake.wordText}
                                                          />
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {/* Interactive Mushaf */}
                                                  <div className="bg-white rounded border border-gray-200 p-2" style={{ maxHeight: '400px', overflow: 'auto' }}>
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
                                    <p className="text-sm text-gray-500 italic">No classwork</p>
                                  )}
                                </div>
                              </div>

                              {/* Compact Homework - Structured like Classwork */}
                              {(assignment.homework?.enabled || 
                                assignment.homework?.content || 
                                assignment.homework?.link || 
                                // ✅ LEGACY: sabqiContent/manzilContent may exist in old data but are not sent in new requests
                                (assignment.homework as any)?.sabqiContent || 
                                (assignment.homework as any)?.manzilContent ||
                                (assignment.homework?.items && assignment.homework.items.length > 0) ||
                                assignment.homework?.submission ||
                                assignment.homework?.notes) && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Homework</h4>
                                  <div className="space-y-2">
                                    {/* Group homework items by type (like classwork) */}
                                    {(() => {
                                      // Separate homework items by type
                                      const sabqItems = assignment.homework?.items?.filter((item: any) => item.type === 'sabq') || [];
                                      const sabqiItems = assignment.homework?.items?.filter((item: any) => item.type === 'sabqi') || [];
                                      const manzilItems = assignment.homework?.items?.filter((item: any) => item.type === 'manzil') || [];
                                      
                                      // ✅ LEGACY: Check for legacy content (may exist in old data, but not sent in new requests)
                                      const hasSabqiContent = (assignment.homework as any)?.sabqiContent;
                                      const hasManzilContent = (assignment.homework as any)?.manzilContent;
                                      const hasGeneralContent = assignment.homework?.content || assignment.homework?.link;
                                      
                                      return (
                                        <>
                                          {/* Sabq Homework */}
                                          {(sabqItems.length > 0) && (
                                            <div className="bg-white rounded border border-gray-200 p-3">
                                              <h5 className="text-xs font-semibold text-gray-700 mb-2">Sabq</h5>
                                              <div className="space-y-2">
                                                {sabqItems.map((item: any, idx: number) => (
                                                  <div key={idx} className="border-l-4 border-purple-400 pl-3 py-1.5">
                                                    <div className="flex-1">
                                                      <p className="text-xs font-medium text-gray-900">
                                                        {item.range?.mode === 'surah_ayah' && item.range.from && item.range.to
                                                          ? `${item.range.from.surahName || `Surah ${item.range.from.surah}`}, Ayah ${item.range.from.ayah}-${item.range.to.ayah}`
                                                          : item.range?.mode === 'juz_juz' || item.range?.mode === 'multiple_juz'
                                                          ? `Juz ${item.range.juzList?.join(', ') || 'N/A'}`
                                                          : item.range?.mode === 'surah_surah'
                                                          ? `${item.range.from?.surahName || `Surah ${item.range.from?.surah}`} إلى ${item.range.to?.surahName || `Surah ${item.range.to?.surah}`}`
                                                          : 'Homework Range'}
                                                      </p>
                                                      {item.content && (
                                                        <p className="text-xs text-gray-700 mt-1">{item.content}</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Sabqi Homework */}
                                          {(sabqiItems.length > 0 || hasSabqiContent) && (
                                            <div className="bg-white rounded border border-gray-200 p-3">
                                              <h5 className="text-xs font-semibold text-gray-700 mb-2">Sabqi</h5>
                                              <div className="space-y-2">
                                                {sabqiItems.map((item: any, idx: number) => (
                                                  <div key={idx} className="border-l-4 border-blue-400 pl-3 py-1.5">
                                                    <div className="flex-1">
                                                      <p className="text-xs font-medium text-gray-900">
                                                        {item.range?.mode === 'surah_ayah' && item.range.from && item.range.to
                                                          ? `${item.range.from.surahName || `Surah ${item.range.from.surah}`}, Ayah ${item.range.from.ayah}-${item.range.to.ayah}`
                                                          : item.range?.mode === 'juz_juz' || item.range?.mode === 'multiple_juz'
                                                          ? `Juz ${item.range.juzList?.join(', ') || 'N/A'}`
                                                          : item.range?.mode === 'surah_surah'
                                                          ? `${item.range.from?.surahName || `Surah ${item.range.from?.surah}`} إلى ${item.range.to?.surahName || `Surah ${item.range.to?.surah}`}`
                                                          : 'Homework Range'}
                                                      </p>
                                                      {item.content && (
                                                        <p className="text-xs text-gray-700 mt-1">{item.content}</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                                {hasSabqiContent && (
                                                  <div className="border-l-4 border-blue-400 pl-3 py-1.5">
                                                    <p className="text-xs text-gray-700">{(assignment.homework as any).sabqiContent}</p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Manzil Homework */}
                                          {(manzilItems.length > 0 || hasManzilContent) && (
                                            <div className="bg-white rounded border border-gray-200 p-3">
                                              <h5 className="text-xs font-semibold text-gray-700 mb-2">Manzil</h5>
                                              <div className="space-y-2">
                                                {manzilItems.map((item: any, idx: number) => (
                                                  <div key={idx} className="border-l-4 border-green-400 pl-3 py-1.5">
                                                    <div className="flex-1">
                                                      <p className="text-xs font-medium text-gray-900">
                                                        {item.range?.mode === 'surah_ayah' && item.range.from && item.range.to
                                                          ? `${item.range.from.surahName || `Surah ${item.range.from.surah}`}, Ayah ${item.range.from.ayah}-${item.range.to.ayah}`
                                                          : item.range?.mode === 'juz_juz' || item.range?.mode === 'multiple_juz'
                                                          ? `Juz ${item.range.juzList?.join(', ') || 'N/A'}`
                                                          : item.range?.mode === 'surah_surah'
                                                          ? `${item.range.from?.surahName || `Surah ${item.range.from?.surah}`} إلى ${item.range.to?.surahName || `Surah ${item.range.to?.surah}`}`
                                                          : 'Homework Range'}
                                                      </p>
                                                      {item.content && (
                                                        <p className="text-xs text-gray-700 mt-1">{item.content}</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                                {hasManzilContent && (
                                                  <div className="border-l-4 border-green-400 pl-3 py-1.5">
                                                    <p className="text-xs text-gray-700">{(assignment.homework as any).manzilContent}</p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* General Homework Content */}
                                          {hasGeneralContent && (
                                            <div className="bg-white rounded border border-gray-200 p-3">
                                              <div className="space-y-2">
                                                {assignment.homework?.content && (
                                                  <p className="text-xs text-gray-700">{assignment.homework.content}</p>
                                                )}
                                                {assignment.homework?.link && (
                                                  <a 
                                                    href={assignment.homework.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary hover:underline"
                                                  >
                                                    {assignment.homework.link}
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Show message if no homework items */}
                                          {sabqItems.length === 0 && 
                                           sabqiItems.length === 0 && 
                                           manzilItems.length === 0 && 
                                           !hasSabqiContent && 
                                           !hasManzilContent && 
                                           !hasGeneralContent && (
                                            <p className="text-sm text-gray-500 italic">No homework</p>
                                          )}
                                        </>
                                      );
                                    })()}
                                    
                                    {/* Homework Notes */}
                                    {assignment.homework?.notes && (
                                      <div className="bg-white rounded border border-gray-200 p-3">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Notes:</p>
                                        <p className="text-xs text-gray-700">{assignment.homework.notes}</p>
                                      </div>
                                    )}
                                    
                                    {/* Homework Submission Status */}
                                    {assignment.homework?.submission && (
                                      <div className="bg-white rounded border border-gray-200 p-3">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Submission Status:</p>
                                        <p className="text-xs text-gray-700">
                                          {assignment.homework.submission.status || (assignment.homework.submission.submitted ? 'Submitted' : 'Not submitted')}
                                        </p>
                                        {assignment.homework.submission.submittedAt && (
                                          <p className="text-[10px] text-gray-500 mt-1">
                                            Submitted: {new Date(assignment.homework.submission.submittedAt).toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* Grading Form */}
                                    {assignment.homework.submission?.status === 'submitted' && 
                                     (user?.role === 'admin' || user?.role === 'superadmin') && (
                                      <div className="bg-white rounded border border-gray-200 p-3 mt-2">
                                      {gradingAssignment === assignment.id ? (
                                        <div className="space-y-2">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Feedback</label>
                                            <textarea
                                              value={gradeData.feedback}
                                              onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
                                              rows={3}
                                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                                              placeholder="Enter feedback..."
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Grade (Optional)</label>
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              value={gradeData.grade}
                                              onChange={(e) => setGradeData(prev => ({ ...prev, grade: e.target.value }))}
                                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                                              placeholder="0-100"
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => {
                                                setGradingAssignment(null);
                                                setGradeData({ feedback: '', grade: '' });
                                              }}
                                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              onClick={() => handleGradeHomework(assignment.id)}
                                              disabled={isGrading}
                                              className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                            >
                                              {isGrading ? 'Grading...' : 'Submit'}
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
                                          className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition-colors"
                                        >
                                          {assignment.homework.submission?.grade !== undefined && assignment.homework.submission?.grade !== null 
                                            ? 'Update Grade' 
                                            : 'Grade Homework'}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  </div>
                                </div>
                              )}

                              {/* Comment */}
                              {assignment.comment && (
                                <div className="bg-white rounded border border-gray-200 p-3">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Comment</h4>
                                  <p className="text-sm text-gray-700">{assignment.comment}</p>
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
