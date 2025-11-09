import React, { useMemo, useState } from 'react';
import {
  Student,
  ProgramType,
  ScheduleDay,
  Sibling,
  RecitationUnitType,
  RecitationStep,
  RecitationUnit,
  StudentRecitationProfile
} from '../types';
import { useData } from '../contexts/DataContext';
import { FALLBACK_CHAPTERS, Chapter } from '@umar-academy/mushaf';

interface StudentRegistrationFormProps {
  onClose: () => void;
  student?: any; // For editing existing student
  isEdit?: boolean; // Flag to indicate if this is edit mode
}

const StudentRegistrationForm: React.FC<StudentRegistrationFormProps> = ({ onClose, student, isEdit = false }) => {
  const { addStudent, updateStudent, updateStudentRecitation, teachers } = useData();
  const [formData, setFormData] = useState({
    fullName: student?.fullName || '',
    parentName: student?.parentName || '',
    email: student?.email || '',
    contact: student?.contact || '',
    program: student?.program || 'Full Time HQ' as ProgramType,
    tuitionFee: student?.tuitionFee || 500,
    registrationAmount: student?.registrationAmount || 100,
    assignedTeacher: student?.assignedTeacher || '',
    scheduleDays: student?.schedule?.days || [] as ScheduleDay[],
    startTime: student?.schedule?.startTime || '09:00',
    endTime: student?.schedule?.endTime || '12:00',
  });

  const [siblings, setSiblings] = useState<Sibling[]>(Array.isArray(student?.siblings) ? student.siblings : []);
  const [showSiblingForm, setShowSiblingForm] = useState(false);
  const [siblingData, setSiblingData] = useState({
    fullName: '',
    program: 'Full Time HQ' as ProgramType,
    assignedTeacher: '',
  });

  type RecitationFormUnitState = {
    unitType: RecitationUnitType;
    juzNumber: string;
    surahNumber: string;
    surahName: string;
    fromAyah: string;
    toAyah: string;
    fromPage: string;
    toPage: string;
    pageCount: string;
    notes: string;
  };

  const toRecitationFormUnitState = (unit?: RecitationUnit): RecitationFormUnitState => ({
    unitType: unit?.unitType || 'surah',
    juzNumber: unit?.juzNumber !== undefined ? String(unit.juzNumber) : '',
    surahNumber: unit?.surahNumber !== undefined ? String(unit.surahNumber) : '',
    surahName: unit?.surahName || '',
    fromAyah: unit?.fromAyah !== undefined ? String(unit.fromAyah) : '',
    toAyah: unit?.toAyah !== undefined ? String(unit.toAyah) : '',
    fromPage: unit?.fromPage !== undefined ? String(unit.fromPage) : '',
    toPage: unit?.toPage !== undefined ? String(unit.toPage) : '',
    pageCount: unit?.pageCount !== undefined ? String(unit.pageCount) : '',
    notes: unit?.notes || ''
  });

  const createEmptyUnitState = (unitType: RecitationUnitType, previous?: RecitationFormUnitState): RecitationFormUnitState => ({
    unitType,
    juzNumber: '',
    surahNumber: '',
    surahName: '',
    fromAyah: '',
    toAyah: '',
    fromPage: '',
    toPage: '',
    pageCount: '',
    notes: previous?.notes || ''
  });

  const initialRecitationProfile: Record<RecitationStep, RecitationFormUnitState> = {
    sabq: toRecitationFormUnitState(student?.recitationProfile?.current?.sabq),
    sabqi: toRecitationFormUnitState(student?.recitationProfile?.current?.sabqi),
    manzil: toRecitationFormUnitState(student?.recitationProfile?.current?.manzil)
  };

  const [recitationFormState, setRecitationFormState] = useState(initialRecitationProfile);

  const allDays: ScheduleDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const chapters = useMemo<Chapter[]>(() => FALLBACK_CHAPTERS, []);
  const chapterMap = useMemo(() => {
    const map = new Map<number, Chapter>();
    chapters.forEach((chapter) => map.set(chapter.id, chapter));
    return map;
  }, [chapters]);

  const juzOptions = useMemo(() => Array.from({ length: 30 }, (_, index) => index + 1), []);

  const stepLabels: Record<RecitationStep, string> = {
    sabq: 'Sabq (New Lesson)',
    sabqi: 'Sabqi (Recent Revision)',
    manzil: 'Manzil (Long-Term Review)'
  };

  const quickSurahSuggestionIds: Record<RecitationStep, number[]> = {
    sabq: [1, 2, 18, 36, 55, 67],
    sabqi: [36, 55, 56, 67, 69, 73, 78, 87],
    manzil: [2, 3, 18, 32, 36, 55, 67, 76]
  };

  const handleRecitationFieldChange = (
    step: RecitationStep,
    field: keyof RecitationFormUnitState,
    value: string
  ) => {
    setRecitationFormState((prev) => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value
      }
    }));
  };

  const parseNumber = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const buildRecitationUnit = (unitState: RecitationFormUnitState): RecitationUnit | undefined => {
    const {
      unitType,
      juzNumber,
      surahNumber,
      surahName,
      fromAyah,
      toAyah,
      fromPage,
      toPage,
      pageCount,
      notes
    } = unitState;

    const normalized: RecitationUnit = {
      unitType,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    if (unitType === 'juz') {
      const juz = parseNumber(juzNumber);
      if (juz !== undefined) {
        normalized.juzNumber = juz;
      }
    }

    if (unitType === 'surah') {
      const surahNum = parseNumber(surahNumber);
      if (surahNum !== undefined) {
        normalized.surahNumber = surahNum;
      }
      if (surahName.trim()) {
        normalized.surahName = surahName.trim();
      }
      const fromAyahNum = parseNumber(fromAyah);
      const toAyahNum = parseNumber(toAyah);
      if (fromAyahNum !== undefined) {
        normalized.fromAyah = fromAyahNum;
      }
      if (toAyahNum !== undefined) {
        normalized.toAyah = toAyahNum;
      }
    }

    if (unitType === 'pages') {
      const fromPageNum = parseNumber(fromPage);
      const toPageNum = parseNumber(toPage);
      if (fromPageNum !== undefined) {
        normalized.fromPage = fromPageNum;
      }
      if (toPageNum !== undefined) {
        normalized.toPage = toPageNum;
      }
      const explicitPageCount = parseNumber(pageCount);
      if (explicitPageCount !== undefined) {
        normalized.pageCount = explicitPageCount;
      } else if (fromPageNum !== undefined && toPageNum !== undefined) {
        normalized.pageCount = Math.abs(toPageNum - fromPageNum) + 1;
      }
    } else {
      const explicitPageCount = parseNumber(pageCount);
      if (explicitPageCount !== undefined) {
        normalized.pageCount = explicitPageCount;
      }
    }

    const meaningfulFields: (keyof RecitationUnit)[] = [
      'juzNumber',
      'surahNumber',
      'surahName',
      'fromPage',
      'toPage',
      'pageCount',
      'fromAyah',
      'toAyah',
      'notes'
    ];
    const hasData = meaningfulFields.some((field) => {
      const value = normalized[field];
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === 'string') {
        return value.trim() !== '';
      }
      return true;
    });

    return hasData ? normalized : undefined;
  };

  const validateRecitationUnit = (step: RecitationStep, unitState: RecitationFormUnitState) => {
    if (unitState.unitType === 'juz' && !unitState.juzNumber.trim()) {
      return `${stepLabels[step]}: Please provide the Juz number.`;
    }
    if (unitState.unitType === 'surah' && !unitState.surahNumber.trim() && !unitState.surahName.trim()) {
      return `${stepLabels[step]}: Please provide the Surah number or name.`;
    }
    if (unitState.unitType === 'pages' && (!unitState.fromPage.trim() || !unitState.toPage.trim())) {
      return `${stepLabels[step]}: Please provide the starting and ending pages.`;
    }
    return null;
  };

  const handleSurahSelect = (step: RecitationStep, surahIdValue: string) => {
    handleRecitationFieldChange(step, 'surahNumber', surahIdValue);
    const surahId = Number(surahIdValue);
    const chapter = Number.isFinite(surahId) ? chapterMap.get(surahId) : undefined;
    handleRecitationFieldChange(step, 'surahName', chapter?.name_simple || '');

    if (chapter?.pages?.length === 2) {
      const [from, to] = chapter.pages;
      handleRecitationFieldChange(step, 'fromPage', String(from));
      handleRecitationFieldChange(step, 'toPage', String(to));
      handleRecitationFieldChange(step, 'pageCount', String(Math.abs(to - from) + 1));
    } else {
      handleRecitationFieldChange(step, 'fromPage', '');
      handleRecitationFieldChange(step, 'toPage', '');
    }
  };

  const handleJuzSelect = (step: RecitationStep, value: string) => {
    handleRecitationFieldChange(step, 'juzNumber', value);
    handleRecitationFieldChange(step, 'pageCount', '');
    handleRecitationFieldChange(step, 'fromPage', '');
    handleRecitationFieldChange(step, 'toPage', '');
  };

  const handleUnitTypeChange = (step: RecitationStep, newType: RecitationUnitType) => {
    setRecitationFormState((prev) => ({
      ...prev,
      [step]: createEmptyUnitState(newType, prev[step])
    }));
  };

  const handleDayToggle = (day: ScheduleDay) => {
    setFormData(prev => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter(d => d !== day)
        : [...prev.scheduleDays, day]
    }));
  };

  const handleAddSibling = () => {
    if (siblingData.fullName) {
      setSiblings([...siblings, { id: `SIB${Date.now()}`, ...siblingData }]);
      setSiblingData({ fullName: '', program: 'Full Time HQ', assignedTeacher: '' });
      setShowSiblingForm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (const step of ['sabq', 'sabqi', 'manzil'] as RecitationStep[]) {
      const validationMessage = validateRecitationUnit(step, recitationFormState[step]);
      if (validationMessage) {
        alert(validationMessage);
        return;
      }
    }

    const currentProfile: StudentRecitationProfile['current'] = {
      sabq: buildRecitationUnit(recitationFormState.sabq),
      sabqi: buildRecitationUnit(recitationFormState.sabqi),
      manzil: buildRecitationUnit(recitationFormState.manzil)
    };

    const recitationProfile: StudentRecitationProfile = {
      current: currentProfile,
      history: isEdit && Array.isArray(student?.recitationProfile?.history)
        ? student.recitationProfile.history
        : []
    };

    const studentData: Student = {
      id: isEdit ? student.id : `STU${Date.now()}`,
      studentRecordId: isEdit ? student.studentRecordId : undefined,
      fullName: formData.fullName,
      parentName: formData.parentName,
      email: formData.email,
      contact: formData.contact,
      program: formData.program,
      siblings: siblings,
      tuitionFee: formData.tuitionFee,
      registrationAmount: formData.registrationAmount,
      assignedTeacher: formData.assignedTeacher,
      schedule: {
        days: formData.scheduleDays,
        startTime: formData.startTime,
        endTime: formData.endTime,
      },
      assessments: isEdit ? student.assessments || [] : [],
      evaluations: isEdit ? student.evaluations || [] : [],
      enrolledDate: isEdit ? student.enrolledDate : new Date().toISOString().split('T')[0],
      status: isEdit ? student.status : 'active',
      avatar: isEdit ? student.avatar : `https://ui-avatars.com/api/?name=${formData.fullName.replace(' ', '+')}&background=2E4D32&color=fff`,
      recitationProfile
    };

    try {
      if (isEdit) {
        const { recitationProfile: _profile, studentRecordId: _recordId, ...userUpdatePayload } = studentData;
        await updateStudent(student.id, userUpdatePayload);

        const recordId = student.studentRecordId || studentData.studentRecordId;
        if (recordId) {
          const recitationPayloadEntries = Object.entries(currentProfile).filter(
            ([, value]) => value !== undefined
          ) as [RecitationStep, RecitationUnit][];
          const currentPayload = recitationPayloadEntries.length
            ? (Object.fromEntries(recitationPayloadEntries) as Partial<Record<RecitationStep, RecitationUnit>>)
            : undefined;

          if (currentPayload) {
            await updateStudentRecitation(recordId, { current: currentPayload });
          }
        }
      } else {
        await addStudent(studentData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Failed to save student. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">
            {isEdit ? 'Edit Student Profile' : 'Register New Student'}
          </h2>
          <p className="text-primary-100 text-sm mt-1">
            {isEdit ? 'Update student information and enrollment details' : 'Complete student profile and enrollment information'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parent Name *</label>
                <input
                  type="text"
                  required
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1-555-0000"
                />
              </div>
            </div>
          </div>

          {/* Program Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Program *</label>
                <select
                  required
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value as ProgramType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Full Time HQ">Full Time HQ</option>
                  <option value="Part Time HQ">Part Time HQ</option>
                  <option value="After School Reading">After School Reading</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Teacher *</label>
                <select
                  required
                  value={formData.assignedTeacher}
                  onChange={(e) => setFormData({ ...formData, assignedTeacher: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tuition Fee (Monthly) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.tuitionFee}
                  onChange={(e) => setFormData({ ...formData, tuitionFee: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.registrationAmount}
                  onChange={(e) => setFormData({ ...formData, registrationAmount: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Days *</label>
              <div className="flex flex-wrap gap-2">
                {allDays.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      formData.scheduleDays.includes(day)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Recitation Profile */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recitation Profile</h3>
            <p className="text-sm text-gray-600 mb-4">
              Capture the exact portions the student is memorizing and reviewing. This information powers ticket suggestions and keeps
              teachers aligned.
            </p>
            <div className="space-y-4">
              {(['sabq', 'sabqi', 'manzil'] as RecitationStep[]).map((step) => {
                const unit = recitationFormState[step];
                const isSurah = unit.unitType === 'surah';
                const isJuz = unit.unitType === 'juz';
                const isPages = unit.unitType === 'pages';

                return (
                  <div key={step} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">{stepLabels[step]}</h4>
                        <p className="text-sm text-gray-600">
                          {step === 'sabq' && 'New lesson the student is currently memorizing.'}
                          {step === 'sabqi' && 'Recent lessons the student is revising (last 7 lessons).'}
                          {step === 'manzil' && 'Long-term review sections to keep memorization strong.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Unit Type *</label>
                        <select
                          value={unit.unitType}
                          onChange={(e) => handleUnitTypeChange(step, e.target.value as RecitationUnitType)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="surah">Surah</option>
                          <option value="juz">Juz</option>
                          <option value="pages">Pages</option>
                        </select>
                      </div>

                      {isJuz && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Juz Number *</label>
                          <select
                            value={unit.juzNumber}
                            onChange={(e) => handleJuzSelect(step, e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Juz…</option>
                            {juzOptions.map((juz) => (
                              <option key={juz} value={String(juz)}>
                                Juz {juz}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {isSurah && (() => {
                        const selectedChapter =
                          unit.surahNumber && Number(unit.surahNumber)
                            ? chapterMap.get(Number(unit.surahNumber))
                            : undefined;
                        const quickChapters = quickSurahSuggestionIds[step]
                          .map((id) => chapterMap.get(id))
                          .filter((chapter): chapter is Chapter => Boolean(chapter));
                        return (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Surah *</label>
                            <select
                              value={unit.surahNumber}
                              onChange={(e) => handleSurahSelect(step, e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Surah…</option>
                              {chapters.map((chapter) => (
                                <option key={chapter.id} value={String(chapter.id)}>
                                  {chapter.id.toString().padStart(3, '0')} — {chapter.name_simple} ({chapter.name_arabic})
                                </option>
                              ))}
                            </select>
                            {selectedChapter && (
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                <span>Verses: {selectedChapter.verses_count}</span>
                                {selectedChapter.pages?.length === 2 && (
                                  <span>
                                    Pages: {selectedChapter.pages[0]} – {selectedChapter.pages[1]}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRecitationFieldChange(step, 'fromAyah', '1');
                                    handleRecitationFieldChange(
                                      step,
                                      'toAyah',
                                      String(selectedChapter.verses_count)
                                    );
                                    if (selectedChapter.pages?.length === 2) {
                                      const [from, to] = selectedChapter.pages;
                                      handleRecitationFieldChange(step, 'pageCount', String(Math.abs(to - from) + 1));
                                    }
                                  }}
                                  className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 font-medium text-gray-600 hover:bg-white"
                                >
                                  Use full surah range
                                </button>
                              </div>
                            )}
                            {quickChapters.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {quickChapters.map((chapter) => (
                                  <button
                                    key={`${step}-quick-${chapter.id}`}
                                    type="button"
                                    onClick={() => handleSurahSelect(step, String(chapter.id))}
                                    className="inline-flex items-center rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                                  >
                                    {chapter.id}. {chapter.name_simple}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {isPages && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">From Page *</label>
                            <input
                              type="number"
                              min={1}
                              value={unit.fromPage}
                              onChange={(e) => handleRecitationFieldChange(step, 'fromPage', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., 150"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">To Page *</label>
                            <input
                              type="number"
                              min={1}
                              value={unit.toPage}
                              onChange={(e) => handleRecitationFieldChange(step, 'toPage', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., 152"
                            />
                          </div>
                        </>
                      )}

                      {isSurah && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">From Ayah (optional)</label>
                            <input
                              type="number"
                              min={1}
                              value={unit.fromAyah}
                              onChange={(e) => handleRecitationFieldChange(step, 'fromAyah', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., 1"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">To Ayah (optional)</label>
                            <input
                              type="number"
                              min={1}
                              value={unit.toAyah}
                              onChange={(e) => handleRecitationFieldChange(step, 'toAyah', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., 20"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Page Count</label>
                        <input
                          type="number"
                          min={1}
                          value={unit.pageCount}
                          onChange={(e) => handleRecitationFieldChange(step, 'pageCount', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Pages to recite/review"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                          value={unit.notes}
                          onChange={(e) => handleRecitationFieldChange(step, 'notes', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                          placeholder="Any specific instructions, mistakes to watch, or pacing notes..."
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Siblings */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Siblings (Optional)</h3>
              <button
                type="button"
                onClick={() => setShowSiblingForm(!showSiblingForm)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                + Add Sibling
              </button>
            </div>

            {showSiblingForm && (
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <input
                    type="text"
                    placeholder="Sibling Full Name"
                    value={siblingData.fullName}
                    onChange={(e) => setSiblingData({ ...siblingData, fullName: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={siblingData.program}
                    onChange={(e) => setSiblingData({ ...siblingData, program: e.target.value as ProgramType })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Full Time HQ">Full Time HQ</option>
                    <option value="Part Time HQ">Part Time HQ</option>
                    <option value="After School Reading">After School Reading</option>
                  </select>
                  <select
                    value={siblingData.assignedTeacher}
                    onChange={(e) => setSiblingData({ ...siblingData, assignedTeacher: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddSibling}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Add This Sibling
                </button>
              </div>
            )}

            {siblings.length > 0 && (
              <div className="space-y-2">
                {siblings.map((sibling, index) => (
                  <div key={sibling.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium">{sibling.fullName}</p>
                      <p className="text-sm text-gray-600">{sibling.program}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSiblings(siblings.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              {isEdit ? 'Update Student' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistrationForm;
