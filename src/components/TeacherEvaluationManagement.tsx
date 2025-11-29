import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { TeacherEvaluation, EvaluationQuestion, QuestionType } from '../types';

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

interface TeacherEvaluationManagementProps {
  onClose: () => void;
}

// Autocomplete Input Component
const AutocompleteInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  label: string;
  required?: boolean;
  className?: string;
}> = ({ value, onChange, suggestions, placeholder, label, required, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && suggestions.length > 0) {
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0 && value.length > 0);
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <label className="block text-xs font-bold text-primary mb-1.5 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (filteredSuggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary placeholder:text-primary/40 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md"
        />
        {value && (
          <button
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {isOpen && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border-2 border-primary/20 rounded-xl shadow-xl max-h-60 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                onChange(suggestion);
                setIsOpen(false);
                inputRef.current?.blur();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-primary/10 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <span className="font-medium">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Searchable Select Component
const SearchableSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  label: string;
  required?: boolean;
  className?: string;
}> = ({ value, onChange, options, placeholder, label, required, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLButtonElement>(null);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`}>
      <label className="block text-xs font-bold text-primary mb-1.5 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <button
          ref={inputRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md flex items-center justify-between"
        >
          <span className={selectedOption ? 'text-primary' : 'text-primary/40'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg 
            className={`w-5 h-5 text-primary/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border-2 border-primary/20 rounded-xl shadow-xl max-h-60 overflow-hidden"
          >
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 border border-primary/20 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gray-100 last:border-b-0 ${
                      value === option.value
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-primary hover:bg-primary/5'
                    }`}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-primary/60 text-center">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TeacherEvaluationManagement: React.FC<TeacherEvaluationManagementProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { teachers } = useBackendData();
  const [evaluations, setEvaluations] = useState<TeacherEvaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<TeacherEvaluation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'archived'>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    questions: [] as EvaluationQuestion[],
    status: 'draft' as 'draft' | 'active' | 'archived',
    evaluationPeriod: {
      startDate: '',
      endDate: ''
    },
    autoSave: true
  });

  // Title suggestions based on existing evaluations
  const titleSuggestions = evaluations
    .map(e => e.title)
    .filter((title, index, self) => self.indexOf(title) === index)
    .slice(0, 10);

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/evaluations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEvaluations(data);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvaluation = () => {
    setIsCreating(true);
    setShowForm(true);
    setFormData({
      title: '',
      description: '',
      questions: [],
      status: 'draft',
      evaluationPeriod: { startDate: '', endDate: '' },
      autoSave: true
    });
    setSelectedEvaluation(null);
  };

  const handleEditEvaluation = (evaluation: TeacherEvaluation) => {
    setIsCreating(false);
    setShowForm(true);
    setSelectedEvaluation(evaluation);
    setFormData({
      title: evaluation.title,
      description: evaluation.description || '',
      questions: evaluation.questions || [],
      status: evaluation.status,
      evaluationPeriod: {
        startDate: evaluation.evaluationPeriod?.startDate 
          ? new Date(evaluation.evaluationPeriod.startDate).toISOString().split('T')[0]
          : '',
        endDate: evaluation.evaluationPeriod?.endDate
          ? new Date(evaluation.evaluationPeriod.endDate).toISOString().split('T')[0]
          : ''
      },
      autoSave: evaluation.autoSave
    });
  };

  const handleAddQuestion = () => {
    const newQuestion: EvaluationQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      questionText: '',
      questionType: 'text', // Default to text (with 4 choices)
      options: ['', '', '', ''], // Initialize with 4 empty options for all question types
      isRequired: true,
      order: formData.questions.length + 1,
      points: 1
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };

  const handleQuestionChange = (index: number, field: keyof EvaluationQuestion, value: any) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const handleRemoveQuestion = (index: number) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    updatedQuestions.forEach((q, i) => {
      q.order = i + 1;
    });
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const handleSaveEvaluation = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title for the evaluation');
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('umar_academy_token');
      
      const payload = {
        ...formData,
        evaluationPeriod: {
          startDate: formData.evaluationPeriod.startDate ? new Date(formData.evaluationPeriod.startDate) : undefined,
          endDate: formData.evaluationPeriod.endDate ? new Date(formData.evaluationPeriod.endDate) : undefined
        }
      };

      const url = isCreating 
        ? `${API_BASE}/evaluations`
        : `${API_BASE}/evaluations/${selectedEvaluation?.id}`;
      
      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await loadEvaluations();
        setShowForm(false);
        setSelectedEvaluation(null);
        alert(isCreating ? 'Evaluation created successfully!' : 'Evaluation updated successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save evaluation'}`);
      }
    } catch (error) {
      console.error('Error saving evaluation:', error);
      alert('Failed to save evaluation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignEvaluation = async (evaluationId: string) => {
    setSelectedEvaluation(evaluations.find(e => e.id === evaluationId) || null);
    setShowAssignModal(true);
  };

  const handleSubmitAssignment = async () => {
    if (!selectedEvaluation || selectedTeachers.length === 0) {
      alert('Please select at least one teacher');
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/evaluations/${selectedEvaluation.id}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teacherIds: selectedTeachers,
          dueDate: dueDate || undefined
        })
      });

      if (response.ok) {
        alert(`Evaluation assigned to ${selectedTeachers.length} teacher(s) successfully!`);
        setShowAssignModal(false);
        setSelectedTeachers([]);
        setDueDate('');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to assign evaluation'}`);
      }
    } catch (error) {
      console.error('Error assigning evaluation:', error);
      alert('Failed to assign evaluation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvaluation = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this evaluation? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(`${API_BASE}/evaluations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await loadEvaluations();
        alert('Evaluation deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to delete evaluation'}`);
      }
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      alert('Failed to delete evaluation');
    }
  };

  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesSearch = evaluation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (evaluation.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || evaluation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Question type options with descriptions
  const questionTypeOptions: Array<{ value: QuestionType; label: string; description: string; icon: string }> = [
    { value: 'text', label: 'Text with 4 Choices', description: 'Text question with 4 multiple choice options', icon: '📝' },
    { value: 'audio', label: 'Audio', description: 'Record or upload audio response', icon: '🎤' },
    { value: 'video', label: 'Video', description: 'Record or upload video response', icon: '🎥' }
  ];

  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-primary/30">
          {/* Enhanced Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <span className="text-2xl">{isCreating ? '✨' : '✏️'}</span>
                  {isCreating ? 'Create New Evaluation' : 'Edit Evaluation'}
                </h2>
                <p className="text-white/80 text-xs mt-1">
                  {isCreating ? 'Build a comprehensive evaluation form for teachers' : 'Update evaluation details and questions'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedEvaluation(null);
                }}
                className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
            {/* Basic Info Section */}
            <div className="bg-white rounded-xl border-2 border-primary/10 p-5 mb-5 shadow-lg">
              <h3 className="text-base font-extrabold text-primary mb-4 flex items-center gap-2">
                <span>📋</span> Basic Information
              </h3>
              <div className="space-y-4">
                <AutocompleteInput
                  value={formData.title}
                  onChange={(value) => setFormData({ ...formData, title: value })}
                  suggestions={titleSuggestions}
                  placeholder="e.g., Q4 2024 Performance Review"
                  label="Evaluation Title"
                  required
                />

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5 flex items-center gap-1">
                    Description
                    <span className="text-xs text-primary/60 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary placeholder:text-primary/40 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md resize-none"
                    rows={3}
                    placeholder="Describe what this evaluation covers..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5 flex items-center gap-1">
                      Start Date
                      <span className="text-xs text-primary/60 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.evaluationPeriod.startDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        evaluationPeriod: { ...formData.evaluationPeriod, startDate: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5 flex items-center gap-1">
                      End Date
                      <span className="text-xs text-primary/60 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.evaluationPeriod.endDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        evaluationPeriod: { ...formData.evaluationPeriod, endDate: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <input
                    type="checkbox"
                    id="autoSave"
                    checked={formData.autoSave}
                    onChange={(e) => setFormData({ ...formData, autoSave: e.target.checked })}
                    className="w-5 h-5 text-primary border-primary/30 rounded focus:ring-primary/20 cursor-pointer"
                  />
                  <label htmlFor="autoSave" className="text-sm font-medium text-primary cursor-pointer flex-1">
                    Enable Auto-Save Progress
                    <span className="block text-xs text-primary/60 font-normal mt-0.5">
                      Automatically save teacher responses every 2 seconds
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div className="bg-white rounded-xl border-2 border-primary/10 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-extrabold text-primary flex items-center gap-2">
                  <span>❓</span> Questions ({formData.questions.length})
                </h3>
                <button
                  onClick={handleAddQuestion}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Question
                </button>
              </div>

              {formData.questions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-sm font-medium text-primary/60">No questions added yet</p>
                  <p className="text-xs text-primary/40 mt-1">Click "Add Question" to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.questions.map((question, index) => (
                    <div key={question.id} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-primary/10 shadow-md hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white text-sm font-bold">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-primary/60">Question {index + 1}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveQuestion(index)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-primary mb-1.5">Question Text *</label>
                          <input
                            type="text"
                            value={question.questionText}
                            onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary placeholder:text-primary/40 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
                            placeholder="Enter your question here..."
                          />
                        </div>

                        <SearchableSelect
                          value={question.questionType}
                          onChange={(value) => {
                            const newType = value as QuestionType;
                            handleQuestionChange(index, 'questionType', newType);
                            // All question types need 4 options - ensure they're initialized
                            if (!question.options || question.options.length === 0) {
                              handleQuestionChange(index, 'options', ['', '', '', '']);
                            }
                          }}
                          options={questionTypeOptions.map(opt => ({ value: opt.value, label: `${opt.icon} ${opt.label}` }))}
                          placeholder="Select question type"
                          label="Question Type"
                          required
                        />

                        {/* Text questions always have 4 MCQ choices */}
                        {question.questionType === 'text' && (
                          <>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1.5">
                                4 Choice Options *
                                <span className="text-xs text-primary/60 font-normal ml-2">(Exactly 4 options required)</span>
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[0, 1, 2, 3].map((optIndex) => (
                                  <div key={optIndex}>
                                    <label className="block text-[10px] font-bold text-primary mb-1">
                                      Option {optIndex + 1}
                                    </label>
                                    <input
                                      type="text"
                                      value={question.options?.[optIndex] || ''}
                                      onChange={(e) => {
                                        const updatedOptions = [...(question.options || ['', '', '', ''])];
                                        updatedOptions[optIndex] = e.target.value;
                                        handleQuestionChange(index, 'options', updatedOptions);
                                      }}
                                      className="w-full px-3 py-2 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary placeholder:text-primary/40 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
                                      placeholder={`Enter option ${optIndex + 1}...`}
                                    />
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-primary/60 mt-2">All 4 options must be filled</p>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1.5">Correct Answer *</label>
                              <select
                                value={question.correctAnswer || ''}
                                onChange={(e) => handleQuestionChange(index, 'correctAnswer', e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
                              >
                                <option value="">Select correct answer</option>
                                {question.options?.map((opt, optIdx) => (
                                  opt.trim() && (
                                    <option key={optIdx} value={opt}>
                                      Option {optIdx + 1}: {opt}
                                    </option>
                                  )
                                ))}
                              </select>
                              <p className="text-xs text-primary/60 mt-1">
                                {question.options && question.options.filter(o => o.trim()).length < 4
                                  ? '⚠️ Please fill all 4 options first'
                                  : 'Select which of the 4 options is correct'}
                              </p>
                            </div>
                          </>
                        )}

                        {/* Audio/Video questions: Reference link + 4 MCQ options */}
                        {(question.questionType === 'audio' || question.questionType === 'video') && (
                          <>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1.5">
                                Reference Media URL *
                                <span className="text-xs text-primary/60 font-normal ml-2">(Link to audio/video for teacher to review)</span>
                              </label>
                              <input
                                type="url"
                                value={question.mediaUrl || ''}
                                onChange={(e) => handleQuestionChange(index, 'mediaUrl', e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary placeholder:text-primary/40 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
                                placeholder="https://..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1.5">
                                4 Choice Options *
                                <span className="text-xs text-primary/60 font-normal ml-2">(Exactly 4 options required)</span>
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[0, 1, 2, 3].map((optIndex) => (
                                  <div key={optIndex}>
                                    <label className="block text-[10px] font-bold text-primary mb-1">
                                      Option {optIndex + 1}
                                    </label>
                                    <input
                                      type="text"
                                      value={question.options?.[optIndex] || ''}
                                      onChange={(e) => {
                                        const updatedOptions = [...(question.options || ['', '', '', ''])];
                                        updatedOptions[optIndex] = e.target.value;
                                        handleQuestionChange(index, 'options', updatedOptions);
                                      }}
                                      className="w-full px-3 py-2 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary placeholder:text-primary/40 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
                                      placeholder={`Enter option ${optIndex + 1}...`}
                                    />
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-primary/60 mt-2">All 4 options must be filled</p>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-1.5">Correct Answer *</label>
                              <select
                                value={question.correctAnswer || ''}
                                onChange={(e) => handleQuestionChange(index, 'correctAnswer', e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
                                disabled={!question.options || question.options.filter(o => o.trim()).length < 4}
                              >
                                <option value="">Select correct answer</option>
                                {question.options?.map((opt, optIdx) => (
                                  opt.trim() && (
                                    <option key={optIdx} value={opt}>
                                      Option {optIdx + 1}: {opt}
                                    </option>
                                  )
                                ))}
                              </select>
                              <p className="text-xs text-primary/60 mt-1">
                                {question.options && question.options.filter(o => o.trim()).length < 4
                                  ? '⚠️ Please fill all 4 options first'
                                  : 'Select which of the 4 options is correct'}
                              </p>
                            </div>
                          </>
                        )}

                        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                          <input
                            type="checkbox"
                            checked={question.isRequired}
                            onChange={(e) => handleQuestionChange(index, 'isRequired', e.target.checked)}
                            className="w-5 h-5 text-primary border-primary/30 rounded focus:ring-primary/20 cursor-pointer"
                          />
                          <label className="text-sm font-medium text-primary cursor-pointer">
                            Required Question
                            <span className="block text-xs text-primary/60 font-normal mt-0.5">
                              Teacher must answer this question to complete the evaluation
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t-2 border-primary/20 bg-gray-50 flex items-center justify-between">
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedEvaluation(null);
              }}
              className="px-5 py-2.5 border-2 border-primary/30 text-primary rounded-xl text-sm font-bold hover:bg-soft-primary transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEvaluation}
              disabled={isLoading || !formData.title.trim()}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isCreating ? 'Create Evaluation' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Assignment Modal
  if (showAssignModal && selectedEvaluation) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border-2 border-primary/30">
          <div className="px-6 py-4 bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
            <h3 className="text-lg font-extrabold text-white">Assign Evaluation</h3>
            <p className="text-white/80 text-xs mt-1">{selectedEvaluation.title}</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-2">Select Teachers *</label>
              <div className="border-2 border-primary/20 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2">
                {teachers.map(teacher => (
                  <label key={teacher.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(teacher.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeachers([...selectedTeachers, teacher.id]);
                        } else {
                          setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id));
                        }
                      }}
                      className="w-5 h-5 text-primary border-primary/30 rounded focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-primary">{teacher.fullName}</span>
                    <span className="text-xs text-primary/60 ml-auto">{teacher.email}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-primary mb-2">Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t-2 border-primary/20 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setShowAssignModal(false);
                setSelectedTeachers([]);
                setDueDate('');
              }}
              className="px-5 py-2.5 border-2 border-primary/30 text-primary rounded-xl text-sm font-bold hover:bg-soft-primary transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitAssignment}
              disabled={isLoading || selectedTeachers.length === 0}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all disabled:opacity-50"
            >
              Assign to {selectedTeachers.length} Teacher{selectedTeachers.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-primary/30">
        {/* Enhanced Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Teacher Evaluation Management
              </h2>
              <p className="text-white/80 text-xs mt-1">Create, manage, and assign comprehensive teacher evaluations</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateEvaluation}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Evaluation
              </button>
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
        </div>

        {/* Enhanced Filters */}
        <div className="px-6 py-4 bg-gradient-to-br from-gray-50 to-white border-b-2 border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Evaluations
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or description..."
                className="w-full px-4 py-2.5 border-2 border-primary/20 rounded-xl bg-white text-sm font-medium text-primary placeholder:text-primary/40 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
              />
            </div>
            <SearchableSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as typeof statusFilter)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'draft', label: '📝 Draft' },
                { value: 'active', label: '✅ Active' },
                { value: 'archived', label: '📦 Archived' }
              ]}
              placeholder="Filter by status"
              label="Status Filter"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-primary mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-primary font-bold">Loading evaluations...</p>
              </div>
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-lg font-bold text-primary mb-2">No evaluations found</p>
              <p className="text-sm text-primary/60 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first evaluation to get started'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={handleCreateEvaluation}
                  className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all shadow-lg hover:shadow-xl"
                >
                  Create First Evaluation
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvaluations.map((evaluation) => (
                <div key={evaluation.id} className="bg-white rounded-xl border-2 border-primary/10 p-5 shadow-md hover:shadow-xl transition-all hover:border-primary/30 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-extrabold text-primary mb-2 group-hover:text-primary transition-colors">
                        {evaluation.title}
                      </h3>
                      {evaluation.description && (
                        <p className="text-xs text-primary/70 mb-3 line-clamp-2">{evaluation.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">
                          {evaluation.questions.length} Q
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg font-bold ${
                          evaluation.status === 'active' ? 'bg-green-100 text-green-800' :
                          evaluation.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {evaluation.status}
                        </span>
                        {evaluation.autoSave && (
                          <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold">
                            Auto-save
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleEditEvaluation(evaluation)}
                      className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-[rgba(var(--color-primary-rgb),0.9)] transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleAssignEvaluation(evaluation.id)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all"
                    >
                      Assign
                    </button>
                    {evaluation.status === 'draft' && (
                      <button
                        onClick={() => handleDeleteEvaluation(evaluation.id)}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherEvaluationManagement;
