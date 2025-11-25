import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import { getQuranChapters } from '@umar-academy/mushaf';

interface TestQuestion {
  surah: number;
  ayah: number;
  page: number;
  memoryScore?: number;
  tajweedScore?: number;
  fluencyScore?: number;
  mistakes: MushafMistake[];
  notes?: string;
}

interface TestResult {
  _id: string;
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  questions: TestQuestion[];
  feedback: string;
  createdAt: string;
  postedAt?: string;
  postedToStudent?: boolean;
}

interface StudentTestResultsProps {
  onClose: () => void;
}

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

const StudentTestResults: React.FC<StudentTestResultsProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { students } = useBackendData();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);

  // Load surah names
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const loadedChapters = await getQuranChapters();
        setChapters(loadedChapters);
      } catch (error) {
        console.error('Error loading chapters:', error);
      }
    };
    loadChapters();
  }, []);

  const getSurahArabicName = (surahNumber: number): string => {
    const chapter = chapters.find((c: any) => c.id === surahNumber);
    return chapter?.name_arabic || '';
  };

  const currentStudent = useMemo(() => {
    return students.find(s => s.email === user?.email) || students[0];
  }, [students, user?.email]);

  // Load test results for current student
  useEffect(() => {
    if (!currentStudent?.id) {
      setTestResults([]);
      return;
    }

    const loadTestResults = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('umar_academy_token');
        const response = await fetch(`${API_BASE}/tests/student/${currentStudent.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Only show tests that have been posted to student portal
          const postedTests = Array.isArray(data) 
            ? data.filter((test: TestResult) => test.postedToStudent === true)
            : [];
          setTestResults(postedTests);
        } else {
          console.error('Failed to load test results');
          setTestResults([]);
        }
      } catch (error) {
        console.error('Error loading test results:', error);
        setTestResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTestResults();
  }, [currentStudent?.id]);

  const selectedTest = useMemo(() => {
    if (!selectedTestId) return null;
    return testResults.find(t => t.id === selectedTestId || t._id === selectedTestId) || null;
  }, [testResults, selectedTestId]);

  const selectedQuestion = useMemo(() => {
    if (!selectedTest || selectedQuestionIndex === null) return null;
    return selectedTest.questions[selectedQuestionIndex] || null;
  }, [selectedTest, selectedQuestionIndex]);

  // Calculate average scores
  const calculateAverages = (questions: TestQuestion[]) => {
    const memoryScores = questions.map(q => q.memoryScore).filter(s => s !== undefined) as number[];
    const tajweedScores = questions.map(q => q.tajweedScore).filter(s => s !== undefined) as number[];
    const fluencyScores = questions.map(q => q.fluencyScore).filter(s => s !== undefined) as number[];

    return {
      memory: memoryScores.length > 0 ? memoryScores.reduce((a, b) => a + b, 0) / memoryScores.length : 0,
      tajweed: tajweedScores.length > 0 ? tajweedScores.reduce((a, b) => a + b, 0) / tajweedScores.length : 0,
      fluency: fluencyScores.length > 0 ? fluencyScores.reduce((a, b) => a + b, 0) / fluencyScores.length : 0,
      totalMistakes: questions.reduce((sum, q) => sum + q.mistakes.length, 0)
    };
  };

  // Get mistakes for selected question
  const getMistakesForQuestion = (question: TestQuestion) => {
    return question.mistakes || [];
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-primary/30">
        {/* Header */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-sm font-bold text-white">📊</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white drop-shadow-lg">
                    My Test Results
                  </h2>
                  <p className="text-white/90 text-[10px] sm:text-xs mt-0.5 font-medium">
                    View your test results and feedback
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all hover:scale-110 text-base sm:text-lg font-bold shadow-lg border-2 border-white/30"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gradient-to-b from-gray-50 to-white">
          {!selectedTestId ? (
            /* Test Results List */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-primary">
                  Test Results
                </h3>
                <p className="text-xs text-primary/70">
                  {testResults.length} test{testResults.length !== 1 ? 's' : ''} available
                </p>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-xs text-primary/70">Loading test results...</p>
                </div>
              ) : testResults.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-primary/20 p-6 text-center">
                  <p className="text-sm text-primary/70">No test results available yet</p>
                  <p className="text-xs text-primary/60 mt-1">Your teacher will post test results here when available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {testResults.map((test) => {
                    const averages = calculateAverages(test.questions);
                    return (
                      <div
                        key={test.id || test._id}
                        onClick={() => {
                          setSelectedTestId(test.id || test._id);
                          if (test.questions.length > 0) {
                            setSelectedQuestionIndex(0);
                            setCurrentPage(test.questions[0].page);
                          }
                        }}
                        className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md hover:border-primary transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-extrabold text-primary mb-1">{test.title}</h4>
                            <p className="text-xs text-primary/70">
                              {new Date(test.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-primary/70">
                            {test.questions.length} question{test.questions.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-red-600 font-bold">
                            {averages.totalMistakes} mistake{averages.totalMistakes !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            Memory: {averages.memory.toFixed(1)}
                          </span>
                          <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                            Tajweed: {averages.tajweed.toFixed(1)}
                          </span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                            Fluency: {averages.fluency.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : selectedTest ? (
            /* Test Detail View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Left: Test Summary and Questions */}
              <div className="lg:col-span-1 space-y-3">
                <div className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-extrabold text-primary">{selectedTest.title}</h3>
                    <button
                      onClick={() => {
                        setSelectedTestId(null);
                        setSelectedQuestionIndex(null);
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-bold"
                    >
                      ← Back
                    </button>
                  </div>
                  <p className="text-xs text-primary/70 mb-3">
                    {new Date(selectedTest.createdAt).toLocaleDateString()}
                  </p>

                  {/* Summary */}
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <h4 className="text-xs font-bold text-primary mb-2">Overall Scores</h4>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      <div className="text-center">
                        <p className="text-[10px] text-blue-800 mb-0.5">Memory</p>
                        <p className="text-base font-extrabold text-blue-900">
                          {calculateAverages(selectedTest.questions).memory.toFixed(1)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-green-800 mb-0.5">Tajweed</p>
                        <p className="text-base font-extrabold text-green-900">
                          {calculateAverages(selectedTest.questions).tajweed.toFixed(1)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-purple-800 mb-0.5">Fluency</p>
                        <p className="text-base font-extrabold text-purple-900">
                          {calculateAverages(selectedTest.questions).fluency.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <div className="text-center pt-2 border-t border-gray-200">
                      <p className="text-[10px] text-red-800 mb-0.5">Total Mistakes</p>
                      <p className="text-lg font-extrabold text-red-900">
                        {calculateAverages(selectedTest.questions).totalMistakes}
                      </p>
                    </div>
                  </div>

                  {/* Grading Summary Table */}
                  {selectedTest.questions.length > 1 && (
                    <div className="mb-3 p-2 bg-white rounded-lg border border-gray-200">
                      <h4 className="text-xs font-bold text-primary mb-2">All Questions Grading</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b border-gray-300">
                              <th className="text-left py-1 px-1 font-bold text-primary">Q#</th>
                              <th className="text-center py-1 px-1 font-bold text-blue-800">Memory</th>
                              <th className="text-center py-1 px-1 font-bold text-green-800">Tajweed</th>
                              <th className="text-center py-1 px-1 font-bold text-purple-800">Fluency</th>
                              <th className="text-center py-1 px-1 font-bold text-primary">Avg</th>
                              <th className="text-center py-1 px-1 font-bold text-red-800">Mistakes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTest.questions.map((question, index) => {
                              const hasAllScores = question.memoryScore && question.tajweedScore && question.fluencyScore;
                              const averageScore = hasAllScores 
                                ? ((question.memoryScore || 0) + (question.tajweedScore || 0) + (question.fluencyScore || 0)) / 3 
                                : null;
                              
                              return (
                                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                  <td className="py-1 px-1 font-bold text-primary">{index + 1}</td>
                                  <td className={`py-1 px-1 text-center font-bold ${question.memoryScore ? 'text-blue-900' : 'text-gray-400'}`}>
                                    {question.memoryScore || '-'}
                                  </td>
                                  <td className={`py-1 px-1 text-center font-bold ${question.tajweedScore ? 'text-green-900' : 'text-gray-400'}`}>
                                    {question.tajweedScore || '-'}
                                  </td>
                                  <td className={`py-1 px-1 text-center font-bold ${question.fluencyScore ? 'text-purple-900' : 'text-gray-400'}`}>
                                    {question.fluencyScore || '-'}
                                  </td>
                                  <td className={`py-1 px-1 text-center font-bold ${averageScore !== null ? 'text-primary' : 'text-gray-400'}`}>
                                    {averageScore !== null ? averageScore.toFixed(1) : '-'}
                                  </td>
                                  <td className="py-1 px-1 text-center font-bold text-red-900">
                                    {question.mistakes.length}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Questions List */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    <h4 className="text-xs font-bold text-primary mb-1">Questions ({selectedTest.questions.length})</h4>
                    {selectedTest.questions.map((question, index) => {
                      const hasAllScores = question.memoryScore && question.tajweedScore && question.fluencyScore;
                      const averageScore = hasAllScores 
                        ? ((question.memoryScore || 0) + (question.tajweedScore || 0) + (question.fluencyScore || 0)) / 3 
                        : null;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            setSelectedQuestionIndex(index);
                            setCurrentPage(question.page);
                          }}
                          className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                            selectedQuestionIndex === index
                              ? 'border-primary bg-soft-primary'
                              : 'border-primary/20 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-primary">
                              Q{index + 1}:
                            </span>
                            <span 
                              className="text-sm font-semibold text-gray-900"
                              style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif' }}
                              dir="rtl"
                            >
                              {getSurahArabicName(question.surah) || `Surah ${question.surah}`}
                            </span>
                            <span className="text-xs text-gray-600">
                              ({question.surah}:{question.ayah})
                            </span>
                          </div>
                          
                          {/* Scores Grid */}
                          <div className="grid grid-cols-3 gap-1 mb-1">
                            <div className={`text-center p-1 rounded ${question.memoryScore ? 'bg-blue-50' : 'bg-gray-50'}`}>
                              <p className="text-[8px] text-gray-600 mb-0.5">Memory</p>
                              <p className={`text-xs font-extrabold ${question.memoryScore ? 'text-blue-900' : 'text-gray-400'}`}>
                                {question.memoryScore || '-'}/10
                              </p>
                            </div>
                            <div className={`text-center p-1 rounded ${question.tajweedScore ? 'bg-green-50' : 'bg-gray-50'}`}>
                              <p className="text-[8px] text-gray-600 mb-0.5">Tajweed</p>
                              <p className={`text-xs font-extrabold ${question.tajweedScore ? 'text-green-900' : 'text-gray-400'}`}>
                                {question.tajweedScore || '-'}/10
                              </p>
                            </div>
                            <div className={`text-center p-1 rounded ${question.fluencyScore ? 'bg-purple-50' : 'bg-gray-50'}`}>
                              <p className="text-[8px] text-gray-600 mb-0.5">Fluency</p>
                              <p className={`text-xs font-extrabold ${question.fluencyScore ? 'text-purple-900' : 'text-gray-400'}`}>
                                {question.fluencyScore || '-'}/10
                              </p>
                            </div>
                          </div>
                          
                          {/* Average and Mistakes */}
                          <div className="flex items-center gap-1 mt-1">
                            {averageScore !== null && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                Avg: {averageScore.toFixed(1)}
                              </span>
                            )}
                            {question.mistakes.length > 0 && (
                              <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold">
                                {question.mistakes.length} mistake{question.mistakes.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback */}
                  {selectedTest.feedback && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-bold text-blue-800 mb-1">Teacher Feedback</p>
                      <p className="text-xs text-blue-900">{selectedTest.feedback}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Mushaf View */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-primary">
                      {selectedQuestion ? (
                        <div className="flex items-center gap-2">
                          <span>Question {(selectedQuestionIndex || 0) + 1}:</span>
                          <span 
                            className="font-semibold"
                            style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif' }}
                            dir="rtl"
                          >
                            {getSurahArabicName(selectedQuestion.surah) || `Surah ${selectedQuestion.surah}`}
                          </span>
                          <span className="text-xs text-gray-600">
                            ({selectedQuestion.surah}:{selectedQuestion.ayah})
                          </span>
                        </div>
                      ) : (
                        'Select a question to view mistakes'
                      )}
                    </h3>
                  </div>
                  
                  {selectedQuestion && (
                    <>
                      {/* Question Scores */}
                      <div className="mb-2 p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {selectedQuestion.memoryScore && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                              Memory: {selectedQuestion.memoryScore}/10
                            </span>
                          )}
                          {selectedQuestion.tajweedScore && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
                              Tajweed: {selectedQuestion.tajweedScore}/10
                            </span>
                          )}
                          {selectedQuestion.fluencyScore && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-bold">
                              Fluency: {selectedQuestion.fluencyScore}/10
                            </span>
                          )}
                        </div>
                        {selectedQuestion.notes && (
                          <p className="text-xs text-primary/70 mt-2">{selectedQuestion.notes}</p>
                        )}
                      </div>

                      {/* Mushaf */}
                      <div className="flex justify-center">
                        <InteractiveMushaf
                          currentPage={currentPage}
                          onPageChange={setCurrentPage}
                          mistakes={getMistakesForQuestion(selectedQuestion)}
                          readOnly={true}
                          mode="viewing"
                          studentName={currentStudent?.fullName}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default StudentTestResults;

