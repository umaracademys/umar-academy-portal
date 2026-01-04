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
  const [selectedEvaluationDetails, setSelectedEvaluationDetails] = useState<any>(null);
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Submitted' },
      under_review: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Under Review' },
      feedback_provided: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Feedback Provided' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const statusCounts = evaluations.reduce((acc, evaluation) => {
    acc[evaluation.status || 'draft'] = (acc[evaluation.status || 'draft'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/90 px-6 py-5 flex justify-between items-center rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-white">Weekly Evaluations Review</h2>
            <p className="text-white/90 text-sm mt-1">Review and provide feedback on teacher-submitted evaluations</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">Filter by status:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                All ({evaluations.length})
              </button>
              {Object.entries(statusCounts).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filterStatus === status
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {getStatusBadge(status).props.children} ({count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-gray-200">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 font-bold text-lg mb-2">No evaluations found</p>
              <p className="text-sm text-gray-500">
                {filterStatus === 'all' 
                  ? 'No weekly evaluations have been submitted yet.'
                  : `No evaluations with status "${filterStatus}" found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluations.map((evaluation) => (
                <div
                  key={evaluation.id || evaluation._id}
                  className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedEvaluationDetails(evaluation)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        {evaluation.studentName || 'Student'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Week of {formatDate(evaluation.weekStartDate)} - {formatDate(evaluation.weekEndDate)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Submitted by {evaluation.teacherName || 'Teacher'} on {evaluation.submittedAt ? formatDate(evaluation.submittedAt) : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(evaluation.status || 'draft')}
                    </div>
                  </div>

                  {/* Level and Surah */}
                  <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Level:</span>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{evaluation.level || 'N/A'}</p>
                      </div>
                      {evaluation.selectedSurah && (
                        <div>
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Surah:</span>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{evaluation.selectedSurah}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview of content */}
                  <div className="space-y-2">
                    {evaluation.commonMistakes && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs font-bold text-red-900 mb-1">Common Mistakes</p>
                        <p className="text-sm text-red-800 line-clamp-2">{evaluation.commonMistakes}</p>
                      </div>
                    )}
                    {evaluation.fixingEtiquette && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-bold text-blue-900 mb-1">Fixing Etiquette</p>
                        <p className="text-sm text-blue-800 line-clamp-2">{evaluation.fixingEtiquette}</p>
                      </div>
                    )}
                    {evaluation.adminFeedback && (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-xs font-bold text-yellow-900 mb-1">Admin Feedback</p>
                        <p className="text-sm text-yellow-800 line-clamp-2">{evaluation.adminFeedback}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {evaluation.submittedAt && (
                        <span>Submitted: {formatDate(evaluation.submittedAt)}</span>
                      )}
                      {evaluation.reviewedAt && (
                        <span className="ml-4">Reviewed: {formatDate(evaluation.reviewedAt)}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvaluation(evaluation.id || evaluation._id);
                        }}
                        className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-md text-sm"
                      >
                        {evaluation.adminFeedback ? 'Update Feedback' : 'Provide Feedback'}
                      </button>
                      {evaluation.status === 'under_review' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
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
                          className="px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-md text-sm"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-end">
                    <span className="text-sm font-medium text-primary hover:text-primary/80">
                      Click to view full details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEvaluationDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/90 px-6 py-5 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-white">Evaluation Details</h3>
                <p className="text-white/90 text-sm mt-1">
                  {selectedEvaluationDetails.studentName} - Week of {formatDate(selectedEvaluationDetails.weekStartDate)} - {formatDate(selectedEvaluationDetails.weekEndDate)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvaluationDetails(null)}
                className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                <div>
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Status:</span>
                  <div className="mt-2">{getStatusBadge(selectedEvaluationDetails.status || 'draft')}</div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  {selectedEvaluationDetails.submittedAt && (
                    <p>Submitted: {formatDate(selectedEvaluationDetails.submittedAt)}</p>
                  )}
                  {selectedEvaluationDetails.reviewedAt && (
                    <p className="mt-1">Reviewed: {formatDate(selectedEvaluationDetails.reviewedAt)}</p>
                  )}
                </div>
              </div>

              {/* Level and Surah */}
              <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Level:</span>
                    <p className="text-lg font-bold text-gray-900 mt-2">{selectedEvaluationDetails.level || 'N/A'}</p>
                  </div>
                  {selectedEvaluationDetails.selectedSurah && (
                    <div>
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Surah:</span>
                      <p className="text-lg font-bold text-gray-900 mt-2">{selectedEvaluationDetails.selectedSurah}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Common Mistakes */}
              {selectedEvaluationDetails.commonMistakes && (
                <div className="p-5 bg-red-50 rounded-xl border-2 border-red-200">
                  <h4 className="font-bold text-red-900 text-lg mb-3 flex items-center gap-2">
                    <span>⚠️</span> Common Mistakes
                  </h4>
                  <p className="text-sm text-red-800 whitespace-pre-wrap leading-relaxed">{selectedEvaluationDetails.commonMistakes}</p>
                </div>
              )}

              {/* Fixing Etiquette */}
              {selectedEvaluationDetails.fixingEtiquette && (
                <div className="p-5 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 text-lg mb-3 flex items-center gap-2">
                    <span>✅</span> Fixing Etiquette
                  </h4>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">{selectedEvaluationDetails.fixingEtiquette}</p>
                </div>
              )}

              {/* Admin Feedback */}
              {selectedEvaluationDetails.adminFeedback && (
                <div className="p-5 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                  <h4 className="font-bold text-yellow-900 text-lg mb-3 flex items-center gap-2">
                    <span>💬</span> Admin Feedback
                  </h4>
                  <p className="text-sm text-yellow-800 whitespace-pre-wrap leading-relaxed">{selectedEvaluationDetails.adminFeedback}</p>
                  {selectedEvaluationDetails.reviewedByName && (
                    <p className="text-xs text-yellow-700 mt-3 font-medium">
                      - {selectedEvaluationDetails.reviewedByName} ({formatDate(selectedEvaluationDetails.reviewedAt)})
                    </p>
                  )}
                </div>
              )}

              {/* Game Plan */}
              {selectedEvaluationDetails.gamePlan && (
                <div className="p-5 bg-green-50 rounded-xl border-2 border-green-200">
                  <h4 className="font-bold text-green-900 text-lg mb-3 flex items-center gap-2">
                    <span>🎯</span> Game Plan
                  </h4>
                  <p className="text-sm text-green-800 whitespace-pre-wrap leading-relaxed">{selectedEvaluationDetails.gamePlan}</p>
                </div>
              )}

              {/* Shared Links */}
              {selectedEvaluationDetails.sharedLinks && selectedEvaluationDetails.sharedLinks.length > 0 && (
                <div className="p-5 bg-purple-50 rounded-xl border-2 border-purple-200">
                  <h4 className="font-bold text-purple-900 text-lg mb-3 flex items-center gap-2">
                    <span>🔗</span> Shared Links
                  </h4>
                  <div className="space-y-2">
                    {selectedEvaluationDetails.sharedLinks.map((link: string, idx: number) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 hover:bg-purple-100 transition-all"
                      >
                        <p className="text-sm text-purple-700 font-medium break-all">{link}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedEvaluationDetails(null);
                    setSelectedEvaluation(selectedEvaluationDetails.id || selectedEvaluationDetails._id);
                  }}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md"
                >
                  {selectedEvaluationDetails.adminFeedback ? 'Update Feedback' : 'Provide Feedback'}
                </button>
                {selectedEvaluationDetails.status === 'under_review' && (
                  <button
                    onClick={async () => {
                      if (confirm('Approve this evaluation?')) {
                        try {
                          const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
                          const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
                          const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
                          const response = await fetch(`${apiUrl}/weekly-evaluations/${selectedEvaluationDetails.id || selectedEvaluationDetails._id}/approve`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              adminFeedback: selectedEvaluationDetails.adminFeedback || '',
                              gamePlan: selectedEvaluationDetails.gamePlan || '',
                              sharedLinks: selectedEvaluationDetails.sharedLinks || []
                            })
                          });
                          if (response.ok) {
                            alert('Evaluation approved! The teacher has been notified.');
                            setSelectedEvaluationDetails(null);
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
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md"
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => setSelectedEvaluationDetails(null)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Form Modal */}
      {selectedEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/90 px-6 py-5 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-bold text-white">Provide Feedback</h3>
              <button
                onClick={() => {
                  setSelectedEvaluation(null);
                  setFeedback('');
                  setGamePlan('');
                  setLinks(['']);
                }}
                className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
              >
                ×
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
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Game Plan</label>
                <textarea
                  value={gamePlan}
                  onChange={(e) => setGamePlan(e.target.value)}
                  placeholder="Enter game plan..."
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
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
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
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
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
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


