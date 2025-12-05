import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import Card from '../../../components/Card';
import { useData } from '../../../contexts/DataContext';
import { useBackendData } from '../../../contexts/BackendDataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import { HomeworkSubmission } from '../../../types/assignment';
import { uploadMistakeAudio } from '../../../services/audioService';

const StudentAssignments: React.FC = () => {
  const navigate = useNavigate();
  const { students, getStudentByEmail } = useData();
  const { assignments: backendAssignments, getStudentPersonalMushaf } = useBackendData();
  const { user } = useAuth();
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [mushafPage, setMushafPage] = useState<number>(1);
  const [showHomeworkForm, setShowHomeworkForm] = useState<string | null>(null);
  const [homeworkSubmission, setHomeworkSubmission] = useState({
    content: '',
    link: '',
    attachments: [] as Array<{ name: string; url: string; type: string }>
  });
  const [isSubmittingHomework, setIsSubmittingHomework] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [viewingMistakesFor, setViewingMistakesFor] = useState<{ assignmentId: string; type: 'sabq' | 'sabqi' | 'manzil' | 'all'; index?: number } | null>(null);
  const [personalMushafMistakes, setPersonalMushafMistakes] = useState<MushafMistake[]>([]);
  const [loadingPersonalMushaf, setLoadingPersonalMushaf] = useState(false);

  const currentStudent = getStudentByEmail(user?.email || '') || students[0];

  // Get student's assignments from backend
  const studentAssignments = useMemo(() => {
    if (!currentStudent?.id) return [];
    
    return backendAssignments
      .filter((assignment: any) => {
        const assignmentStudentId = assignment.studentId || assignment._id?.studentId;
        return assignmentStudentId === currentStudent.id || 
               assignmentStudentId === currentStudent.id.toString() ||
               String(assignmentStudentId) === String(currentStudent.id);
      })
      .map((assignment: any) => ({
        ...assignment,
        id: assignment._id || assignment.id,
        createdAt: assignment.createdAt ? new Date(assignment.createdAt) : new Date()
      }))
      .sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [backendAssignments, currentStudent]);

  // Group assignments by date
  const groupedAssignments = useMemo(() => {
    const grouped: Record<string, typeof studentAssignments> = {};
    studentAssignments.forEach(assignment => {
      const date = assignment.createdAt 
        ? new Date(assignment.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'Unknown Date';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(assignment);
    });
    return grouped;
  }, [studentAssignments]);

  // Get mistakes filtered by workflow step (sabq/sabqi/manzil)
  const getMistakesForPhase = (assignment: any, type: 'sabq' | 'sabqi' | 'manzil', index: number) => {
    if (!assignment.mushafMistakes) return [];
    return assignment.mushafMistakes
      .filter((m: any) => m.workflowStep === type)
      .map((m: any) => ({
        id: m.id || `mistake-${Date.now()}-${Math.random()}`,
        type: m.type,
        page: m.page,
        surah: m.surah,
        ayah: m.ayah,
        wordIndex: m.wordIndex,
        position: m.position,
        note: m.note,
        audioUrl: m.audioUrl,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
      }));
  };

  // Get mushaf mistakes for selected assignment or specific phase
  const mushafMistakes = useMemo(() => {
    if (viewingMistakesFor) {
      const assignment = studentAssignments.find(a => a.id === viewingMistakesFor.assignmentId);
      if (!assignment) return [];
      if (viewingMistakesFor.type === 'all') {
        // Return all mistakes for all phases
        if (!assignment.mushafMistakes) return [];
        return assignment.mushafMistakes.map((m: any) => ({
          id: m.id || `mistake-${Date.now()}-${Math.random()}`,
          type: m.type,
          page: m.page,
          surah: m.surah,
          ayah: m.ayah,
          wordIndex: m.wordIndex,
          position: m.position,
          note: m.note,
          audioUrl: m.audioUrl,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
        }));
      }
      return getMistakesForPhase(assignment, viewingMistakesFor.type, viewingMistakesFor.index || 0);
    }
    
    if (!selectedAssignment) return [];
    const assignment = studentAssignments.find(a => a.id === selectedAssignment);
    if (!assignment?.mushafMistakes) return [];
    return assignment.mushafMistakes.map((m: any) => ({
      id: m.id || `mistake-${Date.now()}-${Math.random()}`,
            type: m.type,
            page: m.page,
            surah: m.surah,
            ayah: m.ayah,
            wordIndex: m.wordIndex,
      position: m.position,
      note: m.note,
      audioUrl: m.audioUrl ? (() => {
        if (m.audioUrl.startsWith('http')) return m.audioUrl;
        let baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        // Remove /api from base URL if present (uploads are served from root, not /api)
        if (baseUrl.endsWith('/api')) {
          baseUrl = baseUrl.replace('/api', '');
        }
        baseUrl = baseUrl.replace(/\/$/, '');
        const audioPath = m.audioUrl.startsWith('/') ? m.audioUrl : `/${m.audioUrl}`;
        return `${baseUrl}${audioPath}`;
      })() : undefined,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
    }));
  }, [selectedAssignment, viewingMistakesFor, studentAssignments]);

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load personal mushaf when assignment is selected or viewing mistakes
  useEffect(() => {
    const loadPersonalMushaf = async () => {
      const assignmentId = viewingMistakesFor?.assignmentId || selectedAssignment;
      if (!assignmentId || !currentStudent?.id) {
        setPersonalMushafMistakes([]);
        return;
      }

      try {
        setLoadingPersonalMushaf(true);
        const personalMushafData = await getStudentPersonalMushaf(currentStudent.id);
        
        if (personalMushafData && personalMushafData.mistakes) {
          const convertedMistakes: MushafMistake[] = personalMushafData.mistakes.map((m: any) => ({
            id: m.id || `personal-${Date.now()}-${Math.random()}`,
            type: m.type,
            page: m.page,
            surah: m.surah,
            ayah: m.ayah,
            wordIndex: m.wordIndex,
            position: m.position,
            note: m.note,
            audioUrl: m.audioUrl ? (() => {
              if (m.audioUrl.startsWith('http')) return m.audioUrl;
              let baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
              // Remove /api from base URL if present (uploads are served from root, not /api)
              if (baseUrl.endsWith('/api')) {
                baseUrl = baseUrl.replace('/api', '');
              }
              baseUrl = baseUrl.replace(/\/$/, '');
              const audioPath = m.audioUrl.startsWith('/') ? m.audioUrl : `/${m.audioUrl}`;
              return `${baseUrl}${audioPath}`;
            })() : undefined,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          }));
          setPersonalMushafMistakes(convertedMistakes);
        } else {
          setPersonalMushafMistakes([]);
        }
      } catch (error) {
        console.error('Error loading personal mushaf:', error);
        setPersonalMushafMistakes([]);
      } finally {
        setLoadingPersonalMushaf(false);
      }
    };

    loadPersonalMushaf();
  }, [selectedAssignment, viewingMistakesFor?.assignmentId, currentStudent?.id, getStudentPersonalMushaf]);

  // Auto-set mushaf page when assignment is selected
  React.useEffect(() => {
    if (selectedAssignment && mushafMistakes.length > 0) {
      const firstMistake = mushafMistakes[0];
      if (firstMistake.page) {
        setMushafPage(firstMistake.page);
      }
    } else if (selectedAssignment && personalMushafMistakes.length > 0) {
      // If no assignment mistakes, show first personal mistake
      const firstMistake = personalMushafMistakes[0];
      if (firstMistake.page) {
        setMushafPage(firstMistake.page);
      }
    }
  }, [selectedAssignment, mushafMistakes, personalMushafMistakes]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      setAudioChunks([]);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioChunks([]);
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Store timer to clear it later
      (recorder as any).timer = timer;
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      if ((mediaRecorder as any).timer) {
        clearInterval((mediaRecorder as any).timer);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitHomework = async (assignmentId: string) => {
    if (!currentStudent) {
      alert('Student information not found');
      return;
    }

    if (!homeworkSubmission.content && !homeworkSubmission.link && !audioUrl && homeworkSubmission.attachments.length === 0) {
      alert('Please provide homework content, link, audio recording, or attachments');
      return;
    }

    setIsSubmittingHomework(true);
    try {
      let uploadedAudioUrl: string | null = null;
      
      // Upload audio if recorded
      if (audioBlob) {
        try {
          uploadedAudioUrl = await uploadMistakeAudio(audioBlob);
          console.log('✅ Audio uploaded:', uploadedAudioUrl);
        } catch (audioError) {
          console.error('Error uploading audio:', audioError);
          alert('Warning: Audio recording failed to upload. You can still submit without audio or try again.');
        }
      }

      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/assignments/${assignmentId}/submit-homework`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: homeworkSubmission.content,
          link: homeworkSubmission.link,
          audioUrl: uploadedAudioUrl,
          attachments: homeworkSubmission.attachments,
          studentId: currentStudent.id,
          studentName: currentStudent.fullName
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit homework');
      }

      alert('Homework submitted successfully!');
      setShowHomeworkForm(null);
      setHomeworkSubmission({ content: '', link: '', attachments: [] });
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      
      // Refresh assignments
      window.location.reload();
    } catch (error) {
      console.error('Error submitting homework:', error);
      alert(`Failed to submit homework: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingHomework(false);
    }
  };

  const handleAddAttachment = () => {
    const name = prompt('Enter attachment name:');
    const url = prompt('Enter attachment URL:');
    if (name && url) {
      setHomeworkSubmission(prev => ({
        ...prev,
        attachments: [...prev.attachments, { name, url, type: 'link' }]
      }));
    }
  };

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary mb-4">Student Profile Not Found</h1>
            <p className="text-primary-soft mb-4">We couldn't find your student profile.</p>
            <button 
              onClick={() => navigate('/student/dashboard')} 
              className="px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">My Assignments</h1>
            <p className="text-primary-soft mt-2">View all your assignments and classwork</p>
            </div>
                <button
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-3 border border-accent-soft text-primary rounded-full font-semibold hover:bg-soft-accent transition-colors"
          >
            Back to Dashboard
                </button>
              </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card title="Total Assignments">
            <div className="text-3xl font-bold text-primary">{studentAssignments.length}</div>
          </Card>
          <Card title="Active">
            <div className="text-3xl font-bold text-blue-600">
              {studentAssignments.filter((a: any) => a.status === 'active').length}
                </div>
          </Card>
          <Card title="Completed">
            <div className="text-3xl font-bold text-green-600">
              {studentAssignments.filter((a: any) => a.status === 'completed').length}
            </div>
          </Card>
            </div>

            {/* Assignments List */}
        {studentAssignments.length === 0 ? (
          <Card title="No Assignments">
            <div className="text-center py-12">
              <p className="text-primary-soft text-lg mb-4">No assignments found.</p>
              <p className="text-primary-soft">Your teacher will assign work soon.</p>
            </div>
          </Card>
        ) : (
            <div className="space-y-6">
            {(Object.entries(groupedAssignments) as [string, any[]][])
              .sort(([dateA], [dateB]) => {
                const a = new Date(dateA);
                const b = new Date(dateB);
                return b.getTime() - a.getTime();
              })
              .map(([date, dayAssignments]) => (
                <Card key={date} title={date}>
                  <div className="space-y-4">
                    {dayAssignments.map((assignment: any) => {
                      const isSelected = selectedAssignment === assignment.id;
                      const classwork = assignment.classwork || { sabq: [], sabqi: [], manzil: [] };
                      const hasClasswork = classwork.sabq.length > 0 || classwork.sabqi.length > 0 || classwork.manzil.length > 0;
                      const hasHomework = assignment.homework?.enabled;

                return (
                  <div
                    key={assignment.id}
                          className={`border rounded-2xl p-4 sm:p-6 transition-all ${
                            isSelected 
                              ? 'border-primary bg-soft-primary shadow-md' 
                              : 'border-accent-soft hover:border-primary bg-white'
                          }`}
                        >
                          {/* Assignment Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-lg sm:text-xl font-bold text-primary">
                                  Assignment #{studentAssignments.indexOf(assignment) + 1}
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  assignment.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {assignment.status === 'active' ? 'Active' : assignment.status}
                            </span>
                        </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-primary-soft mb-2">
                                <span>👨‍🏫 Assigned by: {assignment.assignedByName || 'Teacher'}</span>
                                <span>📅 {formatDate(assignment.createdAt)}</span>
                        </div>
                              {assignment.comment && (
                                <p className="text-sm text-primary-soft italic mt-2">"{assignment.comment}"</p>
                        )}
                      </div>
                            <button
                              onClick={() => setSelectedAssignment(isSelected ? null : assignment.id)}
                              className="px-4 py-2 bg-soft-primary text-primary rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.1)] transition-colors whitespace-nowrap text-sm"
                            >
                              {isSelected ? 'Hide Details' : 'View Details'}
                            </button>
                    </div>

                          {/* Assignment Details (when expanded) */}
                          {isSelected && (
                            <div className="mt-4 pt-4 border-t border-accent-soft space-y-4">
                              {/* View All Mushaf Button */}
                              {assignment.mushafMistakes && assignment.mushafMistakes.length > 0 && (
                                <div className="mb-4">
                                  <button
                                    onClick={() => {
                                      setViewingMistakesFor({ assignmentId: assignment.id, type: 'all' });
                                      if (assignment.mushafMistakes.length > 0) {
                                        setMushafPage(assignment.mushafMistakes[0].page);
                                      }
                                    }}
                                    className="w-full px-4 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors flex items-center justify-center gap-2"
                                  >
                                    <span>📖</span>
                                    <span>View All Mistakes ({assignment.mushafMistakes.length})</span>
                                  </button>
                                </div>
                              )}
                              
                              {/* Classwork Section */}
                              {hasClasswork && (
                                <div className="p-4 bg-soft-primary rounded-xl border border-primary-soft">
                                  <h4 className="text-sm font-semibold text-primary mb-3">📚 Classwork</h4>
                                  <div className="space-y-3">
                                    {/* Sabq */}
                                    {classwork.sabq.length > 0 && (
                                      <div>
                                        <span className="text-xs font-medium text-primary-soft">Sabq:</span>
                                        <ul className="ml-4 mt-1 space-y-1">
                                          {classwork.sabq.map((phase: any, idx: number) => {
                                            const phaseMistakes = getMistakesForPhase(assignment, 'sabq', idx);
                                            const hasMistakes = phaseMistakes.length > 0;
                                            return (
                                              <li key={idx} className="text-sm text-primary flex items-center justify-between gap-2">
                                                <span>• {phase.assignmentRange || phase.details || 'Sabq recitation'}</span>
                                                {hasMistakes && (
                                                  <button
                                                    onClick={() => {
                                                      setViewingMistakesFor({ assignmentId: assignment.id, type: 'sabq', index: idx });
                                                      setSelectedAssignment(assignment.id);
                                                      if (phaseMistakes.length > 0) {
                                                        setMushafPage(phaseMistakes[0].page);
                                                      }
                                                    }}
                                                    className="px-2 py-1 text-xs bg-primary text-white rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors whitespace-nowrap"
                                                    title={`View ${phaseMistakes.length} mistake(s)`}
                                                  >
                                                    View Mushaf ({phaseMistakes.length})
                                                  </button>
                                                )}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {/* Sabqi */}
                                    {classwork.sabqi.length > 0 && (
                                      <div>
                                        <span className="text-xs font-medium text-primary-soft">Sabqi:</span>
                                        <ul className="ml-4 mt-1 space-y-1">
                                          {classwork.sabqi.map((phase: any, idx: number) => {
                                            const phaseMistakes = getMistakesForPhase(assignment, 'sabqi', idx);
                                            const hasMistakes = phaseMistakes.length > 0;
                                            return (
                                              <li key={idx} className="text-sm text-primary flex items-center justify-between gap-2">
                                                <span>• {phase.assignmentRange || phase.details || 'Sabqi recitation'}</span>
                                                {hasMistakes && (
                                                  <button
                                                    onClick={() => {
                                                      setViewingMistakesFor({ assignmentId: assignment.id, type: 'sabqi', index: idx });
                                                      setSelectedAssignment(assignment.id);
                                                      if (phaseMistakes.length > 0) {
                                                        setMushafPage(phaseMistakes[0].page);
                                                      }
                                                    }}
                                                    className="px-2 py-1 text-xs bg-primary text-white rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors whitespace-nowrap"
                                                    title={`View ${phaseMistakes.length} mistake(s)`}
                                                  >
                                                    View Mistakes ({phaseMistakes.length})
                                                  </button>
                                                )}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {/* Manzil */}
                                    {classwork.manzil.length > 0 && (
                                      <div>
                                        <span className="text-xs font-medium text-primary-soft">Manzil:</span>
                                        <ul className="ml-4 mt-1 space-y-1">
                                          {classwork.manzil.map((phase: any, idx: number) => {
                                            const phaseMistakes = getMistakesForPhase(assignment, 'manzil', idx);
                                            const hasMistakes = phaseMistakes.length > 0;
                                            return (
                                              <li key={idx} className="text-sm text-primary flex items-center justify-between gap-2">
                                                <span>• {phase.assignmentRange || phase.details || 'Manzil recitation'}</span>
                                                {hasMistakes && (
                                                  <button
                                                    onClick={() => {
                                                      setViewingMistakesFor({ assignmentId: assignment.id, type: 'manzil', index: idx });
                                                      setSelectedAssignment(assignment.id);
                                                      if (phaseMistakes.length > 0) {
                                                        setMushafPage(phaseMistakes[0].page);
                                                      }
                                                    }}
                                                    className="px-2 py-1 text-xs bg-primary text-white rounded-full hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors whitespace-nowrap"
                                                    title={`View ${phaseMistakes.length} mistake(s)`}
                                                  >
                                                    View Mushaf ({phaseMistakes.length})
                                                  </button>
                                                )}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    )}
                          </div>
                        </div>
                      )}

                              {/* Homework Section */}
                              {hasHomework && (
                                <div className="p-4 bg-soft-accent rounded-xl border border-accent-soft">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                    <h4 className="text-sm font-semibold text-primary">📝 Homework</h4>
                                    {assignment.homework.submission?.submitted ? (
                                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        assignment.homework.submission.status === 'graded' 
                                          ? 'bg-green-100 text-green-800'
                                          : assignment.homework.submission.status === 'returned'
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {assignment.homework.submission.status === 'graded' 
                                          ? '✓ Graded' 
                                          : assignment.homework.submission.status === 'returned'
                                          ? 'Returned'
                                          : 'Submitted'}
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setShowHomeworkForm(assignment.id);
                                          setHomeworkSubmission({ content: '', link: '', attachments: [] });
                                        }}
                                        className="px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors whitespace-nowrap"
                                      >
                                        Submit Homework
                                      </button>
                                    )}
                          </div>
                                  
                                  {assignment.homework.content && (
                                    <p className="text-sm text-primary mb-2">{assignment.homework.content}</p>
                                  )}
                                  {assignment.homework.link && (
                                    <a 
                                      href={assignment.homework.link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2"
                                    >
                                      🔗 {assignment.homework.link}
                                    </a>
                                  )}

                                  {/* Homework Submission Status */}
                                  {assignment.homework.submission?.submitted && (
                                    <div className="mt-4 pt-4 border-t border-accent-soft">
                                      <h5 className="text-xs font-semibold text-primary mb-2">Your Submission:</h5>
                                      {assignment.homework.submission.submittedAt && (
                                        <p className="text-xs text-primary-soft mb-2">
                                          Submitted: {formatDate(assignment.homework.submission.submittedAt)}
                                        </p>
                                      )}
                                      {assignment.homework.submission.content && (
                                        <p className="text-sm text-primary mb-2">{assignment.homework.submission.content}</p>
                                      )}
                                      {assignment.homework.submission.link && (
                                        <a 
                                          href={assignment.homework.submission.link} 
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2"
                                        >
                                          🔗 {assignment.homework.submission.link}
                                        </a>
                                      )}
                                      {assignment.homework.submission.audioUrl && (
                                        <div className="mb-2">
                                          <p className="text-xs font-semibold text-primary-soft mb-1">Audio Recording:</p>
                                          <audio
                                            controls
                                            src={assignment.homework.submission.audioUrl}
                                            className="w-full max-w-md"
                                          >
                                            Your browser does not support the audio element.
                                          </audio>
                          </div>
                                      )}
                                      {assignment.homework.submission.attachments && assignment.homework.submission.attachments.length > 0 && (
                                        <div className="mb-2">
                                          <p className="text-xs font-semibold text-primary-soft mb-1">Attachments:</p>
                                          {assignment.homework.submission.attachments.map((att, idx) => (
                                            <a
                                              key={idx}
                                              href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mr-2"
                                            >
                                              📎 {att.name}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Feedback */}
                                      {assignment.homework.submission.feedback && (
                                        <div className="mt-3 p-2 bg-white rounded-lg border border-primary-soft">
                                          <p className="text-xs font-semibold text-primary mb-1">Feedback:</p>
                                          <p className="text-sm text-primary">{assignment.homework.submission.feedback}</p>
                                          {assignment.homework.submission.gradedByName && (
                                            <p className="text-xs text-primary-soft mt-1">
                                              - {assignment.homework.submission.gradedByName}
                                              {assignment.homework.submission.gradedAt && ` (${formatDate(assignment.homework.submission.gradedAt)})`}
                                            </p>
                            )}
                          </div>
                                      )}
                                      
                                      {/* Grade */}
                                      {assignment.homework.submission.grade !== undefined && assignment.homework.submission.grade !== null && (
                                        <div className="mt-2">
                                          <span className="text-sm font-semibold text-primary">Grade: </span>
                                          <span className="text-lg font-bold text-primary">{assignment.homework.submission.grade}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Homework Submission Form */}
                                  {showHomeworkForm === assignment.id && !assignment.homework.submission?.submitted && (
                                    <div className="mt-4 pt-4 border-t border-accent-soft">
                                      <h5 className="text-sm font-semibold text-primary mb-3">Submit Your Homework</h5>
                                      <div className="space-y-3">
                                        <div>
                                          <label className="block text-xs font-medium text-primary mb-1">
                                            Content *
                                          </label>
                                          <textarea
                                            value={homeworkSubmission.content}
                                            onChange={(e) => setHomeworkSubmission(prev => ({ ...prev, content: e.target.value }))}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition"
                                            placeholder="Enter your homework content..."
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-primary mb-1">
                                            Link (Optional)
                                          </label>
                                          <input
                                            type="url"
                                            value={homeworkSubmission.link}
                                            onChange={(e) => setHomeworkSubmission(prev => ({ ...prev, link: e.target.value }))}
                                            className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition"
                                            placeholder="https://..."
                                          />
                                        </div>
                                        
                                        {/* Audio Recording Section */}
                                        <div>
                                          <label className="block text-xs font-medium text-primary mb-2">
                                            Audio Recording (Optional)
                                          </label>
                                          <div className="space-y-2">
                                            {!audioUrl ? (
                                              <div className="flex items-center gap-2">
                                                {!isRecording ? (
                                                  <button
                                                    type="button"
                                                    onClick={startRecording}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                                                  >
                                                    <span className="w-3 h-3 bg-white rounded-full"></span>
                                                    Start Recording
                                                  </button>
                                                ) : (
                                                  <div className="flex items-center gap-3">
                                                    <button
                                                      type="button"
                                                      onClick={stopRecording}
                                                      className="px-4 py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                                                    >
                                                      <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                                                      Stop Recording ({formatTime(recordingTime)})
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="space-y-2">
                                                <audio
                                                  controls
                                                  src={audioUrl}
                                                  className="w-full max-w-md"
                                                >
                                                  Your browser does not support the audio element.
                                                </audio>
                                                <div className="flex gap-2">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setAudioUrl(null);
                                                      setAudioBlob(null);
                                                      setRecordingTime(0);
                                                    }}
                                                    className="px-3 py-1 text-xs bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors"
                                                  >
                                                    Remove Recording
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={startRecording}
                                                    className="px-3 py-1 text-xs bg-soft-primary text-primary rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.1)] transition-colors"
                                                  >
                                                    Record Again
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                            <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-medium text-primary">
                                              Attachments (Optional)
                                            </label>
                                            <button
                                              onClick={handleAddAttachment}
                                              className="px-3 py-1 text-xs bg-soft-primary text-primary rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.1)] transition-colors"
                                            >
                                              + Add
                                            </button>
                                          </div>
                                          {homeworkSubmission.attachments.length > 0 && (
                                            <div className="space-y-1">
                                              {homeworkSubmission.attachments.map((att, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-accent-soft">
                                                  <span className="text-xs text-primary">{att.name}</span>
                                                  <button
                                                    onClick={() => setHomeworkSubmission(prev => ({
                                                      ...prev,
                                                      attachments: prev.attachments.filter((_, i) => i !== idx)
                                                    }))}
                                                    className="text-red-500 hover:text-red-700 text-xs"
                                                  >
                                                    Remove
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                            </div>
                                        <div className="flex gap-2">
                            <button
                              onClick={() => {
                                              // Stop recording if active
                                              if (isRecording && mediaRecorder) {
                                                stopRecording();
                                              }
                                              setShowHomeworkForm(null);
                                              setHomeworkSubmission({ content: '', link: '', attachments: [] });
                                              setAudioBlob(null);
                                              setAudioUrl(null);
                                              setRecordingTime(0);
                                            }}
                                            className="px-4 py-2 border border-accent-soft text-primary rounded-full font-semibold hover:bg-soft-accent transition-colors"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleSubmitHomework(assignment.id)}
                                            disabled={isSubmittingHomework}
                                            className="px-4 py-2 bg-primary text-white rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {isSubmittingHomework ? 'Submitting...' : 'Submit'}
                            </button>
                          </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Mushaf View - Show when viewing specific phase (sabq/sabqi/manzil) */}
                              {viewingMistakesFor && viewingMistakesFor.assignmentId === assignment.id && (
                                <div className="mt-4 pt-4 border-t-4 border-accent bg-gradient-to-br from-soft-primary to-white rounded-2xl" onClick={(e) => e.stopPropagation()}>
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-lg sm:text-xl font-extrabold text-primary">
                                        📖 Personal Mushaf - {viewingMistakesFor.type.toUpperCase()} ({mushafMistakes.length} mistake{mushafMistakes.length !== 1 ? 's' : ''})
                                      </h4>
                                      <button
                                        onClick={() => {
                                          setViewingMistakesFor(null);
                                        }}
                                        className="px-4 py-2 bg-primary text-white rounded-full text-sm font-extrabold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-all shadow-lg hover:scale-105"
                                      >
                                        Close Mushaf
                                      </button>
                                    </div>
                                    <div className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-primary/30 shadow-xl">
                                      <InteractiveMushaf
                                        currentPage={mushafPage}
                                        onPageChange={setMushafPage}
                                        mistakes={mushafMistakes}
                                        onMistakeMark={() => {}}
                                        readOnly={true}
                                        mode="viewing"
                                        studentName={currentStudent.fullName}
                                      />
                                    </div>
                                    {/* Mistake List Summary */}
                                    {mushafMistakes.length > 0 && (
                                      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                                        <h5 className="text-sm font-extrabold text-primary mb-2">Mistake Details:</h5>
                                        {mushafMistakes.map((mistake: any, idx: number) => (
                                          <div
                                            key={mistake.id || idx}
                                            className="p-3 bg-white rounded-xl border-2 border-primary/20 text-sm shadow-md hover:shadow-lg transition-all"
                                          >
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-extrabold">
                                                {mistake.type || 'Mistake'}
                                              </span>
                                              <span className="text-primary font-semibold">
                                                Page {mistake.page}, Surah {mistake.surah}, Ayah {mistake.ayah}
                                              </span>
                                            </div>
                                            {mistake.note && (
                                              <p className="text-primary-soft italic text-xs mt-1">"{mistake.note}"</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
                    </div>
        )}

        {/* Mushaf Modal */}
        {(selectedAssignment || viewingMistakesFor) && (mushafMistakes.length > 0 || personalMushafMistakes.length > 0) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-accent-soft bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] text-white">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold">
                      Mushaf View
                      {viewingMistakesFor && viewingMistakesFor.type !== 'all' && ` - ${viewingMistakesFor.type.toUpperCase()}`}
                      {viewingMistakesFor && viewingMistakesFor.type === 'all' && ' - All Mistakes'}
                    </h2>
                    <p className="text-white/80 text-xs sm:text-sm mt-1">
                      {mushafMistakes.length} assignment mistake(s) • {personalMushafMistakes.length} historical mistake(s)
                    </p>
                      </div>
                  <div className="flex gap-2">
                    {viewingMistakesFor && viewingMistakesFor.type !== 'all' && (
                      <button
                        onClick={() => {
                          const assignment = studentAssignments.find(a => a.id === viewingMistakesFor.assignmentId);
                          if (assignment?.mushafMistakes && assignment.mushafMistakes.length > 0) {
                            setViewingMistakesFor({ assignmentId: viewingMistakesFor.assignmentId, type: 'all' });
                            setMushafPage(assignment.mushafMistakes[0].page);
                          }
                        }}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 text-white rounded-full text-xs sm:text-sm font-semibold hover:bg-white/30 transition-colors whitespace-nowrap"
                      >
                        View All Mistakes
                        </button>
                      )}
                    <button
                      onClick={() => {
                        setSelectedAssignment(null);
                        setViewingMistakesFor(null);
                      }}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 text-white rounded-full text-xs sm:text-sm font-semibold hover:bg-white/30 transition-colors whitespace-nowrap"
                    >
                      Close
                    </button>
                  </div>
                </div>
            </div>

              {/* Mushaf */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
                <div className="w-full max-w-4xl">
                  <InteractiveMushaf
                    currentPage={mushafPage}
                    onPageChange={setMushafPage}
                    mistakes={mushafMistakes}
                    historicalMistakes={personalMushafMistakes}
                    showHistorical={true}
                    readOnly={true}
                    mode="viewing"
                    studentName={currentStudent.fullName}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAssignments;

