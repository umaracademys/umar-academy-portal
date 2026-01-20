import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { Ticket, TajweedIssue, TajweedIssueType, MistakeCount, Atkees, RecitationRange } from '../types/ticket';
import { ClassworkPhase } from '../types/assignment';
import { MushafMistake } from '@umar-academy/mushaf';
import { useBackendData } from '../contexts/BackendDataContext';
import { WorkflowBanner } from './workflow/WorkflowBanner';
import { MistakeBadgeHighlight } from './workflow/MistakeBadgeHighlight';
import { fetchVersesBySurah } from '../services/quranApi';
import { getQuranChapters } from '@umar-academy/mushaf';

interface SabqEntry {
  id: string;
  recitationRange: RecitationRange;
  mistakes: MushafMistake[];
  mistakeCount?: MistakeCount;
  atkees?: Atkees;
  tajweedIssues: TajweedIssue[];
  adminComment?: string;
}

interface AdminSabqReviewProps {
  ticket: Ticket;
  onClose: () => void;
  onSubmit: (ticketId: string, data: {
    sabqEntries: SabqEntry[];
    homeworkRange?: RecitationRange;
    adminComment: string;
  }) => Promise<void>;
}

const AdminSabqReview: React.FC<AdminSabqReviewProps> = ({ ticket, onClose, onSubmit }) => {
  const { getStudentPersonalMushaf, getStudentAssignments } = useBackendData();
  const [mushafPage, setMushafPage] = useState(1);
  const [currentSabqIndex, setCurrentSabqIndex] = useState<number | null>(null); // null = creating new, number = editing existing
  const [sabqEntries, setSabqEntries] = useState<SabqEntry[]>([]);
  const [currentMistakes, setCurrentMistakes] = useState<MushafMistake[]>([]);
  const [currentRecitationRange, setCurrentRecitationRange] = useState<RecitationRange>({
    surahNumber: 1,
    juzNumber: undefined,
    startAyahNumber: 0,
    endAyahNumber: 0,
    startAyahText: undefined,
    endAyahText: undefined
  });
  const [selectedStartAyah, setSelectedStartAyah] = useState<{ surah: number; ayah: number } | null>(null);
  const [selectedEndAyah, setSelectedEndAyah] = useState<{ surah: number; ayah: number } | null>(null);
  const [mistakeCount, setMistakeCount] = useState<MistakeCount | undefined>(undefined);
  const [atkees, setAtkees] = useState<number | undefined>(undefined);
  const [tajweedIssues, setTajweedIssues] = useState<TajweedIssue[]>([]);
  const [mistakesWithWords, setMistakesWithWords] = useState<Map<string, string>>(new Map()); // Map of mistake ID to word text
  const [mistakesWithWordsByKey, setMistakesWithWordsByKey] = useState<Map<string, string>>(new Map()); // Map of composite key (surah:ayah:wordIndex) to word text
  const [currentAdminComment, setCurrentAdminComment] = useState('');
  const [adminComment, setAdminComment] = useState(ticket.adminComment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalMushafMistakes, setPersonalMushafMistakes] = useState<MushafMistake[]>([]);
  const [loadingPersonalMushaf, setLoadingPersonalMushaf] = useState(false);
  const [mushafZoom, setMushafZoom] = useState(1.0);
  const [showSidebar, setShowSidebar] = useState(true); // Auto-show sidebar for admin
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [homeworkRange, setHomeworkRange] = useState<RecitationRange | undefined>(undefined);
  const [homeworkStartAyah, setHomeworkStartAyah] = useState<{ surah: number; ayah: number } | null>(null);
  const [homeworkEndAyah, setHomeworkEndAyah] = useState<{ surah: number; ayah: number } | null>(null);
  const [loadingAyahText, setLoadingAyahText] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  const hasNavigatedRef = useRef(false); // Track if initial navigation has happened

  // Load surahs on mount
  useEffect(() => {
    const loadSurahs = async () => {
      try {
        const chapters = await getQuranChapters();
        setSurahs(chapters);
      } catch (error) {
        console.error('Error loading surahs:', error);
      }
    };
    loadSurahs();
  }, []);

  // Get surah name from surah number (always Arabic)
  const getSurahName = (surahNumber: number): string | undefined => {
    const surah = surahs.find(s => s.id === surahNumber);
    // Always prefer Arabic name
    return surah?.name_arabic || surah?.name_simple;
  };

  // Load personal mushaf mistakes
  useEffect(() => {
    const loadPersonalMushaf = async () => {
      if (!ticket.studentId) return;
      setLoadingPersonalMushaf(true);
      try {
        const personalMushafData = await getStudentPersonalMushaf(ticket.studentId);
        if (personalMushafData?.mistakes) {
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
  }, [ticket.studentId, getStudentPersonalMushaf]);

  // Navigate to student's last sabq position (after personal mushaf is loaded) - Only once on mount
  useEffect(() => {
    // Only navigate once, after personal mushaf is loaded
    if (loadingPersonalMushaf || hasNavigatedRef.current) return;
    
    const navigateToLastSabq = () => {
      if (!ticket.studentId) return;
      
      try {
        // Get student's assignments
        const studentAssignments = getStudentAssignments(ticket.studentId);
        
        // Find the last sabq entry
        let lastSabqEntry: ClassworkPhase | null = null;
        for (const assignment of studentAssignments) {
          if (assignment.classwork?.sabq && assignment.classwork.sabq.length > 0) {
            // Get the last sabq entry (most recent)
            const sabqEntries = assignment.classwork.sabq;
            const lastEntry = sabqEntries[sabqEntries.length - 1];
            if (lastEntry && lastEntry.toAyah && lastEntry.surahNumber) {
              lastSabqEntry = lastEntry;
              break; // Use the most recent one
            }
          }
        }
        
        if (lastSabqEntry && typeof lastSabqEntry.surahNumber === 'number' && typeof lastSabqEntry.toAyah === 'number') {
          // Try to find page from mistakes or use estimation
          // First, check if we have mistakes with page numbers for this surah/ayah
          const surahNum = lastSabqEntry.surahNumber;
          const toAyahNum = lastSabqEntry.toAyah;
          const relevantMistake = personalMushafMistakes.find(m => 
            m.surah === surahNum && 
            m.ayah === toAyahNum
          );
          
          if (relevantMistake?.page) {
            setMushafPage(relevantMistake.page);
          } else {
            // Fallback: estimate page from surah (rough approximation)
            const estimatedPage = estimatePageFromSurah(surahNum);
            if (estimatedPage) {
              setMushafPage(estimatedPage);
            }
          }
          hasNavigatedRef.current = true; // Mark as navigated
        } else if (personalMushafMistakes.length > 0 && !hasNavigatedRef.current) {
          // If no sabq entry found, check personal mistakes
          const firstMistake = personalMushafMistakes[0];
          if (firstMistake?.page) {
            setMushafPage(firstMistake.page);
            hasNavigatedRef.current = true; // Mark as navigated
          }
        }
      } catch (error) {
        console.error('Error navigating to last sabq:', error);
      }
    };
    
    navigateToLastSabq();
  }, [ticket.studentId, getStudentAssignments, personalMushafMistakes.length, loadingPersonalMushaf]);
  
  // Helper function to estimate page from surah (fallback)
  const estimatePageFromSurah = (surahNumber: number): number | null => {
    // Rough page estimates based on common mushaf layouts
    const surahPageMap: Record<number, number> = {
      1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187,
      10: 208, 11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293, 19: 305,
      20: 312, 21: 322, 22: 332, 23: 342, 24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396,
      30: 404, 31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458,
      40: 467, 41: 477, 42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515,
      50: 518, 51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542, 59: 545,
      60: 549, 61: 551, 62: 553, 63: 554, 64: 556, 65: 558, 66: 560, 67: 562, 68: 564, 69: 566,
      70: 568, 71: 570, 72: 572, 73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583,
      80: 585, 81: 586, 82: 587, 83: 589, 84: 590, 85: 591, 86: 593, 87: 594, 88: 595, 89: 596,
      90: 597, 91: 598, 92: 599, 93: 600, 94: 601, 95: 602, 96: 603, 97: 604, 98: 605, 99: 606,
      100: 607, 101: 607, 102: 608, 103: 608, 104: 609, 105: 609, 106: 610, 107: 610, 108: 611, 109: 611,
      110: 611, 111: 612, 112: 612, 113: 613, 114: 613
    };
    return surahPageMap[surahNumber] || null;
  };

  // Load ayah text and surah name when ayah is selected
  const loadAyahText = async (surahNumber: number, ayahNumber: number): Promise<string> => {
    try {
      setLoadingAyahText(true);
      
      // Try backend endpoint first (most reliable for Arabic text)
      let ayahText: string | undefined;
      try {
        const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE}/quran/surahs/${surahNumber}/ayahs/${ayahNumber}/text`);
        if (response.ok) {
          const data = await response.json();
          if (data.text) {
            // Clean the text: remove any trailing ayah numbers or extra whitespace
            ayahText = data.text.trim();
            // Remove any Arabic or English numerals at the end (ayah numbers)
            if (ayahText) {
              ayahText = ayahText.replace(/[\s]*[٠-٩0-9]+[\s]*$/, '').trim();
            } else {
              ayahText = '';
            }
          }
        } else if (response.status === 404) {
          // Gracefully handle 404 - continue to fallback methods
          console.warn(`⚠️ Ayah text endpoint returned 404 for surah ${surahNumber}, ayah ${ayahNumber}, trying fallback methods...`);
          // Don't return - continue to fallback methods below
        }
      } catch (error) {
        // Continue to fallback - don't log error for 404s
        if ((error as any).status !== 404) {
          console.warn('⚠️ Error fetching ayah text:', error);
        }
      }
      
      // Fallback: Try to fetch verses from API
      if (!ayahText) {
        try {
          const verses = await fetchVersesBySurah(surahNumber);
          if (verses && verses.length > 0) {
            const verse = verses.find((v: any) => {
              return v.verse_number === ayahNumber || 
                     v.verseNumber === ayahNumber ||
                     (v.verse_key && v.verse_key === `${surahNumber}:${ayahNumber}`);
            });
            if (verse) {
              // Prefer text_uthmani (most accurate), then text, then text_simple
              ayahText = verse.text_uthmani || verse.text || verse.text_simple;
              if (ayahText) {
                // Clean the text: remove any trailing ayah numbers or extra whitespace
                ayahText = ayahText.trim();
                // Remove any Arabic or English numerals at the end (ayah numbers)
                ayahText = ayahText.replace(/[\s]*[٠-٩0-9]+[\s]*$/, '').trim();
              }
            }
          }
        } catch (error) {
          // Continue to fallback
        }
      }
      
      // If we still don't have text, try fetching from words API
      if (!ayahText) {
        try {
          const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
          const wordsResponse = await fetch(`${API_BASE}/quran/surahs/${surahNumber}/ayahs/${ayahNumber}/words`);
          if (wordsResponse.ok) {
            const wordsData = await wordsResponse.json();
            if (wordsData.words && Array.isArray(wordsData.words) && wordsData.words.length > 0) {
              // Reconstruct ayah text from words - join without spaces for proper Arabic text
              ayahText = wordsData.words.map((w: any) => {
                let wordText = (w.text || w.word_text || '').trim();
                // Remove any HTML tags or special characters
                wordText = wordText.replace(/<[^>]+>/g, '');
                return wordText;
              }).filter(Boolean).join('');
              // Clean the final text: remove any trailing ayah numbers
              if (ayahText) {
                ayahText = ayahText.replace(/[\s]*[٠-٩0-9]+[\s]*$/, '').trim();
              } else {
                ayahText = '';
              }
            }
          }
        } catch (error) {
          // Return empty string
        }
      }
      
      // Return cleaned text or empty string
      return ayahText && ayahText.trim().length > 0 ? ayahText.trim() : '';
    } catch (error) {
      console.error('Error loading ayah text:', error);
      return '';
    } finally {
      setLoadingAyahText(false);
    }
  };

  // Handle double-click for ayah range selection
  const handleVerseDoubleClick = async (surah: number, ayah: number, page: number) => {
    const hasStartAyah = currentRecitationRange.startAyahNumber > 0;
    const hasEndAyah = currentRecitationRange.endAyahNumber > 0;
    const surahName = getSurahName(surah);
    
    if (!hasStartAyah) {
      setSelectedStartAyah({ surah, ayah });
      const ayahText = await loadAyahText(surah, ayah);
      setCurrentRecitationRange(prev => ({
        ...prev,
        surahNumber: surah,
        surahName: surahName,
        startAyahNumber: ayah,
        startAyahText: ayahText,
        endAyahNumber: prev.endAyahNumber || 0,
        endAyahText: prev.endAyahText
      }));
    } else if (!hasEndAyah) {
      const startAyah = currentRecitationRange.startAyahNumber;
      if (surah === currentRecitationRange.surahNumber && ayah >= startAyah) {
        setSelectedEndAyah({ surah, ayah });
        const ayahText = await loadAyahText(surah, ayah);
        setCurrentRecitationRange(prev => ({
          ...prev,
          surahNumber: surah,
          surahName: surahName,
          endAyahNumber: ayah,
          endAyahText: ayahText
        }));
      } else {
        alert('End ayah must be in the same surah and come after the start ayah');
      }
    } else {
      // Reset
      setSelectedStartAyah({ surah, ayah });
      setSelectedEndAyah(null);
      const ayahText = await loadAyahText(surah, ayah);
      setCurrentRecitationRange(prev => ({
        ...prev,
        surahNumber: surah,
        surahName: surahName,
        startAyahNumber: ayah,
        startAyahText: ayahText,
        endAyahNumber: 0,
        endAyahText: undefined
      }));
    }
  };

  // Handle homework double-click
  const handleHomeworkDoubleClick = async (surah: number, ayah: number, page: number) => {
    const hasStartAyah = homeworkRange?.startAyahNumber && homeworkRange.startAyahNumber > 0;
    const hasEndAyah = homeworkRange?.endAyahNumber && homeworkRange.endAyahNumber > 0;
    const surahName = getSurahName(surah);
    
    if (!homeworkRange) {
      setHomeworkRange({
        surahNumber: surah,
        surahName: surahName,
        juzNumber: undefined,
        startAyahNumber: 0,
        endAyahNumber: 0,
        startAyahText: undefined,
        endAyahText: undefined
      });
    }
    
    if (!hasStartAyah) {
      setHomeworkStartAyah({ surah, ayah });
      const ayahText = await loadAyahText(surah, ayah);
      setHomeworkRange(prev => ({
        ...prev!,
        surahNumber: surah,
        surahName: surahName,
        startAyahNumber: ayah,
        startAyahText: ayahText,
        endAyahNumber: prev?.endAyahNumber || 0,
        endAyahText: prev?.endAyahText
      }));
    } else if (!hasEndAyah) {
      const startAyah = homeworkRange.startAyahNumber;
      if (surah === homeworkRange.surahNumber && ayah >= startAyah) {
        setHomeworkEndAyah({ surah, ayah });
        const ayahText = await loadAyahText(surah, ayah);
        setHomeworkRange(prev => ({
          ...prev!,
          surahNumber: surah,
          surahName: surahName,
          endAyahNumber: ayah,
          endAyahText: ayahText
        }));
      } else {
        alert('End ayah must be in the same surah and come after the start ayah');
      }
    } else {
      // Reset
      setHomeworkStartAyah({ surah, ayah });
      setHomeworkEndAyah(null);
      const ayahText = await loadAyahText(surah, ayah);
      setHomeworkRange(prev => ({
        ...prev!,
        surahNumber: surah,
        surahName: surahName,
        startAyahNumber: ayah,
        startAyahText: ayahText,
        endAyahNumber: 0,
        endAyahText: undefined
      }));
    }
  };

  // Handle mistake marking
  const handleMistakeMark = (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    const newMistake: MushafMistake = {
      ...mistake,
      id: `mistake-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    setCurrentMistakes(prev => [...prev, newMistake]);
  };

  // Remove mistake
  const handleRemoveMistake = (mistakeId: string) => {
    setCurrentMistakes(prev => prev.filter(m => m.id !== mistakeId));
  };

  // Save current Sabq entry
  const saveCurrentSabqEntry = () => {
    if (currentRecitationRange.startAyahNumber === 0 || currentRecitationRange.endAyahNumber === 0) {
      alert('Please select both start and end ayah (double-click on verses)');
      return;
    }

    const entry: SabqEntry = {
      id: currentSabqIndex !== null ? sabqEntries[currentSabqIndex].id : `sabq-${Date.now()}-${Math.random()}`,
      recitationRange: { ...currentRecitationRange },
      mistakes: [...currentMistakes],
      mistakeCount: mistakeCount || undefined,
      atkees: atkees || undefined,
      tajweedIssues: [...tajweedIssues],
      adminComment: currentAdminComment.trim() || undefined
    };

    if (currentSabqIndex !== null) {
      // Update existing entry
      const updated = [...sabqEntries];
      updated[currentSabqIndex] = entry;
      setSabqEntries(updated);
    } else {
      // Add new entry
      setSabqEntries(prev => [...prev, entry]);
    }

    // Reset current state
    setCurrentSabqIndex(null);
    setCurrentMistakes([]);
    setCurrentRecitationRange({
      surahNumber: 1,
      juzNumber: undefined,
      startAyahNumber: 0,
      endAyahNumber: 0,
      startAyahText: undefined,
      endAyahText: undefined
    });
    setSelectedStartAyah(null);
    setSelectedEndAyah(null);
    setMistakeCount(undefined);
    setAtkees(undefined);
    setTajweedIssues([]);
    setCurrentAdminComment('');
  };

  // Start new Sabq entry
  const startNewSabqEntry = () => {
    setCurrentSabqIndex(null);
    setCurrentMistakes([]);
    setCurrentRecitationRange({
      surahNumber: 1,
      juzNumber: undefined,
      startAyahNumber: 0,
      endAyahNumber: 0,
      startAyahText: undefined,
      endAyahText: undefined
    });
    setSelectedStartAyah(null);
    setSelectedEndAyah(null);
    setMistakeCount(undefined);
    setAtkees(undefined);
    setTajweedIssues([]);
    setCurrentAdminComment('');
    setShowSidebar(true);
  };

  // Edit existing Sabq entry
  const editSabqEntry = (index: number) => {
    const entry = sabqEntries[index];
    setCurrentSabqIndex(index);
    setCurrentMistakes([...entry.mistakes]);
    setCurrentRecitationRange({ ...entry.recitationRange });
    setSelectedStartAyah(entry.recitationRange.startAyahNumber ? {
      surah: entry.recitationRange.surahNumber,
      ayah: entry.recitationRange.startAyahNumber
    } : null);
    setSelectedEndAyah(entry.recitationRange.endAyahNumber ? {
      surah: entry.recitationRange.surahNumber,
      ayah: entry.recitationRange.endAyahNumber
    } : null);
    setMistakeCount(entry.mistakeCount || undefined);
    setAtkees(entry.atkees || undefined);
    setTajweedIssues([...entry.tajweedIssues]);
    setCurrentAdminComment(entry.adminComment || '');
    setShowSidebar(true);
  };

  // Remove Sabq entry
  const removeSabqEntry = (index: number) => {
    if (window.confirm('Are you sure you want to remove this Sabq entry?')) {
      setSabqEntries(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Validation
  const canSubmit = useMemo(() => {
    // Must have at least one Sabq entry with start and end ayah
    if (sabqEntries.length === 0) {
      return false;
    }
    // All entries must have start and end ayah
    return sabqEntries.every(entry => 
      entry.recitationRange.startAyahNumber > 0 && entry.recitationRange.endAyahNumber > 0
    );
  }, [sabqEntries]);

  // Handle submit
  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Please add at least one Sabq entry with start and end ayah selected');
      return;
    }

    if (!adminComment.trim()) {
      setError('Admin comment is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(ticket.id, {
        sabqEntries,
        homeworkRange,
        adminComment: adminComment.trim()
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit Sabq');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tajweed issue types
  const tajweedIssueTypes: TajweedIssueType[] = [
    'heavy_letters',
    'fatha_not_vertical',
    'kasrah_not_horizontal',
    'clarity_compromised',
    'lack_of_confidence',
    'incorrect_stops',
    'ghunnah_error',
    'qalqalah_error',
    'idgham_error',
    'madd_error',
    'tajweed_rule_violation'
  ];

  const toggleTajweedIssue = (type: TajweedIssueType) => {
    setTajweedIssues(prev => {
      const existing = prev.find(issue => issue.type === type);
      if (existing) {
        return prev.filter(issue => issue.type !== type);
      } else {
        return [...prev, { type }];
      }
    });
  };

  const getTajweedIssueLabel = (type: TajweedIssueType): string => {
    const labels: Record<TajweedIssueType, string> = {
      heavy_letters: 'Heavy Letters',
      fatha_not_vertical: 'Fatha Not Vertical',
      kasrah_not_horizontal: 'Kasrah Not Horizontal',
      clarity_compromised: 'Clarity Compromised',
      lack_of_confidence: 'Lack of Confidence',
      incorrect_stops: 'Incorrect Stops',
      ghunnah_error: 'Ghunnah Error',
      qalqalah_error: 'Qalqalah Error',
      idgham_error: 'Idgham Error',
      madd_error: 'Madd Error',
      tajweed_rule_violation: 'Tajweed Rule Violation'
    };
    return labels[type] || type;
  };

  // Mistake categories
  const mistakeCategories = useMemo(() => {
    return currentMistakes.reduce((acc, m) => {
      const type = m.type.toLowerCase();
      if (['madd', 'ikhfa', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'].includes(type)) {
        acc.tajweed++;
      } else if (type === 'atkee') {
        acc.atkee++;
      } else {
        acc.mistakes++;
      }
      return acc;
    }, { mistakes: 0, atkee: 0, tajweed: 0 });
  }, [currentMistakes]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-primary border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">Admin Sabq Review</h2>
              <span className="px-2 py-1 rounded text-xs font-semibold bg-white/20 text-white">
                {ticket.studentName}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded transition-colors text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Mushaf Area */}
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Interactive Mushaf</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  {showSidebar ? 'Hide' : 'Show'} Panel
                </button>
                {currentMistakes.length > 0 && (
                  <span className="px-3 py-1 bg-primary/10 rounded text-sm font-semibold text-primary">
                    {currentMistakes.length} mistakes
                  </span>
                )}
              </div>
            </div>

            {loadingPersonalMushaf && (
              <div className="text-center py-4 text-sm text-gray-500">
                Loading student's mistake history...
              </div>
            )}

            <div className="border border-gray-200 rounded overflow-hidden" style={{ maxHeight: '600px', overflow: 'auto' }}>
              <InteractiveMushaf
                currentPage={mushafPage}
                onPageChange={setMushafPage}
                mistakes={currentMistakes}
                historicalMistakes={personalMushafMistakes}
                showHistorical={true}
                onMistakeMark={handleMistakeMark}
                onVerseDoubleClick={handleVerseDoubleClick}
                onMistakesWithWords={(mistakesWithWordsData) => {
                  if (!mistakesWithWordsData || mistakesWithWordsData.length === 0) {
                    return;
                  }
                  
                  // Store word text for each mistake by ID and by composite key
                  // Use functional update to merge with existing data
                  setMistakesWithWords((prevMap) => {
                    const wordTextMap = new Map(prevMap);
                    
                    mistakesWithWordsData.forEach((m: any) => {
                      if (m.wordText && m.id) {
                        wordTextMap.set(m.id, m.wordText);
                      }
                    });
                    
                    return wordTextMap;
                  });
                  
                  setMistakesWithWordsByKey((prevMap) => {
                    const wordTextMapByKey = new Map(prevMap);
                    
                    mistakesWithWordsData.forEach((m: any) => {
                      if (m.wordText && m.surah && m.ayah && m.wordIndex !== undefined) {
                        const compositeKey = `${m.surah}:${m.ayah}:${m.wordIndex}`;
                        wordTextMapByKey.set(compositeKey, m.wordText);
                      }
                    });
                    
                    return wordTextMapByKey;
                  });
                }}
                readOnly={false}
                mode="marking"
                studentName={ticket.studentName}
                enableZoom={true}
                zoom={mushafZoom}
                onZoomChange={setMushafZoom}
              />
            </div>
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div className="w-80 border-l border-gray-200 overflow-y-auto bg-gray-50 p-4 space-y-4">
              {/* Current Sabq Entry */}
              <div className="bg-white rounded-lg border-2 border-primary p-3">
                <h4 className="text-sm font-semibold text-primary mb-3">Current Sabq Entry</h4>
                
                {/* Recitation Range */}
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Recitation Range *</div>
                  <div className="text-xs text-gray-600 mb-2">
                    <strong>Double-click</strong> on verses to select start and end ayahs
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2 bg-gray-50 rounded border">
                      <div className="text-[10px] font-semibold text-gray-700 mb-0.5">Start Ayah</div>
                      {currentRecitationRange.startAyahNumber > 0 && currentRecitationRange.startAyahText ? (
                        <div className="space-y-1">
                          {currentRecitationRange.surahName && (
                            <div 
                              className="text-sm font-bold text-primary"
                              style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                              dir="rtl"
                            >
                              {currentRecitationRange.surahName}
                            </div>
                          )}
                          <div 
                            className="text-base text-gray-900 leading-relaxed"
                            style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                            dir="rtl"
                          >
                            {currentRecitationRange.startAyahText}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">Not selected</div>
                      )}
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <div className="text-[10px] font-semibold text-gray-700 mb-0.5">End Ayah</div>
                      {currentRecitationRange.endAyahNumber > 0 && currentRecitationRange.endAyahText ? (
                        <div className="space-y-1">
                          {currentRecitationRange.surahName && (
                            <div 
                              className="text-sm font-bold text-primary"
                              style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                              dir="rtl"
                            >
                              {currentRecitationRange.surahName}
                            </div>
                          )}
                          <div 
                            className="text-base text-gray-900 leading-relaxed"
                            style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                            dir="rtl"
                          >
                            {currentRecitationRange.endAyahText}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">Not selected</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Juz Number */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Juz Number (Optional)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={currentRecitationRange.juzNumber || ''}
                    onChange={(e) => setCurrentRecitationRange(prev => ({
                      ...prev,
                      juzNumber: e.target.value ? parseInt(e.target.value) : undefined
                    }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>

                {/* Mistakes */}
                {currentMistakes.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">
                      Mistakes ({currentMistakes.length})
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {currentMistakes.map((mistake) => {
                        // Get word text from mistakesWithWords map - try by ID first, then by composite key
                        let wordText = mistake.id ? mistakesWithWords.get(mistake.id) : undefined;
                        
                        // If not found by ID, try to find by composite key (surah:ayah:wordIndex)
                        if (!wordText && mistake.surah && mistake.ayah && mistake.wordIndex !== undefined) {
                          const compositeKey = `${mistake.surah}:${mistake.ayah}:${mistake.wordIndex}`;
                          wordText = mistakesWithWordsByKey.get(compositeKey);
                        }
                        
                        return (
                          <MistakeBadgeHighlight
                            key={mistake.id}
                            mistake={mistake}
                            isNew={true}
                            showTimestamp={false}
                            onRemove={handleRemoveMistake}
                            wordText={wordText}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mistake Count & Atkees */}
                <div className="mb-3 space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Mistake Count</label>
                    <select
                      value={mistakeCount}
                      onChange={(e) => setMistakeCount(e.target.value === 'weak' ? 'weak' : (e.target.value ? parseInt(e.target.value) : undefined))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="">Select count</option>
                      <option value="weak">Weak</option>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Atkees</label>
                    <select
                      value={atkees}
                      onChange={(e) => setAtkees(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="">Select</option>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tajweed Issues */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Tajweed Issues</label>
                  <div className="space-y-1">
                    {tajweedIssueTypes.map(type => (
                      <label key={type} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={tajweedIssues.some(issue => issue.type === type)}
                          onChange={() => toggleTajweedIssue(type)}
                          className="rounded"
                        />
                        <span>{getTajweedIssueLabel(type)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Admin Comment for this entry */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Comment (Optional)</label>
                  <textarea
                    value={currentAdminComment}
                    onChange={(e) => setCurrentAdminComment(e.target.value)}
                    placeholder="Add comment for this Sabq entry..."
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    rows={2}
                  />
                </div>

                {/* Save Entry Button */}
                <button
                  onClick={saveCurrentSabqEntry}
                  disabled={currentRecitationRange.startAyahNumber === 0 || currentRecitationRange.endAyahNumber === 0}
                  className="w-full px-3 py-2 bg-primary text-white rounded text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentSabqIndex !== null ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>

              {/* Saved Sabq Entries */}
              {sabqEntries.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Saved Sabq Entries ({sabqEntries.length})</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sabqEntries.map((entry, index) => (
                      <div key={entry.id} className="p-2 bg-gray-50 rounded border border-purple-200 border-l-4 border-l-purple-400">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-gray-700 mb-1">
                              Entry {index + 1}
                            </div>
                            
                            {/* Recitation Range - Arabic Text */}
                            {entry.recitationRange.surahName && (
                              <div 
                                className="text-xs font-bold text-primary mb-0.5"
                                style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                                dir="rtl"
                              >
                                {entry.recitationRange.surahName}
                              </div>
                            )}
                            {entry.recitationRange.startAyahText && entry.recitationRange.endAyahText && (
                              <div className="space-y-0.5 mb-1">
                                <p 
                                  className="text-xs text-gray-900 leading-relaxed"
                                  style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                                  dir="rtl"
                                >
                                  {entry.recitationRange.startAyahText}
                                </p>
                                {entry.recitationRange.endAyahText !== entry.recitationRange.startAyahText && (
                                  <p 
                                    className="text-xs text-gray-900 leading-relaxed"
                                    style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                                    dir="rtl"
                                  >
                                    {entry.recitationRange.endAyahText}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {/* Fallback: Show numbers if text not available */}
                            {(!entry.recitationRange.startAyahText || !entry.recitationRange.endAyahText) && (
                              <div className="text-xs text-gray-600 mb-1">
                                Surah {entry.recitationRange.surahNumber}: {entry.recitationRange.startAyahNumber}-{entry.recitationRange.endAyahNumber}
                                {entry.recitationRange.juzNumber && ` (Juz ${entry.recitationRange.juzNumber})`}
                              </div>
                            )}
                            
                            {/* Mistake Count & Atkees */}
                            <div className="flex gap-2 mt-1 mb-1">
                              {entry.mistakeCount && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-semibold">
                                  Mistakes: {entry.mistakeCount}
                                </span>
                              )}
                              {entry.atkees && (
                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-semibold">
                                  Atkees: {entry.atkees}
                                </span>
                              )}
                              {entry.tajweedIssues && entry.tajweedIssues.length > 0 && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-semibold">
                                  Tajweed: {entry.tajweedIssues.length}
                                </span>
                              )}
                            </div>
                            
                            {/* Mistakes List */}
                            {entry.mistakes && entry.mistakes.length > 0 && (
                              <div className="mt-1.5 pt-1.5 border-t border-gray-300">
                                <div className="text-[10px] font-semibold text-gray-700 mb-1">
                                  Marked Mistakes ({entry.mistakes.length})
                                </div>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {entry.mistakes.map((mistake) => (
                                    <MistakeBadgeHighlight
                                      key={mistake.id || `mistake-${index}-${mistake.page}-${mistake.wordIndex}`}
                                      mistake={mistake}
                                      isNew={false}
                                      showTimestamp={false}
                                      onRemove={undefined}
                                      wordText={mistake.wordText}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => editSabqEntry(index)}
                              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeSabqEntry(index)}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={startNewSabqEntry}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 transition-colors"
                >
                  + Add Another Sabq
                </button>
                <button
                  onClick={() => setShowHomeworkModal(true)}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Pass Sabq & Assign Homework
                </button>
              </div>

              {/* Admin Comment (Required) */}
              <div className="bg-white rounded-lg border-2 border-primary p-3">
                <label className="text-sm font-semibold text-primary mb-1 block">
                  Admin Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Enter admin comment (required)..."
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  rows={3}
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || !adminComment.trim() || isSubmitting}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Send to Assignment'}
              </button>
            </div>
          )}
        </div>

        {/* Homework Modal */}
        {showHomeworkModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-blue-600 border-b border-blue-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Assign Sabq Homework</h3>
                  <button
                    onClick={() => setShowHomeworkModal(false)}
                    className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded transition-colors text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Double-click on verses in the Mushaf to select homework start and end ayahs.
                  </p>
                  <div className="border border-gray-200 rounded overflow-hidden" style={{ maxHeight: '400px', overflow: 'auto' }}>
                    <InteractiveMushaf
                      currentPage={mushafPage}
                      onPageChange={setMushafPage}
                      mistakes={[]}
                      historicalMistakes={personalMushafMistakes}
                      showHistorical={true}
                      onVerseDoubleClick={handleHomeworkDoubleClick}
                      readOnly={false}
                      mode="marking"
                      studentName={ticket.studentName}
                      enableZoom={true}
                      zoom={mushafZoom}
                      onZoomChange={setMushafZoom}
                    />
                  </div>
                </div>

                {homeworkRange && (homeworkRange.startAyahNumber > 0 || homeworkRange.endAyahNumber > 0) && (
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Homework Range</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-semibold text-gray-700">Start Ayah</div>
                        {homeworkRange.startAyahNumber > 0 ? (
                          <div className="text-sm text-blue-700 font-bold">
                            Surah {homeworkRange.surahNumber}:{homeworkRange.startAyahNumber}
                            {homeworkRange.startAyahText && (
                              <div className="text-xs text-gray-600 mt-0.5">{homeworkRange.startAyahText}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Not selected</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-700">End Ayah</div>
                        {homeworkRange.endAyahNumber > 0 ? (
                          <div className="text-sm text-blue-700 font-bold">
                            Surah {homeworkRange.surahNumber}:{homeworkRange.endAyahNumber}
                            {homeworkRange.endAyahText && (
                              <div className="text-xs text-gray-600 mt-0.5">{homeworkRange.endAyahText}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Not selected</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowHomeworkModal(false);
                    setHomeworkRange(undefined);
                    setHomeworkStartAyah(null);
                    setHomeworkEndAyah(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowHomeworkModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Save Homework
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSabqReview;
