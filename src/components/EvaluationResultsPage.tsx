import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { EvaluationResult } from '../types';

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

interface EvaluationResultsPageProps {
  onClose: () => void;
}

const EvaluationResultsPage: React.FC<EvaluationResultsPageProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { teachers } = useBackendData();
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<EvaluationResult | null>(null);
  const [filters, setFilters] = useState({
    evaluationId: '',
    teacherId: '',
    status: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadResults();
  }, [filters]);

  const loadResults = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('umar_academy_token');
      
      const queryParams = new URLSearchParams();
      if (filters.evaluationId) queryParams.append('evaluationId', filters.evaluationId);
      if (filters.teacherId) queryParams.append('teacherId', filters.teacherId);
      if (filters.status) queryParams.append('status', filters.status);

      const response = await fetch(`${API_BASE}/evaluation-results?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading results:', error);
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

  const filteredResults = results.filter(result => {
    const matchesSearch = result.evaluation?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.assignment.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.assignment.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-primary/30">
        {/* Enhanced Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Evaluation Results
              </h2>
              <p className="text-white/80 text-xs mt-1">View and analyze teacher evaluation results</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-primary mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Results
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary placeholder:text-primary/40 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
                placeholder="Search by evaluation, teacher, or ID..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-primary mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
              >
                <option value="">All Statuses</option>
                <option value="completed">✅ Completed</option>
                <option value="in_progress">🔄 In Progress</option>
                <option value="assigned">📋 Assigned</option>
                <option value="overdue">⚠️ Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-primary mb-2">Teacher</label>
              <select
                value={filters.teacherId}
                onChange={(e) => setFilters({ ...filters, teacherId: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
              >
                <option value="">All Teachers</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                ))}
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
                <p className="text-primary font-bold">Loading results...</p>
              </div>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-lg font-bold text-primary mb-2">No results found</p>
              <p className="text-sm text-primary/60">
                {searchTerm || filters.status || filters.teacherId
                  ? 'Try adjusting your filters'
                  : 'No evaluation results available yet'}
              </p>
            </div>
          ) : selectedResult ? (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-5 py-2.5 border-2 border-primary/30 text-primary rounded-xl text-sm font-bold hover:bg-soft-primary transition-all flex items-center gap-2 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Results
              </button>
              
              <div className="bg-white rounded-xl border-2 border-primary/10 p-6 shadow-lg">
                <div className="mb-6">
                  <h3 className="text-xl font-extrabold text-primary mb-2 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    {selectedResult.evaluation?.title || 'Evaluation Details'}
                  </h3>
                  {selectedResult.evaluation?.description && (
                    <p className="text-sm text-primary/70">{selectedResult.evaluation.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                    <p className="text-[10px] text-blue-800 mb-1 font-bold uppercase">Teacher</p>
                    <p className="text-base font-extrabold text-blue-900">{selectedResult.assignment.teacherName}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
                    <p className="text-[10px] text-green-800 mb-1 font-bold uppercase">Status</p>
                    <p className={`text-xs font-bold px-3 py-1 rounded-lg inline-block ${getStatusColor(selectedResult.assignment.status)}`}>
                      {getStatusIcon(selectedResult.assignment.status)} {selectedResult.assignment.status.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                    <p className="text-[10px] text-purple-800 mb-1 font-bold uppercase">Progress</p>
                    <p className="text-base font-extrabold text-purple-900">{selectedResult.assignment.progress}%</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                    <p className="text-[10px] text-orange-800 mb-1 font-bold uppercase">Completed</p>
                    <p className="text-base font-extrabold text-orange-900">
                      {selectedResult.answeredQuestions} / {selectedResult.totalQuestions}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-base font-extrabold text-primary flex items-center gap-2">
                    <span>💬</span>
                    Answers ({selectedResult.answers.length})
                  </h4>
                  {selectedResult.answers.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <p className="text-sm text-primary/60">No answers submitted yet</p>
                    </div>
                  ) : (
                    selectedResult.answers.map((answer, index) => {
                      const question = selectedResult.evaluation ? 
                        selectedResult.evaluation.questions?.find((q: any) => q.id === answer.questionId) : null;
                      
                      return (
                        <div key={answer.id} className="p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-primary/10 shadow-md">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white text-sm font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-sm font-extrabold text-primary">
                                  Answer {index + 1}
                                  {question && (
                                    <span className="text-xs text-primary/60 ml-2">
                                      - {question.questionText.substring(0, 50)}...
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            {answer.isCorrect !== undefined && (
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                answer.isCorrect 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {answer.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                              </span>
                            )}
                          </div>
                          
                          {answer.answerText && (
                            <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                              <p className="text-xs font-bold text-primary mb-1">Text Answer</p>
                              <p className="text-sm text-primary">{answer.answerText}</p>
                            </div>
                          )}
                          
                          {answer.selectedOption && (
                            <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                              <p className="text-xs font-bold text-primary mb-1">Selected Option</p>
                              <p className="text-sm font-medium text-primary">{answer.selectedOption}</p>
                            </div>
                          )}
                          
                          {answer.mediaUrl && (
                            <div className="mb-3">
                              <p className="text-xs font-bold text-primary mb-2">Media Upload</p>
                              <a
                                href={answer.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Media
                              </a>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                            <p className="text-xs text-primary/60">
                              <span className="font-bold">Answered:</span> {new Date(answer.answeredAt).toLocaleString()}
                            </p>
                            {answer.autoSaved && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">
                                💾 Auto-saved
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResults.map((result) => (
                <div
                  key={result.assignment.id}
                  className="bg-white rounded-xl border-2 border-primary/10 p-6 shadow-md hover:shadow-xl transition-all hover:border-primary/30 cursor-pointer group"
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-base font-extrabold text-primary mb-2 group-hover:text-primary transition-colors flex items-center gap-2">
                        <span className="text-xl">📝</span>
                        {result.evaluation?.title || 'Evaluation'}
                      </h3>
                      <p className="text-sm text-primary/70 mb-3">Teacher: {result.assignment.teacherName}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1.5 rounded-lg border-2 font-bold text-xs flex items-center gap-1.5 ${getStatusColor(result.assignment.status)}`}>
                          {getStatusIcon(result.assignment.status)}
                          {result.assignment.status.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                          <div className="w-20 bg-primary/20 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${result.assignment.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-primary">{result.assignment.progress}%</span>
                        </div>
                        <span className="text-xs text-primary/60 font-medium">
                          {result.answeredQuestions} / {result.totalQuestions} Questions
                        </span>
                      </div>
                    </div>
                    {result.assignment.completedAt && (
                      <div className="text-right">
                        <p className="text-xs text-primary/60 font-bold">Completed</p>
                        <p className="text-xs text-primary font-medium">
                          {new Date(result.assignment.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <button className="w-full px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                      View Details
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationResultsPage;
