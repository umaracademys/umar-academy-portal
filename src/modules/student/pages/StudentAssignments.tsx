import React, { useState, useMemo } from 'react';
import StudentHeader from '../components/StudentHeader';
import StudentSidebar from '../components/StudentSidebar';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useBackendData } from '../../../contexts/BackendDataContext';
import InteractiveMushaf from '../../../components/InteractiveMushaf';
import { MushafMistake } from '../../../types/mushaf';

const StudentAssignments: React.FC = () => {
  const { user } = useAuth();
  const { students } = useData();
  const { assignments: backendAssignments } = useBackendData();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'assigned' | 'history'>('assigned');
  const [showMushafForAssignment, setShowMushafForAssignment] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState(1);

  const currentStudent = students.find(s => s.email === user?.email);

  // Get student's assignments from backend
  const studentAssignments = useMemo(() => {
    if (!currentStudent?.id) return [];
    
    return backendAssignments
      .filter((assignment: any) => {
        const assignedTo = Array.isArray(assignment.assignedTo) ? assignment.assignedTo : [assignment.assignedTo];
        const studentId = currentStudent.id || currentStudent._id;
        return assignedTo.includes(studentId) || 
               assignedTo.includes(studentId?.toString()) ||
               assignedTo.includes(currentStudent._id);
      })
      .map((assignment: any) => {
        const id = assignment._id || assignment.id;
        const createdAt = assignment.createdAt ? new Date(assignment.createdAt) : new Date();
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : new Date();
        const now = new Date();
        
        // Determine status
        let status = 'pending';
        if (assignment.status === 'completed') {
          status = 'completed';
        } else if (assignment.submissions && assignment.submissions.length > 0) {
          status = 'submitted';
        } else if (dueDate < now) {
          status = 'overdue';
        } else {
          status = 'pending';
        }

        // Parse description
        const description = assignment.description || '';
        const lines = description.split('\n');
        const listenersInfo = lines.filter((line: string) => line.includes('Listener:'));
        
        return {
          id,
          title: assignment.title || `${assignment.classworkType || 'Assignment'}`,
          description: description,
          type: assignment.type || 'classwork',
          classworkType: assignment.classworkType,
          program: assignment.program || '',
          dueDate: dueDate,
          createdAt: createdAt,
          status: status,
          grade: assignment.submissions?.[0]?.grade || null,
          homework: assignment.homeworkComments || '',
          homeworkLink: assignment.homeworkLink || '',
          listenerName: assignment.listenerName || 'Teacher',
          listenersInfo: listenersInfo.join('\n'),
          report: lines.filter((line: string) => !line.includes('Listener:')).join('\n').trim() || description,
          submissions: assignment.submissions || [],
          isPast: dueDate < now || assignment.status === 'completed',
          // Only show mushafMarkings for assignments created from finalized tickets
          mushafMarkings: assignment.fromTicketId && assignment.mushafMarkings 
            ? (assignment.mushafMarkings || []).map((m: any) => ({
                id: m.id || m._id || '',
                type: m.type,
                page: m.page,
                surah: m.surah,
                ayah: m.ayah,
                wordIndex: m.wordIndex,
                position: m.position || { x: 50, y: 50 },
                note: m.note || '',
                timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
              } as MushafMistake))
            : []
        };
      })
      .sort((a, b) => {
        // Sort by due date, pending/active first, then completed
        if (a.isPast !== b.isPast) {
          return a.isPast ? 1 : -1; // Active first
        }
        return b.dueDate.getTime() - a.dueDate.getTime(); // Most recent first
      });
  }, [backendAssignments, currentStudent]);

  // Separate assigned (active) and history (completed/past)
  const assignedAssignments = useMemo(() => 
    studentAssignments.filter(a => !a.isPast && a.status !== 'completed'),
    [studentAssignments]
  );

  const historyAssignments = useMemo(() => 
    studentAssignments.filter(a => a.isPast || a.status === 'completed'),
    [studentAssignments]
  );

  // Filter based on view mode
  const displayedAssignments = useMemo(() => {
    const source = viewMode === 'assigned' ? assignedAssignments : historyAssignments;
    
    if (filter === 'all') return source;
    return source.filter(a => a.status === filter);
  }, [viewMode, filter, assignedAssignments, historyAssignments]);

  // Use backend assignments if available, otherwise empty
  const assignmentsToDisplay = displayedAssignments;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'submitted':
        return 'Submitted';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader />
      
      <div className="flex">
        <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 lg:ml-64">
          <div className="p-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assignments</h1>
              <p className="text-gray-600">View your assigned tasks and assignment history</p>
            </div>

            {/* View Mode Toggle */}
            <div className="mb-6 flex gap-4 items-center">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('assigned')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'assigned'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📋 Assigned ({assignedAssignments.length})
                </button>
                <button
                  onClick={() => setViewMode('history')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'history'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📚 History ({historyAssignments.length})
                </button>
              </div>

              {/* Filter Tabs */}
              {viewMode === 'assigned' && (
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'active', label: 'Active' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key as any)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        filter === tab.key
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assignments List */}
            <div className="space-y-6">
              {assignmentsToDisplay.map((assignment: any) => (
                <div key={assignment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {assignment.title}
                        </h3>
                        {assignment.classworkType && (
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                            {assignment.classworkType.toUpperCase()}
                          </span>
                        )}
                        {assignment.program && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {assignment.program}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span>👂 Listener: <span className="font-semibold">{assignment.listenerName}</span></span>
                        <span>📅 Due: {assignment.dueDate.toLocaleDateString()}</span>
                        <span>📅 Created: {assignment.createdAt.toLocaleDateString()}</span>
                      </div>

                      {/* Report/Description */}
                      {assignment.report && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-green-500">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">📝 Report & Feedback:</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.report}</p>
                        </div>
                      )}

                      {/* Listeners Info */}
                      {assignment.listenersInfo && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">👂 Listeners:</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.listenersInfo}</p>
                        </div>
                      )}

                      {/* Homework */}
                      {assignment.homework && (
                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">📝 Homework:</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{assignment.homework}</p>
                          {assignment.homeworkLink && (
                            <a
                              href={assignment.homeworkLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm font-medium"
                            >
                              📎 Homework Link →
                            </a>
                          )}
                        </div>
                      )}

                      {/* Mushaf Mistake Markings */}
                      {assignment.mushafMarkings && assignment.mushafMarkings.length > 0 && (
                        <div className="mb-4 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">
                                📖 Mushaf Mistake Markings ({assignment.mushafMarkings.length} mistake{assignment.mushafMarkings.length !== 1 ? 's' : ''})
                              </h4>
                              <p className="text-xs text-gray-600 mt-1">
                                Click "View Mushaf" to see your mistakes highlighted on the Quran pages
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                if (showMushafForAssignment === assignment.id) {
                                  setShowMushafForAssignment(null);
                                } else {
                                  setShowMushafForAssignment(assignment.id);
                                  // Set initial page from first mistake if available
                                  const firstMistake = assignment.mushafMarkings[0];
                                  if (firstMistake && firstMistake.page) {
                                    setMushafPage(firstMistake.page);
                                  }
                                }
                              }}
                              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                            >
                              {showMushafForAssignment === assignment.id ? '📖 Hide Mushaf' : '📖 View Mushaf'}
                            </button>
                          </div>
                          
                          {/* Quick navigation to pages with mistakes */}
                          {showMushafForAssignment !== assignment.id && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-purple-200">
                              <span className="text-xs font-semibold text-purple-900">Jump to pages:</span>
                              {Array.from(new Set(assignment.mushafMarkings.map((m: MushafMistake) => m.page)))
                                .sort((a, b) => a - b)
                                .map((page: number) => {
                                  const mistakesOnPage = assignment.mushafMarkings.filter((m: MushafMistake) => m.page === page).length;
                                  return (
                                    <button
                                      key={page}
                                      onClick={() => {
                                        setMushafPage(page);
                                        setShowMushafForAssignment(assignment.id);
                                      }}
                                      className="px-3 py-1 bg-purple-200 text-purple-800 rounded-md hover:bg-purple-300 text-xs font-medium"
                                    >
                                      Page {page} ({mistakesOnPage})
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                          
                          {/* Mistake Summary */}
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-2">
                              {['madd', 'holding', 'memory', 'ikhfa', 'tech', 'other'].map((type) => {
                                const count = assignment.mushafMarkings.filter((m: MushafMistake) => m.type === type).length;
                                if (count === 0) return null;
                                return (
                                  <span key={type} className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-700">
                                    {type === 'madd' ? 'Tajweed' : 
                                     type === 'holding' ? 'Hesitation' :
                                     type === 'memory' ? 'Memory' :
                                     type === 'ikhfa' ? 'Pronunciation' :
                                     type === 'tech' ? 'Technical' : 'Other'}: {count}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Mushaf View */}
                          {showMushafForAssignment === assignment.id && (
                            <div className="mt-4 bg-white rounded-lg border-2 border-purple-200 p-4">
                              <div className="flex justify-between items-center mb-4">
                                <div>
                                  <h5 className="text-md font-bold text-gray-900">📖 Your Mistakes on the Mushaf</h5>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Page {mushafPage} • {assignment.mushafMarkings.filter((m: MushafMistake) => m.page === mushafPage).length} mistake{assignment.mushafMarkings.filter((m: MushafMistake) => m.page === mushafPage).length !== 1 ? 's' : ''} on this page
                                  </p>
                                </div>
                                <button
                                  onClick={() => setShowMushafForAssignment(null)}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                                >
                                  Close
                                </button>
                              </div>
                              
                              {/* Quick navigation buttons */}
                              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200">
                                <span className="text-xs font-semibold text-gray-700 self-center">Navigate to pages with mistakes:</span>
                                {Array.from(new Set(assignment.mushafMarkings.map((m: MushafMistake) => m.page)))
                                  .sort((a, b) => a - b)
                                  .map((page: number) => {
                                    const mistakesOnPage = assignment.mushafMarkings.filter((m: MushafMistake) => m.page === page).length;
                                    return (
                                      <button
                                        key={page}
                                        onClick={() => setMushafPage(page)}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                          mushafPage === page
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                        }`}
                                      >
                                        Page {page} ({mistakesOnPage})
                                      </button>
                                    );
                                  })}
                              </div>
                              
                              <InteractiveMushaf
                                currentPage={mushafPage}
                                onPageChange={setMushafPage}
                                mistakes={assignment.mushafMarkings}
                                onMistakeMark={() => {}} // Read-only for students
                                readOnly={true}
                                mode="viewing"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                        {getStatusText(assignment.status)}
                      </span>
                      {assignment.grade !== null && assignment.grade !== undefined && (
                        <span className="text-lg font-bold text-green-600">
                          {assignment.grade}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      {assignment.status === 'pending' && viewMode === 'assigned' && (
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                          Submit Assignment
                        </button>
                      )}
                      {assignment.submissions && assignment.submissions.length > 0 && (
                        <span className="text-sm text-gray-600">
                          ✅ Submitted {assignment.submissions[0].submittedAt ? new Date(assignment.submissions[0].submittedAt).toLocaleDateString() : ''}
                        </span>
                      )}
                    </div>
                    
                    {assignment.status === 'completed' && (
                      <div className="text-sm text-gray-600">
                        Completed on {assignment.createdAt.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {assignmentsToDisplay.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {viewMode === 'assigned' ? 'No Assigned Tasks' : 'No Assignment History'}
                </h3>
                <p className="text-gray-600">
                  {viewMode === 'assigned' 
                    ? "You don't have any active assignments yet." 
                    : "You don't have any completed assignments in your history yet."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignments;



