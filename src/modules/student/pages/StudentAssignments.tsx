import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import { useData } from '../../../contexts/DataContext';
import { useBackendData } from '../../../contexts/BackendDataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import { HomeworkSubmission } from '../../../types/assignment';
import { uploadMistakeAudio } from '../../../services/audioService';
import HomeworkDisplay from '../../../components/HomeworkDisplay';
import ClassworkEntryCard from '../../../components/ClassworkEntryCard';

const StudentAssignments: React.FC = () => {
  const navigate = useNavigate();
  const { students, getStudentByEmail } = useData();
  const { assignments: backendAssignments, getStudentPersonalMushaf, getStudentByIdentity } = useBackendData();
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Unified Student Identity: Find student by email OR userId (ID-agnostic lookup)
  const currentStudent = useMemo(() => {
    if (!user) return undefined;
    
    // Try unified lookup (email OR userId)
    let student = getStudentByIdentity?.(user.email, user.id);
    
    // Fallback to email-only lookup (for backward compatibility)
    if (!student && user.email) {
      student = getStudentByEmail(user.email);
    }
    
    // Last resort: try to find by userId directly
    if (!student && user.id) {
      const normalizeId = (id: any): string => {
        if (!id) return '';
        if (id && typeof id === 'object' && id.toString && typeof id.toString === 'function') {
          const str = id.toString();
          if (/^[0-9a-fA-F]{24}$/.test(str)) return str;
          return str.trim();
        }
        return String(id).trim();
      };
      
      const normalizedUserId = normalizeId(user.id);
      student = students.find(s => {
        const sUserId = normalizeId((s as any).userId);
        return sUserId === normalizedUserId;
      });
    }
    
    return student || undefined; // Return undefined instead of students[0] to avoid wrong student
  }, [user, students, getStudentByIdentity, getStudentByEmail]);

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
  }, [backendAssignments, currentStudent, showHomeworkOnly, normalizeId]);

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

  const formatDate = useCallback((date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

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
      <AppLayout
        sidebar={<Sidebar onClose={() => setSidebarOpen(false)} isOpen={sidebarOpen} />}
        isSidebarOpen={sidebarOpen}
        onMenuClick={() => setSidebarOpen(true)}
        onOverlayClick={() => setSidebarOpen(false)}
      >
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center">
              <h1 className="heading-page mb-2">Student Profile Not Found</h1>
              <p className="body-text text-gray-600 mb-6">We couldn&apos;t find your student profile.</p>
              <Button onClick={() => navigate('/student/dashboard')} fullWidthMobile>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      sidebar={<Sidebar onClose={() => setSidebarOpen(false)} isOpen={sidebarOpen} />}
      isSidebarOpen={sidebarOpen}
      onMenuClick={() => setSidebarOpen(true)}
      onOverlayClick={() => setSidebarOpen(false)}
    >
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page title outside cards */}
          <div className="mb-6">
            <h1 className="heading-page">My assignments</h1>
            <p className="caption mt-1">
              Your current classwork and homework
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            <Button
              variant={showHomeworkOnly ? 'primary' : 'outline'}
              onClick={() => setShowHomeworkOnly(!showHomeworkOnly)}
              fullWidthMobile
              size="md"
            >
              {showHomeworkOnly ? 'Show All' : 'Previous Homework Only'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/student/dashboard')} fullWidthMobile size="md">
              Back to Dashboard
            </Button>
          </div>

          {/* Assignments List - single white panel */}
          {studentAssignments.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
              <div className="text-center py-8">
                <p className="body-text text-gray-700 mb-2">No assignments yet</p>
                <p className="caption text-gray-600">New assignments from your teacher will appear here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {(Object.entries(groupedAssignments) as [string, any[]][])
                .sort(([dateA], [dateB]) => {
                  const a = new Date(dateA);
                  const b = new Date(dateB);
                  return b.getTime() - a.getTime();
                })
                .map(([date, dayAssignments]) => (
                  <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b border-gray-200">
                      <h2 className="heading-card">{date}</h2>
                    </div>
                    <div className="p-4 sm:p-5 space-y-6">
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
                                <h3 className="heading-card">
                                  Assignment #{studentAssignments.indexOf(assignment) + 1}
                                </h3>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                  {assignment.status === 'active' ? 'Active' : assignment.status === 'completed' ? 'Completed' : assignment.status === 'archived' ? 'Archived' : assignment.status}
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
                            <Button
                              variant="outline"
                              size="sm"
                              fullWidthMobile
                              className="min-h-[44px]"
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
                            >
                              {isSelected ? 'Hide' : 'View assignment'}
                            </Button>
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
                                      <div className="space-y-3">
                                        {/* ✅ FIX: Use standardized ClassworkEntryCard for all classwork types */}
                                        {/* Sabq */}
                                        {classwork.sabq.length > 0 && (
                                          <div>
                                            <span className="text-[10px] font-semibold text-gray-600 mb-2 block">Sabq:</span>
                                            <div className="space-y-2">
                                              {classwork.sabq.map((phase: any, idx: number) => {
                                                const phaseMistakes = getMistakesForPhase(assignment, 'sabq', idx);
                                                return (
                                                  <div key={idx} className="space-y-1">
                                                    <ClassworkEntryCard
                                                      phase={phase}
                                                      type="sabq"
                                                      index={idx}
                                                      showDate={true}
                                                      className="text-sm"
                                                    />
                                                    {phaseMistakes.length > 0 && (
                                                      <div className="flex justify-end">
                                                        <button
                                                          onClick={() => {
                                                            setViewingMistakesFor({ assignmentId: assignment.id, type: 'sabq', index: idx });
                                                            if (phaseMistakes.length > 0) {
                                                              setMushafPage(phaseMistakes[0].page);
                                                            }
                                                          }}
                                                          className={`px-2 py-1 text-xs rounded transition-colors ${
                                                            currentViewingMistakes?.type === 'sabq' && currentViewingMistakes?.index === idx
                                                              ? 'bg-primary text-white'
                                                              : 'bg-primary/20 text-primary hover:bg-primary/30'
                                                          }`}
                                                        >
                                                          View Mushaf ({phaseMistakes.length})
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Sabqi */}
                                        {classwork.sabqi.length > 0 && (
                                          <div>
                                            <span className="text-[10px] font-semibold text-gray-600 mb-2 block">Sabqi:</span>
                                            <div className="space-y-2">
                                              {classwork.sabqi.map((phase: any, idx: number) => {
                                                const phaseMistakes = getMistakesForPhase(assignment, 'sabqi', idx);
                                                return (
                                                  <div key={idx} className="space-y-1">
                                                    <ClassworkEntryCard
                                                      phase={phase}
                                                      type="sabqi"
                                                      index={idx}
                                                      showDate={true}
                                                      className="text-sm"
                                                    />
                                                    {phaseMistakes.length > 0 && (
                                                      <div className="flex justify-end">
                                                        <button
                                                          onClick={() => {
                                                            setViewingMistakesFor({ assignmentId: assignment.id, type: 'sabqi', index: idx });
                                                            if (phaseMistakes.length > 0) {
                                                              setMushafPage(phaseMistakes[0].page);
                                                            }
                                                          }}
                                                          className={`px-2 py-1 text-xs rounded transition-colors ${
                                                            currentViewingMistakes?.type === 'sabqi' && currentViewingMistakes?.index === idx
                                                              ? 'bg-primary text-white'
                                                              : 'bg-primary/20 text-primary hover:bg-primary/30'
                                                          }`}
                                                        >
                                                          View Mushaf ({phaseMistakes.length})
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Manzil */}
                                        {classwork.manzil.length > 0 && (
                                          <div>
                                            <span className="text-[10px] font-semibold text-gray-600 mb-2 block">Manzil:</span>
                                            <div className="space-y-2">
                                              {classwork.manzil.map((phase: any, idx: number) => {
                                                const phaseMistakes = getMistakesForPhase(assignment, 'manzil', idx);
                                                return (
                                                  <div key={idx} className="space-y-1">
                                                    <ClassworkEntryCard
                                                      phase={phase}
                                                      type="manzil"
                                                      index={idx}
                                                      showDate={true}
                                                      className="text-sm"
                                                    />
                                                    {phaseMistakes.length > 0 && (
                                                      <div className="flex justify-end">
                                                        <button
                                                          onClick={() => {
                                                            setViewingMistakesFor({ assignmentId: assignment.id, type: 'manzil', index: idx });
                                                            if (phaseMistakes.length > 0) {
                                                              setMushafPage(phaseMistakes[0].page);
                                                            }
                                                          }}
                                                          className={`px-2 py-1 text-xs rounded transition-colors ${
                                                            currentViewingMistakes?.type === 'manzil' && currentViewingMistakes?.index === idx
                                                              ? 'bg-primary text-white'
                                                              : 'bg-primary/20 text-primary hover:bg-primary/30'
                                                          }`}
                                                        >
                                                          View Mushaf ({phaseMistakes.length})
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
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
                                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                            {assignment.homework.submission.status === 'graded' 
                                              ? 'Graded' 
                                              : assignment.homework.submission.status === 'returned'
                                              ? 'Returned'
                                              : 'Submitted'}
                                          </span>
                                        ) : (
                                          <Button
                                            variant="primary"
                                            size="sm"
                                            fullWidthMobile
                                            onClick={() => {
                                              setShowHomeworkForm(assignment.id);
                                              setHomeworkSubmission({ content: '', link: '', attachments: [] });
                                            }}
                                          >
                                            Submit Homework
                                          </Button>
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
                                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                              <Button
                                                variant="outline"
                                                fullWidthMobile
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
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                variant="primary"
                                                fullWidthMobile
                                                isLoading={isSubmittingHomework}
                                                disabled={isSubmittingHomework}
                                                onClick={() => handleSubmitHomework(assignment.id)}
                                              >
                                                {isSubmittingHomework ? 'Saving...' : 'Save'}
                                              </Button>
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
                                      <h4 className="heading-card text-sm">Personal Mushaf</h4>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                          if (showMushafForAssignment === assignment.id) {
                                            setShowMushafForAssignment(null);
                                          } else {
                                            setShowMushafForAssignment(assignment.id);
                                          }
                                        }}
                                      >
                                        {showMushafForAssignment === assignment.id ? 'Hide' : 'Show'}
                                      </Button>
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
                                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 body-text text-gray-700"
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
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentAssignments;
