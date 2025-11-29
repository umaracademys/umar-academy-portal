import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EvaluationAssignment, TeacherEvaluation, EvaluationQuestion, EvaluationAnswer } from '../types';

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

interface TeacherEvaluationFlowProps {
  assignmentId: string;
  onComplete: () => void;
  onClose: () => void;
}

const TeacherEvaluationFlow: React.FC<TeacherEvaluationFlowProps> = ({ assignmentId, onComplete, onClose }) => {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<EvaluationAssignment | null>(null);
  const [evaluation, setEvaluation] = useState<TeacherEvaluation | null>(null);
  const [answers, setAnswers] = useState<EvaluationAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<{
    answerText?: string;
    selectedOption?: string;
    mediaUrl?: string;
  }>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadAssignmentData();
  }, [assignmentId]);

  useEffect(() => {
    // Auto-save if enabled
    if (evaluation?.autoSave && currentAnswer && Object.keys(currentAnswer).length > 0) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = window.setTimeout(() => {
        handleSaveAnswer(true);
      }, 2000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [currentAnswer, evaluation?.autoSave]);

  useEffect(() => {
    // Load current answer when question changes
    if (evaluation && evaluation.questions[currentQuestionIndex]) {
      const question = evaluation.questions[currentQuestionIndex];
      const existingAnswer = answers.find(a => a.questionId === question.id);
      if (existingAnswer) {
        setCurrentAnswer({
          answerText: existingAnswer.answerText || '',
          selectedOption: existingAnswer.selectedOption || '',
          mediaUrl: existingAnswer.mediaUrl || ''
        });
        if (existingAnswer.mediaUrl) {
          setRecordingUrl(existingAnswer.mediaUrl);
        }
      } else {
        setCurrentAnswer({});
        setRecordingUrl(null);
      }
      setError(null);
      setSuccessMessage(null);
      // Reset recording state when question changes
      setIsRecording(false);
      setRecordingBlob(null);
      chunksRef.current = [];
    }
  }, [currentQuestionIndex, evaluation, answers]);

  const loadAssignmentData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/evaluation-assignments/${assignmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignment(data.assignment);
        setEvaluation(data.evaluation);
        setAnswers(data.answers || []);
        setCurrentQuestionIndex(data.assignment.currentQuestionIndex || 0);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load evaluation');
      }
    } catch (error) {
      console.error('Error loading assignment:', error);
      setError('Failed to load evaluation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEvaluation = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/evaluation-assignments/${assignmentId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedAssignment = await response.json();
        setAssignment(updatedAssignment);
      }
    } catch (error) {
      console.error('Error starting evaluation:', error);
      setError('Failed to start evaluation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAnswer = async (autoSaved = false) => {
    if (!evaluation) return;

    const question = evaluation.questions[currentQuestionIndex];
    if (!question) return;

    // Validate required fields
    if (question.isRequired) {
      if (question.questionType === 'text' && !currentAnswer.selectedOption) {
        setError('This question is required. Please select one of the 4 options.');
        return;
      }
      if ((question.questionType === 'audio' || question.questionType === 'video')) {
        if (!currentAnswer.selectedOption) {
          setError('This question is required. Please select one of the 4 options.');
          return;
        }
        if (!currentAnswer.mediaUrl && !recordingUrl) {
          setError('This question is required. Please record your answer.');
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/evaluation-assignments/${assignmentId}/answers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: question.id,
          answerText: currentAnswer.answerText,
          selectedOption: currentAnswer.selectedOption,
          mediaUrl: recordingUrl || currentAnswer.mediaUrl, // Use recording URL if available
          autoSaved
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedAnswers = [...answers];
        const existingIndex = updatedAnswers.findIndex(a => a.questionId === question.id);
        if (existingIndex >= 0) {
          updatedAnswers[existingIndex] = data.answer;
        } else {
          updatedAnswers.push(data.answer);
        }
        setAnswers(updatedAnswers);
        setAssignment(data.assignment);

        // All question types (text, audio, video) are MCQ with 4 choices - validate correctness
        if ((question.questionType === 'text' || question.questionType === 'audio' || question.questionType === 'video') && data.isCorrect === false && !autoSaved) {
          setError('❌ Incorrect answer. Please select the correct option to continue.');
          return;
        }

        if ((question.questionType === 'text' || question.questionType === 'audio' || question.questionType === 'video') && data.isCorrect === true && !autoSaved) {
          setSuccessMessage('✅ Correct! Moving to next question...');
          setTimeout(() => {
            handleNextQuestion();
            setSuccessMessage(null);
            // Reset recording state
            setIsRecording(false);
            setRecordingBlob(null);
            setRecordingUrl(null);
            chunksRef.current = [];
          }, 1000);
          return;
        }

        if (autoSaved) {
          setSuccessMessage('💾 Auto-saved');
          setTimeout(() => setSuccessMessage(null), 2000);
        }
      } else {
        const errorData = await response.json();
        if (errorData.isCorrect === false) {
          setError('❌ Incorrect answer. Please select the correct option to continue.');
        } else {
          setError(errorData.error || 'Failed to save answer');
        }
      }
    } catch (error) {
      console.error('Error saving answer:', error);
      setError('Failed to save answer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextQuestion = () => {
    if (!evaluation) return;
    if (currentQuestionIndex < evaluation.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Reset recording state when navigating
      setIsRecording(false);
      setRecordingBlob(null);
      setRecordingUrl(null);
      chunksRef.current = [];
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: currentQuestion?.questionType === 'audio',
        video: currentQuestion?.questionType === 'video'
      });

      const mimeType = currentQuestion?.questionType === 'audio' 
        ? 'audio/webm' 
        : 'video/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordingBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        setCurrentAnswer({ ...currentAnswer, mediaUrl: url });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please check your microphone/camera permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setRecordingBlob(null);
    setRecordingUrl(null);
    chunksRef.current = [];
    setCurrentAnswer({ ...currentAnswer, mediaUrl: undefined });
    
    // Stop all tracks
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleCompleteEvaluation = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/evaluation-assignments/${assignmentId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const completedAssignment = await response.json();
        setAssignment(completedAssignment);
        setSuccessMessage('🎉 Evaluation completed successfully!');
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to complete evaluation');
      }
    } catch (error) {
      console.error('Error completing evaluation:', error);
      setError('Failed to complete evaluation');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !assignment) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-primary/30">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-primary mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-primary text-base font-bold">Loading evaluation...</p>
            <p className="text-primary/60 text-sm mt-2">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (!assignment || !evaluation) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md shadow-2xl border-2 border-red-200">
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-600 text-base font-bold mb-4">Failed to load evaluation</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Start screen
  if (assignment.status === 'assigned' && !assignment.startedAt) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border-2 border-primary/30 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
            <h2 className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2">
              <span className="text-3xl">📝</span>
              {evaluation.title}
            </h2>
            {evaluation.description && (
              <p className="text-white/90 text-sm mt-2">{evaluation.description}</p>
            )}
          </div>
          <div className="p-8 bg-gradient-to-b from-gray-50 to-white">
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-primary/10 shadow-sm">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary text-xl font-bold">
                  ❓
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">Total Questions</p>
                  <p className="text-2xl font-extrabold text-primary">{evaluation.questions.length}</p>
                </div>
              </div>
              {assignment.dueDate && (
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-primary/10 shadow-sm">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-100 text-yellow-800 text-xl font-bold">
                    📅
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">Due Date</p>
                    <p className="text-lg font-extrabold text-primary">
                      {new Date(assignment.dueDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              )}
              {evaluation.autoSave && (
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-primary/10 shadow-sm">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-800 text-xl font-bold">
                    💾
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">Auto-Save Enabled</p>
                    <p className="text-xs text-primary/60">Your progress will be saved automatically</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleStartEvaluation}
                disabled={isLoading}
                className="flex-1 px-6 py-4 bg-primary text-white rounded-xl text-base font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isLoading ? 'Starting...' : 'Start Evaluation'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-4 border-2 border-primary/30 text-primary rounded-xl text-base font-bold hover:bg-soft-primary transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = evaluation.questions[currentQuestionIndex];
  const currentAnswerData = answers.find(a => a.questionId === currentQuestion?.id);
  const isAnswered = !!currentAnswerData;
  // Text questions are MCQ - must be correct to proceed
  // All question types (text, audio, video) are MCQ - must be correct to proceed
  const canProceed = currentQuestion?.questionType 
    ? (currentAnswerData?.isCorrect === true) 
    : true;
  const answeredCount = answers.length;
  const totalQuestions = evaluation.questions.length;
  const progressPercentage = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-primary/30">
        {/* Enhanced Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-white mb-2 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                {evaluation.title}
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-40 bg-white/20 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-white h-3 rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${assignment.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-white/90 font-bold">{assignment.progress}%</span>
                </div>
                <span className="text-xs text-white/80">
                  {answeredCount} of {totalQuestions} answered
                </span>
              </div>
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

        {/* Enhanced Question Navigation */}
        <div className="px-6 py-4 bg-gradient-to-br from-gray-50 to-white border-b-2 border-primary/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-primary">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              {currentQuestion?.isRequired && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-bold">
                  Required
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {evaluation.questions.map((q, index) => {
                const answer = answers.find(a => a.questionId === q.id);
                const isCurrent = index === currentQuestionIndex;
                const isAnswered = !!answer;
                const isAccessible = index <= currentQuestionIndex || isAnswered;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      if (isAccessible) {
                        setCurrentQuestionIndex(index);
                      }
                    }}
                    disabled={!isAccessible}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-primary text-white shadow-lg scale-110 ring-2 ring-primary/50'
                        : isAnswered
                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-50'
                    } ${isAccessible && !isCurrent ? 'hover:scale-105' : ''}`}
                    title={`Question ${index + 1}${isAnswered ? ' (Answered)' : ''}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-white to-gray-50">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-md">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-bold">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl shadow-md">
              <p className="text-sm text-green-800 font-bold">{successMessage}</p>
            </div>
          )}

          {currentQuestion && (
            <div className="space-y-6">
              {/* Question Header */}
              <div className="bg-white rounded-xl border-2 border-primary/10 p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-white text-xl font-bold flex-shrink-0">
                    Q{currentQuestionIndex + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-extrabold text-primary mb-2">
                      {currentQuestion.questionText}
                      {currentQuestion.isRequired && <span className="text-red-600 ml-2">*</span>}
                    </h3>
                    {currentQuestion.instructions && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800 font-medium flex items-start gap-2">
                          <span>💡</span>
                          <span>{currentQuestion.instructions}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reference Media for Audio/Video Questions */}
              {(currentQuestion.questionType === 'audio' || currentQuestion.questionType === 'video') && currentQuestion.mediaUrl && (
                <div className="bg-white rounded-xl border-2 border-primary/10 p-6 shadow-lg">
                  <p className="text-xs font-bold text-primary mb-3 flex items-center gap-2">
                    <span>🎵</span>
                    Reference Media (Listen/Watch First)
                  </p>
                  {currentQuestion.questionType === 'audio' ? (
                    <audio
                      ref={audioRef}
                      src={currentQuestion.mediaUrl}
                      controls
                      className="w-full rounded-lg"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={currentQuestion.mediaUrl}
                      controls
                      className="w-full max-h-96 rounded-lg"
                    />
                  )}
                </div>
              )}

              {/* Answer Input Section */}
              <div className="bg-white rounded-xl border-2 border-primary/10 p-6 shadow-lg">
                {/* Text questions = MCQ with 4 choices */}
                {currentQuestion.questionType === 'text' && (
                  <div>
                    <label className="block text-xs font-bold text-primary mb-3">Select Your Answer *</label>
                    {currentQuestion.options && currentQuestion.options.length === 4 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentQuestion.options.map((option, index) => (
                          <label
                            key={index}
                            className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
                              currentAnswer.selectedOption === option
                                ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                                : 'border-gray-200 hover:border-primary/50 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              value={option}
                              checked={currentAnswer.selectedOption === option}
                              onChange={(e) => {
                                setCurrentAnswer({ ...currentAnswer, selectedOption: e.target.value });
                                setError(null);
                                setSuccessMessage(null);
                              }}
                              className="w-5 h-5 text-primary border-primary/30 focus:ring-primary/20 mr-4 flex-shrink-0"
                            />
                            <span className="text-sm font-medium text-primary flex-1">{option}</span>
                            {currentAnswer.selectedOption === option && (
                              <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                        <p className="text-sm text-yellow-800 font-bold">⚠️ This question needs exactly 4 options. Please contact admin.</p>
                      </div>
                    )}
                    {isAnswered && currentAnswerData?.isCorrect === false && (
                      <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                        <p className="text-sm text-red-800 font-bold flex items-center gap-2">
                          <span>❌</span>
                          Incorrect answer. Please select the correct option to continue.
                        </p>
                      </div>
                    )}
                    {isAnswered && currentAnswerData?.isCorrect === true && (
                      <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                        <p className="text-sm text-green-800 font-bold flex items-center gap-2">
                          <span>✅</span>
                          Correct! You can proceed to the next question.
                        </p>
                      </div>
                    )}
                    {evaluation.autoSave && (
                      <p className="text-xs text-primary/60 mt-3 flex items-center gap-1">
                        <span>💾</span>
                        Your selection will be auto-saved
                      </p>
                    )}
                  </div>
                )}

                {/* Audio/Video questions: 4 MCQ options + Recording */}
                {(currentQuestion.questionType === 'audio' || currentQuestion.questionType === 'video') && (
                  <div className="space-y-4">
                    {/* 4 MCQ Options */}
                    <div>
                      <label className="block text-xs font-bold text-primary mb-3">Select Your Answer *</label>
                      {currentQuestion.options && currentQuestion.options.length === 4 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentQuestion.options.map((option, index) => (
                            <label
                              key={index}
                              className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
                                currentAnswer.selectedOption === option
                                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                                  : 'border-gray-200 hover:border-primary/50 bg-white'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${currentQuestion.id}`}
                                value={option}
                                checked={currentAnswer.selectedOption === option}
                                onChange={(e) => {
                                  setCurrentAnswer({ ...currentAnswer, selectedOption: e.target.value });
                                  setError(null);
                                  setSuccessMessage(null);
                                }}
                                className="w-5 h-5 text-primary border-primary/30 focus:ring-primary/20 mr-4 flex-shrink-0"
                              />
                              <span className="text-sm font-medium text-primary flex-1">{option}</span>
                              {currentAnswer.selectedOption === option && (
                                <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                          <p className="text-sm text-yellow-800 font-bold">⚠️ This question needs exactly 4 options. Please contact admin.</p>
                        </div>
                      )}
                      {isAnswered && currentAnswerData?.isCorrect === false && (
                        <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                          <p className="text-sm text-red-800 font-bold flex items-center gap-2">
                            <span>❌</span>
                            Incorrect answer. Please select the correct option to continue.
                          </p>
                        </div>
                      )}
                      {isAnswered && currentAnswerData?.isCorrect === true && (
                        <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                          <p className="text-sm text-green-800 font-bold flex items-center gap-2">
                            <span>✅</span>
                            Correct! You can proceed to the next question.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Recording Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-primary/10 p-6">
                      <label className="block text-xs font-bold text-primary mb-3 flex items-center gap-2">
                        <span className="text-xl">
                          {currentQuestion.questionType === 'audio' ? '🎤' : '🎥'}
                        </span>
                        Record Your Answer *
                      </label>
                      
                      <div className="flex items-center gap-3 mb-4">
                        {!isRecording && !recordingUrl && (
                          <button
                            onClick={startRecording}
                            className="px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Start Recording
                          </button>
                        )}
                        
                        {isRecording && (
                          <>
                            <button
                              onClick={stopRecording}
                              className="px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 animate-pulse"
                            >
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                              Recording... Click to Stop
                            </button>
                            <button
                              onClick={cancelRecording}
                              className="px-4 py-3 bg-gray-500 text-white rounded-xl text-sm font-bold hover:bg-gray-600 transition-all"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>

                      {recordingUrl && (
                        <div className="mt-4">
                          <p className="text-xs font-bold text-primary mb-2">Your Recording:</p>
                          {currentQuestion.questionType === 'audio' ? (
                            <audio src={recordingUrl} controls className="w-full rounded-lg" />
                          ) : (
                            <video src={recordingUrl} controls className="w-full max-h-64 rounded-lg" />
                          )}
                          <button
                            onClick={cancelRecording}
                            className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-xs font-bold hover:bg-red-200 transition-all"
                          >
                            Remove Recording
                          </button>
                        </div>
                      )}

                      {evaluation.autoSave && (
                        <p className="text-xs text-primary/60 mt-3 flex items-center gap-1">
                          <span>💾</span>
                          Your recording will be auto-saved
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        <div className="px-6 py-4 border-t-2 border-primary/20 bg-gradient-to-br from-gray-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-5 py-2.5 border-2 border-primary/30 text-primary rounded-xl text-sm font-bold hover:bg-soft-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <div className="flex items-center gap-2 text-xs text-primary/60">
              {isSaving && (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium">Saving...</span>
                </div>
              )}
              {evaluation.autoSave && !isSaving && (
                <div className="flex items-center gap-2">
                  <span>💾</span>
                  <span>Auto-save enabled</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentQuestionIndex < evaluation.questions.length - 1 ? (
              <button
                onClick={() => handleSaveAnswer(false)}
                disabled={isSaving || !canProceed}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    Save & Next
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleCompleteEvaluation}
                disabled={isLoading || !canProceed}
                className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Completing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Complete Evaluation
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherEvaluationFlow;
