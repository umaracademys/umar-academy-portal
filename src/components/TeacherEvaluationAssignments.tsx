import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EvaluationAssignment } from '../types';
import TeacherEvaluationFlow from './TeacherEvaluationFlow';

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

interface TeacherEvaluationAssignmentsProps {
  onClose: () => void;
}

const TeacherEvaluationAssignments: React.FC<TeacherEvaluationAssignmentsProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<EvaluationAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/evaluation-assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '🔄';
      case 'overdue':
        return '⚠️';
      default:
        return '📋';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (selectedAssignmentId) {
    return (
      <TeacherEvaluationFlow
        assignmentId={selectedAssignmentId}
        onComplete={() => {
          setSelectedAssignmentId(null);
          loadAssignments();
        }}
        onClose={() => setSelectedAssignmentId(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-primary/30">
        {/* Enhanced Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <span className="text-2xl">📝</span>
                My Evaluations
              </h2>
              <p className="text-white/80 text-xs mt-1">Complete your assigned teacher evaluations</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all hover:scale-110"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="px-6 py-4 bg-gradient-to-br from-gray-50 to-white border-b-2 border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Evaluations
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by evaluation ID or name..."
                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary placeholder:text-primary/40 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-primary mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
              >
                <option value="all">All Statuses</option>
                <option value="assigned">📋 Assigned</option>
                <option value="in_progress">🔄 In Progress</option>
                <option value="completed">✅ Completed</option>
                <option value="overdue">⚠️ Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-primary mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-primary font-bold">Loading evaluations...</p>
              </div>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-lg font-bold text-primary mb-2">No evaluations found</p>
              <p className="text-sm text-primary/60">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'You don\'t have any assigned evaluations yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => {
                const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date() && assignment.status !== 'completed';
                
                return (
                  <div
                    key={assignment.id}
                    className="bg-white rounded-xl border-2 border-primary/10 p-6 shadow-md hover:shadow-xl transition-all hover:border-primary/30 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary text-xl font-bold">
                            📝
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold text-primary group-hover:text-primary transition-colors">
                              Evaluation #{assignment.id.substring(0, 12)}...
                            </h3>
                            <p className="text-xs text-primary/60 mt-0.5">
                              Assigned by {assignment.assignedByName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap ml-16">
                          <span className={`px-3 py-1.5 rounded-lg border-2 font-bold text-xs flex items-center gap-1.5 ${getStatusColor(assignment.status)}`}>
                            <span>{getStatusIcon(assignment.status)}</span>
                            {assignment.status.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                            <div className="w-24 bg-primary/20 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${assignment.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold text-primary">{assignment.progress}%</span>
                          </div>
                          {assignment.dueDate && (
                            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                              isOverdue 
                                ? 'bg-red-100 text-red-800 border-2 border-red-300' 
                                : 'bg-gray-100 text-gray-800 border-2 border-gray-300'
                            }`}>
                              📅 Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-200 ml-16">
                      <button
                        onClick={() => setSelectedAssignmentId(assignment.id)}
                        className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${
                          assignment.status === 'assigned'
                            ? 'bg-primary text-white hover:bg-[rgba(var(--color-primary-rgb),0.9)]'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {assignment.status === 'assigned' ? (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Start Evaluation
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l7 7-7 7M4 5l7 7-7 7" />
                            </svg>
                            Continue
                          </>
                        )}
                      </button>
                      {assignment.completedAt && (
                        <div className="px-4 py-2.5 bg-green-50 border-2 border-green-200 rounded-xl">
                          <p className="text-xs font-bold text-green-800">
                            ✅ Completed: {new Date(assignment.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherEvaluationAssignments;
