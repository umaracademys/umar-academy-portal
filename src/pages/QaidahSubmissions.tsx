import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { fetchQaidahHomeworkSubmissions, reviewQaidahHomework, QaidahHomework } from '../services/qaidahApi';
import QaidahViewer from '../components/QaidahViewer';

const QaidahSubmissions: React.FC = () => {
  const { user } = useAuth();
  const { students } = useData();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [homeworkList, setHomeworkList] = useState<QaidahHomework[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedHomework, setExpandedHomework] = useState<string | null>(null);
  const [teacherFeedback, setTeacherFeedback] = useState<{ [key: string]: string }>({});
  const [isReviewing, setIsReviewing] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Get available students (teachers see assigned students, admins see all)
  const availableStudents = user?.role === 'teacher'
    ? students.filter(s => {
        const teacherId = (user as any).teacherId || (user as any).id;
        return s.assignedTeacher === teacherId ||
               (s as any).assignedTeacher?.toString() === teacherId?.toString();
      })
    : students;

  useEffect(() => {
    if (selectedStudentId) {
      loadHomework(selectedStudentId);
    } else {
      setHomeworkList([]);
    }
  }, [selectedStudentId]);

  const loadHomework = async (studentId: string) => {
    setIsLoading(true);
    try {
      const data = await fetchQaidahHomeworkSubmissions(studentId);
      setHomeworkList(data.homework || []);
      // Initialize feedback state
      const feedbackMap: { [key: string]: string } = {};
      data.homework?.forEach(hw => {
        feedbackMap[hw.id] = hw.teacherFeedback || '';
      });
      setTeacherFeedback(feedbackMap);
    } catch (error) {
      console.error('Error loading homework:', error);
      setToastMessage('Failed to load homework. Please try again.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (homework: QaidahHomework) => {
    const feedback = teacherFeedback[homework.id] || '';
    
    setIsReviewing(homework.id);
    try {
      await reviewQaidahHomework(homework.id, feedback, 'reviewed');
      setToastMessage('Homework marked as reviewed!');
      setExpandedHomework(null);
      
      // Reload homework list
      if (selectedStudentId) {
        await loadHomework(selectedStudentId);
      }
    } catch (error: any) {
      console.error('Error reviewing homework:', error);
      setToastMessage(error.message || 'Failed to review homework. Please try again.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsReviewing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded">Pending</span>;
      case 'submitted':
        return <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">Submitted</span>;
      case 'reviewed':
        return <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Reviewed</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const getSelectedStudent = () => {
    return availableStudents.find(s => 
      (s.id || (s as any)._id) === selectedStudentId
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Qaidah Submissions Review</h1>

        {/* Student Selection */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Student
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">-- Select Student --</option>
            {availableStudents.map((student) => (
              <option key={student.id || (student as any)._id} value={student.id || (student as any)._id}>
                {student.fullName || (student as any).fullName}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading homework...</p>
            </div>
          </div>
        ) : !selectedStudentId ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 text-lg">Please select a student to view their homework submissions.</p>
          </div>
        ) : homeworkList.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 text-lg">No homework submissions found for this student.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {homeworkList.map((homework) => {
              const youtubeId = extractYouTubeId(homework.youtubeLink || '');
              
              return (
                <div
                  key={homework.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setExpandedHomework(expandedHomework === homework.id ? null : homework.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {homework.book === 'qaidah1' ? 'Qaidah 1' : homework.book === 'qaidah2' ? 'Qaidah 2' : 'Quran'} - Page {homework.page}
                          </h3>
                          {getStatusBadge(homework.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          Due: {formatDate(homework.dueDate)}
                        </p>
                        {homework.homeworkInstructions && (
                          <p className="text-sm text-gray-700 mt-2">{homework.homeworkInstructions}</p>
                        )}
                        {homework.youtubeLink && (
                          <p className="text-sm text-blue-600 mt-1">
                            ✓ Submission received
                          </p>
                        )}
                      </div>
                      <div className="text-gray-400">
                        {expandedHomework === homework.id ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>

                  {expandedHomework === homework.id && (
                    <div className="border-t border-gray-200 p-4 space-y-4">
                      {/* Qaidah Page Viewer with Marks */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Classwork Page with Marks</h4>
                        <div className="h-[400px] border border-gray-300 rounded-lg overflow-hidden">
                          <QaidahViewer
                            currentPage={homework.page}
                            totalPages={100}
                            studentId={homework.student}
                            book={homework.book}
                          />
                        </div>
                      </div>

                      {/* Student YouTube Submission */}
                      {homework.youtubeLink && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Student Submission</h4>
                          {youtubeId ? (
                            <div className="aspect-video rounded-lg overflow-hidden border border-gray-300">
                              <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${youtubeId}`}
                                title="Student Submission"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                              ></iframe>
                            </div>
                          ) : (
                            <div className="bg-gray-100 rounded-lg p-4">
                              <a
                                href={homework.youtubeLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {homework.youtubeLink}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Teacher Feedback Form */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teacher Feedback
                        </label>
                        <textarea
                          value={teacherFeedback[homework.id] || ''}
                          onChange={(e) => {
                            setTeacherFeedback({
                              ...teacherFeedback,
                              [homework.id]: e.target.value
                            });
                          }}
                          placeholder="Enter feedback for the student..."
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      {/* Review Button */}
                      {homework.status !== 'reviewed' && (
                        <button
                          onClick={() => handleReview(homework)}
                          disabled={isReviewing === homework.id}
                          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isReviewing === homework.id ? 'Reviewing...' : 'Mark as Reviewed'}
                        </button>
                      )}

                      {/* Already Reviewed Status */}
                      {homework.status === 'reviewed' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-green-800 mb-1">Reviewed</p>
                          {homework.teacherFeedback && (
                            <p className="text-sm text-green-700">{homework.teacherFeedback}</p>
                          )}
                          {homework.reviewedAt && (
                            <p className="text-xs text-green-600 mt-2">
                              Reviewed on: {formatDate(homework.reviewedAt)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50"
          style={{
            animation: 'fadeIn 0.3s ease-in'
          }}
        >
          {toastMessage}
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default QaidahSubmissions;
