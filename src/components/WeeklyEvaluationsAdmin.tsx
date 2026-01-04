import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from './Card';

interface WeeklyEvaluationsAdminProps {
  onClose: () => void;
}

const WeeklyEvaluationsAdmin: React.FC<WeeklyEvaluationsAdminProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [gamePlan, setGamePlan] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEvaluations();
  }, [filterStatus]);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      const url = filterStatus === 'all' 
        ? `${apiUrl}/weekly-evaluations`
        : `${apiUrl}/weekly-evaluations?status=${filterStatus}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = () => {
    setLinks([...links, '']);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const handleSubmitFeedback = async (evaluationId: string) => {
    if (!feedback.trim() && !gamePlan.trim() && links.every(l => !l.trim())) {
      alert('Please provide at least feedback, game plan, or a link');
      return;
    }

    setSaving(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/weekly-evaluations/${evaluationId}/admin-feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminFeedback: feedback,
          gamePlan: gamePlan,
          sharedLinks: links.filter(l => l.trim()),
          reviewedBy: user?.id || '',
          reviewedByName: user?.name || user?.email || 'Admin'
        })
      });

      if (response.ok) {
        alert('Feedback submitted successfully! The teacher has been notified.');
        setFeedback('');
        setGamePlan('');
        setLinks(['']);
        setSelectedEvaluation(null);
        loadEvaluations();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'under_review':
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'feedback_provided':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Weekly Evaluations Review</h2>
            <p className="text-sm text-gray-600 mt-1">Review and provide feedback on teacher-submitted evaluations</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="feedback_provided">Feedback Provided</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
            </select>
            <div className="ml-auto text-sm text-gray-600">
              Total: <span className="font-semibold">{evaluations.length}</span> evaluations
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">No evaluations found</p>
              <p className="text-sm text-gray-500 mt-1">
                {filterStatus === 'all' 
                  ? 'No weekly evaluations have been submitted yet.'
                  : `No evaluations with status "${filterStatus}" found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluations.map((evaluation) => (
                <Card key={evaluation.id || evaluation._id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {evaluation.studentName || 'Student'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Week of {formatDate(evaluation.weekStartDate)} - {formatDate(evaluation.weekEndDate)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Submitted by {evaluation.teacherName || 'Teacher'} on {evaluation.submittedAt ? formatDate(evaluation.submittedAt) : 'N/A'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(evaluation.status || 'draft')}`}>
                      {evaluation.status || 'draft'}
                    </span>
                  </div>

                  {/* Level and Surah */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-gray-600 uppercase">Level:</span>
                        <p className="text-sm font-medium text-gray-900">{evaluation.level || 'N/A'}</p>
                      </div>
                      {evaluation.selectedSurah && (
                        <div>
                          <span className="text-xs font-semibold text-gray-600 uppercase">Surah:</span>
                          <p className="text-sm font-medium text-gray-900">{evaluation.selectedSurah}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Common Mistakes */}
                  {evaluation.commonMistakes && (
                    <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2">Common Mistakes</h4>
                      <p className="text-sm text-red-800 whitespace-pre-wrap">{evaluation.commonMistakes}</p>
                    </div>
                  )}

                  {/* Fixing Etiquette */}
                  {evaluation.fixingEtiquette && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">Fixing Etiquette</h4>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{evaluation.fixingEtiquette}</p>
                    </div>
                  )}

                  {/* Admin Feedback */}
                  {evaluation.adminFeedback && (
                    <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-900 mb-2">Admin Feedback</h4>
                      <p className="text-sm text-yellow-800 whitespace-pre-wrap">{evaluation.adminFeedback}</p>
                      {evaluation.reviewedByName && (
                        <p className="text-xs text-yellow-700 mt-2">
                          - {evaluation.reviewedByName} ({formatDate(evaluation.reviewedAt)})
                        </p>
                      )}
                    </div>
                  )}

                  {/* Game Plan */}
                  {evaluation.gamePlan && (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">Game Plan</h4>
                      <p className="text-sm text-green-800 whitespace-pre-wrap">{evaluation.gamePlan}</p>
                    </div>
                  )}

                  {/* Shared Links */}
                  {evaluation.sharedLinks && evaluation.sharedLinks.length > 0 && (
                    <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-2">Shared Links</h4>
                      <div className="space-y-2">
                        {evaluation.sharedLinks.map((link: string, idx: number) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-purple-700 hover:text-purple-900 hover:underline"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setSelectedEvaluation(evaluation.id || evaluation._id)}
                      className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      {evaluation.adminFeedback ? 'Update Feedback' : 'Provide Feedback'}
                    </button>
                    {evaluation.status === 'under_review' && (
                      <button
                        onClick={async () => {
                          if (confirm('Approve this evaluation?')) {
                            try {
                              const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
                              const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
                              const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
                              const response = await fetch(`${apiUrl}/weekly-evaluations/${evaluation.id || evaluation._id}/approve`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  adminFeedback: evaluation.adminFeedback || '',
                                  gamePlan: evaluation.gamePlan || '',
                                  sharedLinks: evaluation.sharedLinks || []
                                })
                              });
                              if (response.ok) {
                                alert('Evaluation approved! The teacher has been notified.');
                                loadEvaluations();
                              } else {
                                const error = await response.json();
                                alert(error.error || 'Failed to approve evaluation');
                              }
                            } catch (error) {
                              console.error('Error approving evaluation:', error);
                              alert('Failed to approve evaluation');
                            }
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feedback Form Modal */}
      {selectedEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Provide Feedback</h3>
              <button
                onClick={() => {
                  setSelectedEvaluation(null);
                  setFeedback('');
                  setGamePlan('');
                  setLinks(['']);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter your feedback..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Game Plan</label>
                <textarea
                  value={gamePlan}
                  onChange={(e) => setGamePlan(e.target.value)}
                  placeholder="Enter game plan..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shared Links</label>
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => handleLinkChange(index, e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      {links.length > 1 && (
                        <button
                          onClick={() => handleRemoveLink(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleAddLink}
                    className="px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary/10"
                  >
                    + Add Link
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleSubmitFeedback(selectedEvaluation)}
                  disabled={saving || (!feedback.trim() && !gamePlan.trim() && links.every(l => !l.trim()))}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  onClick={() => {
                    setSelectedEvaluation(null);
                    setFeedback('');
                    setGamePlan('');
                    setLinks(['']);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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

export default WeeklyEvaluationsAdmin;


