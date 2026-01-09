import React, { useReducer, useEffect, useMemo, useCallback, useRef } from 'react';
import { HomeworkItem, HomeworkRange } from '../types/assignment';
import { TicketMistake } from '../types/ticket';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type HomeworkType = 'sabq' | 'sabqi' | 'manzil';
type RangeMode = 'surah_ayah' | 'surah_surah' | 'juz_juz' | 'multiple_juz';

interface HomeworkSuggestion {
  suggested: boolean;
  range?: HomeworkRange;
  ticketIds?: string[];
  lastApprovedAt?: string;
}

interface HomeworkSuggestions {
  sabq: HomeworkSuggestion;
  sabqi: HomeworkSuggestion;
  manzil: HomeworkSuggestion;
}

interface HomeworkAssignmentFormProps {
  studentId: string;
  studentName?: string; // Optional: student name for template display
  assignmentId?: string;
  ticketMistakes?: TicketMistake[]; // Optional: mistakes from ticket for smart suggestions
  ticketType?: 'sabq' | 'sabqi' | 'manzil'; // Optional: ticket type for suggestions
  onSave: (homeworkItems: HomeworkItem[], notes: string) => Promise<void>;
  onClose: () => void;
}

interface FormState {
  selectedType: HomeworkType | null;
  homeworkItems: HomeworkItem[];
  currentItem: Partial<HomeworkItem>;
  notes: string;
  suggestions: HomeworkSuggestions | null;
  loadingSuggestions: boolean;
  isSaving: boolean;
  validationErrors: Record<string, string>;
  toastMessage: string | null;
  ignoredSuggestions: Set<HomeworkType>;
}

type FormAction =
  | { type: 'SET_TYPE'; payload: HomeworkType | null }
  | { type: 'UPDATE_CURRENT_ITEM'; payload: Partial<HomeworkItem> }
  | { type: 'ADD_ITEM'; payload: HomeworkItem }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'RESET_FORM' }
  | { type: 'SET_SUGGESTIONS'; payload: HomeworkSuggestions }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'SET_VALIDATION_ERROR'; payload: { field: string; error: string } }
  | { type: 'CLEAR_VALIDATION_ERROR'; payload: string }
  | { type: 'SHOW_TOAST'; payload: string }
  | { type: 'HIDE_TOAST' }
  | { type: 'IGNORE_SUGGESTION'; payload: HomeworkType };

// ============================================================================
// CONSTANTS
// ============================================================================

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali \'Imran', 4: 'An-Nisa', 5: 'Al-Ma\'idah',
  6: 'Al-An\'am', 7: 'Al-A\'raf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Ra\'d', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Mu\'minun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shu\'ara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqi\'ah', 57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saff', 62: 'Al-Jumu\'ah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Ma\'arij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Nazi\'at', 80: 'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-A\'la', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
  101: 'Al-Qari\'ah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Ma\'un', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas'
};

const TYPE_COLORS = {
  sabq: { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary', hover: 'hover:bg-primary/20' },
  sabqi: { bg: 'bg-accent/10', border: 'border-accent/30', text: 'text-accent', hover: 'hover:bg-accent/20' },
  manzil: { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary', hover: 'hover:bg-primary/20' }
};

const INITIAL_CURRENT_ITEM: Partial<HomeworkItem> = {
  type: undefined,
  range: {
    mode: 'surah_ayah',
    from: { surah: 1, surahName: 'Al-Fatihah', ayah: 1 },
    to: { surah: 1, surahName: 'Al-Fatihah', ayah: 1 }
  },
  source: { suggestedFrom: 'manual', ticketIds: [] }
};

// ============================================================================
// REDUCER
// ============================================================================

const initialState: FormState = {
  selectedType: null,
  homeworkItems: [],
  currentItem: INITIAL_CURRENT_ITEM,
  notes: '',
  suggestions: null,
  loadingSuggestions: false,
  isSaving: false,
  validationErrors: {},
  toastMessage: null,
  ignoredSuggestions: new Set()
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_TYPE':
      return {
        ...state,
        selectedType: action.payload,
        validationErrors: {}
      };

    case 'UPDATE_CURRENT_ITEM':
      return {
        ...state,
        currentItem: { ...state.currentItem, ...action.payload },
        validationErrors: {}
      };

    case 'ADD_ITEM':
      return {
        ...state,
        homeworkItems: [...state.homeworkItems, action.payload],
        selectedType: null,
        currentItem: INITIAL_CURRENT_ITEM,
        validationErrors: {}
      };

    case 'REMOVE_ITEM':
      return {
        ...state,
        homeworkItems: state.homeworkItems.filter((_, i) => i !== action.payload)
      };

    case 'RESET_FORM':
      return {
        ...initialState,
        suggestions: state.suggestions,
        loadingSuggestions: state.loadingSuggestions
      };

    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };

    case 'SET_LOADING':
      return { ...state, loadingSuggestions: action.payload };

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'SET_NOTES':
      return { ...state, notes: action.payload };

    case 'SET_VALIDATION_ERROR':
      return {
        ...state,
        validationErrors: { ...state.validationErrors, [action.payload.field]: action.payload.error }
      };

    case 'CLEAR_VALIDATION_ERROR':
      const { [action.payload]: _, ...rest } = state.validationErrors;
      return { ...state, validationErrors: rest };

    case 'SHOW_TOAST':
      return { ...state, toastMessage: action.payload };

    case 'HIDE_TOAST':
      return { ...state, toastMessage: null };

    case 'IGNORE_SUGGESTION':
      return {
        ...state,
        ignoredSuggestions: new Set([...Array.from(state.ignoredSuggestions), action.payload])
      };

    default:
      return state;
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

function validateSabq(range: HomeworkRange): string | null {
  if (!range.from?.surah) return 'Surah is required';
  if (!range.from?.ayah || !range.to?.ayah) return 'Ayah range is required';
  if (range.from.ayah > range.to.ayah) return 'From Ayah must be ≤ To Ayah';
  return null;
}

function validateSabqi(range: HomeworkRange): string | null {
  if (range.mode === 'surah_surah') {
    if (!range.from?.surah || !range.to?.surah) return 'Surah range is required';
    if (range.from.surah > range.to.surah) return 'From Surah must be ≤ To Surah';
  } else if (range.mode === 'juz_juz') {
    if (!range.juzList || range.juzList.length === 0) return 'Juz is required';
    if (range.juzList[0] < 1 || range.juzList[0] > 30) return 'Juz must be between 1-30';
  }
  return null;
}

function validateManzil(range: HomeworkRange): string | null {
  if (!range.juzList || range.juzList.length === 0) return 'At least one Juz must be selected';
  if (range.juzList.some(juz => juz < 1 || juz > 30)) return 'All Juz values must be between 1-30';
  return null;
}

function validateCurrentItem(item: Partial<HomeworkItem>): string | null {
  if (!item.type || !item.range) return 'Type and range are required';

  switch (item.type) {
    case 'sabq':
      return validateSabq(item.range);
    case 'sabqi':
      return validateSabqi(item.range);
    case 'manzil':
      return validateManzil(item.range);
    default:
      return 'Invalid homework type';
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatRange(range: HomeworkRange): string {
  if (range.mode === 'surah_ayah') {
    const from = range.from;
    const to = range.to;
    if (!from) return 'Invalid range';
    const surahName = from.surahName || `Surah ${from.surah}`;
    if (from.ayah && to?.ayah) {
      return from.ayah === to.ayah
        ? `${surahName}, Ayah ${from.ayah}`
        : `${surahName}, Ayah ${from.ayah}-${to.ayah}`;
    }
    return surahName;
  } else if (range.mode === 'juz_juz') {
    return `Juz ${range.juzList?.[0] || 'N/A'}`;
  } else if (range.mode === 'multiple_juz') {
    return `Juz ${range.juzList?.join(', ') || 'N/A'}`;
  } else if (range.mode === 'surah_surah') {
    const fromName = range.from?.surahName || `Surah ${range.from?.surah}`;
    const toName = range.to?.surahName || `Surah ${range.to?.surah}`;
    return `${fromName} to ${toName}`;
  }
  return 'Unknown range';
}

function getDefaultRangeForType(type: HomeworkType): HomeworkRange {
  switch (type) {
    case 'sabq':
      return {
        mode: 'surah_ayah',
        from: { surah: 1, surahName: 'Al-Fatihah', ayah: 1 },
        to: { surah: 1, surahName: 'Al-Fatihah', ayah: 1 }
      };
    case 'sabqi':
      return {
        mode: 'juz_juz',
        juzList: [1]
      };
    case 'manzil':
      return {
        mode: 'multiple_juz',
        juzList: []
      };
  }
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface ToastProps {
  message: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = React.memo(({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[60] bg-primary text-white px-6 py-3 rounded-lg shadow-lg animate-fadeIn">
      <div className="flex items-center gap-3">
        <span>✓</span>
        <span>{message}</span>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in;
        }
      `}</style>
    </div>
  );
});
Toast.displayName = 'Toast';

interface HomeworkSuggestionPanelProps {
  suggestions: HomeworkSuggestions | null;
  loading: boolean;
  ignored: Set<HomeworkType>;
  onUse: (type: HomeworkType) => void;
  onModify: (type: HomeworkType) => void;
  onIgnore: (type: HomeworkType) => void;
  onScrollToForm: () => void;
}

const HomeworkSuggestionPanel: React.FC<HomeworkSuggestionPanelProps> = React.memo(({
  suggestions,
  loading,
  ignored,
  onUse,
  onModify,
  onIgnore,
  onScrollToForm
}) => {
  if (loading) {
    return (
      <div className="text-center py-6 text-gray-500">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm">Loading suggestions...</p>
      </div>
    );
  }

  const hasSuggestions = suggestions && (
    (suggestions.sabq?.suggested && !ignored.has('sabq')) ||
    (suggestions.sabqi?.suggested && !ignored.has('sabqi')) ||
    (suggestions.manzil?.suggested && !ignored.has('manzil'))
  );

  if (!hasSuggestions) {
    return (
      <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
        No suggestions available. Create homework manually below.
      </div>
    );
  }

  const renderSuggestionCard = (type: HomeworkType, label: string) => {
    const suggestion = suggestions?.[type];
    if (!suggestion?.suggested || ignored.has(type)) return null;

    const colors = TYPE_COLORS[type];
    const range = suggestion.range ? formatRange(suggestion.range) : '';

    return (
      <div className={`${colors.bg} border ${colors.border} rounded-lg p-4 mb-4 transition-all hover:shadow-md`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-900">💡 Suggested</span>
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">From last approved assignment</span>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {label}: <span className="text-gray-700">{range}</span>
            </p>
            {suggestion.lastApprovedAt && (
              <p className="text-xs text-gray-600 mt-1">
                Last approved: {new Date(suggestion.lastApprovedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-4">
            <button
              type="button"
              onClick={() => onUse(type)}
              className="px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors font-medium"
            >
              Use
            </button>
            <button
              type="button"
              onClick={() => {
                onModify(type);
                setTimeout(onScrollToForm, 100);
              }}
              className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded hover:bg-primary/20 transition-colors font-medium"
            >
              Modify
            </button>
            <button
              type="button"
              onClick={() => onIgnore(type)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors font-medium"
            >
              Ignore
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Suggestions from Recent Tickets</h3>
      {renderSuggestionCard('sabq', 'Sabq')}
      {renderSuggestionCard('sabqi', 'Sabqi')}
      {renderSuggestionCard('manzil', 'Manzil')}
    </div>
  );
});
HomeworkSuggestionPanel.displayName = 'HomeworkSuggestionPanel';

interface HomeworkTypeSelectorProps {
  onSelect: (type: HomeworkType) => void;
}

const HomeworkTypeSelector: React.FC<HomeworkTypeSelectorProps> = React.memo(({ onSelect }) => {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Homework Type</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['sabq', 'sabqi', 'manzil'] as HomeworkType[]).map(type => {
          const colors = TYPE_COLORS[type];
          const labels = { sabq: '📖 Sabq', sabqi: '📚 Sabqi', manzil: '📿 Manzil' };
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className={`px-4 py-3 border-2 ${colors.border} ${colors.bg} ${colors.text} rounded-lg font-medium ${colors.hover} transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.border.replace('border-', 'focus:ring-')}`}
            >
              {labels[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
});
HomeworkTypeSelector.displayName = 'HomeworkTypeSelector';

interface SabqFormProps {
  currentItem: Partial<HomeworkItem>;
  onUpdate: (updates: Partial<HomeworkItem>) => void;
  error?: string;
}

const SabqForm: React.FC<SabqFormProps> = React.memo(({ currentItem, onUpdate, error }) => {
  const range = currentItem.range || { mode: 'surah_ayah' as RangeMode };
  const fromSurah = range.from?.surah || 1;
  const fromAyah = range.from?.ayah || 1;
  const toAyah = range.to?.ayah || 1;

  const handleSurahChange = (surah: number) => {
    const surahName = SURAH_NAMES[surah] || `Surah ${surah}`;
    onUpdate({
      range: {
        mode: 'surah_ayah',
        from: { surah, surahName, ayah: fromAyah },
        to: { surah, surahName, ayah: toAyah }
      }
    });
  };

  const handleFromAyahChange = (ayah: number) => {
    onUpdate({
      range: {
        ...range,
        from: { ...range.from!, ayah },
        to: { ...range.to!, surah: range.from!.surah, surahName: range.from!.surahName }
      }
    });
  };

  const handleToAyahChange = (ayah: number) => {
    onUpdate({
      range: {
        ...range,
        to: { ...range.to!, ayah }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Surah <span className="text-red-500">*</span>
        </label>
        <select
          value={fromSurah}
          onChange={(e) => handleSurahChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          {Object.entries(SURAH_NAMES).map(([num, name]) => (
            <option key={num} value={num}>{num}. {name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From Ayah <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={fromAyah}
            onChange={(e) => handleFromAyahChange(parseInt(e.target.value) || 1)}
            className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary transition ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To Ayah <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={toAyah}
            onChange={(e) => handleToAyahChange(parseInt(e.target.value) || 1)}
            className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary transition ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes/Comments (optional)
        </label>
        <textarea
          value={currentItem.content || ''}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Add any notes or instructions for this Sabq homework..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary transition resize-none"
        />
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
});
SabqForm.displayName = 'SabqForm';

interface SabqiFormProps {
  currentItem: Partial<HomeworkItem>;
  onUpdate: (updates: Partial<HomeworkItem>) => void;
  error?: string;
}

const SabqiForm: React.FC<SabqiFormProps> = React.memo(({ currentItem, onUpdate, error }) => {
  const range = currentItem.range || { mode: 'juz_juz' as RangeMode };
  const mode = range.mode === 'surah_surah' ? 'surah_surah' : 'juz_juz';

  const handleModeChange = (newMode: 'surah_surah' | 'juz_juz') => {
    if (newMode === 'surah_surah') {
      onUpdate({
        range: {
          mode: 'surah_surah',
          from: { surah: 1, surahName: SURAH_NAMES[1] || 'Al-Fatihah' },
          to: { surah: 1, surahName: SURAH_NAMES[1] || 'Al-Fatihah' }
        }
      });
    } else {
      onUpdate({
        range: {
          mode: 'juz_juz',
          juzList: [1]
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Range Mode</label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="sabqi-mode"
              checked={mode === 'surah_surah'}
              onChange={() => handleModeChange('surah_surah')}
              className="mr-2"
            />
            <span className="text-sm">Surah → Surah</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="sabqi-mode"
              checked={mode === 'juz_juz'}
              onChange={() => handleModeChange('juz_juz')}
              className="mr-2"
            />
            <span className="text-sm">Juz → Juz</span>
          </label>
        </div>
      </div>

      {mode === 'surah_surah' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Surah <span className="text-red-500">*</span>
            </label>
            <select
              value={range.from?.surah || 1}
              onChange={(e) => {
                const surah = parseInt(e.target.value);
                onUpdate({
                  range: {
                    ...range,
                    from: { surah, surahName: SURAH_NAMES[surah] || `Surah ${surah}` }
                  }
                });
              }}
              className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-accent focus:border-accent transition ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              {Object.entries(SURAH_NAMES).map(([num, name]) => (
                <option key={num} value={num}>{num}. {name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Surah <span className="text-red-500">*</span>
            </label>
            <select
              value={range.to?.surah || 1}
              onChange={(e) => {
                const surah = parseInt(e.target.value);
                onUpdate({
                  range: {
                    ...range,
                    to: { surah, surahName: SURAH_NAMES[surah] || `Surah ${surah}` }
                  }
                });
              }}
              className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-accent focus:border-accent transition ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              {Object.entries(SURAH_NAMES).map(([num, name]) => (
                <option key={num} value={num}>{num}. {name}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Juz <span className="text-red-500">*</span>
          </label>
          <select
            value={range.juzList?.[0] || 1}
            onChange={(e) => {
              const juz = parseInt(e.target.value);
              onUpdate({
                range: {
                  mode: 'juz_juz',
                  juzList: [juz]
                }
              });
            }}
            className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-accent focus:border-accent transition ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => (
              <option key={juz} value={juz}>Juz {juz}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes/Comments (optional)
        </label>
        <textarea
          value={currentItem.content || ''}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Add any notes or instructions for this Sabqi homework..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-accent focus:border-accent transition resize-none"
        />
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
});
SabqiForm.displayName = 'SabqiForm';

interface ManzilFormProps {
  currentItem: Partial<HomeworkItem>;
  onUpdate: (updates: Partial<HomeworkItem>) => void;
  error?: string;
}

const ManzilForm: React.FC<ManzilFormProps> = React.memo(({ currentItem, onUpdate, error }) => {
  const range = currentItem.range || { mode: 'multiple_juz' as RangeMode };
  const juzList = range.juzList || [];

  const handleJuzToggle = (juz: number) => {
    const newList = juzList.includes(juz)
      ? juzList.filter(j => j !== juz)
      : [...juzList, juz].sort((a, b) => a - b);
    onUpdate({
      range: {
        mode: 'multiple_juz',
        juzList: newList
      }
    });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Juz (multiple) <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto">
        {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => (
          <label key={juz} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded transition">
            <input
              type="checkbox"
              checked={juzList.includes(juz)}
              onChange={() => handleJuzToggle(juz)}
              className="mr-2"
            />
            <span className="text-xs sm:text-sm">Juz {juz}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {juzList.length === 0 && (
        <p className="text-sm text-gray-500 mt-2">Select at least one Juz</p>
      )}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes/Comments (optional)
        </label>
        <textarea
          value={currentItem.content || ''}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Add any notes or instructions for this Manzil homework..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary transition resize-none"
        />
      </div>
    </div>
  );
});
ManzilForm.displayName = 'ManzilForm';

interface HomeworkItemsListProps {
  items: HomeworkItem[];
  onRemove: (index: number) => void;
}

const HomeworkItemsList: React.FC<HomeworkItemsListProps> = React.memo(({ items, onRemove }) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Added Homework Items</h3>
      <div className="space-y-2">
        {items.map((item, index) => {
          const colors = TYPE_COLORS[item.type];
          return (
            <div
              key={index}
              className={`flex items-center justify-between ${colors.bg} border ${colors.border} rounded-lg p-3 transition-all hover:shadow-md animate-slideIn`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-sm font-medium text-gray-900 capitalize">{item.type}:</span>
                  <span className="text-sm text-gray-700">{formatRange(item.range)}</span>
                  {item.source.suggestedFrom === 'ticket' && (
                    <span className="text-xs text-primary">(from tickets)</span>
                  )}
                </div>
                {item.content && (
                  <p className="text-xs text-gray-600 mt-1 italic">"{item.content}"</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="ml-3 text-red-600 hover:text-red-700 text-sm font-medium transition-colors flex-shrink-0"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
});
HomeworkItemsList.displayName = 'HomeworkItemsList';

interface HomeworkNotesProps {
  notes: string;
  onChange: (notes: string) => void;
}

const HomeworkNotes: React.FC<HomeworkNotesProps> = React.memo(({ notes, onChange }) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        General Notes (optional)
      </label>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none transition"
        placeholder="Add any additional notes or instructions..."
      />
    </div>
  );
});
HomeworkNotes.displayName = 'HomeworkNotes';

interface ModalFooterActionsProps {
  onClose: () => void;
  onSave: () => void;
  canSave: boolean;
  isSaving: boolean;
}

const ModalFooterActions: React.FC<ModalFooterActionsProps> = React.memo(({
  onClose,
  onSave,
  canSave,
  isSaving
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
      <button
        type="button"
        onClick={onClose}
        className="w-full sm:w-auto px-5 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
        disabled={isSaving}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        className="w-full sm:w-auto px-5 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSaving || !canSave}
      >
        {isSaving ? 'Saving...' : 'Save Homework'}
      </button>
    </div>
  );
});
ModalFooterActions.displayName = 'ModalFooterActions';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Template configurations for specific students
const STUDENT_TEMPLATES: Record<string, {
  sabq?: Partial<HomeworkItem>;
  sabqi?: Partial<HomeworkItem>;
  manzil?: Partial<HomeworkItem>;
  notes?: string;
}> = {
  'Ibrahim Ahsan': {
    sabq: {
      type: 'sabq',
      range: {
        mode: 'surah_ayah',
        from: {
          surah: 1,
          surahName: 'Al-Fatihah',
          ayah: 1
        },
        to: {
          surah: 2,
          surahName: 'Al-Baqarah',
          ayah: 5
        }
      }
    },
    sabqi: {
      type: 'sabqi',
      range: {
        mode: 'surah_ayah',
        from: {
          surah: 1,
          surahName: 'Al-Fatihah',
          ayah: 1
        },
        to: {
          surah: 1,
          surahName: 'Al-Fatihah',
          ayah: 7
        }
      }
    },
    manzil: {
      type: 'manzil',
      range: {
        mode: 'juz_juz',
        juzList: [1]
      }
    },
    notes: 'Practice with proper tajweed and makhraj. Focus on correct pronunciation.'
  }
};

const HomeworkAssignmentForm: React.FC<HomeworkAssignmentFormProps> = ({
  studentId,
  studentName,
  assignmentId,
  ticketMistakes = [],
  ticketType,
  onSave,
  onClose
}) => {
  const [state, dispatch] = useReducer(formReducer, initialState);
  const formRef = useRef<HTMLDivElement>(null);

  // Generate suggestions from ticket mistakes or fetch from API
  useEffect(() => {
    let mounted = true;
    const loadSuggestions = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        // If ticket mistakes provided, generate suggestions from them
        if (ticketMistakes && ticketMistakes.length > 0 && ticketType) {
          const suggestions: HomeworkSuggestions = {
            sabq: { suggested: false },
            sabqi: { suggested: false },
            manzil: { suggested: false }
          };

          // Group mistakes by surah
          const mistakesBySurah: Record<number, number[]> = {};
          ticketMistakes.forEach((mistake: TicketMistake) => {
            if (mistake.surah && mistake.ayah) {
              if (!mistakesBySurah[mistake.surah]) {
                mistakesBySurah[mistake.surah] = [];
              }
              if (!mistakesBySurah[mistake.surah].includes(mistake.ayah)) {
                mistakesBySurah[mistake.surah].push(mistake.ayah);
              }
            }
          });

          // Generate suggestion based on ticket type
          if (ticketType === 'sabq' && Object.keys(mistakesBySurah).length > 0) {
            const surahs = Object.keys(mistakesBySurah).map(Number).sort((a, b) => a - b);
            const firstSurah = surahs[0];
            const ayahs = mistakesBySurah[firstSurah].sort((a, b) => a - b);
            
            if (ayahs.length > 0) {
              suggestions.sabq = {
                suggested: true,
                range: {
                  mode: 'surah_ayah',
                  from: {
                    surah: firstSurah,
                    surahName: SURAH_NAMES[firstSurah] || `Surah ${firstSurah}`,
                    ayah: Math.min(...ayahs)
                  },
                  to: {
                    surah: firstSurah,
                    surahName: SURAH_NAMES[firstSurah] || `Surah ${firstSurah}`,
                    ayah: Math.max(...ayahs)
                  }
                },
                ticketIds: [],
                lastApprovedAt: new Date().toISOString()
              };
            }
          } else if (ticketType === 'sabqi' || ticketType === 'manzil') {
            // For sabqi/manzil, suggest based on pages (convert to juz)
            const pages = [...new Set(ticketMistakes.map((m: TicketMistake) => m.page).filter(Boolean))].sort((a, b) => a - b);
            if (pages.length > 0) {
              // Rough conversion: page 1-20 ≈ Juz 1, page 21-40 ≈ Juz 2, etc.
              const juzs = [...new Set(pages.map(page => Math.ceil(page / 20)))].filter(juz => juz >= 1 && juz <= 30);
              
              if (juzs.length > 0 && ticketType === 'sabqi') {
                suggestions.sabqi = {
                  suggested: true,
                  range: {
                    mode: 'juz_juz',
                    juzList: [juzs[0]]
                  },
                  ticketIds: [],
                  lastApprovedAt: new Date().toISOString()
                };
              } else if (juzs.length > 0 && ticketType === 'manzil') {
                suggestions.manzil = {
                  suggested: true,
                  range: {
                    mode: 'multiple_juz',
                    juzList: juzs.slice(0, 5) // Limit to 5 juz
                  },
                  ticketIds: [],
                  lastApprovedAt: new Date().toISOString()
                };
              }
            }
          }

          if (mounted) {
            dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          // Fallback to API suggestions
          const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
          const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
          const response = await fetch(`${API_BASE}/students/${studentId}/homework-suggestions`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (response.ok && mounted) {
            const data = await response.json();
            dispatch({ type: 'SET_SUGGESTIONS', payload: data });
          }
        }
      } catch (error) {
        // Silent fail - suggestions are optional
      } finally {
        if (mounted) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    loadSuggestions();
    return () => { mounted = false; };
  }, [studentId, ticketMistakes, ticketType]);

  // Auto-hide toast
  useEffect(() => {
    if (state.toastMessage) {
      const timer = setTimeout(() => {
        dispatch({ type: 'HIDE_TOAST' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.toastMessage]);

  const handleTypeSelect = useCallback((type: HomeworkType) => {
    dispatch({
      type: 'UPDATE_CURRENT_ITEM',
      payload: {
        type,
        range: getDefaultRangeForType(type),
        source: { suggestedFrom: 'manual', ticketIds: [] }
      }
    });
    dispatch({ type: 'SET_TYPE', payload: type });
  }, []);

  const handleUseSuggestion = useCallback((type: HomeworkType) => {
    const suggestion = state.suggestions?.[type];
    if (suggestion?.suggested && suggestion.range) {
      const newItem: HomeworkItem = {
        type,
        range: suggestion.range,
        source: {
          suggestedFrom: 'ticket',
          ticketIds: suggestion.ticketIds || []
        }
      };
      dispatch({ type: 'ADD_ITEM', payload: newItem });
      dispatch({ type: 'SHOW_TOAST', payload: `${type.charAt(0).toUpperCase() + type.slice(1)} homework added from suggestion` });
    }
  }, [state.suggestions]);

  const handleModifySuggestion = useCallback((type: HomeworkType) => {
    const suggestion = state.suggestions?.[type];
    if (suggestion?.suggested && suggestion.range) {
      dispatch({
        type: 'UPDATE_CURRENT_ITEM',
        payload: {
          type,
          range: { ...suggestion.range },
          source: {
            suggestedFrom: 'ticket',
            ticketIds: suggestion.ticketIds || []
          }
        }
      });
      dispatch({ type: 'SET_TYPE', payload: type });
    }
  }, [state.suggestions]);

  const handleIgnoreSuggestion = useCallback((type: HomeworkType) => {
    dispatch({ type: 'IGNORE_SUGGESTION', payload: type });
  }, []);

  const handleUpdateCurrentItem = useCallback((updates: Partial<HomeworkItem>) => {
    dispatch({ type: 'UPDATE_CURRENT_ITEM', payload: updates });
  }, []);

  const handleAddItem = useCallback(() => {
    const validationError = validateCurrentItem(state.currentItem);
    if (validationError) {
      dispatch({
        type: 'SET_VALIDATION_ERROR',
        payload: { field: 'currentItem', error: validationError }
      });
      return;
    }

    if (!state.currentItem.type || !state.currentItem.range) return;

    const newItem: HomeworkItem = {
      type: state.currentItem.type,
      range: state.currentItem.range,
      source: state.currentItem.source || { suggestedFrom: 'manual', ticketIds: [] }
    };

    dispatch({ type: 'ADD_ITEM', payload: newItem });
    dispatch({ type: 'SHOW_TOAST', payload: 'Homework item added' });
  }, [state.currentItem]);

  const handleRemoveItem = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: index });
  }, []);

  const handleSave = useCallback(async () => {
    if (state.homeworkItems.length === 0) {
      dispatch({
        type: 'SET_VALIDATION_ERROR',
        payload: { field: 'items', error: 'Please add at least one homework item' }
      });
      return;
    }

    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await onSave(state.homeworkItems, state.notes);
      onClose();
    } catch (error) {
      dispatch({
        type: 'SET_VALIDATION_ERROR',
        payload: { field: 'save', error: 'Failed to save homework. Please try again.' }
      });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.homeworkItems, state.notes, onSave, onClose]);

  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const validationError = state.validationErrors.currentItem || state.validationErrors.items || state.validationErrors.save;
  const canAddItem = useMemo(() => {
    if (!state.currentItem.type || !state.currentItem.range) return false;
    return !validateCurrentItem(state.currentItem);
  }, [state.currentItem]);

  const renderFormFields = () => {
    if (!state.selectedType) return null;

    const colors = TYPE_COLORS[state.selectedType];
    const typeLabel = state.selectedType.charAt(0).toUpperCase() + state.selectedType.slice(1);

    return (
      <div ref={formRef} className={`${colors.bg} border ${colors.border} rounded-lg p-4 mb-4`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Add {typeLabel} Homework
        </h3>
        {state.selectedType === 'sabq' && (
          <SabqForm
            currentItem={state.currentItem}
            onUpdate={handleUpdateCurrentItem}
            error={state.selectedType === 'sabq' ? validationError : undefined}
          />
        )}
        {state.selectedType === 'sabqi' && (
          <SabqiForm
            currentItem={state.currentItem}
            onUpdate={handleUpdateCurrentItem}
            error={state.selectedType === 'sabqi' ? validationError : undefined}
          />
        )}
        {state.selectedType === 'manzil' && (
          <ManzilForm
            currentItem={state.currentItem}
            onUpdate={handleUpdateCurrentItem}
            error={state.selectedType === 'manzil' ? validationError : undefined}
          />
        )}
        {state.validationErrors.save && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {state.validationErrors.save}
          </div>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleAddItem}
            disabled={!canAddItem}
            className={`w-full sm:w-auto px-4 py-2 ${colors.text.replace('text-', 'bg-').replace('-700', '-600')} text-white rounded text-sm font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Add Item
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_TYPE', payload: null })}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col max-h-[90vh]">
          {/* Header - Not sticky, scrolls with content */}
          <div className="border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Assign Homework</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {studentName ? `Create structured homework assignments for ${studentName}` : 'Create structured homework assignments'}
                </p>
              </div>
              {studentName && STUDENT_TEMPLATES[studentName] && (
                <button
                  onClick={() => {
                    const template = STUDENT_TEMPLATES[studentName];
                    const templateItems: HomeworkItem[] = [];
                    
                    if (template.sabq) {
                      templateItems.push({
                        type: 'sabq',
                        range: template.sabq.range as HomeworkRange,
                        source: {
                          suggestedFrom: 'manual',
                          ticketIds: []
                        }
                      });
                    }
                    if (template.sabqi) {
                      templateItems.push({
                        type: 'sabqi',
                        range: template.sabqi.range as HomeworkRange,
                        source: {
                          suggestedFrom: 'manual',
                          ticketIds: []
                        }
                      });
                    }
                    if (template.manzil) {
                      templateItems.push({
                        type: 'manzil',
                        range: template.manzil.range as HomeworkRange,
                        source: {
                          suggestedFrom: 'manual',
                          ticketIds: []
                        }
                      });
                    }
                    
                    templateItems.forEach(item => {
                      dispatch({ type: 'ADD_ITEM', payload: item });
                    });
                    
                    if (template.notes) {
                      dispatch({ type: 'SET_NOTES', payload: template.notes });
                    }
                    
                    dispatch({ type: 'SHOW_TOAST', payload: `Template loaded for ${studentName}` });
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Create Assignment Template
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-6">
            <HomeworkSuggestionPanel
              suggestions={state.suggestions}
              loading={state.loadingSuggestions}
              ignored={state.ignoredSuggestions}
              onUse={handleUseSuggestion}
              onModify={handleModifySuggestion}
              onIgnore={handleIgnoreSuggestion}
              onScrollToForm={scrollToForm}
            />

            {!state.selectedType && (
              <HomeworkTypeSelector onSelect={handleTypeSelect} />
            )}

            {renderFormFields()}

            <HomeworkItemsList
              items={state.homeworkItems}
              onRemove={handleRemoveItem}
            />

            <HomeworkNotes
              notes={state.notes}
              onChange={(notes) => dispatch({ type: 'SET_NOTES', payload: notes })}
            />

            {state.validationErrors.items && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {state.validationErrors.items}
              </div>
            )}
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="border-t border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0 bg-white">
            <ModalFooterActions
              onClose={onClose}
              onSave={handleSave}
              canSave={state.homeworkItems.length > 0}
              isSaving={state.isSaving}
            />
          </div>
        </div>
      </div>

      {state.toastMessage && (
        <Toast
          message={state.toastMessage}
          onClose={() => dispatch({ type: 'HIDE_TOAST' })}
        />
      )}
    </>
  );
};

export default HomeworkAssignmentForm;
