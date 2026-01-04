import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from './Card';

interface TeacherWeeklyEvaluationReviewProps {
  teacherId: string;
  onClose: () => void;
  initialEvaluationId?: string; // For opening a specific evaluation from notification
}

const TeacherWeeklyEvaluationReview: React.FC<TeacherWeeklyEvaluationReviewProps> = ({
  teacherId,
  onClose,
  initialEvaluationId
}) => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadEvaluations();
  }, [teacherId, filterStatus]);

  // Auto-select evaluation if initialEvaluationId is provided
  useEffect(() => {
    if (initialEvaluationId && evaluations.length > 0) {
      const evaluation = evaluations.find(e => e.id === initialEvaluationId);
      if (evaluation) {
        setSelectedEvaluation(evaluation);
      }
    }
  }, [initialEvaluationId, evaluations]);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      const url = filterStatus === 'all' 
        ? `${API_BASE}/teachers/${teacherId}/weekly-evaluations`
        : `${API_BASE}/teachers/${teacherId}/weekly-evaluations?status=${filterStatus}`;
      
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

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
            <h2 className="text-2xl font-bold text-white">My Weekly Evaluations</h2>
            <p className="text-white/90 text-sm mt-1">Review and track your weekly evaluations</p>
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
                  ? "You haven't created any weekly evaluations yet."
                  : `No evaluations with status "${filterStatus}" found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluations.map((evaluation) => (
                <div
                  key={evaluation.id || evaluation._id}
                  className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedEvaluation(evaluation)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        Week of {formatDate(evaluation.weekStartDate)} - {formatDate(evaluation.weekEndDate)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Student: <span className="font-semibold">{evaluation.studentName || 'N/A'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(evaluation.status || 'draft')}
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
                  </div>

                  {/* Admin Feedback Preview */}
                  {evaluation.adminFeedback && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs font-bold text-yellow-900 mb-1">Admin Feedback</p>
                      <p className="text-sm text-yellow-800 line-clamp-2">{evaluation.adminFeedback}</p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {evaluation.submittedAt && (
                        <span>Submitted: {formatDate(evaluation.submittedAt)}</span>
                      )}
                      {evaluation.reviewedAt && (
                        <span className="ml-4">Reviewed: {formatDate(evaluation.reviewedAt)}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-primary hover:text-primary/80">
                      View full details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/90 px-6 py-5 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-white">Evaluation Details</h3>
                <p className="text-white/90 text-sm mt-1">
                  {selectedEvaluation.studentName} - Week of {formatDate(selectedEvaluation.weekStartDate)} - {formatDate(selectedEvaluation.weekEndDate)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvaluation(null)}
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
                  <div className="mt-2">{getStatusBadge(selectedEvaluation.status || 'draft')}</div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  {selectedEvaluation.submittedAt && (
                    <p>Submitted: {formatDate(selectedEvaluation.submittedAt)}</p>
                  )}
                  {selectedEvaluation.reviewedAt && (
                    <p className="mt-1">Reviewed: {formatDate(selectedEvaluation.reviewedAt)}</p>
                  )}
                </div>
              </div>

              {/* Level and Surah */}
              <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Level:</span>
                    <p className="text-lg font-bold text-gray-900 mt-2">{selectedEvaluation.level || 'N/A'}</p>
                  </div>
                  {selectedEvaluation.selectedSurah && (
                    <div>
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Surah:</span>
                      <p className="text-lg font-bold text-gray-900 mt-2">{selectedEvaluation.selectedSurah}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Common Mistakes */}
              {selectedEvaluation.commonMistakes && (
                <div className="p-5 bg-red-50 rounded-xl border-2 border-red-200">
                  <h4 className="font-bold text-red-900 text-lg mb-3 flex items-center gap-2">
                    <span>⚠️</span> Common Mistakes
                  </h4>
                  <p className="text-sm text-red-800 whitespace-pre-wrap leading-relaxed">{selectedEvaluation.commonMistakes}</p>
                </div>
              )}

              {/* Fixing Etiquette */}
              {selectedEvaluation.fixingEtiquette && (
                <div className="p-5 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 text-lg mb-3 flex items-center gap-2">
                    <span>✅</span> Fixing Etiquette
                  </h4>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">{selectedEvaluation.fixingEtiquette}</p>
                </div>
              )}

              {/* Admin Feedback */}
              {selectedEvaluation.adminFeedback && (
                <div className="p-5 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                  <h4 className="font-bold text-yellow-900 text-lg mb-3 flex items-center gap-2">
                    <span>💬</span> Admin Feedback
                  </h4>
                  <p className="text-sm text-yellow-800 whitespace-pre-wrap leading-relaxed">{selectedEvaluation.adminFeedback}</p>
                  {selectedEvaluation.reviewedByName && (
                    <p className="text-xs text-yellow-700 mt-3 font-medium">
                      - {selectedEvaluation.reviewedByName} ({formatDate(selectedEvaluation.reviewedAt)})
                    </p>
                  )}
                </div>
              )}

              {/* Game Plan */}
              {selectedEvaluation.gamePlan && (
                <div className="p-5 bg-green-50 rounded-xl border-2 border-green-200">
                  <h4 className="font-bold text-green-900 text-lg mb-3 flex items-center gap-2">
                    <span>🎯</span> Game Plan
                  </h4>
                  <p className="text-sm text-green-800 whitespace-pre-wrap leading-relaxed">{selectedEvaluation.gamePlan}</p>
                </div>
              )}

              {/* Shared Links */}
              {selectedEvaluation.sharedLinks && selectedEvaluation.sharedLinks.length > 0 && (
                <div className="p-5 bg-purple-50 rounded-xl border-2 border-purple-200">
                  <h4 className="font-bold text-purple-900 text-lg mb-3 flex items-center gap-2">
                    <span>🔗</span> Shared Links
                  </h4>
                  <div className="space-y-2">
                    {selectedEvaluation.sharedLinks.map((link: string, idx: number) => (
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

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedEvaluation(null)}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherWeeklyEvaluationReview;

