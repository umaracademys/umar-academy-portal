import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InteractiveMushaf, FALLBACK_CHAPTERS } from '@umar-academy/mushaf';
import { Ticket, TajweedIssue, TajweedIssueType, MistakeCount, Atkees, RecitationRange } from '../types/ticket';
import { MushafMistake } from '@umar-academy/mushaf';
import { useBackendData } from '../contexts/BackendDataContext';
import { WorkflowBanner } from './workflow/WorkflowBanner';
import { AICommentDraft } from './workflow/AICommentDraft';
import { MistakeBadgeHighlight } from './workflow/MistakeBadgeHighlight';
import { fetchVersesBySurah } from '../services/quranApi';

interface TeacherTicketReviewProps {
  ticket: Ticket;
  onClose: () => void;
  onSubmit: (
    ticketId: string, 
    data: { 
      teacherComment: string; 
      mistakes: MushafMistake[];
      recitationRange?: RecitationRange;
      mistakeCount?: MistakeCount;
      atkees?: Atkees;
      tajweedIssues?: TajweedIssue[];
      reviewNotes?: string;
    }
  ) => Promise<void>;
}

const TeacherTicketReview: React.FC<TeacherTicketReviewProps> = ({ ticket, onClose, onSubmit }) => {
  const { getStudentPersonalMushaf } = useBackendData();
  const [mushafPage, setMushafPage] = useState(1);
  const [mistakes, setMistakes] = useState<MushafMistake[]>(ticket.mistakes || []);
  const [mistakesWithWords, setMistakesWithWords] = useState<Map<string, string>>(new Map()); // Map of mistake ID to word text
  const [mistakesWithWordsByKey, setMistakesWithWordsByKey] = useState<Map<string, string>>(new Map()); // Map of composite key (surah:ayah:wordIndex) to word text
  const [teacherComment, setTeacherComment] = useState(ticket.teacherComment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalMushafMistakes, setPersonalMushafMistakes] = useState<MushafMistake[]>([]);
  const [loadingPersonalMushaf, setLoadingPersonalMushaf] = useState(false);
  const [fullMushafView, setFullMushafView] = useState(false); // Full-Page Mushaf Mode
  const [showReviewComment, setShowReviewComment] = useState(false); // Review Comment hidden by default
  const [mushafZoom, setMushafZoom] = useState(1.0); // Zoom level
  const [showSidebar, setShowSidebar] = useState(true); // Show sidebar by default to see mistakes and info
  const [newMistakeIds, setNewMistakeIds] = useState<Set<string>>(new Set()); // Track newly added mistakes
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    adminNotes: false,
    previousReview: false,
    mistakes: true, // Expanded by default to see mistakes
    comment: true, // Expanded by default for review comment
    recitationRange: true, // Expanded by default to show start/end ayah
    mistakeDetails: false,
    tajweedIssues: false // Collapsed by default, can expand if needed
  });
  const initialMistakesRef = useRef<Set<string>>(new Set(ticket.mistakes?.map(m => m.id || '') || []));
  const [showPeriodicAlert, setShowPeriodicAlert] = useState(false);
  
  // Recitation range state
  const [recitationRange, setRecitationRange] = useState<RecitationRange>(ticket.recitationRange || {
    surahNumber: 1,
    juzNumber: undefined,
    startAyahNumber: 0,
    endAyahNumber: 0,
    startAyahText: undefined,
    endAyahText: undefined
  });
  const [selectedStartAyah, setSelectedStartAyah] = useState<{ surah: number; ayah: number } | null>(null);
  const [selectedEndAyah, setSelectedEndAyah] = useState<{ surah: number; ayah: number } | null>(null);
  const [loadingAyahText, setLoadingAyahText] = useState(false);
  
  // Mistake count and atkees state
  const [mistakeCount, setMistakeCount] = useState<MistakeCount | ''>(ticket.mistakeCount || '');
  const [atkees, setAtkees] = useState<Atkees | ''>(ticket.atkees || '');
  
  // Tajweed issues state
  const [tajweedIssues, setTajweedIssues] = useState<TajweedIssue[]>(ticket.tajweedIssues || []);
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
  
  // Review notes state
  const [reviewNotes, setReviewNotes] = useState(ticket.reviewNotes || '');

  // Load student's personal mushaf when ticket is opened
  useEffect(() => {
    const loadPersonalMushaf = async () => {
      if (!ticket.studentId) {
        setPersonalMushafMistakes([]);
        return;
      }

      try {
        setLoadingPersonalMushaf(true);
        const personalMushafData = await getStudentPersonalMushaf(ticket.studentId);
        
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
  }, [ticket.studentId, getStudentPersonalMushaf]);

  // Initialize mushaf page when ticket is selected
  useEffect(() => {
    if (ticket.mistakes && ticket.mistakes.length > 0) {
      const firstMistake = ticket.mistakes[0];
      if (firstMistake?.page) {
        setMushafPage(firstMistake.page);
      }
    } else if (personalMushafMistakes.length > 0) {
      // If no ticket mistakes, show first personal mistake
      const firstMistake = personalMushafMistakes[0];
      if (firstMistake?.page) {
        setMushafPage(firstMistake.page);
      }
    }
  }, [ticket.mistakes, personalMushafMistakes]);

  // Convert mistakes to MushafMistake format
  const mushafMistakes = useMemo(() => {
    return mistakes.map(m => ({
      id: m.id || `mistake-${Date.now()}-${Math.random()}`,
      type: m.type,
      page: m.page,
      surah: m.surah,
      ayah: m.ayah,
      wordIndex: m.wordIndex,
      position: m.position,
      note: m.note,
      audioUrl: m.audioUrl ? (m.audioUrl.startsWith('http') ? m.audioUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}${m.audioUrl.startsWith('/') ? '' : '/'}${m.audioUrl}`) : undefined,
      timestamp: m.timestamp || new Date()
    }));
  }, [mistakes]);

  const handleMistakeMark = (mistake: Omit<MushafMistake, 'id' | 'timestamp'>) => {
    const newMistake: MushafMistake = {
      ...mistake,
      id: `mistake-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    setMistakes(prev => [...prev, newMistake]);
    // Track as new mistake
    setNewMistakeIds(prev => new Set(prev).add(newMistake.id!));
  };

  const handleRemoveMistake = (mistakeId: string) => {
    setMistakes(prev => prev.filter(m => m.id !== mistakeId));
  };

  // Categorize mistakes
  const mistakeCategories = useMemo(() => {
    const regularMistakes = mistakes.filter(m => {
      const type = m.type.toLowerCase();
      return type !== 'atkee' && !['madd', 'ikhfa', 'holding', 'tech'].includes(type);
    });
    const atkeeMistakes = mistakes.filter(m => m.type.toLowerCase() === 'atkee');
    const tajweedMistakes = mistakes.filter(m => {
      const type = m.type.toLowerCase();
      return ['madd', 'ikhfa', 'holding', 'tech'].includes(type);
    });
    return {
      mistakes: regularMistakes.length,
      atkee: atkeeMistakes.length,
      tajweed: tajweedMistakes.length
    };
  }, [mistakes]);

  // ESC key handler to exit Full Mushaf View
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullMushafView) {
        setFullMushafView(false);
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [fullMushafView]);

  // Periodic alerts every 4 minutes when ticket is in_progress
  useEffect(() => {
    if (ticket.status === 'in_progress') {
      // Set up interval to show alert every 4 minutes
      const intervalId = window.setInterval(() => {
        setShowPeriodicAlert(true);
      }, 4 * 60 * 1000); // 4 minutes

      return () => {
        clearInterval(intervalId);
      };
    } else {
      // Clear alert if ticket is not in_progress
      setShowPeriodicAlert(false);
    }
  }, [ticket.status]);

  // Load ayah text and surah name when ayah is selected
  const loadAyahText = async (surahNumber: number, ayahNumber: number): Promise<{ text: string; surahName: string } | undefined> => {
    try {
      setLoadingAyahText(true);
      
      // First, get surah name in Arabic (always use Arabic, never English)
      const { getQuranChapters } = await import('../services/quranApi');
      const chapters = await getQuranChapters();
      const surah = chapters.find((c: any) => c.id === surahNumber);
      
      // Try fallback chapters if API doesn't have Arabic name
      let surahName = surah?.name_arabic?.trim();
      if (!surahName) {
        const fallbackSurah = FALLBACK_CHAPTERS.find((c: any) => c.id === surahNumber);
        surahName = fallbackSurah?.name_arabic?.trim();
      }
      // Always use Arabic name - if not available, use Arabic fallback (never English)
      surahName = surahName || `سورة ${surahNumber}`;
      
      // NEW: Try QUL endpoint first (most reliable for Arabic text)
      let ayahText: string | undefined;
      try {
        const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
        const qulResponse = await fetch(`${API_BASE}/quran/surahs/${surahNumber}/ayahs/${ayahNumber}/text`);
        if (qulResponse.ok) {
          const qulData = await qulResponse.json();
          if (qulData.text) {
            // Clean the text: remove any trailing ayah numbers or extra whitespace
            let cleanedText = qulData.text.trim();
            // Remove any Arabic or English numerals at the end (ayah numbers)
            if (cleanedText) {
              cleanedText = cleanedText.replace(/[\s]*[٠-٩0-9]+[\s]*$/, '').trim();
            }
            ayahText = cleanedText || '';
            if (ayahText) {
              console.log(`✅ Got full ayah text from QUL for surah ${surahNumber}, ayah ${ayahNumber}, length: ${ayahText.length}, source: ${qulData.source}`);
            }
          }
        } else if (qulResponse.status === 404) {
          // Gracefully handle 404 - ayah text not available from any source
          console.warn(`⚠️ Ayah text not available for surah ${surahNumber}, ayah ${ayahNumber}`);
          // Continue to fallback - don't throw error
        }
      } catch (qulError) {
        // Only log non-404 errors
        if ((qulError as any).status !== 404) {
          console.warn(`⚠️ QUL endpoint failed, trying verses API:`, qulError);
        }
      }
      
      // Fallback: Try to fetch verses from API (this gives us the full ayah text)
      if (!ayahText) {
        try {
          console.log(`📖 Fetching verses for surah ${surahNumber}...`);
          const verses = await fetchVersesBySurah(surahNumber);
          console.log(`📚 Got ${verses?.length || 0} verses for surah ${surahNumber}`);
          if (verses && verses.length > 0) {
            const verse = verses.find((v: any) => {
              const matches = v.verse_number === ayahNumber || 
                            v.verseNumber === ayahNumber ||
                            (v.verse_key && v.verse_key === `${surahNumber}:${ayahNumber}`);
              if (matches) {
                console.log(`✅ Found matching verse:`, { 
                  verse_number: v.verse_number, 
                  verseNumber: v.verseNumber, 
                  verse_key: v.verse_key,
                  has_text_uthmani: !!v.text_uthmani,
                  has_text: !!v.text,
                  has_text_simple: !!v.text_simple
                });
              }
              return matches;
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
              console.log(`✅ Got full ayah text from verses API for surah ${surahNumber}, ayah ${ayahNumber}, length: ${ayahText?.length || 0}`);
            } else {
              // Use debug level - this is expected when data isn't available
              if (import.meta.env?.DEV) {
                console.debug(`ℹ️ No matching verse found for surah ${surahNumber}, ayah ${ayahNumber} in ${verses.length} verses`);
              }
            }
          } else {
            // Use debug level - this is expected when data isn't available
            if (import.meta.env?.DEV) {
              console.debug(`ℹ️ No verses returned for surah ${surahNumber} (data may not be available)`);
            }
          }
        } catch (verseError) {
          console.warn(`⚠️ Could not fetch verses for surah ${surahNumber}, trying alternative method:`, verseError);
        }
      }
      
      // If we couldn't get the text from verses API, try fetching from MongoDB words directly
      // (Note: This may only have partial words, so verses API is preferred)
      if (!ayahText) {
        try {
          const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
          // Try to get words for this specific ayah from MongoDB
          const wordsResponse = await fetch(`${API_BASE}/quran/surahs/${surahNumber}/ayahs/${ayahNumber}/words`);
          if (wordsResponse.ok) {
            const wordsData = await wordsResponse.json();
            if (wordsData.words && Array.isArray(wordsData.words) && wordsData.words.length > 0) {
              // Reconstruct ayah text from words - join without spaces for proper Arabic text
              let reconstructedText = wordsData.words.map((w: any) => {
                let wordText = (w.text || w.word_text || '').trim();
                // Remove any HTML tags or special characters
                wordText = wordText.replace(/<[^>]+>/g, '');
                return wordText;
              }).filter(Boolean).join('');
              // Clean the final text: remove any trailing ayah numbers
              if (reconstructedText) {
                reconstructedText = reconstructedText.replace(/[\s]*[٠-٩0-9]+[\s]*$/, '').trim();
              }
              ayahText = reconstructedText || '';
              if (ayahText) {
                console.log(`✅ Got ayah text from words API for surah ${surahNumber}, ayah ${ayahNumber} (${wordsData.words.length} words):`, ayahText);
              }
            }
          }
        } catch (wordsError) {
          console.warn(`⚠️ Could not fetch ayah text from words API:`, wordsError);
        }
      }
      
      // If we still don't have text, return surah name only (user can see it's selected)
      if (ayahText && ayahText.trim().length > 0) {
        // Final cleanup: ensure no ayah numbers or extra whitespace
        const cleanText = ayahText.trim().replace(/[\s]*[٠-٩0-9]+[\s]*$/, '').trim();
        return { text: cleanText, surahName };
      } else {
        console.warn(`⚠️ Could not load ayah text for surah ${surahNumber}, ayah ${ayahNumber}, but surah name is available`);
        // Return empty string instead of placeholder to avoid confusion
        return { text: '', surahName };
      }
    } catch (error) {
      console.error('Error loading ayah text:', error);
      // Still try to return surah name
      try {
        const { getQuranChapters } = await import('../services/quranApi');
        const chapters = await getQuranChapters();
        const surah = chapters.find((c: any) => c.id === surahNumber);
        
        // Try fallback chapters if API doesn't have Arabic name
        let surahName = surah?.name_arabic?.trim();
        if (!surahName) {
          const fallbackSurah = FALLBACK_CHAPTERS.find((c: any) => c.id === surahNumber);
          surahName = fallbackSurah?.name_arabic?.trim();
        }
        // Always use Arabic name - if not available, use Arabic fallback (never English)
        surahName = surahName || `سورة ${surahNumber}`;
        return { text: `[Error loading ayah ${ayahNumber}]`, surahName };
      } catch {
        return undefined;
      }
    } finally {
      setLoadingAyahText(false);
    }
  };

  // Handle double-click for ayah range selection (start/end ayah)
  const handleVerseDoubleClick = async (surah: number, ayah: number, page: number) => {
    console.log('🖱️ [TeacherTicketReview] Double-click handler called:', { surah, ayah, page, currentRange: recitationRange });
    
    // Check current recitation range state to determine what to set
    const hasStartAyah = recitationRange.startAyahNumber > 0;
    const hasEndAyah = recitationRange.endAyahNumber > 0;
    
    console.log('📊 [TeacherTicketReview] Current state:', { hasStartAyah, hasEndAyah, startAyah: recitationRange.startAyahNumber, endAyah: recitationRange.endAyahNumber });
    
    // If start ayah not set, set it
    if (!hasStartAyah) {
      console.log('✅ Setting start ayah:', { surah, ayah });
      setSelectedStartAyah({ surah, ayah });
      
      // Get surah name in Arabic (always use Arabic, never English)
      const { getQuranChapters } = await import('../services/quranApi');
      const chapters = await getQuranChapters();
      const surahInfo = chapters.find((c: any) => c.id === surah);
      
      // Try fallback chapters if API doesn't have Arabic name
      let surahName = surahInfo?.name_arabic?.trim();
      if (!surahName) {
        const fallbackSurah = FALLBACK_CHAPTERS.find((c: any) => c.id === surah);
        surahName = fallbackSurah?.name_arabic?.trim();
      }
      // Always use Arabic name - if not available, use Arabic fallback (never English)
      surahName = surahName || `سورة ${surah}`;
      
      // Try to load ayah text (but don't fail if it doesn't work)
      const ayahData = await loadAyahText(surah, ayah);
      
      // Set the range even if ayah text couldn't be loaded (we have surah name)
      setRecitationRange(prev => ({
        ...prev,
        surahNumber: surah,
        surahName: ayahData?.surahName || surahName,
        startAyahNumber: ayah,
        startAyahText: ayahData?.text || `[Ayah ${ayah}]`,
        endAyahNumber: prev.endAyahNumber || 0,
        endAyahText: prev.endAyahText
      }));
    } 
    // If start ayah is set but end is not, set end
    else if (!hasEndAyah) {
      // Validate that end ayah comes after start
      const startAyah = recitationRange.startAyahNumber;
      if (surah === recitationRange.surahNumber && ayah >= startAyah) {
        console.log('✅ Setting end ayah:', { surah, ayah, startAyah });
        setSelectedEndAyah({ surah, ayah });
        
        // Get surah name in Arabic if not already set (always use Arabic, never English)
        const { getQuranChapters } = await import('../services/quranApi');
        const chapters = await getQuranChapters();
        const surahInfo = chapters.find((c: any) => c.id === surah);
        
        // Try fallback chapters if API doesn't have Arabic name
        let surahName = surahInfo?.name_arabic?.trim();
        if (!surahName) {
          const fallbackSurah = FALLBACK_CHAPTERS.find((c: any) => c.id === surah);
          surahName = fallbackSurah?.name_arabic?.trim();
        }
        // Always use Arabic name - if not available, use Arabic fallback (never English)
        surahName = surahName || `سورة ${surah}`;
        
        // Try to load ayah text (but don't fail if it doesn't work)
        const ayahData = await loadAyahText(surah, ayah);
        
        // Set the range even if ayah text couldn't be loaded
        setRecitationRange(prev => ({
          ...prev,
          surahNumber: surah,
          surahName: prev.surahName || ayahData?.surahName || surahName,
          endAyahNumber: ayah,
          endAyahText: ayahData?.text || `[Ayah ${ayah}]`
        }));
      } else {
        alert('End ayah must be in the same surah and come after the start ayah');
      }
    } 
    // Both are set, allow reset
    else {
      console.log('🔄 Resetting - both start and end are set');
      setSelectedStartAyah({ surah, ayah });
      setSelectedEndAyah(null);
      
      // Get surah name
      const { getQuranChapters } = await import('../services/quranApi');
      const chapters = await getQuranChapters();
      const surahInfo = chapters.find((c: any) => c.id === surah);
      const surahName = surahInfo?.name_arabic || surahInfo?.name_simple || `سورة ${surah}`;
      
      // Try to load ayah text (but don't fail if it doesn't work)
      const ayahData = await loadAyahText(surah, ayah);
      
      // Set the range even if ayah text couldn't be loaded
      setRecitationRange(prev => ({
        ...prev,
        surahNumber: surah,
        surahName: ayahData?.surahName || surahName,
        startAyahNumber: ayah,
        startAyahText: ayahData?.text || `[Ayah ${ayah}]`,
        endAyahNumber: 0,
        endAyahText: undefined
      }));
    }
  };

  // Validation: Submit enabled if start/end ayah are selected (mistakes/comment are optional)
  const canSubmit = useMemo(() => {
    const hasRange = recitationRange.startAyahNumber > 0 && recitationRange.endAyahNumber > 0;
    return hasRange;
  }, [recitationRange.startAyahNumber, recitationRange.endAyahNumber]);
  
  // Validation messages
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!recitationRange.startAyahNumber || !recitationRange.endAyahNumber) {
      errors.push('Please select both start and end ayah (double-click on verses)');
    }
    return errors;
  }, [recitationRange.startAyahNumber, recitationRange.endAyahNumber]);

  // Banner visibility: Show until start/end ayah are selected
  const showBanner = useMemo(() => {
    return !bannerDismissed && !canSubmit;
  }, [bannerDismissed, canSubmit]);

  const handleSubmit = async () => {
    // Validate required fields (only start/end ayah are required)
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      if (!recitationRange.startAyahNumber || !recitationRange.endAyahNumber) {
        setExpandedSections(prev => ({ ...prev, recitationRange: true }));
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Enrich mistakes with wordText before submitting
      const mistakesWithWordText = mushafMistakes.map((mistake) => {
        // Get word text from mistakesWithWords map - try by ID first, then by composite key
        let wordText = mistake.id ? mistakesWithWords.get(mistake.id) : undefined;
        
        // If not found by ID, try to find by composite key (surah:ayah:wordIndex)
        if (!wordText && mistake.surah && mistake.ayah && mistake.wordIndex !== undefined) {
          const compositeKey = `${mistake.surah}:${mistake.ayah}:${mistake.wordIndex}`;
          wordText = mistakesWithWordsByKey.get(compositeKey);
        }
        
        // Return mistake with wordText included
        return {
          ...mistake,
          wordText: wordText || undefined
        };
      });
      
      // Submit ticket with all new fields
      const submitData = {
        teacherComment: teacherComment.trim(),
        mistakes: mistakesWithWordText,
        recitationRange: recitationRange,
        mistakeCount: mistakeCount || undefined,
        atkees: atkees || undefined,
        tajweedIssues: tajweedIssues.length > 0 ? tajweedIssues : undefined,
        reviewNotes: reviewNotes.trim() || undefined
      };
      
      console.log('📤 Submitting ticket:', {
        ticketId: ticket.id,
        mistakesCount: mistakesWithWordText.length,
        mistakesWithWordText: mistakesWithWordText.filter(m => m.wordText).length,
        recitationRange,
        mistakeCount,
        atkees,
        tajweedIssuesCount: tajweedIssues.length
      });
      
      await onSubmit(ticket.id, submitData);
      
      console.log('✅ Ticket submitted successfully');
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle tajweed issue toggle
  const handleTajweedIssueToggle = (issueType: TajweedIssueType) => {
    setTajweedIssues(prev => {
      const existing = prev.find(i => i.type === issueType);
      if (existing) {
        return prev.filter(i => i.type !== issueType);
      } else {
        return [...prev, { type: issueType }];
      }
    });
  };

  // Update tajweed issue note
  const handleTajweedIssueNote = (issueType: TajweedIssueType, note: string) => {
    setTajweedIssues(prev => prev.map(issue => 
      issue.type === issueType ? { ...issue, note } : issue
    ));
  };

  const typeColors = {
    sabq: { bg: 'bg-primary', text: 'text-white' },
    sabqi: { bg: 'bg-accent', text: 'text-white' },
    manzil: { bg: 'bg-primary/80', text: 'text-white' }
  };
  const colors = typeColors[ticket.type as keyof typeof typeColors] || typeColors.sabq;

  return (
    <>
      {/* Periodic Alert Modal - Full Screen */}
      {showPeriodicAlert && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 border-4 border-primary">
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-3xl font-bold text-primary mb-6">Review Checklist</h2>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <span className="text-2xl">👀</span>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Can you see student's hands?</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">📖</span>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Can you see their Quran?</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Are they reading with fluency?</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                  <span className="text-2xl">💪</span>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Motivate them: "Good job!"</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPeriodicAlert(false)}
                className="mt-6 px-8 py-3 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary/90 transition-colors"
              >
                Continue Review
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Professional Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-primary to-primary/90 border-b-2 border-primary/30 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <span className="text-sm font-bold text-white">TK</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Review Ticket</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white/90 text-xs font-medium">{ticket.studentName}</span>
                  <span className="text-white/70">•</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
                {ticket.type.toUpperCase()}
              </span>
                  {mistakes.length > 0 && (
                    <>
                      <span className="text-white/70">•</span>
                      <span className="text-white/90 text-xs">{mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-xl font-bold backdrop-blur-sm"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Compact Admin Notes - Wrapped */}
        {ticket.teacherNotes && (
          <div className="px-3 py-2 bg-primary/5 border-b border-gray-200">
            <button
              onClick={() => setExpandedSections(prev => ({ ...prev, adminNotes: !prev.adminNotes }))}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-xs font-semibold text-primary">Admin Instructions</span>
              <span className="text-xs text-gray-500">{expandedSections.adminNotes ? '▼' : '▶'}</span>
            </button>
            {expandedSections.adminNotes && (
              <p className="text-xs text-gray-700 mt-1">{ticket.teacherNotes}</p>
            )}
          </div>
        )}

        {/* Compact Previous Review - Wrapped */}
        {ticket.status === 'reassigned' && ticket.previousTeacherComment && (
          <div className="px-3 py-2 bg-orange-50 border-b border-gray-200">
            <button
              onClick={() => setExpandedSections(prev => ({ ...prev, previousReview: !prev.previousReview }))}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-xs font-semibold text-orange-800">Previous Review</span>
              <span className="text-xs text-gray-500">{expandedSections.previousReview ? '▼' : '▶'}</span>
            </button>
            {expandedSections.previousReview && (
              <div className="mt-1">
                <p className="text-xs text-orange-900 mb-1">{ticket.previousTeacherComment}</p>
                {ticket.reassignmentReason && (
                  <p className="text-xs text-orange-700">Reason: {ticket.reassignmentReason}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Contextual Workflow Banner */}
        <WorkflowBanner
          message="Double-click on verses to select start and end ayah. Single-click to mark mistakes."
          type="info"
          visible={showBanner}
          onDismiss={() => setBannerDismissed(true)}
          icon="💡"
        />

        {/* Error Message */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-l-4 border-red-500">
            <p className="text-sm font-bold text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Compact Content */}
        <div className={`flex-1 overflow-y-auto ${fullMushafView ? 'p-0' : 'p-3'} bg-gray-50 transition-all duration-300`}>
          {fullMushafView ? (
            /* Full-Page Mushaf View */
            <div className="relative w-full h-full">
              {/* Full View Header Bar */}
              <div className="absolute top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <span>📖</span> Full Mushaf View
                  </h3>
                  <span className="text-xs text-gray-600">
                    {mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''} marked
                  </span>
                </div>
                <button
                  onClick={() => setFullMushafView(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                  title="Exit Full View (ESC)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit Full View
                </button>
              </div>
              
              {/* Full-Page Mushaf */}
              <div className="pt-12 h-full overflow-auto">
                {loadingPersonalMushaf && (
                  <div className="text-center py-4 text-gray-500">
                    Loading student's mistake history...
                  </div>
                )}
                <InteractiveMushaf
                  currentPage={mushafPage}
                  onPageChange={setMushafPage}
                  mistakes={mushafMistakes}
                  historicalMistakes={personalMushafMistakes}
                  showHistorical={true}
                  onMistakeMark={handleMistakeMark}
                      onVerseDoubleClick={handleVerseDoubleClick}
                  readOnly={false}
                  mode="marking"
                  studentName={ticket.studentName}
                  enableZoom={true}
                  zoom={mushafZoom}
                  onZoomChange={setMushafZoom}
                />
              </div>
            </div>
          ) : (
            /* Compact Normal View - Mushaf with Wrapped Features */
            <div className={`space-y-3 ${showSidebar ? 'grid grid-cols-1 lg:grid-cols-3 gap-3' : ''}`}>
              {/* Main Mushaf Area */}
              <div className={showSidebar ? 'lg:col-span-2' : ''}>
              {/* Compact Mushaf Header */}
                <div className="bg-white rounded-lg border border-gray-200 p-2 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Interactive Mushaf</h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 transition-colors"
                      title={showSidebar ? "Hide panel" : "Show panel"}
                    >
                      {showSidebar ? 'Hide' : 'Show'} Panel
                    </button>
                    <button
                      onClick={() => setFullMushafView(true)}
                      className="px-2 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 transition-colors"
                      title="Full view (ESC to exit)"
                    >
                      Full View
                    </button>
                    {mistakes.length > 0 && (
                      <span className="px-2 py-1 bg-primary/10 rounded text-xs font-semibold text-primary">
                        {mistakes.length} mistakes
                      </span>
                    )}
                  </div>
                </div>
                {loadingPersonalMushaf && (
                  <div className="text-center py-2 text-xs text-gray-500">
                    Loading...
                  </div>
                )}
                <div className="border border-gray-200 rounded overflow-hidden" style={{ maxHeight: '500px', overflow: 'auto' }}>
                  <InteractiveMushaf
                    currentPage={mushafPage}
                    onPageChange={setMushafPage}
                    mistakes={mushafMistakes}
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
                        const wordTextMapByKey = new Map<string, string>();
                        
                        mistakesWithWordsData.forEach((m: any) => {
                          if (m.wordText && m.surah && m.ayah && m.wordIndex !== undefined) {
                            // Store by composite key (surah:ayah:wordIndex)
                            const compositeKey = `${m.surah}:${m.ayah}:${m.wordIndex}`;
                            wordTextMapByKey.set(compositeKey, m.wordText);
                            
                            // Also store by ID if available
                            if (m.id) {
                              wordTextMap.set(m.id, m.wordText);
                            }
                          }
                        });
                        
                        // Update the key map separately
                        setMistakesWithWordsByKey((prevKeyMap) => {
                          const mergedKeyMap = new Map(prevKeyMap);
                          wordTextMapByKey.forEach((value, key) => {
                            mergedKeyMap.set(key, value);
                          });
                          return mergedKeyMap;
                        });
                        
                        return wordTextMap;
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
              </div>

              {/* Compact Wrapped Sidebar Panel */}
              {showSidebar && (
                <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
                  {/* Current Page Info - Always Visible */}
                  <div className="bg-white rounded-lg border border-gray-200 p-2">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Current View</div>
                    <div className="text-xs text-gray-600 font-medium">
                      Page {mushafPage}
                    </div>
                    {mistakes.length > 0 && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''} marked
                      </div>
                    )}
                  </div>

                  {/* Recitation Range Section - REQUIRED */}
                  <div className="bg-white rounded-lg border-2 border-primary overflow-hidden">
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, recitationRange: !prev.recitationRange }))}
                      className="w-full px-2 py-1.5 flex items-center justify-between border-b border-gray-200 bg-primary/10"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-primary">Recitation Range</span>
                        <span className="text-red-500 text-xs">*</span>
                        {recitationRange.startAyahNumber > 0 && recitationRange.endAyahNumber > 0 && (
                          <span className="text-xs text-green-600">✓</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{expandedSections.recitationRange ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.recitationRange && (
                      <div className="p-2 space-y-2">
                        <div className="text-xs text-gray-600 mb-2">
                          <strong>Double-click</strong> on verses in the Mushaf to select start and end ayahs<br/>
                          <span className="text-[10px] text-gray-500">Single-click marks mistakes</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="text-[10px] font-semibold text-gray-700 mb-0.5">Start Ayah</div>
                            {recitationRange.startAyahText ? (
                              <div className="space-y-1">
                                {recitationRange.surahName && (
                                  <div 
                                    className="text-sm font-bold text-primary"
                                    style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                                    dir="rtl"
                                  >
                                    {recitationRange.surahName}
                                  </div>
                                )}
                                <div 
                                  className="text-base text-gray-900 leading-relaxed"
                                  style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                                  dir="rtl"
                                >
                                  {recitationRange.startAyahText}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">Not selected - Double-click a verse</div>
                            )}
                          </div>
                          <div className="p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="text-[10px] font-semibold text-gray-700 mb-0.5">End Ayah</div>
                            {recitationRange.endAyahText ? (
                              <div className="space-y-1">
                                {recitationRange.surahName && (
                                  <div 
                                    className="text-sm font-bold text-primary"
                                    style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                                    dir="rtl"
                                  >
                                    {recitationRange.surahName}
                                  </div>
                                )}
                                <div 
                                  className="text-base text-gray-900 leading-relaxed"
                                  style={{ fontFamily: 'Amiri, "Scheherazade New", "Arabic Typesetting", "Traditional Arabic", serif', direction: 'rtl' }}
                                  dir="rtl"
                                >
                                  {recitationRange.endAyahText}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">
                                {recitationRange.startAyahText 
                                  ? 'Not selected - Double-click a verse after the start ayah' 
                                  : 'Not selected - Select start ayah first'}
                              </div>
                            )}
                          </div>
                        </div>
                        {(!recitationRange.startAyahNumber || !recitationRange.endAyahNumber) && (
                          <div className="text-[10px] text-red-600 font-semibold">
                            ⚠️ Both start and end ayah must be selected
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Marked Mistakes & Statistics - Consolidated */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, mistakes: !prev.mistakes }))}
                      className="w-full px-2 py-1.5 flex items-center justify-between border-b border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900">Marked Mistakes</span>
                        {mistakes.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">
                            {mistakes.length}
                            </span>
                          )}
                      </div>
                      <span className="text-xs text-gray-500">{expandedSections.mistakes ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.mistakes && (
                      <div className="p-2 space-y-3">
                        {/* Mistake List */}
                        {mistakes.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-xs text-gray-500">Click on words in the Mushaf to mark mistakes</p>
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {mistakes.map((mistake) => {
                              const isNew = newMistakeIds.has(mistake.id || '');
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
                                  isNew={isNew}
                                  showTimestamp={false}
                                  onRemove={handleRemoveMistake}
                                  wordText={wordText}
                                />
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Statistics Summary - Compact */}
                        {mistakes.length > 0 && (
                          <div className="pt-2 border-t border-gray-200 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-gray-700 mb-1 block">Mistake Count</label>
                                <select
                                  value={mistakeCount}
                                  onChange={(e) => setMistakeCount(e.target.value === 'weak' ? 'weak' : (e.target.value ? parseInt(e.target.value) : ''))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary focus:border-primary"
                                >
                                  <option value="">Select</option>
                                  <option value="weak">Weak</option>
                                  {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                    <option key={num} value={num}>{num}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-gray-700 mb-1 block">Atkees</label>
                                <select
                                  value={atkees}
                                  onChange={(e) => setAtkees(e.target.value ? parseInt(e.target.value) : '')}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary focus:border-primary"
                                >
                                  <option value="">Select</option>
                                  {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                    <option key={num} value={num}>{num}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {/* Category Summary */}
                            <div className="flex gap-1.5 flex-wrap">
                              {mistakeCategories.mistakes > 0 && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px]">
                                  Mistakes: {mistakeCategories.mistakes}
                                </span>
                              )}
                              {mistakeCategories.atkee > 0 && (
                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px]">
                                  Atkees: {mistakeCategories.atkee}
                                </span>
                              )}
                              {mistakeCategories.tajweed > 0 && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                                  Tajweed: {mistakeCategories.tajweed}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tajweed Issues Section */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, tajweedIssues: !prev.tajweedIssues }))}
                      className="w-full px-2 py-1.5 flex items-center justify-between border-b border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900">Tajweed Issues</span>
                        {tajweedIssues.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                            {tajweedIssues.length}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{expandedSections.tajweedIssues ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.tajweedIssues && (
                      <div className="p-2 space-y-2">
                        {tajweedIssueTypes.map((issueType) => {
                          const issue = tajweedIssues.find(i => i.type === issueType);
                          const isChecked = !!issue;
                          const displayName = issueType.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ');
                          
                          return (
                            <div key={issueType} className="space-y-1">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTajweedIssueToggle(issueType)}
                                  className="mt-0.5"
                                  id={`tajweed-${issueType}`}
                                />
                                <label htmlFor={`tajweed-${issueType}`} className="text-xs text-gray-700 flex-1 cursor-pointer">
                                  {displayName}
                                </label>
                              </div>
                              {isChecked && (
                                <textarea
                                  value={issue?.note || ''}
                                  onChange={(e) => handleTajweedIssueNote(issueType, e.target.value)}
                                  placeholder="Note (optional)"
                                  rows={1}
                                  className="text-[10px] px-1 py-0.5 border border-gray-300 rounded w-full ml-5 focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Review Comment Section - Required */}
                  <div className="bg-white rounded-lg border-2 border-primary/30 overflow-hidden">
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, comment: !prev.comment }))}
                      className="w-full px-2 py-1.5 flex items-center justify-between border-b border-gray-200 bg-primary/5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900">Review Comment</span>
                        <span className="text-red-500 text-xs">*</span>
                        {teacherComment && (
                          <span className="text-xs text-gray-500">({teacherComment.length} chars)</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{expandedSections.comment ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.comment && (
                      <div className="p-2">
                        <div className="mb-2">
                          <AICommentDraft
                            mistakes={mistakes}
                            onDraftGenerated={(draft) => {
                              setTeacherComment(draft);
                            }}
                            disabled={mistakes.length === 0}
                          />
                        </div>
                        <textarea
                          value={teacherComment}
                          onChange={(e) => setTeacherComment(e.target.value)}
                          rows={6}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                          placeholder="Enter your review comments..."
                          autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This comment will be sent to the admin for review.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Review Notes Section - Optional */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
                      <span className="text-xs font-semibold text-gray-900">Review Notes (Optional)</span>
                    </div>
                    <div className="p-2">
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                        placeholder="Add any additional notes..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div className="px-3 py-2 border-t border-gray-200 bg-white flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
            className="px-4 py-1.5 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            title={!canSubmit ? 'Double-click on verses to select start and end ayah' : 'Submit review'}
          >
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default TeacherTicketReview;

