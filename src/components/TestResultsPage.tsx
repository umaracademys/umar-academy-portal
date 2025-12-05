import React, { useState, useEffect, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { ProgramType } from '../types';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import { getQuranChapters } from '@umar-academy/mushaf';
import AiSuggestionsInput from './AiSuggestionsInput';

interface TestQuestion {
  id?: string;
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
  program?: ProgramType;
  title: string;
  questions: TestQuestion[];
  feedback: string;
  createdAt: string;
  createdBy: string;
  postedToStudent?: boolean;
  postedAt?: string;
}

interface TestResultsPageProps {
  onClose: () => void;
}

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

const TestResultsPage: React.FC<TestResultsPageProps> = ({ onClose }) => {
  const { students } = useBackendData();
  const { user } = useAuth();
  
  const [selectedProgram, setSelectedProgram] = useState<ProgramType | 'all'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTest, setEditingTest] = useState<TestResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
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

  // Get unique programs
  const programs = useMemo(() => {
    const programSet = new Set<ProgramType>();
    students.forEach(student => {
      if (student.program) {
        programSet.add(student.program);
      }
    });
    return Array.from(programSet);
  }, [students]);

  // Filter students by program
  const filteredStudents = useMemo(() => {
    if (selectedProgram === 'all') return students;
    return students.filter(s => s.program === selectedProgram);
  }, [students, selectedProgram]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const selectedTest = useMemo(() => {
    if (!selectedTestId) return null;
    return testResults.find(t => t.id === selectedTestId || t._id === selectedTestId) || null;
  }, [testResults, selectedTestId]);

  // Load test results for selected student
  useEffect(() => {
    if (!selectedStudentId) {
      setTestResults([]);
      return;
    }

    const loadTestResults = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('umar_academy_token');
        const response = await fetch(`${API_BASE}/tests/student/${selectedStudentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTestResults(Array.isArray(data) ? data : []);
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
  }, [selectedStudentId]);

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

  // Handle edit
  const handleEdit = () => {
    if (selectedTest) {
      setEditingTest({ ...selectedTest });
      setIsEditing(true);
    }
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingTest || !selectedTestId) return;

    try {
      const token = localStorage.getItem('umar_academy_token');
      
      // Prepare the update payload - only send fields that can be updated
      const updatePayload = {
        title: editingTest.title,
        questions: editingTest.questions.map(q => ({
          id: q.id || `q-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          surah: q.surah,
          ayah: q.ayah,
          page: q.page,
          memoryScore: q.memoryScore,
          tajweedScore: q.tajweedScore,
          fluencyScore: q.fluencyScore,
          mistakes: q.mistakes || [],
          notes: q.notes || ''
        })),
        feedback: editingTest.feedback || ''
      };

      const response = await fetch(`${API_BASE}/tests/${selectedTestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        const updated = await response.json();
        setTestResults(testResults.map(t => 
          (t.id === selectedTestId || t._id === selectedTestId) ? updated : t
        ));
        // Update selectedTest if it's the one being edited
        if (selectedTest && (selectedTest.id === selectedTestId || selectedTest._id === selectedTestId)) {
          setSelectedTestId(selectedTestId); // This will trigger a refresh
        }
        setIsEditing(false);
        setEditingTest(null);
        alert('Test updated successfully!');
        // Reload test results to get updated data
        if (selectedStudentId) {
          const reloadResponse = await fetch(`${API_BASE}/tests/student/${selectedStudentId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (reloadResponse.ok) {
            const reloadedTests = await reloadResponse.json();
            setTestResults(reloadedTests);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update test' }));
        throw new Error(errorData.error || 'Failed to update test');
      }
    } catch (error: any) {
      console.error('Error updating test:', error);
      alert(`Failed to update test: ${error.message || 'Please try again.'}`);
    }
  };

  // Handle post to student portal
  const handlePostToStudent = async () => {
    if (!selectedTestId) return;

    if (!window.confirm('Are you sure you want to post this test result to the student portal? The student will be able to see it.')) {
      return;
    }

    try {
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/tests/${selectedTestId}/post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updated = await response.json();
        setTestResults(testResults.map(t => 
          (t.id === selectedTestId || t._id === selectedTestId) ? updated : t
        ));
        alert('Test posted to student portal successfully!');
      } else {
        throw new Error('Failed to post test');
      }
    } catch (error) {
      console.error('Error posting test:', error);
      alert('Failed to post test. Please try again.');
    }
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!selectedTest) return;

    try {
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/tests/${selectedTestId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Test-${selectedTest.studentName}-${selectedTest.title.replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
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
                    Test Results
                  </h2>
                  <p className="text-white/90 text-[10px] sm:text-xs mt-0.5 font-medium">
                    View, edit, and manage student test results
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
          {/* Step 1: Program and Student Selection */}
          {!selectedStudentId ? (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md">
                <h3 className="text-sm font-extrabold text-primary mb-2">Select Program</h3>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value as ProgramType | 'all')}
                  className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-white text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition text-xs font-medium"
                >
                  <option value="all">All Programs</option>
                  {programs.map(program => (
                    <option key={program} value={program}>{program}</option>
                  ))}
                </select>
              </div>

              <div className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md">
                <h3 className="text-sm font-extrabold text-primary mb-2">Select Student</h3>
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-primary/70">No students found</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {filteredStudents.map(student => (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id)}
                        className="p-2 bg-gradient-to-br from-white to-soft-primary rounded-lg border-2 border-primary/20 hover:border-primary transition-all text-left"
                      >
                        <p className="text-xs font-extrabold text-primary truncate">{student.fullName}</p>
                        <p className="text-[10px] text-primary/70">{student.program}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : !selectedTestId ? (
            /* Step 2: Test Results List */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-primary">
                    Test Results for {selectedStudent?.fullName}
                  </h3>
                  <p className="text-xs text-primary/70">
                    {testResults.length} test{testResults.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudentId(null);
                    setTestResults([]);
                  }}
                  className="px-3 py-1.5 border-2 border-primary/30 text-primary rounded-lg text-xs font-bold hover:bg-soft-primary transition-all"
                >
                  Back
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-xs text-primary/70">Loading test results...</p>
                </div>
              ) : testResults.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-primary/20 p-6 text-center">
                  <p className="text-sm text-primary/70">No test results found for this student</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {testResults.map((test) => {
                    const averages = calculateAverages(test.questions);
                    return (
                      <div
                        key={test.id || test._id}
                        onClick={() => setSelectedTestId(test.id || test._id)}
                        className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md hover:border-primary transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-extrabold text-primary mb-1">{test.title}</h4>
                            <p className="text-xs text-primary/70">
                              {new Date(test.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {test.postedToStudent && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-lg text-[10px] font-bold">
                              Posted
                            </span>
                          )}
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
                            M: {averages.memory.toFixed(1)}
                          </span>
                          <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                            T: {averages.tajweed.toFixed(1)}
                          </span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                            F: {averages.fluency.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : selectedTest ? (
            /* Step 3: Test Detail View */
            <div className="space-y-3">
              {/* Header Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-primary">{selectedTest.title}</h3>
                  <p className="text-xs text-primary/70">
                    {new Date(selectedTest.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedTestId(null);
                      setIsEditing(false);
                      setEditingTest(null);
                    }}
                    className="px-3 py-1.5 border-2 border-primary/30 text-primary rounded-lg text-xs font-bold hover:bg-soft-primary transition-all"
                  >
                    Back
                  </button>
                  {!selectedTest.postedToStudent && (
                    <button
                      onClick={handleEdit}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all"
                    >
                      Edit
                    </button>
                  )}
                  {!selectedTest.postedToStudent && (
                    <button
                      onClick={handlePostToStudent}
                      className="px-3 py-1.5 bg-accent text-primary rounded-lg text-xs font-bold hover:bg-accent/90 transition-all"
                    >
                      Post to Portal
                    </button>
                  )}
                  <button
                    onClick={handleDownloadPDF}
                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all"
                  >
                    Download PDF
                  </button>
                </div>
              </div>

              {/* Test Summary */}
              {!isEditing ? (
                <div className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md">
                  <h4 className="text-sm font-extrabold text-primary mb-2">Test Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-[10px] text-blue-800 mb-0.5">Memory Avg</p>
                      <p className="text-base font-extrabold text-blue-900">
                        {calculateAverages(selectedTest.questions).memory.toFixed(1)}
                      </p>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                      <p className="text-[10px] text-green-800 mb-0.5">Tajweed Avg</p>
                      <p className="text-base font-extrabold text-green-900">
                        {calculateAverages(selectedTest.questions).tajweed.toFixed(1)}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <p className="text-[10px] text-purple-800 mb-0.5">Fluency Avg</p>
                      <p className="text-base font-extrabold text-purple-900">
                        {calculateAverages(selectedTest.questions).fluency.toFixed(1)}
                      </p>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg">
                      <p className="text-[10px] text-red-800 mb-0.5">Total Mistakes</p>
                      <p className="text-base font-extrabold text-red-900">
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
                  <div className="space-y-2">
                    <h4 className="text-sm font-extrabold text-primary mb-2">Questions ({selectedTest.questions.length})</h4>
                    {selectedTest.questions.map((question, index) => {
                      const hasAllScores = question.memoryScore && question.tajweedScore && question.fluencyScore;
                      const averageScore = hasAllScores 
                        ? ((question.memoryScore || 0) + (question.tajweedScore || 0) + (question.fluencyScore || 0)) / 3 
                        : null;
                      
                      return (
                        <div
                          key={index}
                          className="p-2 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
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
                            {averageScore !== null && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                                Avg: {averageScore.toFixed(1)}
                              </span>
                            )}
                          </div>
                          
                          {/* Scores Grid */}
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div className={`text-center p-1.5 rounded ${question.memoryScore ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                              <p className="text-[9px] text-gray-600 mb-0.5 font-bold">Memory</p>
                              <p className={`text-sm font-extrabold ${question.memoryScore ? 'text-blue-900' : 'text-gray-400'}`}>
                                {question.memoryScore || '-'}/10
                              </p>
                            </div>
                            <div className={`text-center p-1.5 rounded ${question.tajweedScore ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                              <p className="text-[9px] text-gray-600 mb-0.5 font-bold">Tajweed</p>
                              <p className={`text-sm font-extrabold ${question.tajweedScore ? 'text-green-900' : 'text-gray-400'}`}>
                                {question.tajweedScore || '-'}/10
                              </p>
                            </div>
                            <div className={`text-center p-1.5 rounded ${question.fluencyScore ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-200'}`}>
                              <p className="text-[9px] text-gray-600 mb-0.5 font-bold">Fluency</p>
                              <p className={`text-sm font-extrabold ${question.fluencyScore ? 'text-purple-900' : 'text-gray-400'}`}>
                                {question.fluencyScore || '-'}/10
                              </p>
                            </div>
                          </div>
                          
                          {/* Mistakes and Notes */}
                          <div className="flex items-center gap-2">
                            {question.mistakes.length > 0 && (
                              <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">
                                {question.mistakes.length} mistake{question.mistakes.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {question.notes && (
                            <p className="text-xs text-primary/70 mt-2 pt-2 border-t border-gray-200">{question.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Feedback */}
                  {selectedTest.feedback && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-bold text-blue-800 mb-1">Overall Feedback</p>
                      <p className="text-xs text-blue-900">{selectedTest.feedback}</p>
                    </div>
                  )}
                </div>
              ) : editingTest ? (
                <div className="bg-white rounded-xl border-2 border-primary/20 p-3 shadow-md">
                  <h4 className="text-sm font-extrabold text-primary mb-3">Edit Test</h4>
                  
                  {/* Test Title */}
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-primary mb-1">Test Title</label>
                    <input
                      type="text"
                      value={editingTest.title}
                      onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Questions Edit */}
                  <div className="space-y-3 mb-3">
                    <h5 className="text-xs font-bold text-primary">Questions</h5>
                    {editingTest.questions.map((question, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
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
                        
                        {/* Scores Input */}
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div>
                            <label className="block text-[9px] font-bold text-blue-800 mb-0.5">Memory</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={question.memoryScore || ''}
                              onChange={(e) => {
                                const updatedQuestions = [...editingTest.questions];
                                updatedQuestions[index] = {
                                  ...question,
                                  memoryScore: e.target.value ? parseInt(e.target.value) : undefined
                                };
                                setEditingTest({ ...editingTest, questions: updatedQuestions });
                              }}
                              className="w-full px-2 py-1 border border-blue-300 rounded text-xs focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                              placeholder="1-10"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-green-800 mb-0.5">Tajweed</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={question.tajweedScore || ''}
                              onChange={(e) => {
                                const updatedQuestions = [...editingTest.questions];
                                updatedQuestions[index] = {
                                  ...question,
                                  tajweedScore: e.target.value ? parseInt(e.target.value) : undefined
                                };
                                setEditingTest({ ...editingTest, questions: updatedQuestions });
                              }}
                              className="w-full px-2 py-1 border border-green-300 rounded text-xs focus:ring-2 focus:ring-green-200 focus:border-green-500"
                              placeholder="1-10"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-purple-800 mb-0.5">Fluency</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={question.fluencyScore || ''}
                              onChange={(e) => {
                                const updatedQuestions = [...editingTest.questions];
                                updatedQuestions[index] = {
                                  ...question,
                                  fluencyScore: e.target.value ? parseInt(e.target.value) : undefined
                                };
                                setEditingTest({ ...editingTest, questions: updatedQuestions });
                              }}
                              className="w-full px-2 py-1 border border-purple-300 rounded text-xs focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                              placeholder="1-10"
                            />
                          </div>
                        </div>
                        
                        {/* Notes Input */}
                        <div>
                          <label className="block text-[9px] font-bold text-primary mb-0.5">Notes</label>
                          <AiSuggestionsInput
                            value={question.notes || ''}
                            onChange={(value) => {
                              const updatedQuestions = [...editingTest.questions];
                              updatedQuestions[index] = {
                                ...question,
                                notes: value
                              };
                              setEditingTest({ ...editingTest, questions: updatedQuestions });
                            }}
                            category="tajweed"
                            rows={2}
                            multiline={true}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="Add notes for this question..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Overall Feedback */}
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-primary mb-1">Overall Feedback</label>
                    <AiSuggestionsInput
                      value={editingTest.feedback || ''}
                      onChange={(value) => setEditingTest({ ...editingTest, feedback: value })}
                      category="evaluation"
                      rows={4}
                      multiline={true}
                      className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Add overall feedback for the student..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditingTest(null);
                      }}
                      className="px-3 py-1.5 border-2 border-primary/30 text-primary rounded-lg text-xs font-bold hover:bg-soft-primary transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TestResultsPage;

