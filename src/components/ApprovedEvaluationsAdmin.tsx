import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from './Card';

interface ApprovedEvaluationsAdminProps {
  onClose: () => void;
}

const ApprovedEvaluationsAdmin: React.FC<ApprovedEvaluationsAdminProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [homeworkContent, setHomeworkContent] = useState('');
  const [homeworkLink, setHomeworkLink] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [assigningHomework, setAssigningHomework] = useState(false);

  useEffect(() => {
    loadEvaluations();
  }, [dateFilter, customStartDate, customEndDate]);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      
      let url = `${API_BASE}/weekly-evaluations/approved`;
      const params = new URLSearchParams();
      
      if (dateFilter === 'today') {
        // Default - today's approved evaluations
      } else if (dateFilter === '7days') {
        params.append('days', '7');
      } else if (dateFilter === '30days') {
        params.append('days', '30');
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to load approved evaluations');
      }
    } catch (error) {
      console.error('Error loading approved evaluations:', error);
      alert('Failed to load approved evaluations');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignHomework = async (evaluation: any) => {
    if (!homeworkContent.trim() && !additionalNotes.trim()) {
      alert('Please provide homework content or additional notes');
      return;
    }

    setAssigningHomework(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/weekly-evaluations/${evaluation.id}/assign-homework`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          homeworkContent: homeworkContent || undefined,
          homeworkLink: homeworkLink || undefined,
          additionalNotes: additionalNotes || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Homework assigned successfully to ${evaluation.studentName}!`);
        setSelectedEvaluation(null);
        setHomeworkContent('');
        setHomeworkLink('');
        setAdditionalNotes('');
        loadEvaluations();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to assign homework');
      }
    } catch (error) {
      console.error('Error assigning homework:', error);
      alert('Failed to assign homework');
    } finally {
      setAssigningHomework(false);
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-primary/30">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <span className="text-2xl">✓</span>
                Approved Weekly Evaluations
              </h2>
              <p className="text-white/80 text-sm mt-1">View approved evaluations and assign homework</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-semibold text-gray-700">Filter by date:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
            
            {dateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Start date"
                />
                <span className="text-gray-600">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="End date"
                />
              </>
            )}
            
            <div className="ml-auto text-sm text-gray-600">
              Showing {evaluations.length} approved evaluation{evaluations.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No approved evaluations found for the selected period.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluations.map((evaluation) => (
                <Card key={evaluation.id || evaluation._id} className="border-2 border-gray-200 hover:border-primary/50 transition-colors">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-primary">{evaluation.studentName}</h3>
                        <p className="text-sm text-gray-600">
                          Week of {formatDate(evaluation.weekStartDate)} • Level: {evaluation.level}
                          {evaluation.selectedSurah && ` • ${evaluation.selectedSurah}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Teacher: {evaluation.teacherName} • Approved: {formatDateTime(evaluation.approvedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {evaluation.ratings && (
                          <div className="text-right">
                            <div className="text-xs text-gray-600">Ratings</div>
                            <div className="text-sm font-semibold">
                              F:{evaluation.ratings.fluency}/5 T:{evaluation.ratings.tajweed}/5 A:{evaluation.ratings.accuracy}/5
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => setSelectedEvaluation(evaluation)}
                          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
                        >
                          Assign Homework
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {evaluation.strengths && (
                        <div>
                          <p className="font-semibold text-green-700 mb-1">Strengths:</p>
                          <p className="text-gray-700">{evaluation.strengths}</p>
                        </div>
                      )}
                      {evaluation.weaknesses && (
                        <div>
                          <p className="font-semibold text-orange-700 mb-1">Weaknesses:</p>
                          <p className="text-gray-700">{evaluation.weaknesses}</p>
                        </div>
                      )}
                      {evaluation.commonMistakes && (
                        <div>
                          <p className="font-semibold text-red-700 mb-1">Common Mistakes:</p>
                          <p className="text-gray-700">{evaluation.commonMistakes}</p>
                        </div>
                      )}
                      {evaluation.adminFeedback && (
                        <div>
                          <p className="font-semibold text-blue-700 mb-1">Admin Feedback:</p>
                          <p className="text-gray-700">{evaluation.adminFeedback}</p>
                        </div>
                      )}
                    </div>

                    {evaluation.gamePlan && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="font-semibold text-blue-700 mb-1">Game Plan:</p>
                        <p className="text-gray-700 text-sm">{evaluation.gamePlan}</p>
                      </div>
                    )}

                    {evaluation.sharedLinks && evaluation.sharedLinks.length > 0 && (
                      <div className="mt-4">
                        <p className="font-semibold text-gray-700 mb-2">Shared Links:</p>
                        <div className="flex flex-wrap gap-2">
                          {evaluation.sharedLinks.map((link: string, idx: number) => (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                            >
                              {link}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Homework Assignment Modal */}
      {selectedEvaluation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-primary/30">
            <div className="px-6 py-4 bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-white">
                  Assign Homework to {selectedEvaluation.studentName}
                </h3>
                <button
                  onClick={() => {
                    setSelectedEvaluation(null);
                    setHomeworkContent('');
                    setHomeworkLink('');
                    setAdditionalNotes('');
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Homework Content (optional - will auto-generate from evaluation if empty)
                </label>
                <textarea
                  value={homeworkContent}
                  onChange={(e) => setHomeworkContent(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={6}
                  placeholder="Leave empty to auto-generate from evaluation data..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Homework Link (optional)</label>
                <input
                  type="url"
                  value={homeworkLink}
                  onChange={(e) => setHomeworkLink(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Additional Notes (optional)</label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Any additional instructions or notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleAssignHomework(selectedEvaluation)}
                  disabled={assigningHomework}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningHomework ? 'Assigning...' : 'Assign Homework'}
                </button>
                <button
                  onClick={() => {
                    setSelectedEvaluation(null);
                    setHomeworkContent('');
                    setHomeworkLink('');
                    setAdditionalNotes('');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedEvaluationsAdmin;

