import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchQaidahHomeworkSubmissions, submitQaidahHomework, QaidahHomework } from '../../../services/qaidahApi';
import QaidahViewer from '../../../components/QaidahViewer';
import { useNavigate } from 'react-router-dom';

const StudentQaidahHomework: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [homeworkList, setHomeworkList] = useState<QaidahHomework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHomework, setSelectedHomework] = useState<QaidahHomework | null>(null);
  const [youtubeLink, setYoutubeLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedHomework, setExpandedHomework] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const studentId = (user as any).studentId || (user as any).studentDocumentId || user.id;
    if (!studentId) {
      console.error('Student ID not found');
      return;
    }

    loadHomework(studentId);
  }, [user, navigate]);

  const loadHomework = async (studentId: string) => {
    setIsLoading(true);
    try {
      const data = await fetchQaidahHomeworkSubmissions(studentId);
      setHomeworkList(data.homework || []);
    } catch (error) {
      console.error('Error loading homework:', error);
      setToastMessage('Failed to load homework. Please try again.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (homework: QaidahHomework) => {
    if (!youtubeLink.trim()) {
      setToastMessage('Please enter a YouTube link');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    // Validate YouTube link
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeLink)) {
      setToastMessage('Please enter a valid YouTube link');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitQaidahHomework(homework.id, youtubeLink);
      setToastMessage('Homework submitted successfully!');
      setYoutubeLink('');
      setExpandedHomework(null);
      
      // Reload homework list
      const studentId = (user as any).studentId || (user as any).studentDocumentId || user.id;
      await loadHomework(studentId);
    } catch (error: any) {
      console.error('Error submitting homework:', error);
      setToastMessage(error.message || 'Failed to submit homework. Please try again.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
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

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && selectedHomework?.status === 'pending';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading homework...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Qaidah Homework</h1>

        {homeworkList.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">No homework assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {homeworkList.map((homework) => (
              <div
                key={homework.id}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setExpandedHomework(expandedHomework === homework.id ? null : homework.id);
                    if (expandedHomework !== homework.id) {
                      setSelectedHomework(homework);
                      setYoutubeLink(homework.youtubeLink || '');
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {homework.book === 'qaidah1' ? 'Qaidah 1' : homework.book === 'qaidah2' ? 'Qaidah 2' : 'Quran'} - Page {homework.page}
                        </h3>
                        {getStatusBadge(homework.status)}
                        {isOverdue(homework.dueDate) && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">Overdue</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Due: {formatDate(homework.dueDate)}
                      </p>
                      {homework.homeworkInstructions && (
                        <p className="text-sm text-gray-700 mt-2">{homework.homeworkInstructions}</p>
                      )}
                    </div>
                    <div className="text-gray-400">
                      {expandedHomework === homework.id ? '▼' : '▶'}
                    </div>
                  </div>
                </div>

                {expandedHomework === homework.id && (
                  <div className="border-t border-gray-200 p-4 space-y-4">
                    {/* Qaidah Page Viewer */}
                    <div className="h-[500px] border border-gray-300 rounded-lg overflow-hidden">
                      <QaidahViewer
                        currentPage={homework.page}
                        totalPages={100}
                        studentId={homework.student}
                        book={homework.book}
                      />
                    </div>

                    {/* Submission Form */}
                    {homework.status === 'pending' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            YouTube Submission Link
                          </label>
                          <input
                            type="text"
                            value={youtubeLink}
                            onChange={(e) => setYoutubeLink(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Paste your YouTube video link here
                          </p>
                        </div>
                        <button
                          onClick={() => handleSubmit(homework)}
                          disabled={isSubmitting || !youtubeLink.trim()}
                          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Homework'}
                        </button>
                      </div>
                    )}

                    {/* Submitted Status */}
                    {homework.status === 'submitted' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800 font-medium mb-2">Submitted</p>
                        {homework.youtubeLink && (
                          <a
                            href={homework.youtubeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Submission: {homework.youtubeLink}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Teacher Feedback */}
                    {homework.status === 'reviewed' && homework.teacherFeedback && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-800 mb-2">Teacher Feedback:</p>
                        <p className="text-sm text-green-700">{homework.teacherFeedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
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

export default StudentQaidahHomework;
