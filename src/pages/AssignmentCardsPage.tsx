import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Program } from '../types/assignment';
import ModernAssignmentForm from '../components/ModernAssignmentForm';

const AssignmentCardsPage: React.FC = () => {
  const { assignments, refreshData } = useData();
  const { user } = useAuth();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterProgram, setFilterProgram] = useState<string>('');
  const [programs, setPrograms] = useState<Program[]>([]);

  // Mock programs
  useEffect(() => {
    const mockPrograms: Program[] = [
      { id: '1', name: 'Full Time HQ', description: 'Full-time Hifz program', students: ['1', '2', '3'], createdAt: new Date(), status: 'active' },
      { id: '2', name: 'Part Time HQ', description: 'Part-time Hifz program', students: ['1', '4', '5'], createdAt: new Date(), status: 'active' },
      { id: '3', name: 'After School Reading', description: 'After school reading program', students: ['2', '3', '6'], createdAt: new Date(), status: 'active' }
    ];
    setPrograms(mockPrograms);
  }, []);

  // Check if user can create assignments
  const canCreateAssignments = user?.role === 'superadmin' || 
    user?.role === 'admin' ||
    user?.role === 'teacher';

  const filteredAssignments = assignments.filter(assignment => {
    const programMatch = !filterProgram || assignment.program === filterProgram;
    return programMatch;
  });

  const getAssignmentStatus = (assignment: Assignment) => {
    const totalStudents = assignment.assignedTo.length;
    const submittedCount = assignment.submissions.length;
    
    if (submittedCount === 0) return 'Not Started';
    if (submittedCount === totalStudents) return 'Completed';
    return `In Progress (${submittedCount}/${totalStudents})`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string, classworkType?: string) => {
    if (type === 'classwork') {
      switch (classworkType) {
        case 'sabq': return '📖';
        case 'sabqi': return '📚';
        case 'manzil': return '📑';
        default: return '📖';
      }
    } else {
      return '🏠';
    }
  };

  const getTypeColor = (type: string, classworkType?: string) => {
    if (type === 'classwork') {
      switch (classworkType) {
        case 'sabq': return 'from-blue-500 to-blue-600';
        case 'sabqi': return 'from-green-500 to-green-600';
        case 'manzil': return 'from-purple-500 to-purple-600';
        default: return 'from-blue-500 to-blue-600';
      }
    } else {
      return 'from-orange-500 to-orange-600';
    }
  };

  const getTypeLabel = (type: string, classworkType?: string) => {
    if (type === 'classwork') {
      switch (classworkType) {
        case 'sabq': return 'Sabq';
        case 'sabqi': return 'Sabqi';
        case 'manzil': return 'Manzil';
        default: return 'Classwork';
      }
    } else {
      return 'Homework';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">📚 Assignment Cards</h1>
                <p className="text-blue-100 text-lg">View all assignments in a beautiful card layout</p>
              </div>
              {canCreateAssignments && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center"
                >
                  <span className="mr-2">✨</span>
                  Create New Assignment
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-semibold text-gray-700">Filter by Program:</label>
            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Programs</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
            <button
              onClick={() => setFilterProgram('')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filter
            </button>
          </div>
        </div>

        {/* Assignment Cards */}
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-600 mb-6">
              {filteredAssignments.length === assignments.length 
                ? "Create your first assignment to get started"
                : "Try adjusting your filter to see more assignments"
              }
            </p>
            {canCreateAssignments && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                Create Assignment
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => {
              const status = getAssignmentStatus(assignment);
              const program = programs.find(p => p.id === assignment.program);
              // const icon = getAssignmentStatus(assignment); // Status displayed elsewhere
              const typeColor = getTypeColor(assignment.type, assignment.classworkType);
              const typeLabel = getTypeLabel(assignment.type, assignment.classworkType);
              const typeIcon = getTypeIcon(assignment.type, assignment.classworkType);
              
              return (
                <div key={assignment.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden">
                  {/* Card Header with Gradient */}
                  <div className={`bg-gradient-to-r ${typeColor} p-6 text-white`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{typeIcon}</span>
                        <div>
                          <h3 className="text-lg font-bold">{assignment.title}</h3>
                          <p className="text-white text-opacity-90 text-sm">{typeLabel}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                    
                    <p className="text-white text-opacity-90 text-sm line-clamp-2">
                      {assignment.description}
                    </p>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-5 h-5 mr-2">📚</span>
                        <span className="font-medium">{program?.name || 'Unknown Program'}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-5 h-5 mr-2">👥</span>
                        <span>{assignment.assignedTo.length} students assigned</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-5 h-5 mr-2">📅</span>
                        <span>
                          {assignment.dueDate 
                            ? new Date(assignment.dueDate).toLocaleDateString()
                            : 'No due date'
                          }
                        </span>
                      </div>

                      {assignment.type === 'homework' && assignment.homeworkLink && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="w-5 h-5 mr-2">🔗</span>
                          <a 
                            href={assignment.homeworkLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            View Homework Link
                          </a>
                        </div>
                      )}

                      {assignment.type === 'homework' && assignment.homeworkText && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Instructions:</span>
                          <p className="mt-1 text-gray-700 line-clamp-2">{assignment.homeworkText}</p>
                        </div>
                      )}

                      {assignment.program === '3' && assignment.readingLink && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="w-5 h-5 mr-2">📖</span>
                          <a 
                            href={assignment.readingLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-800 underline"
                          >
                            Reading Link
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{assignment.submissions.length}/{assignment.assignedTo.length}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${assignment.assignedTo.length > 0 
                              ? (assignment.submissions.length / assignment.assignedTo.length) * 100 
                              : 0
                            }%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      {canCreateAssignments && (
                        <button
                          onClick={() => {
                            // Assignment detail view can be added here
                            setShowCreateForm(true);
                          }}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Assignment Modal */}
        {showCreateForm && (
          <ModernAssignmentForm
            onClose={() => {
              setShowCreateForm(false);
            }}
            onSuccess={() => {
              setShowCreateForm(false);
              refreshData();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AssignmentCardsPage;
