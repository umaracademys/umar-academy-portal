import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface QaidahLearningObjectivesProps {
  book: 'qaidah1' | 'qaidah2';
  page: number;
  onClose?: () => void;
}

interface LearningObjectivesData {
  id?: string;
  student?: string;
  studentName?: string;
  book: string;
  page: number;
  teachingDate?: string;
  letters: string[];
  rules: string[];
  learningObjectives: string;
  notes: string;
  links: Array<{ title: string; url: string; description?: string }>;
}

const QaidahLearningObjectives: React.FC<QaidahLearningObjectivesProps> = ({
  book,
  page,
  onClose
}) => {
  const { user } = useAuth();
  const { students, getStudentsByTeacher } = useData();
  const canEdit = user && ['teacher', 'admin', 'superadmin'].includes(user.role);
  
  // Get assigned students for teacher
  const assignedStudents = React.useMemo(() => {
    if (!user?.id || !getStudentsByTeacher) return [];
    const teacherId = user.id || (user as any)._id;
    return getStudentsByTeacher(teacherId);
  }, [user, students, getStudentsByTeacher]);

  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingHomework, setIsSubmittingHomework] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<LearningObjectivesData[]>([]);
  
  const [learningData, setLearningData] = useState<LearningObjectivesData>({
    book,
    page,
    letters: [],
    rules: [],
    learningObjectives: '',
    notes: '',
    links: []
  });
  
  const [editData, setEditData] = useState<LearningObjectivesData>(learningData);
  const [newLetter, setNewLetter] = useState('');
  const [newRule, setNewRule] = useState('');
  const [showArabicPicker, setShowArabicPicker] = useState(false);
  const [showRulesPicker, setShowRulesPicker] = useState(false);
  
  // Link management
  const [newLink, setNewLink] = useState('');

  // Load learning objectives when student/date changes
  useEffect(() => {
    if (selectedStudentId && selectedDate) {
      loadLearningObjectives();
      loadHistory();
    }
  }, [selectedStudentId, book, page, selectedDate]);

  // Auto-select first student if available
  useEffect(() => {
    if (assignedStudents.length > 0 && !selectedStudentId) {
      const firstStudent = assignedStudents[0];
      setSelectedStudentId(firstStudent.id || (firstStudent as any)._id);
    }
  }, [assignedStudents, selectedStudentId]);

  const loadLearningObjectives = async () => {
    if (!selectedStudentId || !selectedDate) return;
    
    try {
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      
      const response = await fetch(`${API_BASE}/qaidah/student-learning/${selectedStudentId}/${book}/${page}/${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLearningData(data);
        setEditData(data);
      } else {
        // Initialize empty if not found
        const emptyData: LearningObjectivesData = {
          student: selectedStudentId,
          book,
          page,
          teachingDate: selectedDate,
          letters: [],
          rules: [],
          learningObjectives: '',
          notes: '',
          links: []
        };
        setLearningData(emptyData);
        setEditData(emptyData);
      }
    } catch (error) {
      console.error('❌ Error loading learning objectives:', error);
    }
  };

  const loadHistory = async () => {
    if (!selectedStudentId) return;
    
    try {
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      
      const response = await fetch(`${API_BASE}/qaidah/student-learning/history/${selectedStudentId}/${book}/${page}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('❌ Error loading history:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedStudentId || !selectedDate) {
      alert('Please select a student and date');
      return;
    }

    setIsSaving(true);
    try {
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      
      if (!token) {
        alert('You must be logged in to save learning objectives');
        setIsSaving(false);
        return;
      }

      const response = await fetch(`${API_BASE}/qaidah/student-learning/${selectedStudentId}/${book}/${page}/${selectedDate}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          letters: editData.letters,
          rules: editData.rules,
          learningObjectives: editData.learningObjectives,
          notes: editData.notes,
          links: editData.links
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLearningData(data);
        setIsEditing(false);
        loadHistory(); // Refresh history
      } else {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Unknown error' };
        }
        alert(`Failed to save: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error saving learning objectives:', error);
      alert('Failed to save learning objectives');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitHomework = async () => {
    if (!selectedStudentId || !selectedDate || !learningData.id) {
      alert('Please save learning objectives first before submitting as homework');
      return;
    }

    if (!confirm('Submit this as homework for the student?')) return;

    setIsSubmittingHomework(true);
    try {
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      
      // Get Qaidah marks for this student/page/date
      const marksResponse = await fetch(`${API_BASE}/qaidah/${selectedStudentId}/${book}/${page}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let qaidahMarkId = null;
      if (marksResponse.ok) {
        const marksData = await marksResponse.json();
        // Try to find marks for today's date
        // Note: This assumes marks are stored with classworkDate
        // You may need to adjust based on your QaidahMark schema
      }

      const response = await fetch(`${API_BASE}/qaidah/homework/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: selectedStudentId,
          book,
          page,
          teachingDate: selectedDate,
          learningObjectiveId: learningData.id,
          qaidahMarkId: qaidahMarkId,
          links: editData.links
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert('Homework assigned successfully!');
      } else {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Unknown error' };
        }
        alert(`Failed to create homework: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error submitting homework:', error);
      alert('Failed to submit homework');
    } finally {
      setIsSubmittingHomework(false);
    }
  };

  // Arabic letters and diacritics
  const arabicLetters = [
    'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر',
    'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف',
    'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'
  ];

  const diacritics = [
    { name: 'Fatha', mark: 'َ', symbol: 'َ' },
    { name: 'Kasra', mark: 'ِ', symbol: 'ِ' },
    { name: 'Damma', mark: 'ُ', symbol: 'ُ' },
    { name: 'Sukun', mark: 'ْ', symbol: 'ْ' },
    { name: 'Shadda', mark: 'ّ', symbol: 'ّ' }
  ];

  const commonRules = [
    'Fatha', 'Kasra', 'Damma', 'Sukun', 'Shadda',
    'Tanween Fatha', 'Tanween Kasra', 'Tanween Damma',
    'Madd', 'Hamza', 'Tashdeed'
  ];

  const selectArabicLetter = (letter: string, diacritic?: string) => {
    const letterWithDiacritic = diacritic ? `${letter}${diacritic}` : letter;
    if (!editData.letters.includes(letterWithDiacritic)) {
      setEditData({
        ...editData,
        letters: [...editData.letters, letterWithDiacritic]
      });
    }
    setShowArabicPicker(false);
  };

  const selectRule = (rule: string) => {
    if (!editData.rules.includes(rule)) {
      setEditData({
        ...editData,
        rules: [...editData.rules, rule]
      });
    }
    setShowRulesPicker(false);
  };

  const addLink = () => {
    if (newLink.trim()) {
      setEditData({
        ...editData,
        links: [...editData.links, { title: '', url: newLink.trim(), description: '' }]
      });
      setNewLink('');
    }
  };

  const removeLink = (index: number) => {
    setEditData({
      ...editData,
      links: editData.links.filter((_, i) => i !== index)
    });
  };

  const handleCancel = () => {
    setEditData(learningData);
    setIsEditing(false);
    setNewLetter('');
    setNewRule('');
  };

  const addLetter = () => {
    if (newLetter.trim() && !editData.letters.includes(newLetter.trim())) {
      setEditData({
        ...editData,
        letters: [...editData.letters, newLetter.trim()]
      });
      setNewLetter('');
    }
  };

  const removeLetter = (letter: string) => {
    setEditData({
      ...editData,
      letters: editData.letters.filter(l => l !== letter)
    });
  };

  const addRule = () => {
    if (newRule.trim() && !editData.rules.includes(newRule.trim())) {
      setEditData({
        ...editData,
        rules: [...editData.rules, newRule.trim()]
      });
      setNewRule('');
    }
  };

  const removeRule = (rule: string) => {
    setEditData({
      ...editData,
      rules: editData.rules.filter(r => r !== rule)
    });
  };

  const selectHistoryItem = (item: LearningObjectivesData) => {
    setSelectedDate(new Date(item.teachingDate || '').toISOString().split('T')[0]);
    setShowHistory(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-4 z-50 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        title="Show Learning Objectives"
      >
        <span>📚</span>
        <span className="text-sm font-semibold">Learning</span>
      </button>
    );
  }

  const selectedStudent = assignedStudents.find(s => 
    (s.id || (s as any)._id) === selectedStudentId
  );

  return (
    <div className="fixed top-20 right-4 z-50 w-80 max-h-[calc(100vh-6rem)] bg-white rounded-lg shadow-2xl border border-primary-300 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-3 py-2 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate">Learning Objectives</h3>
          <p className="text-xs text-primary-100 truncate">
            Page {page} - {book === 'qaidah1' ? 'Qaidah 1' : 'Qaidah 2'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
              title="Edit"
            >
              ✏️
            </button>
          )}
          <button
            onClick={() => {
              setIsOpen(false);
              onClose?.();
            }}
            className="px-1.5 py-1 hover:bg-white/20 rounded text-xs transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Student and Date Selector */}
      {canEdit && (
        <div className="px-2.5 py-2 bg-primary-50 border-b border-primary-200 space-y-1.5">
          <div>
            <label className="text-xs font-semibold text-primary-700 mb-0.5 block">Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-primary-300 rounded focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select student...</option>
              {assignedStudents.map((student) => {
                const studentId = student.id || (student as any)._id;
                return (
                  <option key={studentId} value={studentId}>
                    {student.fullName || (student as any).fullName || 'Unknown'}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1">
              <label className="text-xs font-semibold text-primary-700 mb-0.5 block">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-primary-300 rounded focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                title="Show History"
              >
                📅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="px-2.5 py-2 bg-gray-50 border-b border-gray-200 max-h-40 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-700 mb-1">History</div>
          <div className="space-y-1">
            {history.map((item, idx) => (
              <button
                key={idx}
                onClick={() => selectHistoryItem(item)}
                className="w-full text-left px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-primary-50 transition-colors"
              >
                <div className="font-medium">{new Date(item.teachingDate || '').toLocaleDateString()}</div>
                <div className="text-gray-600">
                  {item.letters.length} letters, {item.rules.length} rules
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {/* Letters Section */}
        <div>
          <h4 className="font-semibold text-primary-700 mb-1.5 text-xs flex items-center gap-1.5">
            <span className="text-sm">🔤</span>
            <span>Letters</span>
          </h4>
          {isEditing ? (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newLetter}
                  onChange={(e) => setNewLetter(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLetter()}
                  placeholder="Add letter"
                  className="flex-1 px-2 py-1.5 border border-primary-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-base"
                  dir="rtl"
                />
                <button
                  onClick={() => setShowArabicPicker(!showArabicPicker)}
                  className="px-2 py-1.5 bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors text-sm"
                  title="Select Arabic Letter"
                >
                  🔤
                </button>
                <button
                  onClick={addLetter}
                  className="px-2.5 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-semibold"
                >
                  +
                </button>
              </div>
              
              {/* Arabic Letter Picker */}
              {showArabicPicker && (
                <div className="bg-white border border-primary-300 rounded p-2 shadow-xl z-50 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2 sticky top-0 bg-white pb-1 border-b">
                    <h5 className="font-semibold text-primary-700 text-xs">Select Letter</h5>
                    <button
                      onClick={() => setShowArabicPicker(false)}
                      className="text-gray-500 hover:text-gray-700 text-sm font-bold"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="mb-2">
                    <p className="text-xs text-gray-600 mb-1.5 font-medium">Basic:</p>
                    <div className="grid grid-cols-7 gap-1">
                      {arabicLetters.map((letter) => (
                        <button
                          key={letter}
                          onClick={() => selectArabicLetter(letter)}
                          className="px-1 py-1 bg-primary-50 hover:bg-primary-200 border border-primary-300 rounded text-lg font-bold transition-colors active:scale-95"
                          title={`Select ${letter}`}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-600 mb-1.5 font-medium">With Vowels:</p>
                    <div className="space-y-2">
                      {diacritics.slice(0, 3).map((diacritic) => (
                        <div key={diacritic.name}>
                          <p className="text-xs text-gray-500 mb-1 font-medium">
                            {diacritic.name} <span className="text-sm">{diacritic.symbol}</span>:
                          </p>
                          <div className="grid grid-cols-7 gap-1">
                            {arabicLetters.map((letter) => (
                              <button
                                key={`${letter}-${diacritic.mark}`}
                                onClick={() => selectArabicLetter(letter, diacritic.mark)}
                                className="px-1 py-1 bg-accent-50 hover:bg-accent-200 border border-accent-300 rounded text-base font-bold transition-colors active:scale-95"
                                title={`${letter} with ${diacritic.name}`}
                              >
                                {letter}{diacritic.mark}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {editData.letters.map((letter, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-accent-100 text-primary-800 rounded-full flex items-center gap-1.5 text-sm font-medium"
                  >
                    <span className="text-base">{letter}</span>
                    <button
                      onClick={() => removeLetter(letter)}
                      className="text-red-600 hover:text-red-800 font-bold text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {learningData.letters.length > 0 ? (
                learningData.letters.map((letter, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-accent-100 text-primary-800 rounded-full font-medium text-base"
                  >
                    {letter}
                  </span>
                ))
              ) : (
                <p className="text-gray-500 text-xs italic">No letters</p>
              )}
            </div>
          )}
        </div>

        {/* Rules Section */}
        <div>
          <h4 className="font-semibold text-primary-700 mb-1.5 text-xs flex items-center gap-1.5">
            <span className="text-sm">📖</span>
            <span>Rules</span>
          </h4>
          {isEditing ? (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRule()}
                  placeholder="Add rule"
                  className="flex-1 px-2 py-1.5 border border-primary-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <button
                  onClick={() => setShowRulesPicker(!showRulesPicker)}
                  className="px-2 py-1.5 bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors text-sm"
                  title="Select Common Rules"
                >
                  📖
                </button>
                <button
                  onClick={addRule}
                  className="px-2.5 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-semibold"
                >
                  +
                </button>
              </div>
              
              {/* Rules Picker */}
              {showRulesPicker && (
                <div className="bg-white border border-primary-300 rounded p-2 shadow-xl z-50">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-primary-700 text-xs">Select Rules</h5>
                    <button
                      onClick={() => setShowRulesPicker(false)}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {commonRules.map((rule) => (
                      <button
                        key={rule}
                        onClick={() => selectRule(rule)}
                        className="px-2 py-1 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded text-xs font-medium transition-colors"
                        title={`Select ${rule}`}
                      >
                        {rule}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {editData.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1 bg-primary-50 border border-primary-200 rounded flex items-center justify-between text-sm"
                  >
                    <span className="text-primary-800 font-medium text-xs">{rule}</span>
                    <button
                      onClick={() => removeRule(rule)}
                      className="text-red-600 hover:text-red-800 font-bold text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {learningData.rules.length > 0 ? (
                learningData.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1 bg-primary-50 border border-primary-200 rounded text-primary-800 font-medium text-xs"
                  >
                    {rule}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-xs italic">No rules</p>
              )}
            </div>
          )}
        </div>

        {/* Learning Objectives */}
        <div>
          <h4 className="font-semibold text-primary-700 mb-1.5 text-xs flex items-center gap-1.5">
            <span className="text-sm">🎯</span>
            <span>Objectives</span>
          </h4>
          {isEditing ? (
            <textarea
              value={editData.learningObjectives}
              onChange={(e) => setEditData({ ...editData, learningObjectives: e.target.value })}
              placeholder="What should students learn?"
              className="w-full px-2 py-1.5 border border-primary-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 min-h-[60px] text-sm"
              rows={2}
            />
          ) : (
            <p className="text-primary-800 bg-primary-50 border border-primary-200 rounded px-2 py-1.5 min-h-[50px] text-xs">
              {learningData.learningObjectives || (
                <span className="text-gray-500 italic">No objectives</span>
              )}
            </p>
          )}
        </div>

        {/* Links Section */}
        {isEditing && (
          <div>
            <h4 className="font-semibold text-primary-700 mb-1.5 text-xs flex items-center gap-1.5">
              <span className="text-sm">🔗</span>
              <span>Links</span>
            </h4>
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLink()}
                  placeholder="Paste URL here"
                  className="flex-1 px-2 py-1.5 border border-primary-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <button
                  onClick={addLink}
                  className="px-2.5 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-semibold"
                >
                  +
                </button>
              </div>
              {editData.links.map((link, idx) => (
                <div key={idx} className="px-2 py-1 bg-primary-50 border border-primary-200 rounded flex items-center justify-between text-xs">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline truncate flex-1">
                    {link.url}
                  </a>
                  <button
                    onClick={() => removeLink(idx)}
                    className="text-red-600 hover:text-red-800 font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {canEdit && (
          <div>
            <h4 className="font-semibold text-primary-700 mb-1.5 text-xs flex items-center gap-1.5">
              <span className="text-sm">📝</span>
              <span>Notes</span>
            </h4>
            {isEditing ? (
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="Teaching notes..."
                className="w-full px-2 py-1.5 border border-primary-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 min-h-[60px] text-sm"
                rows={2}
              />
            ) : (
              <p className="text-primary-800 bg-primary-50 border border-primary-200 rounded px-2 py-1.5 min-h-[50px] text-xs">
                {learningData.notes || (
                  <span className="text-gray-500 italic">No notes</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer - Edit Mode Actions */}
      {isEditing && (
        <div className="border-t border-primary-200 px-2.5 py-2 flex gap-1.5">
          <button
            onClick={handleCancel}
            className="flex-1 px-3 py-1.5 border border-primary-300 text-primary-700 rounded hover:bg-primary-50 transition-colors text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded hover:from-primary-700 hover:to-primary-800 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {/* Submit as Homework Button */}
      {canEdit && !isEditing && learningData.id && (
        <div className="border-t border-primary-200 px-2.5 py-2">
          <button
            onClick={handleSubmitHomework}
            disabled={isSubmittingHomework}
            className="w-full px-3 py-1.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded hover:from-accent-600 hover:to-accent-700 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmittingHomework ? 'Submitting...' : '📋 Submit as Homework'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QaidahLearningObjectives;
