import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Program } from '../types/assignment';
import AssignmentForm from '../components/AssignmentForm';
import SimpleAssignmentForm from '../components/SimpleAssignmentForm';
import AssignmentReports from '../components/AssignmentReports';
import AssignmentSubmissionForm from '../components/AssignmentSubmission';
import BulkAssignmentCreator from '../components/BulkAssignmentCreator';
import CSVAssignmentImporter from '../components/CSVAssignmentImporter';

const AssignmentsPage: React.FC = () => {
  const { assignments, students, addAssignment, updateAssignment, addAssignmentSubmission } = useData();
  const { user } = useAuth();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkCreator, setShowBulkCreator] = useState(false);
  const [showCSVImporter, setShowCSVImporter] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [filterProgram, setFilterProgram] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [programs, setPrograms] = useState<Program[]>([]);

  // Mock programs - in real app, this would come from API
  useEffect(() => {
    const mockPrograms: Program[] = [
      { id: '1', name: 'Full Time HQ', description: 'Full-time Hifz program', students: ['1', '2', '3'], createdAt: new Date(), status: 'active' },
      { id: '2', name: 'Part Time HQ', description: 'Part-time Hifz program', students: ['1', '4', '5'], createdAt: new Date(), status: 'active' },
      { id: '3', name: 'After School Reading', description: 'After school reading program', students: ['2', '3', '6'], createdAt: new Date(), status: 'active' }
    ];
    setPrograms(mockPrograms);
  }, []);

  // Check if user can create assignments (Super Admin controls this)
  const canCreateAssignments = user?.role === 'superadmin' || 
    (user?.role === 'admin' && user?.permissions?.includes('create_assignments')) ||
    (user?.role === 'teacher' && user?.permissions?.includes('create_assignments'));

  const filteredAssignments = assignments.filter(assignment => {
    const programMatch = !filterProgram || assignment.program === filterProgram;
    const typeMatch = !filterType || assignment.type === filterType;
    return programMatch && typeMatch;
  });

  const handleCreateAssignment = async (assignmentData: any) => {
    try {
      await addAssignment(assignmentData);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  const handleUpdateAssignment = async (assignmentData: any) => {
    try {
      await updateAssignment(assignmentData.id, assignmentData);
      setShowCreateForm(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  const handleSubmitAssignment = async (submission: any) => {
    try {
      await addAssignmentSubmission(selectedAssignment!.id, submission);
      setShowSubmissionForm(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error('Error submitting assignment:', error);
    }
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    const totalStudents = assignment.assignedTo.length;
    const submittedCount = assignment.submissions.length;
    
    if (submittedCount === 0) return 'Not Started';
    if (submittedCount === totalStudents) return 'Completed';
    return `In Progress (${submittedCount}/${totalStudents})`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">📝 Assignment Management</h1>
                <p className="text-blue-100 text-lg">Create, manage, and track assignments across all programs</p>
              </div>
              <div className="flex space-x-4">
                {canCreateAssignments && (
                  <>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center"
                    >
                      <span className="mr-2">✨</span>
                      Create New Assignment
                    </button>
                    <button
                      onClick={() => setShowBulkCreator(true)}
                      className="px-6 py-3 bg-white bg-opacity-20 text-white rounded-xl hover:bg-opacity-30 font-semibold transition-all border border-white border-opacity-30"
                    >
                      📊 Bulk Create
                    </button>
                    <button
                      onClick={() => setShowCSVImporter(true)}
                      className="px-6 py-3 bg-white bg-opacity-20 text-white rounded-xl hover:bg-opacity-30 font-semibold transition-all border border-white border-opacity-30"
                    >
                      📁 CSV Import
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowReports(true)}
                  className="px-6 py-3 bg-white bg-opacity-20 text-white rounded-xl hover:bg-opacity-30 font-semibold transition-all border border-white border-opacity-30"
                >
                  📈 Reports
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Program</label>
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Programs</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="classwork">Classwork</option>
                <option value="homework">Homework</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterProgram('');
                  setFilterType('');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Assignments List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Assignments ({filteredAssignments.length})</h2>
          </div>
          
          {filteredAssignments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
              <p className="text-gray-600 mb-6">
                {filteredAssignments.length === assignments.length 
                  ? "Create your first assignment to get started"
                  : "Try adjusting your filters to see more assignments"
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
            <div className="divide-y divide-gray-200">
              {filteredAssignments.map((assignment) => {
                const status = getAssignmentStatus(assignment);
                const program = programs.find(p => p.id === assignment.program);
                
                return (
                  <div key={assignment.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{assignment.description}</p>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <span>📚 {program?.name || 'Unknown Program'}</span>
                          <span>👥 {assignment.assignedTo.length} students</span>
                          <span>📅 {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}</span>
                          <span>🏷️ {assignment.type === 'classwork' ? 'Classwork' : 'Homework'}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setShowSubmissionForm(true);
                          }}
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                        >
                          Submit
                        </button>
                        {canCreateAssignments && (
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowCreateForm(true);
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
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
        </div>

        {/* Modals */}
        {showCreateForm && (
          <SimpleAssignmentForm
            onClose={() => {
              setShowCreateForm(false);
              setSelectedAssignment(null);
            }}
            onSuccess={() => {
              setShowCreateForm(false);
              setSelectedAssignment(null);
            }}
          />
        )}

        {showBulkCreator && (
          <BulkAssignmentCreator
            onClose={() => setShowBulkCreator(false)}
            onSuccess={() => {
              setShowBulkCreator(false);
            }}
          />
        )}

        {showCSVImporter && (
          <CSVAssignmentImporter
            onClose={() => setShowCSVImporter(false)}
            onSuccess={() => {
              setShowCSVImporter(false);
            }}
          />
        )}

        {showReports && (
          <AssignmentReports
            onClose={() => setShowReports(false)}
          />
        )}

        {showSubmissionForm && selectedAssignment && (
          <AssignmentSubmissionForm
            assignment={selectedAssignment}
            onSubmit={handleSubmitAssignment}
            onClose={() => {
              setShowSubmissionForm(false);
              setSelectedAssignment(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AssignmentsPage;