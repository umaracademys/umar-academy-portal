import React, { useState, useMemo, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { ProgramType } from '../types';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import { getQuranChapters } from '@umar-academy/mushaf';

interface TestQuestion {
  id: string;
  surah: number;
  ayah: number;
  page: number;
  memoryScore?: number;
  tajweedScore?: number;
  fluencyScore?: number;
  mistakes: MushafMistake[];
  notes?: string;
}

interface StudentTestingModuleProps {
  onClose: () => void;
}

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

const StudentTestingModule: React.FC<StudentTestingModuleProps> = ({ onClose }) => {
  const { students } = useBackendData();
  const { user } = useAuth();
  
  const [selectedProgram, setSelectedProgram] = useState<ProgramType | 'all'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<MushafMistake[]>([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testTitle, setTestTitle] = useState('');
  const [manualSurah, setManualSurah] = useState<number>(1);
  const [manualAyah, setManualAyah] = useState<number>(1);
  const [isAddingVerseMode, setIsAddingVerseMode] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);

  // Load surah names
  React.useEffect(() => {
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

  const getSurahName = (surahNumber: number): string => {
    const chapter = chapters.find((c: any) => c.id === surahNumber);
    return chapter?.name_simple || `Surah ${surahNumber}`;
  };

  const getSurahArabicName = (surahNumber: number): string => {
    const chapter = chapters.find((c: any) => c.id === surahNumber);
    return chapter?.name_arabic || '';
  };

  const programs = useMemo(() => {
    const programSet = new Set<ProgramType>();
    students.forEach(student => {
      if (student.program) {
        programSet.add(student.program);
      }
    });
    return Array.from(programSet);
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (selectedProgram === 'all') return students;
    return students.filter(s => s.program === selectedProgram);
  }, [students, selectedProgram]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const selectedQuestion = useMemo(() => {
    if (!selectedQuestionId) return null;
    return questions.find(q => q.id === selectedQuestionId) || null;
  }, [questions, selectedQuestionId]);

  const addVerseAsQuestion = (surah: number, ayah: number, page?: number) => {
    const existingQuestion = questions.find(
      q => q.surah === surah && q.ayah === ayah
    );

    if (existingQuestion) {
      setSelectedQuestionId(existingQuestion.id);
      if (page) setCurrentPage(page);
      return;
    }

    const newQuestion: TestQuestion = {
      id: `question-${Date.now()}-${Math.random()}`,
      surah,
      ayah,
      page: page || currentPage,
      mistakes: []
    };

    setQuestions([...questions, newQuestion]);
    setSelectedQuestionId(newQuestion.id);
    setMistakes([]);
    setIsAddingVerseMode(false);
  };

  const handleManualAddVerse = () => {
    if (manualSurah >= 1 && manualSurah <= 114 && manualAyah >= 1) {
      addVerseAsQuestion(manualSurah, manualAyah);
      setManualSurah(1);
      setManualAyah(1);
    } else {
      alert('Please enter valid Surah (1-114) and Ayah numbers');
    }
  };

  const handleMistakeMark = (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    if (!selectedQuestionId) return;

    const newMistake: MushafMistake = {
      ...mistake,
      id: `mistake-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };

    setMistakes([...mistakes, newMistake]);
    setQuestions(questions.map(q => 
      q.id === selectedQuestionId 
        ? { ...q, mistakes: [...q.mistakes, newMistake] }
        : q
    ));
  };

  const updateQuestionScore = (questionId: string, type: 'memory' | 'tajweed' | 'fluency', score: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          [`${type}Score`]: score
        };
      }
      return q;
    }));
  };

  const updateQuestionNotes = (questionId: string, notes: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, notes } : q
    ));
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    if (selectedQuestionId === questionId) {
      setSelectedQuestionId(null);
      setMistakes([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudentId || questions.length === 0) {
      alert('Please select a student and add at least one question');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('umar_academy_token');
      const testData = {
        studentId: selectedStudentId,
        studentName: selectedStudent?.fullName,
        program: selectedStudent?.program,
        title: testTitle || `Test - ${new Date().toLocaleDateString()}`,
        questions: questions.map(q => ({
          surah: q.surah,
          ayah: q.ayah,
          page: q.page,
          memoryScore: q.memoryScore,
          tajweedScore: q.tajweedScore,
          fluencyScore: q.fluencyScore,
          mistakes: q.mistakes,
          notes: q.notes
        })),
        feedback,
        createdAt: new Date().toISOString(),
        createdBy: user?.id
      };

      const response = await fetch(`${API_BASE}/tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit test');
      }

      alert('Test submitted successfully!');
      setQuestions([]);
      setSelectedQuestionId(null);
      setMistakes([]);
      setFeedback('');
      setTestTitle('');
      onClose();
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestionMistakes = useMemo(() => {
    if (!selectedQuestionId) return [];
    return mistakes.filter(m => {
      const question = questions.find(q => q.id === selectedQuestionId);
      if (!question) return false;
      return m.surah === question.surah && m.ayah === question.ayah;
    });
  }, [mistakes, questions, selectedQuestionId]);

  // Calculate overall averages
  const overallAverages = useMemo(() => {
    const memoryScores = questions.map(q => q.memoryScore).filter(s => s !== undefined) as number[];
    const tajweedScores = questions.map(q => q.tajweedScore).filter(s => s !== undefined) as number[];
    const fluencyScores = questions.map(q => q.fluencyScore).filter(s => s !== undefined) as number[];
    
    return {
      memory: memoryScores.length > 0 ? memoryScores.reduce((a, b) => a + b, 0) / memoryScores.length : 0,
      tajweed: tajweedScores.length > 0 ? tajweedScores.reduce((a, b) => a + b, 0) / tajweedScores.length : 0,
      fluency: fluencyScores.length > 0 ? fluencyScores.reduce((a, b) => a + b, 0) / fluencyScores.length : 0,
      totalMistakes: questions.reduce((sum, q) => sum + q.mistakes.length, 0)
    };
  }, [questions]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col border border-gray-200">
        {/* Modern Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Student Testing</h2>
                <p className="text-sm text-white/90">Assess Memory, Tajweed & Fluency</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-all hover:scale-110 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
          {!selectedStudentId ? (
            /* Step 1: Student Selection */
            <div className="p-6 max-w-4xl mx-auto">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Select Student</h3>
                <p className="text-gray-600">Choose a student to begin testing</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Filter by Program</label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value as ProgramType | 'all')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary transition text-sm font-medium shadow-sm"
                >
                  <option value="all">All Programs</option>
                  {programs.map(program => (
                    <option key={program} value={program}>{program}</option>
                  ))}
                </select>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-600 font-medium">No students found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className="group bg-white rounded-xl shadow-md border-2 border-gray-200 p-5 text-left hover:border-primary hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {student.fullName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-gray-900 truncate group-hover:text-primary transition">
                            {student.fullName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{student.program}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Click to select</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Testing Interface */
            <div className="flex flex-col lg:flex-row h-full">
              {/* Left Sidebar - Questions & Controls */}
              <div className="lg:w-96 border-r border-gray-200 bg-white flex flex-col">
                {/* Student Info Bar */}
                <div className="px-6 py-4 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedStudent?.fullName}</p>
                      <p className="text-xs text-gray-600">{selectedStudent?.program}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudentId(null);
                        setQuestions([]);
                        setSelectedQuestionId(null);
                        setMistakes([]);
                        setFeedback('');
                        setTestTitle('');
                      }}
                      className="text-xs text-gray-600 hover:text-primary font-medium"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Test Title */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Test Title</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="Enter test title..."
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary transition text-sm"
                  />
                </div>

                {/* Overall Stats */}
                {questions.length > 0 && (
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                    <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Overall Performance</h4>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-[10px] text-blue-700 font-semibold mb-1">Memory</p>
                        <p className="text-lg font-bold text-blue-900">{overallAverages.memory.toFixed(1)}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-[10px] text-green-700 font-semibold mb-1">Tajweed</p>
                        <p className="text-lg font-bold text-green-900">{overallAverages.tajweed.toFixed(1)}</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-[10px] text-purple-700 font-semibold mb-1">Fluency</p>
                        <p className="text-lg font-bold text-purple-900">{overallAverages.fluency.toFixed(1)}</p>
                      </div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-[10px] text-red-700 font-semibold mb-0.5">Total Mistakes</p>
                      <p className="text-xl font-bold text-red-900">{overallAverages.totalMistakes}</p>
                    </div>
                  </div>
                )}

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-gray-900">Questions ({questions.length})</h4>
                    <button
                      onClick={() => setIsAddingVerseMode(!isAddingVerseMode)}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition shadow-sm"
                    >
                      + Add Verse
                    </button>
                  </div>

                  {isAddingVerseMode && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                      <p className="text-xs font-semibold text-blue-900 mb-3">Add Verse Manually</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-blue-800 mb-1">Surah</label>
                          <input
                            type="number"
                            min="1"
                            max="114"
                            value={manualSurah}
                            onChange={(e) => setManualSurah(parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-blue-800 mb-1">Ayah</label>
                          <input
                            type="number"
                            min="1"
                            value={manualAyah}
                            onChange={(e) => setManualAyah(parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleManualAddVerse}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                      >
                        Add Question
                      </button>
                    </div>
                  )}

                  {questions.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p className="text-sm text-gray-600 font-medium">No questions added yet</p>
                      <p className="text-xs text-gray-500 mt-1">Click "Add Verse" or navigate Mushaf to add questions</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {questions.map((question, index) => {
                        const hasAllScores = question.memoryScore && question.tajweedScore && question.fluencyScore;
                        const averageScore = hasAllScores 
                          ? ((question.memoryScore || 0) + (question.tajweedScore || 0) + (question.fluencyScore || 0)) / 3 
                          : null;
                        
                        return (
                          <div
                            key={question.id}
                            className={`group relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                              selectedQuestionId === question.id
                                ? 'border-primary bg-primary/5 shadow-md'
                                : 'border-gray-200 hover:border-primary/50 hover:shadow-sm bg-white'
                            }`}
                            onClick={() => {
                              setSelectedQuestionId(question.id);
                              setCurrentPage(question.page);
                              setMistakes(question.mistakes);
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-bold">
                                    Q{index + 1}
                                  </span>
                                  <div className="flex-1 flex items-center gap-2">
                                    <span 
                                      className="text-sm font-semibold text-gray-900"
                                      style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif' }}
                                      dir="rtl"
                                    >
                                      {getSurahArabicName(question.surah) || getSurahName(question.surah)}
                                    </span>
                                    <span className="text-xs text-gray-600">
                                      ({question.surah}:{question.ayah})
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className={`text-center p-2 rounded-lg ${question.memoryScore ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                                    <p className="text-[9px] text-gray-600 mb-0.5 font-semibold">Memory</p>
                                    <p className={`text-sm font-bold ${question.memoryScore ? 'text-blue-900' : 'text-gray-400'}`}>
                                      {question.memoryScore || '-'}
                                    </p>
                                  </div>
                                  <div className={`text-center p-2 rounded-lg ${question.tajweedScore ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                                    <p className="text-[9px] text-gray-600 mb-0.5 font-semibold">Tajweed</p>
                                    <p className={`text-sm font-bold ${question.tajweedScore ? 'text-green-900' : 'text-gray-400'}`}>
                                      {question.tajweedScore || '-'}
                                    </p>
                                  </div>
                                  <div className={`text-center p-2 rounded-lg ${question.fluencyScore ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-200'}`}>
                                    <p className="text-[9px] text-gray-600 mb-0.5 font-semibold">Fluency</p>
                                    <p className={`text-sm font-bold ${question.fluencyScore ? 'text-purple-900' : 'text-gray-400'}`}>
                                      {question.fluencyScore || '-'}
                                    </p>
                                  </div>
                                </div>
                                
                                {averageScore !== null && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                      Avg: {averageScore.toFixed(1)}
                                    </span>
                                    {question.mistakes.length > 0 && (
                                      <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded">
                                        {question.mistakes.length} mistake{question.mistakes.length !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeQuestion(question.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Scoring Panel */}
                {selectedQuestion && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <h4 className="text-sm font-bold text-gray-900 mb-4">
                      Score Question {questions.findIndex(q => q.id === selectedQuestionId) + 1}
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Memory (1-10)</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={selectedQuestion.memoryScore || ''}
                          onChange={(e) => updateQuestionScore(selectedQuestion.id, 'memory', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Tajweed (1-10)</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={selectedQuestion.tajweedScore || ''}
                          onChange={(e) => updateQuestionScore(selectedQuestion.id, 'tajweed', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Fluency (1-10)</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={selectedQuestion.fluencyScore || ''}
                          onChange={(e) => updateQuestionScore(selectedQuestion.id, 'fluency', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-sm font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Notes</label>
                        <textarea
                          value={selectedQuestion.notes || ''}
                          onChange={(e) => updateQuestionNotes(selectedQuestion.id, e.target.value)}
                          placeholder="Add notes for this question..."
                          rows={3}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary transition text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Feedback & Submit */}
                <div className="border-t border-gray-200 p-6 bg-white">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Overall Feedback</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Add overall feedback for the student..."
                    rows={4}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary transition text-sm resize-none mb-4"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || questions.length === 0}
                    className="w-full px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Test'}
                  </button>
                </div>
              </div>

              {/* Right Side - Mushaf */}
              <div className="flex-1 bg-gray-50 overflow-y-auto">
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedStudent?.fullName} - Testing Mushaf
                    </h3>
                    <p className="text-sm text-gray-600">
                      Click on verses to add questions • Mark mistakes as needed
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900 font-semibold mb-1">
                        Click on any verse in the Mushaf to add it as a question
                      </p>
                      <p className="text-xs text-blue-700">
                        Selected verses will be highlighted in blue. Click again to mark mistakes.
                      </p>
                    </div>
                    <InteractiveMushaf
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      mistakes={currentQuestionMistakes}
                      onMistakeMark={handleMistakeMark}
                      readOnly={false}
                      mode="marking"
                      studentName={selectedStudent?.fullName}
                      onVerseSelect={(surah, ayah, page) => {
                        const surahName = getSurahName(surah);
                        addVerseAsQuestion(surah, ayah, page);
                        // Visual feedback - the verse will be highlighted automatically
                      }}
                      selectedVerses={questions.map(q => ({ surah: q.surah, ayah: q.ayah }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentTestingModule;
