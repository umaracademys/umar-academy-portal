import React, { useState, useEffect, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, ClassworkPhase, AssignmentMushafMistake } from '../types/assignment';
import { Ticket } from '../types/ticket';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import { useData } from '../contexts/DataContext';

interface AssignmentFormProps {
  studentId: string;
  assignmentId?: string | null;
  prefillTicket?: Ticket | null;
  onClose: () => void;
  onSave: () => void;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({
  studentId,
  assignmentId,
  prefillTicket,
  onClose,
  onSave
}) => {
  const { students, assignments, addAssignment, updateAssignment, refreshData, addMistakeToPersonalMushaf, getStudentPersonalMushaf } = useBackendData();
  const { user } = useAuth();
  const { teachers } = useData();
  const [isSaving, setIsSaving] = useState(false);

  const student = students.find(s => s.id === studentId);
  const existingAssignment = assignmentId 
    ? assignments.find(a => a.id === assignmentId)
    : null;

  const studentActiveAssignment = useMemo(() => {
    if (assignmentId) return null;
    return assignments
      .filter(a => a.studentId === studentId && a.status === 'active')
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      })[0] || null;
  }, [assignments, studentId, assignmentId]);

  const hasRefreshed = React.useRef(false);
  useEffect(() => {
    if (!hasRefreshed.current) {
      hasRefreshed.current = true;
      refreshData();
    }
  }, []);

  // Form state
  const [classwork, setClasswork] = useState<{
    sabq: ClassworkPhase[];
    sabqi: ClassworkPhase[];
    manzil: ClassworkPhase[];
  }>({
    sabq: [],
    sabqi: [],
    manzil: []
  });

  const [homework, setHomework] = useState<{
    enabled: boolean;
    content: string;
    link: string;
  }>({
    enabled: false,
    content: '',
    link: ''
  });

  const [comment, setComment] = useState('');

  // Mushaf mistakes state - separate for each workflow step
  const [currentPage, setCurrentPage] = useState(1);
  const [mistakes, setMistakes] = useState<MushafMistake[]>([]);
  const [showMushaf, setShowMushaf] = useState<{ sabq: boolean; sabqi: boolean; manzil: boolean }>({
    sabq: false,
    sabqi: false,
    manzil: false
  });
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState<'sabq' | 'sabqi' | 'manzil' | null>(null);
  const [existingMistakes, setExistingMistakes] = useState<MushafMistake[]>([]);

  // Get current user info for marking mistakes
  const currentUserInfo = useMemo(() => {
    if (!user) return { id: '', name: '' };
    
    // Check if user is a teacher
    const teacher = teachers.find(t => t.id === user.id || t.email === user.email);
    if (teacher) {
      return { id: teacher.id, name: teacher.fullName || 'Teacher' };
    }
    
    // Check if user is an admin/superadmin
    return { id: user.id || '', name: user.name || user.email || 'Admin' };
  }, [user, teachers]);

  // Load existing mistakes from student's personal mushaf
  useEffect(() => {
    const loadMistakes = async () => {
      if (!studentId) return;
      
      try {
        const data = await getStudentPersonalMushaf(studentId);
        if (data && data.mistakes) {
          const convertedMistakes: MushafMistake[] = data.mistakes.map((m: any) => ({
            id: m.id,
            type: m.type,
            page: m.page,
            surah: m.surah,
            ayah: m.ayah,
            wordIndex: m.wordIndex,
            letterIndex: m.letterIndex,
            position: m.position,
            note: m.note,
            audioUrl: m.audioUrl,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            workflowStep: m.workflowStep
          } as MushafMistake & { workflowStep?: string }));
          
          setExistingMistakes(convertedMistakes);
        }
      } catch (err) {
        console.error('Error loading existing mistakes:', err);
      }
    };
    
    loadMistakes();
  }, [studentId, getStudentPersonalMushaf]);

  // Initialize form
  useEffect(() => {
    if (existingAssignment) {
      const classworkData = existingAssignment.classwork || { sabq: [], sabqi: [], manzil: [] };
      setClasswork(classworkData);
      const hw = existingAssignment.homework || { enabled: false, content: '', link: '' };
      setHomework({
        enabled: hw.enabled || false,
        content: hw.content || '',
        link: hw.link || ''
      });
      setComment(existingAssignment.comment || '');
      
      // Load existing Mushaf mistakes from assignment
      if (existingAssignment.mushafMistakes && existingAssignment.mushafMistakes.length > 0) {
        const convertedMistakes: MushafMistake[] = existingAssignment.mushafMistakes.map((m: AssignmentMushafMistake) => ({
          id: m.id,
          type: m.type || 'other',
          page: m.page,
          surah: m.surah,
          ayah: m.ayah,
          wordIndex: m.wordIndex,
          position: m.position || { x: 50, y: 50 },
          note: m.note || '',
          audioUrl: m.audioUrl,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          workflowStep: m.workflowStep
        } as MushafMistake));
        setMistakes(convertedMistakes);
      }
    } else if (prefillTicket && prefillTicket.type === 'sabq') {
      setClasswork({
        sabq: [{
          type: 'sabq',
          assignmentRange: '',
          details: prefillTicket.adminComment || ''
        }],
        sabqi: [],
        manzil: []
      });
      setComment(prefillTicket.adminComment || '');
    } else if (studentActiveAssignment) {
      const classworkData = studentActiveAssignment.classwork || { sabq: [], sabqi: [], manzil: [] };
      setClasswork(classworkData);
      const hw = studentActiveAssignment.homework || { enabled: false, content: '', link: '' };
      setHomework({
        enabled: hw.enabled || false,
        content: hw.content || '',
        link: hw.link || ''
      });
      setComment(studentActiveAssignment.comment || '');
    }
  }, [existingAssignment, prefillTicket, assignmentId, studentId, studentActiveAssignment]);

  const addClassworkPhase = (type: 'sabq' | 'sabqi' | 'manzil') => {
    setClasswork(prev => ({
      ...prev,
      [type]: [...prev[type], {
        type,
        assignmentRange: '',
        details: ''
      }]
    }));
  };

  const removeClassworkPhase = (type: 'sabq' | 'sabqi' | 'manzil', index: number) => {
    setClasswork(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateClassworkPhase = (
    type: 'sabq' | 'sabqi' | 'manzil',
    index: number,
    field: keyof ClassworkPhase,
    value: string | number
  ) => {
    setClasswork(prev => ({
      ...prev,
      [type]: prev[type].map((phase, i) => 
        i === index ? { ...phase, [field]: value } : phase
      )
    }));
  };

  // Handle mistake marking
  const handleMistakeMark = async (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    if (!studentId || !currentUserInfo.id || !currentWorkflowStep) {
      alert('Student ID, user info, or workflow step not found');
      return;
    }

    try {
      const newMistake: MushafMistake = {
        ...mistake,
        id: `assignment-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        workflowStep: currentWorkflowStep
      } as MushafMistake & { workflowStep: string };

      // Add to local state immediately
      setMistakes(prev => [...prev, newMistake]);

      // Save to backend (student's personal mushaf) with workflow step
      await addMistakeToPersonalMushaf(
        studentId,
        {
          ...mistake,
          workflowStep: currentWorkflowStep
        },
        currentUserInfo.id,
        currentUserInfo.name
      );
    } catch (err) {
      console.error('Error saving mistake:', err);
      alert('Failed to save mistake. Please try again.');
      // Remove from local state if save failed
      setMistakes(prev => prev.slice(0, -1));
    }
  };

  // Get mistakes for a specific workflow step
  const getMistakesForStep = (step: 'sabq' | 'sabqi' | 'manzil') => {
    return mistakes.filter(m => (m as any).workflowStep === step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!student || !user) {
      alert('Student or user information is missing');
      return;
    }

    const hasClasswork = 
      classwork.sabq.some(p => p.assignmentRange.trim()) ||
      classwork.sabqi.some(p => p.assignmentRange.trim()) ||
      classwork.manzil.some(p => p.assignmentRange.trim());

    if (!hasClasswork && !homework.enabled && !comment.trim()) {
      alert('Please add at least one classwork phase, homework, or comment');
      return;
    }

    const filteredClasswork = {
      sabq: classwork.sabq.filter(p => p.assignmentRange.trim()),
      sabqi: classwork.sabqi.filter(p => p.assignmentRange.trim()),
      manzil: classwork.manzil.filter(p => p.assignmentRange.trim())
    };

    setIsSaving(true);
    try {
      // Convert Mushaf mistakes to AssignmentMushafMistake format
      const mushafMistakes: AssignmentMushafMistake[] = mistakes.map(m => ({
        id: m.id,
        type: m.type,
        page: m.page,
        surah: m.surah,
        ayah: m.ayah,
        wordIndex: m.wordIndex,
        position: m.position,
        note: m.note,
        audioUrl: m.audioUrl,
        workflowStep: (m as any).workflowStep,
        markedBy: currentUserInfo.id,
        markedByName: currentUserInfo.name,
        timestamp: m.timestamp || new Date()
      }));

      const assignmentData: Assignment = {
        id: assignmentId || '',
        studentId: student.id,
        studentName: student.fullName,
        assignedBy: user.id || '',
        assignedByName: user.name || user.email || 'Unknown',
        assignedByRole: (user.role === 'superadmin' ? 'super_admin' : user.role) as 'admin' | 'super_admin' | 'teacher',
        classwork: filteredClasswork,
        homework: {
          enabled: homework.enabled,
          content: homework.content.trim(),
          link: homework.link.trim()
        },
        comment: comment.trim(),
        mushafMistakes: mushafMistakes.length > 0 ? mushafMistakes : undefined,
        status: 'active'
      };

      if (assignmentId && existingAssignment) {
        await updateAssignment(assignmentId, assignmentData);
      } else {
        const assignmentDataWithTicket = prefillTicket && prefillTicket.type === 'sabq' && prefillTicket.id
          ? { ...assignmentData, ticketId: prefillTicket.id }
          : assignmentData;
        await addAssignment(assignmentDataWithTicket);
      }

      onSave();
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert('Failed to save assignment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {assignmentId ? 'Edit' : 'Create'} Assignment
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {student?.fullName || 'Student'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Classwork Section */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Classwork</h3>
            
            {/* Sabq */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Sabq</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMushaf(prev => ({ ...prev, sabq: !prev.sabq }));
                      setCurrentWorkflowStep(prev => prev === 'sabq' ? null : 'sabq');
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      showMushaf.sabq
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'border border-green-600 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {showMushaf.sabq ? 'Hide Mushaf' : '📖 Mushaf'}
                  </button>
                  <button
                    type="button"
                    onClick={() => addClassworkPhase('sabq')}
                    className="px-3 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>
              {classwork.sabq.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">No sabq entries</p>
              ) : (
                <div className="space-y-2">
                  {classwork.sabq.map((phase, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Assignment Range (e.g., Surah Al-Fatiha, Ayah 1-7)"
                          value={phase.assignmentRange}
                          onChange={(e) => updateClassworkPhase('sabq', index, 'assignmentRange', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                          required
                        />
                        <textarea
                          placeholder="Details (optional)"
                          value={phase.details || ''}
                          onChange={(e) => updateClassworkPhase('sabq', index, 'details', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeClassworkPhase('sabq', index)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sabq Mushaf Section */}
              {showMushaf.sabq && (
                <div className="mt-4 border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 mb-2 font-semibold">
                      Mark mistakes for Sabq - {student?.fullName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Sabq mistakes: <strong className="text-green-700">{getMistakesForStep('sabq').length}</strong></span>
                    </div>
                  </div>
                  
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-white" style={{ minHeight: '400px', maxHeight: '500px' }}>
                    <InteractiveMushaf
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      mistakes={getMistakesForStep('sabq').filter(m => m.page === currentPage)}
                      historicalMistakes={existingMistakes.filter(m => m.page === currentPage)}
                      onMistakeMark={handleMistakeMark}
                      readOnly={false}
                      mode="marking"
                      showHistorical={true}
                      showSurahIndexDefault={true}
                      studentName={student?.fullName}
                    />
                  </div>

                  {getMistakesForStep('sabq').length > 0 && (
                    <div className="mt-3 p-2 bg-white rounded border border-green-200">
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {getMistakesForStep('sabq').map((mistake, index) => (
                          <div key={mistake.id || index} className="text-xs text-gray-600 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                              {mistake.type}
                            </span>
                            <span>Page {mistake.page}, Surah {mistake.surah}:{mistake.ayah}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sabqi */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Sabqi</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMushaf(prev => ({ ...prev, sabqi: !prev.sabqi }));
                      setCurrentWorkflowStep(prev => prev === 'sabqi' ? null : 'sabqi');
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      showMushaf.sabqi
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'border border-green-600 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {showMushaf.sabqi ? 'Hide Mushaf' : '📖 Mushaf'}
                  </button>
                  <button
                    type="button"
                    onClick={() => addClassworkPhase('sabqi')}
                    className="px-3 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>
              {classwork.sabqi.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">No sabqi entries</p>
              ) : (
                <div className="space-y-2">
                  {classwork.sabqi.map((phase, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Assignment Range (e.g., Surah Al-Fatiha, Ayah 1-7)"
                          value={phase.assignmentRange}
                          onChange={(e) => updateClassworkPhase('sabqi', index, 'assignmentRange', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                          required
                        />
                        <textarea
                          placeholder="Details (optional)"
                          value={phase.details || ''}
                          onChange={(e) => updateClassworkPhase('sabqi', index, 'details', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeClassworkPhase('sabqi', index)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sabqi Mushaf Section */}
              {showMushaf.sabqi && (
                <div className="mt-4 border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 mb-2 font-semibold">
                      Mark mistakes for Sabqi - {student?.fullName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Sabqi mistakes: <strong className="text-green-700">{getMistakesForStep('sabqi').length}</strong></span>
                    </div>
                  </div>
                  
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-white" style={{ minHeight: '400px', maxHeight: '500px' }}>
                    <InteractiveMushaf
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      mistakes={getMistakesForStep('sabqi').filter(m => m.page === currentPage)}
                      historicalMistakes={existingMistakes.filter(m => m.page === currentPage)}
                      onMistakeMark={handleMistakeMark}
                      readOnly={false}
                      mode="marking"
                      showHistorical={true}
                      showSurahIndexDefault={true}
                      studentName={student?.fullName}
                    />
                  </div>

                  {getMistakesForStep('sabqi').length > 0 && (
                    <div className="mt-3 p-2 bg-white rounded border border-green-200">
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {getMistakesForStep('sabqi').map((mistake, index) => (
                          <div key={mistake.id || index} className="text-xs text-gray-600 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                              {mistake.type}
                            </span>
                            <span>Page {mistake.page}, Surah {mistake.surah}:{mistake.ayah}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Manzil */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Manzil</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMushaf(prev => ({ ...prev, manzil: !prev.manzil }));
                      setCurrentWorkflowStep(prev => prev === 'manzil' ? null : 'manzil');
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      showMushaf.manzil
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'border border-green-600 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {showMushaf.manzil ? 'Hide Mushaf' : '📖 Mushaf'}
                  </button>
                  <button
                    type="button"
                    onClick={() => addClassworkPhase('manzil')}
                    className="px-3 py-1 text-xs font-medium text-primary border border-primary rounded hover:bg-primary hover:text-white transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>
              {classwork.manzil.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">No manzil entries</p>
              ) : (
                <div className="space-y-2">
                  {classwork.manzil.map((phase, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Assignment Range (e.g., Surah Al-Fatiha, Ayah 1-7)"
                          value={phase.assignmentRange}
                          onChange={(e) => updateClassworkPhase('manzil', index, 'assignmentRange', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                          required
                        />
                        <textarea
                          placeholder="Details (optional)"
                          value={phase.details || ''}
                          onChange={(e) => updateClassworkPhase('manzil', index, 'details', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeClassworkPhase('manzil', index)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manzil Mushaf Section */}
              {showMushaf.manzil && (
                <div className="mt-4 border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 mb-2 font-semibold">
                      Mark mistakes for Manzil - {student?.fullName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Manzil mistakes: <strong className="text-green-700">{getMistakesForStep('manzil').length}</strong></span>
                    </div>
                  </div>
                  
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-white" style={{ minHeight: '400px', maxHeight: '500px' }}>
                    <InteractiveMushaf
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      mistakes={getMistakesForStep('manzil').filter(m => m.page === currentPage)}
                      historicalMistakes={existingMistakes.filter(m => m.page === currentPage)}
                      onMistakeMark={handleMistakeMark}
                      readOnly={false}
                      mode="marking"
                      showHistorical={true}
                      showSurahIndexDefault={true}
                      studentName={student?.fullName}
                    />
                  </div>

                  {getMistakesForStep('manzil').length > 0 && (
                    <div className="mt-3 p-2 bg-white rounded border border-green-200">
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {getMistakesForStep('manzil').map((mistake, index) => (
                          <div key={mistake.id || index} className="text-xs text-gray-600 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                              {mistake.type}
                            </span>
                            <span>Page {mistake.page}, Surah {mistake.surah}:{mistake.ayah}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Homework Section */}
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="homework-enabled"
                checked={homework.enabled}
                onChange={(e) => setHomework(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="homework-enabled" className="ml-2 text-sm font-medium text-gray-700">
                Enable Homework
              </label>
            </div>
            
            {homework.enabled && (
              <div className="space-y-3 pl-6 border-l-2 border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Homework Content
                  </label>
                  <textarea
                    value={homework.content}
                    onChange={(e) => setHomework(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                    placeholder="Enter homework instructions..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Homework Link (optional)
                  </label>
                  <input
                    type="url"
                    value={homework.link}
                    onChange={(e) => setHomework(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mushaf Mistakes Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Mushaf Mistakes
              </h3>
              <button
                type="button"
                onClick={() => setShowMushaf(prev => ({ ...prev, [currentWorkflowStep || 'sabq']: !prev[currentWorkflowStep || 'sabq'] }))}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  showMushaf[currentWorkflowStep || 'sabq']
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border border-primary text-primary hover:bg-primary/10'
                }`}
              >
                {showMushaf ? 'Hide Mushaf' : 'Mark Mistakes'}
              </button>
            </div>

            {showMushaf && (
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">
                    Click on words in the Mushaf to mark mistakes. Mistakes will be saved to {student?.fullName}'s Personal Mushaf.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Mistakes marked: <strong className="text-primary">{mistakes.length}</strong></span>
                  </div>
                </div>
                
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white" style={{ minHeight: '500px', maxHeight: '600px' }}>
                  <InteractiveMushaf
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    mistakes={mistakes.filter(m => m.page === currentPage)}
                    historicalMistakes={existingMistakes.filter(m => m.page === currentPage)}
                    onMistakeMark={handleMistakeMark}
                    readOnly={false}
                    mode="marking"
                    showHistorical={true}
                    showSurahIndexDefault={true}
                    studentName={student?.fullName}
                  />
                </div>

                {mistakes.length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Mistakes Marked ({mistakes.length})
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {mistakes.map((mistake, index) => (
                        <div key={mistake.id || index} className="text-xs text-gray-600 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
                            {mistake.type}
                          </span>
                          <span>Page {mistake.page}, Surah {mistake.surah}:{mistake.ayah}</span>
                          {mistake.note && (
                            <span className="text-gray-500 italic">- {mistake.note}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!showMushaf && mistakes.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 bg-blue-50">
                <p className="text-sm text-blue-700">
                  <strong>{mistakes.length}</strong> mistake(s) marked. Click "Mark Mistakes" to add more or review.
                </p>
              </div>
            )}
          </div>

          {/* Comment Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              placeholder="Add any additional comments or notes..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : assignmentId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentForm;
