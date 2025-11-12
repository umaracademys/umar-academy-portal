import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import type { ClassworkSection } from '../types/assignment';
import type { Student } from '../types';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const STEP_CONFIG = {
  sabq: {
    label: 'Sabq',
    emoji: '✨',
    description: 'Primary new lesson portion for today.',
  },
  sabqi: {
    label: 'Sabqi',
    emoji: '🧠',
    description: 'Recent retention review to reinforce yesterday\'s work.',
  },
  manzil: {
    label: 'Manzil',
    emoji: '🔁',
    description: 'Long-term revision to maintain mastery.',
  },
} as const;

type StepKey = keyof typeof STEP_CONFIG;

interface ModernAssignmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  assignment?: any;
  isEdit?: boolean;
}

type StepState = {
  portion: string;
  notes: string;
};

const defaultStepState: StepState = { portion: '', notes: '' };

const ModernAssignmentForm: React.FC<ModernAssignmentFormProps> = ({
  onClose,
  onSuccess,
  assignment,
  isEdit = false,
}) => {
  const { students, addAssignment, updateAssignment } = useData();
  const { user } = useAuth();

  const [studentsFromApi, setStudentsFromApi] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentFetchError, setStudentFetchError] = useState<string | null>(null);
  const [assignmentsFromApi, setAssignmentsFromApi] = useState<any[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [assignmentFetchError, setAssignmentFetchError] = useState<string | null>(null);

  const [selectedProgram, setSelectedProgram] = useState<string>(assignment?.program || '');
  const [activeLetter, setActiveLetter] = useState<string>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    assignment?.assignedTo?.[0] || '',
  );
  const [assignmentTitle, setAssignmentTitle] = useState<string>(
    assignment?.title || 'Manual Recitation Assignment',
  );
  const [dueDate, setDueDate] = useState<string>(() => {
    if (assignment?.dueDate) {
      try {
        return new Date(assignment.dueDate).toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    }
    return new Date().toISOString().split('T')[0];
  });
  const [generalComments, setGeneralComments] = useState<string>(
    assignment?.description || '',
  );
  const [homeworkText, setHomeworkText] = useState<string>(
    assignment?.homeworkComments || '',
  );
  const [classworkDetails, setClassworkDetails] = useState<Record<StepKey, StepState>>(() => {
    const initial: Record<StepKey, StepState> = {
      sabq: { ...defaultStepState },
      sabqi: { ...defaultStepState },
      manzil: { ...defaultStepState },
    };

    if (assignment?.classworkSections?.length) {
      assignment.classworkSections.forEach((section: ClassworkSection) => {
        const step = section.step as StepKey;
        if (step && initial[step]) {
          initial[step] = {
            portion: section.assignmentRange || section.summary || '',
            notes: section.summary || section.details || '',
          };
        }
      });
    }

    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleTouched, setTitleTouched] = useState<boolean>(Boolean(assignment?.title));

  const allStudents = useMemo<Student[]>(() => {
    return studentsFromApi.length > 0 ? studentsFromApi : students;
  }, [studentsFromApi, students]);

  useEffect(() => {
    const API_BASE =
      (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      setStudentFetchError(null);
      try {
        const response = await fetch(`${API_BASE}/students`);
        if (!response.ok) {
          throw new Error(`Failed to load students (${response.status})`);
        }
        const payload = await response.json();
        if (Array.isArray(payload)) {
          const normalizedStudents: Student[] = payload.map((student: any) => ({
            id: student._id || student.id,
            fullName: student.fullName || student.name || 'Unnamed Student',
            email: student.email || '',
            parentName: student.parentName || '',
            contact: student.contact || '',
            program: student.program || student.programName || '',
            siblings: student.siblings || [],
            tuitionFee: student.tuitionFee || 0,
            registrationAmount: student.registrationAmount || 0,
            assignedTeacher: student.assignedTeacher || '',
            schedule: student.schedule || ({} as any),
            assessments: student.assessments || [],
            evaluations: student.evaluations || [],
            enrolledDate:
              student.enrolledDate || student.createdAt || new Date().toISOString(),
            status: student.status || 'active',
            avatar: student.avatar || '',
            recitationProfile: student.recitationProfile,
            studentRecordId: student.studentRecordId,
            studentId: student.studentId,
          }));
          setStudentsFromApi(normalizedStudents);
        }
      } catch (error) {
        console.error('Failed to fetch students for manual assignment builder:', error);
        setStudentFetchError('Unable to load students from server. Using cached data.');
      } finally {
        setIsLoadingStudents(false);
      }
    };

    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      setAssignmentFetchError(null);
      try {
        const response = await fetch(`${API_BASE}/assignments`);
        if (!response.ok) {
          throw new Error(`Failed to load assignments (${response.status})`);
        }
        const payload = await response.json();
        if (Array.isArray(payload)) {
          setAssignmentsFromApi(
            payload.map((assignmentItem: any) => ({
              ...assignmentItem,
              id: assignmentItem._id || assignmentItem.id,
            })),
          );
        }
      } catch (error) {
        console.error('Failed to fetch assignments for manual assignment builder:', error);
        setAssignmentFetchError('Unable to load existing assignments from server.');
      } finally {
        setIsLoadingAssignments(false);
      }
    };

    fetchStudents();
    fetchAssignments();
  }, []);

  const programOptions = useMemo(() => {
    const set = new Set<string>();
    allStudents.forEach((student: Student) => {
      const programName = (student.program || '').trim();
      if (programName) {
        set.add(programName);
      }
    });

    if (set.size === 0) {
      return ['Full Time HQ', 'Part Time HQ', 'After School Reading'];
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allStudents]);

  useEffect(() => {
    if (!selectedProgram && programOptions.length > 0) {
      setSelectedProgram(programOptions[0]);
    }
  }, [programOptions, selectedProgram]);

  const studentsByProgram = useMemo(() => {
    return allStudents
      .filter((student: Student) => {
        if (!selectedProgram) return true;
        const programName = (student.program || '').trim();
        return programName === selectedProgram;
      })
      .sort((a: Student, b: Student) => a.fullName.localeCompare(b.fullName, 'en'));
  }, [allStudents, selectedProgram]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    studentsByProgram.forEach((student: Student) => {
      const letter = student.fullName?.trim()?.charAt(0)?.toUpperCase();
      if (letter) {
        set.add(letter);
      }
    });
    return set;
  }, [studentsByProgram]);

  useEffect(() => {
    if (activeLetter !== 'ALL' && !availableLetters.has(activeLetter)) {
      setActiveLetter('ALL');
    }
  }, [availableLetters, activeLetter]);

  const filteredStudents = useMemo(() => {
    const base = activeLetter === 'ALL'
      ? studentsByProgram
      : studentsByProgram.filter((student: Student) =>
          student.fullName?.toUpperCase().startsWith(activeLetter),
        );
    return base;
  }, [studentsByProgram, activeLetter]);

  useEffect(() => {
    if (selectedStudentId && !filteredStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId('');
    }
  }, [filteredStudents, selectedStudentId]);

  const selectedStudent = useMemo(
    () => allStudents.find((student) => student.id === selectedStudentId),
    [allStudents, selectedStudentId],
  );

  useEffect(() => {
    if (selectedStudent && !titleTouched && !isEdit) {
      setAssignmentTitle(`${selectedStudent.fullName} — Recitation Assignment`);
    }
  }, [selectedStudent, titleTouched, isEdit]);

  const handleSelectProgram = (program: string) => {
    setSelectedProgram(program);
    setSelectedStudentId('');
    setErrors((prev) => {
      const next = { ...prev };
      delete next.program;
      delete next.student;
      return next;
    });
  };

  const handleSelectLetter = (letter: string) => {
    if (letter !== 'ALL' && !availableLetters.has(letter)) return;
    setActiveLetter(letter);
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.student;
      return next;
    });
  };

  const handleClassworkDetailChange = (step: StepKey, field: keyof StepState, value: string) => {
    setClassworkDetails((prev) => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value,
      },
    }));
    if (errors.classwork) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.classwork;
        return next;
      });
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!selectedProgram) {
      nextErrors.program = 'Select a program to continue.';
    }

    if (!selectedStudentId) {
      nextErrors.student = 'Choose a student from the list.';
    }

    if (!assignmentTitle.trim()) {
      nextErrors.title = 'Assignment title is required.';
    }

    if (!dueDate) {
      nextErrors.dueDate = 'Due date is required.';
    }

    const hasClasswork = (Object.keys(STEP_CONFIG) as StepKey[]).some((step) => {
      const detail = classworkDetails[step];
      return detail.portion.trim() || detail.notes.trim();
    });

    if (!hasClasswork) {
      nextErrors.classwork =
        'Provide details for at least one classwork step (Sabq, Sabqi, or Manzil).';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildClassworkSections = (): ClassworkSection[] => {
    return (Object.keys(STEP_CONFIG) as StepKey[])
      .map((step, index) => {
        const detail = classworkDetails[step];
        if (!detail.portion.trim() && !detail.notes.trim()) return null;
        return {
          step,
          order: index,
          assignmentRange: detail.portion.trim(),
          summary: detail.notes.trim(),
          label: STEP_CONFIG[step].label,
        } as ClassworkSection;
      })
      .filter(Boolean) as ClassworkSection[];
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const classworkSections = buildClassworkSections();
      const classworkSummary = classworkSections
        .map((section) => {
          const label = STEP_CONFIG[section.step as StepKey]?.label || section.step;
          const range = section.assignmentRange || '';
          const notes = section.summary || '';
          return `${label}: ${[range, notes].filter(Boolean).join(' • ')}`.trim();
        })
        .filter(Boolean)
        .join('\n');

      const payload = {
        id: assignment?.id || Date.now().toString(),
        title: assignmentTitle.trim(),
        description: generalComments.trim() || 'Manual assignment created via portal.',
        type: 'classwork',
        classworkType: classworkSections[0]?.step || 'sabq',
        classworkSections,
        classworkSummary,
        program: selectedProgram,
        assignedBy: user?.id || user?.email || 'manual-admin',
        assignedTo: selectedStudentId ? [selectedStudentId] : [],
        dueDate: new Date(dueDate),
        status: assignment?.status || 'published',
        createdAt: assignment?.createdAt || new Date(),
        updatedAt: new Date(),
        homeworkComments: homeworkText.trim(),
        homeworkSummary: homeworkText.trim(),
        submissions: assignment?.submissions || [],
        notifications: assignment?.notifications || [],
      };

      if (isEdit && assignment?.id) {
        await updateAssignment(assignment.id, payload);
      } else {
        await addAssignment(payload);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving assignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStudentCard = (student: Student) => {
    const isActive = student.id === selectedStudentId;
    return (
      <button
        key={student.id}
        type="button"
        onClick={() => handleSelectStudent(student.id)}
        className={`flex w-full flex-col rounded-2xl border px-4 py-3 text-left transition ${
          isActive
            ? 'border-primary bg-soft-primary/80 shadow-md shadow-primary/10'
            : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <img
            src={
              student.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                student.fullName || 'Student',
              )}&background=2563eb&color=fff`
            }
            alt={student.fullName}
            className="h-10 w-10 rounded-full border border-white shadow-sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{student.fullName}</p>
            <p className="truncate text-xs text-gray-500">
              {(student.program && student.program.length > 0 && student.program) || 'Program not set'}
            </p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="flex h-full w-full max-w-[1200px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 px-8 py-6 text-white">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                Manual Assignment Builder
              </p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight">
                {isEdit ? 'Update Assignment Plan' : 'Create New Assignment'}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-white/80">
                Filter by program, pick a student, and craft sabq, sabqi, manzil, and homework
                instructions that mirror the ticket workflow output.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col lg:flex-row">
          <aside className="w-full border-b border-gray-100 bg-gray-50/80 p-6 lg:w-[320px] lg:border-r lg:border-b-0">
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Program Filter
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {programOptions.map((program) => (
                    <button
                      key={program}
                      type="button"
                      onClick={() => handleSelectProgram(program)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        program === selectedProgram
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-white text-gray-700 hover:bg-primary/10'
                      }`}
                    >
                      {program}
                    </button>
                  ))}
                </div>
                {errors.program && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {errors.program}
                  </p>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Search by Letter
                </h3>
                <div className="mt-3 grid grid-cols-7 gap-1 text-sm">
                  <button
                    type="button"
                    onClick={() => handleSelectLetter('ALL')}
                    className={`rounded-md px-2 py-1 font-medium transition ${
                      activeLetter === 'ALL'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-primary/10'
                    }`}
                  >
                    All
                  </button>
                  {ALPHABET.map((letter) => {
                    const disabled = !availableLetters.has(letter);
                    const isActive = activeLetter === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => handleSelectLetter(letter)}
                        disabled={disabled}
                        className={`rounded-md px-2 py-1 font-medium transition ${
                          isActive
                            ? 'bg-primary text-white'
                            : disabled
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-white text-gray-600 hover:bg-primary/10'
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="flex max-h-[360px] flex-col gap-3 overflow-y-auto pr-1">
                {isLoadingStudents ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm">
                    <div className="text-3xl text-primary">⏳</div>
                    <p className="mt-2 font-semibold text-gray-700">
                      Loading students from the server…
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      This ensures you always work with the latest roster.
                    </p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
                    <div className="text-3xl">🔍</div>
                    <p className="mt-2 text-sm font-semibold text-gray-700">
                      No students found
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Adjust the program or letter filters to see matching students.
                    </p>
                    {studentFetchError && (
                      <p className="mt-3 text-xs font-semibold text-amber-600">
                        {studentFetchError}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {studentFetchError && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                        {studentFetchError}
                      </div>
                    )}
                    {filteredStudents.map(renderStudentCard)}
                  </>
                )}
              </section>

              {errors.student && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {errors.student}
                </p>
              )}
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto bg-white p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl flex-col gap-6">
              {!selectedStudent ? (
                <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50/60 px-8 py-16 text-center">
                  <div className="text-4xl">👆</div>
                  <h3 className="mt-3 text-lg font-semibold text-gray-800">
                    Choose a student to start planning
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Filter by program and letter on the left, then select a student to open the sabq,
                    sabqi, manzil, and homework builder.
                  </p>
                </div>
              ) : (
                <>
                  <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                      <img
                        src={
                          selectedStudent.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            selectedStudent.fullName || 'Student',
                          )}&background=2563eb&color=fff`
                        }
                        alt={selectedStudent.fullName}
                        className="h-14 w-14 rounded-full border border-gray-200 shadow-inner"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedStudent.fullName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {(selectedStudent.program && selectedStudent.program.length > 0 && selectedStudent.program) ||
                            selectedProgram ||
                            'Program not set'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {selectedStudent.email || 'No email on file'}
                        </p>
                      </div>
                      <div className="rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
                        Manual assignment
                      </div>
                    </div>
                    {assignmentFetchError && (
                      <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                        {assignmentFetchError}
                      </p>
                    )}
                    {!assignmentFetchError && (
                      <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
                        {isLoadingAssignments ? (
                          <span className="font-medium text-primary">Loading assignment history…</span>
                        ) : (
                          <>
                            <span className="font-semibold text-gray-800">
                              Existing assignments for this student:
                            </span>{' '}
                            {
                              assignmentsFromApi.filter((assignmentItem) =>
                                (assignmentItem.assignedTo || []).includes(selectedStudent.id),
                              ).length
                            }{' '}
                            total
                          </>
                        )}
                      </div>
                    )}
                  </section>

                  <section className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Assignment title
                      </label>
                      <input
                        type="text"
                        value={assignmentTitle}
                        onChange={(event) => {
                          if (!titleTouched) setTitleTouched(true);
                          setAssignmentTitle(event.target.value);
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.title;
                            return next;
                          });
                        }}
                        className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                          errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                        placeholder="E.g., Daily Recitation Assignment"
                      />
                      {errors.title && (
                        <p className="text-xs font-medium text-red-600">{errors.title}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Due date</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(event) => {
                          setDueDate(event.target.value);
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.dueDate;
                            return next;
                          });
                        }}
                        className={`w-full rounded-xl border px-4 py-3 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                          errors.dueDate ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                      {errors.dueDate && (
                        <p className="text-xs font-medium text-red-600">{errors.dueDate}</p>
                      )}
                    </div>
                  </section>

                  <section className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <header className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Classwork structure</h3>
                        <p className="text-xs text-gray-500">
                          Mirror the ticket workflow: define sabq, sabqi, and manzil expectations the
                          student will see in their portal.
                        </p>
                      </div>
                      <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Classwork focus
                      </div>
                    </header>

                    <div className="space-y-4">
                      {(Object.keys(STEP_CONFIG) as StepKey[]).map((step) => {
                        const config = STEP_CONFIG[step];
                        const detail = classworkDetails[step];
                        const isHighlighted = detail.portion.trim() || detail.notes.trim();

                        return (
                          <div
                            key={step}
                            className={`rounded-2xl border px-5 py-4 transition ${
                              isHighlighted
                                ? 'border-primary/60 bg-soft-primary/60'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                                {config.emoji}
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <h4 className="text-base font-semibold text-gray-900">
                                    {config.label}
                                  </h4>
                                  <p className="text-xs text-gray-500">{config.description}</p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                      Portion / Pages
                                    </label>
                                    <input
                                      type="text"
                                      value={detail.portion}
                                      onChange={(event) =>
                                        handleClassworkDetailChange(
                                          step,
                                          'portion',
                                          event.target.value,
                                        )
                                      }
                                      placeholder="E.g., Juz 5: Ayah 1-20 or Pages 142-144"
                                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                      Key notes / focus
                                    </label>
                                    <textarea
                                      rows={3}
                                      value={detail.notes}
                                      onChange={(event) =>
                                        handleClassworkDetailChange(step, 'notes', event.target.value)
                                      }
                                      placeholder="Coaching cues, tajweed reminders, or memorisation targets"
                                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {errors.classwork && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                        {errors.classwork}
                      </p>
                    )}
                  </section>

                  <section className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Homework</label>
                      <textarea
                        rows={5}
                        value={homeworkText}
                        onChange={(event) => setHomeworkText(event.target.value)}
                        placeholder="Homework instructions (e.g., rewrite ayat 15-20, listen to Sheikh Husary recitation, etc.)"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Internal comments</label>
                      <textarea
                        rows={5}
                        value={generalComments}
                        onChange={(event) => setGeneralComments(event.target.value)}
                        placeholder="Notes for staff or future reference (not visible to student)."
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </section>

                  <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-[2px] border-white border-b-transparent" />
                          {isEdit ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>{isEdit ? 'Update assignment' : 'Create assignment'}</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ModernAssignmentForm;

