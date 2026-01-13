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
import HomeworkDisplay from '../../../components/HomeworkDisplay';

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
  const [showMushafForAssignment, setShowMushafForAssignment] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, {
    classwork?: boolean;
    homework?: boolean;
    mistakes?: boolean;
  }>>({});
  const [showHomeworkOnly, setShowHomeworkOnly] = useState(false);

  const currentStudent = getStudentByEmail(user?.email || '') || students[0];

  // Helper function to normalize IDs for consistent comparison
  const normalizeId = (id: any): string => {
    if (!id) return '';
    if (id && typeof id === 'object' && id.toString && typeof id.toString === 'function') {
      const str = id.toString();
      if (/^[0-9a-fA-F]{24}$/.test(str)) {
        return str;
      }
      return str.trim();
    }
    return String(id).trim();
  };

  // Get student's assignments from backend
  const studentAssignments = useMemo(() => {
    if (!currentStudent?.id) return [];
    
    // Normalize student IDs for comparison
    const normalizedStudentId = normalizeId(currentStudent.id);
    const normalizedUserId = normalizeId((currentStudent as any).userId);
    
    return backendAssignments
      .filter((assignment: any) => {
        const assignmentStudentId = normalizeId(assignment.studentId || assignment._id?.studentId);
        
        // Check if assignment matches EITHER Student document _id OR User document _id
        const matchesStudentId = assignmentStudentId && (
          assignmentStudentId === normalizedStudentId ||
          assignmentStudentId === normalizeId(currentStudent.id?.toString()) ||
          String(assignmentStudentId) === String(normalizedStudentId)
        );
        
        const matchesUserId = normalizedUserId && assignmentStudentId && (
          assignmentStudentId === normalizedUserId ||
          assignmentStudentId === normalizeId((currentStudent as any).userId?.toString()) ||
          String(assignmentStudentId) === String(normalizedUserId)
        );
        
        const matchesStudent = matchesStudentId || matchesUserId;
        
        if (!matchesStudent) return false;
        
        // If homework filter is enabled, only show assignments with homework
        if (showHomeworkOnly) {
          return assignment.homework?.enabled === true && (
            (assignment.homework?.items && assignment.homework.items.length > 0) ||
            assignment.homework?.content ||
            assignment.homework?.pdfId
          );
        }
        
        return true;
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
  }, [backendAssignments, currentStudent, showHomeworkOnly]);

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

  // Load personal mushaf when assignment is selected
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
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

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
      
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-2">
        {/* Header - Compact */}
        <div className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
          <div>
            <h1 className="text-lg font-bold text-primary">My Assignments</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHomeworkOnly(!showHomeworkOnly)}
              className={`w-full sm:w-auto px-2.5 py-1.5 border rounded text-xs font-semibold transition-colors ${
                showHomeworkOnly
                  ? 'bg-primary text-white border-primary hover:bg-primary/90'
                  : 'border-gray-300 text-primary hover:bg-gray-50'
              }`}
            >
              {showHomeworkOnly ? 'Show All' : 'Previous Homework Only'}
            </button>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="w-full sm:w-auto px-2.5 py-1.5 border border-gray-300 text-primary rounded text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Statistics - Compact */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Card title="Total">
            <div className="text-xl font-bold text-primary">{studentAssignments.length}</div>
          </Card>
          <Card title="Active">
            <div className="text-xl font-bold text-blue-600">
              {studentAssignments.filter((a: any) => a.status === 'active').length}
            </div>
          </Card>
          <Card title="Done">
            <div className="text-xl font-bold text-green-600">
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
                  <div className="space-y-6">
                    {dayAssignments.map((assignment: any) => {
                      const isSelected = selectedAssignment === assignment.id;
                      const classwork = assignment.classwork || { sabq: [], sabqi: [], manzil: [] };
                      const hasClasswork = classwork.sabq.length > 0 || classwork.sabqi.length > 0 || classwork.manzil.length > 0;
                      const hasHomework = assignment.homework?.enabled;
                      const hasMushafMistakes = assignment.mushafMistakes && assignment.mushafMistakes.length > 0;
                      const currentViewingMistakes = viewingMistakesFor?.assignmentId === assignment.id ? viewingMistakesFor : null;
                      const displayMistakes = currentViewingMistakes ? mushafMistakes : (hasMushafMistakes ? (assignment.mushafMistakes || []).map((m: any) => ({
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
                      })) : []);

                      return (
                        <div
                          key={assignment.id}
                          className={`border rounded p-2 transition-all ${
                            isSelected 
                              ? 'border-primary bg-soft-primary' 
                              : 'border-gray-200 hover:border-primary bg-white'
                          }`}
                        >
                          {/* Assignment Header - Compact */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 mb-1.5">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                <h3 className="text-sm font-bold text-primary">
                                  Assignment #{studentAssignments.indexOf(assignment) + 1}
                                </h3>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                  assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  assignment.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {assignment.status === 'active' ? 'Active' : assignment.status}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-600 mb-1">
                                <span>By: {assignment.assignedByName || 'Teacher'}</span>
                                <span>•</span>
                                <span>{formatDate(assignment.createdAt)}</span>
                              </div>
                              {assignment.comment && (
                                <p className="text-[10px] text-gray-600 italic mt-1">"{assignment.comment.substring(0, 60)}..."</p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAssignment(null);
                                  setViewingMistakesFor(null);
                                } else {
                                  setSelectedAssignment(assignment.id);
                                  if (hasMushafMistakes && assignment.mushafMistakes.length > 0) {
                                    setMushafPage(assignment.mushafMistakes[0].page);
                                  }
                                }
                              }}
                              className="w-full sm:w-auto px-2 py-1 bg-soft-primary text-primary rounded text-xs font-semibold hover:bg-primary/10 transition-colors"
                            >
                              {isSelected ? 'Hide' : 'View'}
                            </button>
                          </div>

                          {/* Assignment Details (when expanded) - Compact */}
                          {isSelected && (
                            <div className="mt-1.5 pt-1.5 border-t border-gray-200 space-y-2">
                              {/* Integrated Layout: Assignment Info and Mushaf Side by Side */}
                              <div className={`grid gap-2 ${hasMushafMistakes ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                                {/* Left Column: Assignment Details */}
                                <div className="space-y-2">
                                  {/* Classwork Section - Wrapped */}
                                  {hasClasswork && (
                                    <div className="p-1.5 bg-soft-primary rounded border border-gray-200">
                                      <button
                                        onClick={() => setExpandedSections(prev => ({
                                          ...prev,
                                          [assignment.id]: {
                                            ...prev[assignment.id],
                                            classwork: !prev[assignment.id]?.classwork
                                          }
                                        }))}
                                        className="w-full flex items-center justify-between mb-1"
                                      >
                                        <h4 className="text-xs font-semibold text-primary">Classwork</h4>
                                        <span className="text-[9px] text-gray-600">
                                          {expandedSections[assignment.id]?.classwork ? '▼' : '▶'}
                                        </span>
                                      </button>
                                      {expandedSections[assignment.id]?.classwork && (
                                      <div className="space-y-1.5">
                                        {/* Sabq - Compact */}
                                        {classwork.sabq.length > 0 && (
                                          <div>
                                            <span className="text-[10px] font-semibold text-gray-600">Sabq:</span>
                                            <ul className="ml-2 mt-0.5 space-y-0.5">
                                              {classwork.sabq.map((phase: any, idx: number) => {
                                                const phaseMistakes = getMistakesForPhase(assignment, 'sabq', idx);
                                                const hasMistakes = phaseMistakes.length > 0;
                                                return (
                                                  <li key={idx} className="text-[10px] text-gray-700 flex items-center justify-between gap-1.5">
                                                    <span>• {phase.assignmentRange || phase.details || 'Sabq'}</span>
                                                    {hasMistakes && (
                                                      <button
                                                        onClick={() => {
                                                          setViewingMistakesFor({ assignmentId: assignment.id, type: 'sabq', index: idx });
                                                          if (phaseMistakes.length > 0) {
                                                            setMushafPage(phaseMistakes[0].page);
                                                          }
                                                        }}
                                                        className={`px-1 py-0.5 text-[9px] rounded transition-colors ${
                                                          currentViewingMistakes?.type === 'sabq' && currentViewingMistakes?.index === idx
                                                            ? 'bg-primary text-white'
                                                            : 'bg-primary/20 text-primary hover:bg-primary/30'
                                                        }`}
                                                      >
                                                        View ({phaseMistakes.length})
                                                      </button>
                                                    )}
                                                  </li>
                                                );
                                              })}
                                            </ul>
                                          </div>
                                        )}
                                        
                                        {/* Sabqi - Compact */}
                                        {classwork.sabqi.length > 0 && (
                                          <div>
                                            <span className="text-[10px] font-semibold text-gray-600">Sabqi:</span>
                                            <ul className="ml-2 mt-0.5 space-y-0.5">
                                              {classwork.sabqi.map((phase: any, idx: number) => {
                                                const phaseMistakes = getMistakesForPhase(assignment, 'sabqi', idx);
                                                const hasMistakes = phaseMistakes.length > 0;
                                                return (
                                                  <li key={idx} className="text-[10px] text-gray-700 flex items-center justify-between gap-1.5">
                                                    <span>• {phase.assignmentRange || phase.details || 'Sabqi'}</span>
                                                    {hasMistakes && (
                                                      <button
                                                        onClick={() => {
                                                          setViewingMistakesFor({ assignmentId: assignment.id, type: 'sabqi', index: idx });
                                                          if (phaseMistakes.length > 0) {
                                                            setMushafPage(phaseMistakes[0].page);
                                                          }
                                                        }}
                                                        className={`px-1 py-0.5 text-[9px] rounded transition-colors ${
                                                          currentViewingMistakes?.type === 'sabqi' && currentViewingMistakes?.index === idx
                                                            ? 'bg-primary text-white'
                                                            : 'bg-primary/20 text-primary hover:bg-primary/30'
                                                        }`}
                                                      >
                                                        View ({phaseMistakes.length})
                                                      </button>
                                                    )}
                                                  </li>
                                                );
                                              })}
                                            </ul>
                                          </div>
                                        )}
                                        
                                        {/* Manzil - Compact */}
                                        {classwork.manzil.length > 0 && (
                                          <div>
                                            <span className="text-[10px] font-semibold text-gray-600">Manzil:</span>
                                            <ul className="ml-2 mt-0.5 space-y-0.5">
                                              {classwork.manzil.map((phase: any, idx: number) => {
                                                const phaseMistakes = getMistakesForPhase(assignment, 'manzil', idx);
                                                const hasMistakes = phaseMistakes.length > 0;
                                                return (
                                                  <li key={idx} className="text-[10px] text-gray-700 flex items-center justify-between gap-1.5">
                                                    <span>• {phase.assignmentRange || phase.details || 'Manzil'}</span>
                                                    {hasMistakes && (
                                                      <button
                                                        onClick={() => {
                                                          setViewingMistakesFor({ assignmentId: assignment.id, type: 'manzil', index: idx });
                                                          if (phaseMistakes.length > 0) {
                                                            setMushafPage(phaseMistakes[0].page);
                                                          }
                                                        }}
                                                        className={`px-1 py-0.5 text-[9px] rounded transition-colors ${
                                                          currentViewingMistakes?.type === 'manzil' && currentViewingMistakes?.index === idx
                                                            ? 'bg-primary text-white'
                                                            : 'bg-primary/20 text-primary hover:bg-primary/30'
                                                        }`}
                                                      >
                                                        View ({phaseMistakes.length})
                                                      </button>
                                                    )}
                                                  </li>
                                                );
                                              })}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Homework Section - Wrapped */}
                                  {hasHomework && (
                                    <div className="p-1.5 bg-soft-accent rounded border border-gray-200">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-1.5">
                                        <button
                                          onClick={() => setExpandedSections(prev => ({
                                            ...prev,
                                            [assignment.id]: {
                                              ...prev[assignment.id],
                                              homework: !prev[assignment.id]?.homework
                                            }
                                          }))}
                                          className="flex items-center gap-1"
                                        >
                                          <h4 className="text-xs font-semibold text-primary">Homework</h4>
                                          <span className="text-[9px] text-gray-600">
                                            {expandedSections[assignment.id]?.homework ? '▼' : '▶'}
                                          </span>
                                        </button>
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
                                      
                                      {expandedSections[assignment.id]?.homework && (
                                      <>
                                      {/* Display Homework using HomeworkDisplay component */}
                                      <HomeworkDisplay 
                                        homework={assignment.homework} 
                                        showSubmission={false}
                                      />

                                      {/* Homework Submission Status - Wrapped */}
                                      {assignment.homework.submission?.submitted && expandedSections[assignment.id]?.homework && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <h5 className="text-[10px] font-semibold text-primary mb-1.5">Your Submission:</h5>
                                          {assignment.homework.submission.submittedAt && (
                                            <p className="text-[10px] text-gray-600 mb-1">
                                              Submitted: {formatDate(assignment.homework.submission.submittedAt)}
                                            </p>
                                          )}
                                          {assignment.homework.submission.content && (
                                            <p className="text-[10px] text-gray-700 mb-1">{assignment.homework.submission.content}</p>
                                          )}
                                          {assignment.homework.submission.link && (
                                            <a 
                                              href={assignment.homework.submission.link} 
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 mb-1"
                                            >
                                              🔗 {assignment.homework.submission.link.substring(0, 40)}...
                                            </a>
                                          )}
                                          {assignment.homework.submission.audioUrl && (
                                            <div className="mb-1">
                                              <p className="text-[9px] font-semibold text-gray-600 mb-0.5">Audio:</p>
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
                                            <div className="mb-1">
                                              <p className="text-[9px] font-semibold text-gray-600 mb-0.5">Attachments:</p>
                                              {assignment.homework.submission.attachments.map((att, idx) => (
                                                <a
                                                  key={idx}
                                                  href={att.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-[9px] text-primary hover:underline inline-flex items-center gap-1 mr-1"
                                                >
                                                  📎 {att.name}
                                                </a>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {/* Feedback */}
                                          {assignment.homework.submission.feedback && (
                                            <div className="mt-1.5 p-1.5 bg-white rounded border border-gray-200">
                                              <p className="text-[10px] font-semibold text-primary mb-0.5">Feedback:</p>
                                              <p className="text-[10px] text-gray-700">{assignment.homework.submission.feedback}</p>
                                              {assignment.homework.submission.gradedByName && (
                                                <p className="text-[9px] text-gray-500 mt-0.5">
                                                  - {assignment.homework.submission.gradedByName}
                                                  {assignment.homework.submission.gradedAt && ` (${formatDate(assignment.homework.submission.gradedAt)})`}
                                                </p>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* Grade */}
                                          {assignment.homework.submission.grade !== undefined && assignment.homework.submission.grade !== null && (
                                            <div className="mt-1.5">
                                              <span className="text-[10px] font-semibold text-primary">Grade: </span>
                                              <span className="text-sm font-bold text-primary">{assignment.homework.submission.grade}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Homework Submission Form */}
                                      {showHomeworkForm === assignment.id && !assignment.homework.submission?.submitted && expandedSections[assignment.id]?.homework && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <h5 className="text-xs font-semibold text-primary mb-1.5">Submit Your Homework</h5>
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
                                                        className="px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg sm:rounded-full font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 touch-target min-h-[44px] text-sm sm:text-base"
                                                      >
                                                        <span className="w-3 h-3 bg-white rounded-full"></span>
                                                        Start Recording
                                                      </button>
                                                    ) : (
                                                      <div className="flex items-center gap-3">
                                                        <button
                                                          type="button"
                                                          onClick={stopRecording}
                                                          className="px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg sm:rounded-full font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 touch-target min-h-[44px] text-sm sm:text-base"
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
                                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                              <button
                                                onClick={() => {
                                                  if (isRecording && mediaRecorder) {
                                                    stopRecording();
                                                  }
                                                  setShowHomeworkForm(null);
                                                  setHomeworkSubmission({ content: '', link: '', attachments: [] });
                                                  setAudioBlob(null);
                                                  setAudioUrl(null);
                                                  setRecordingTime(0);
                                                }}
                                                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-accent-soft text-primary rounded-lg sm:rounded-full font-semibold hover:bg-soft-accent transition-colors touch-target min-h-[44px] text-sm sm:text-base"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                onClick={() => handleSubmitHomework(assignment.id)}
                                                disabled={isSubmittingHomework}
                                                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-primary text-white rounded-lg sm:rounded-full font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target min-h-[44px] text-sm sm:text-base"
                                              >
                                                {isSubmittingHomework ? 'Submitting...' : 'Submit'}
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Right Column: Integrated Mushaf - Wrapped until clicked */}
                                <div className={`space-y-2 ${hasMushafMistakes ? '' : 'lg:col-span-1'}`}>
                                  <div className="p-1.5 bg-primary/5 rounded border border-primary/20">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <h4 className="text-xs font-bold text-primary">
                                        Personal Mushaf
                                      </h4>
                                      <button
                                        onClick={() => {
                                          if (showMushafForAssignment === assignment.id) {
                                            setShowMushafForAssignment(null);
                                          } else {
                                            setShowMushafForAssignment(assignment.id);
                                          }
                                        }}
                                        className="px-1.5 py-0.5 text-[9px] bg-primary/20 text-primary rounded font-semibold hover:bg-primary/30 transition-colors"
                                      >
                                        {showMushafForAssignment === assignment.id ? 'Hide' : 'Show'}
                                      </button>
                                    </div>
                                    
                                    {showMushafForAssignment === assignment.id && (
                                      <>
                                        {currentViewingMistakes && (
                                          <div className="mb-1.5 p-1 bg-primary/5 rounded text-[10px]">
                                            <p className="text-[10px] text-gray-600">
                                              Showing: <span className="font-semibold text-primary">{currentViewingMistakes.type.toUpperCase()}</span>
                                              {currentViewingMistakes.index !== undefined && ` (Phase ${(currentViewingMistakes.index || 0) + 1})`}
                                            </p>
                                          </div>
                                        )}
                                        
                                        {!hasMushafMistakes && !currentViewingMistakes && (
                                          <div className="mb-1.5 p-1.5 bg-blue-50 rounded border border-blue-200 text-[10px] text-blue-700">
                                            No mistakes marked yet.
                                          </div>
                                        )}
                                        
                                        <div className="bg-white rounded p-1.5 border border-primary/20 min-h-[300px]">
                                          <InteractiveMushaf
                                            currentPage={mushafPage}
                                            onPageChange={setMushafPage}
                                            mistakes={displayMistakes}
                                            historicalMistakes={personalMushafMistakes}
                                            showHistorical={true}
                                            onMistakeMark={() => {}}
                                            readOnly={true}
                                            mode="viewing"
                                            showSurahIndexDefault={true}
                                            studentName={currentStudent.fullName}
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Mistake Report - Wrapped */}
                                  {displayMistakes.length > 0 && (
                                    <div className="mt-2 p-1.5 bg-white rounded border border-primary/20">
                                      <button
                                        onClick={() => setExpandedSections(prev => ({
                                          ...prev,
                                          [assignment.id]: {
                                            ...prev[assignment.id],
                                            mistakes: !prev[assignment.id]?.mistakes
                                          }
                                        }))}
                                        className="w-full flex items-center justify-between mb-1.5"
                                      >
                                        <h5 className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                          <span>Mistake Report</span>
                                          <span className="text-[9px] bg-primary text-white px-1 py-0.5 rounded">
                                            {displayMistakes.length}
                                          </span>
                                        </h5>
                                        <span className="text-[9px] text-gray-600">
                                          {expandedSections[assignment.id]?.mistakes ? '▼' : '▶'}
                                        </span>
                                      </button>
                                      {expandedSections[assignment.id]?.mistakes && (
                                      <>
                                      <div className="mb-1.5">
                                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                                          {(() => {
                                            const regularMistakes = displayMistakes.filter((m: any) => {
                                              const type = (m.type || '').toLowerCase();
                                              const isAtkee = type === 'atkee' || type.includes('atkee');
                                              const isTajweed = ['madd', 'ikhfa', 'holding', 'tech', 'mad (elongation) mistake', 'ikhfa mistake', 'ghunna mistake', 'holding/fluency mistake'].some(t => type.includes(t));
                                              return !isAtkee && !isTajweed;
                                            });
                                            const atkeeMistakes = displayMistakes.filter((m: any) => {
                                              const type = (m.type || '').toLowerCase();
                                              return type === 'atkee' || type.includes('atkee');
                                            });
                                            const tajweedMistakes = displayMistakes.filter((m: any) => {
                                              const type = (m.type || '').toLowerCase();
                                              return ['madd', 'ikhfa', 'holding', 'tech', 'mad (elongation) mistake', 'ikhfa mistake', 'ghunna mistake', 'holding/fluency mistake'].some(t => type.includes(t));
                                            });
                                            
                                            return (
                                              <>
                                                {regularMistakes.length > 0 && (
                                                  <span className="px-1 py-0.5 bg-red-100 text-red-800 rounded text-[9px] font-semibold">
                                                    Mistakes: {regularMistakes.length}
                                                  </span>
                                                )}
                                                {atkeeMistakes.length > 0 && (
                                                  <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-[9px] font-semibold">
                                                    Atkee: {atkeeMistakes.length}
                                                  </span>
                                                )}
                                                {tajweedMistakes.length > 0 && (
                                                  <span className="px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[9px] font-semibold">
                                                    Tajweed: {tajweedMistakes.length}
                                                  </span>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {displayMistakes.map((mistake: any, idx: number) => (
                                          <div
                                            key={mistake.id || idx}
                                            className="p-1.5 bg-gray-50 rounded border border-gray-200 text-[10px] hover:shadow-sm transition-shadow"
                                          >
                                            <div className="flex items-start justify-between gap-1.5">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                  <span className="px-1 py-0.5 rounded bg-primary text-white text-[9px] font-semibold">
                                                    {mistake.type || 'Mistake'}
                                                  </span>
                                                  <span className="text-primary font-medium text-[9px]">
                                                    P{mistake.page}, S{mistake.surah}, A{mistake.ayah}
                                                  </span>
                                                </div>
                                                {mistake.note && (
                                                  <p className="text-gray-600 italic text-[9px] mt-0.5">"{mistake.note}"</p>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
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
      </div>
    </div>
  );
};

export default StudentAssignments;
