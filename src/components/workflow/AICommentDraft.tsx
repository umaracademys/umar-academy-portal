import React, { useState } from 'react';
import { MushafMistake } from '@umar-academy/mushaf';

interface AICommentDraftProps {
  mistakes: MushafMistake[];
  onDraftGenerated: (draft: string) => void;
  disabled?: boolean;
}

/**
 * AI-assisted comment drafting component
 * Analyzes mistakes and suggests a review comment draft
 */
export const AICommentDraft: React.FC<AICommentDraftProps> = ({
  mistakes,
  onDraftGenerated,
  disabled = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDraft = async () => {
    if (mistakes.length === 0) {
      alert('Please mark at least one mistake before generating a comment draft.');
      return;
    }

    setIsGenerating(true);

    try {
      // Categorize mistakes
      const mistakeCategories = {
        mistakes: mistakes.filter(m => {
          const type = m.type.toLowerCase();
          return type !== 'atkee' && !['madd', 'ikhfa', 'holding', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'].includes(type);
        }),
        atkees: mistakes.filter(m => m.type.toLowerCase() === 'atkee'),
        tajweed: mistakes.filter(m => {
          const type = m.type.toLowerCase();
          return ['madd', 'ikhfa', 'holding', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'].includes(type);
        }),
      };

      // Generate draft based on mistake patterns
      let draft = '';

      // Overall assessment
      const totalMistakes = mistakes.length;
      if (totalMistakes === 0) {
        draft = 'Excellent recitation! No mistakes detected.';
      } else if (totalMistakes <= 3) {
        draft = 'Good recitation overall. ';
      } else if (totalMistakes <= 7) {
        draft = 'Recitation needs improvement. ';
      } else {
        draft = 'Recitation requires significant attention. ';
      }

      // Add specific feedback
      const feedbacks: string[] = [];

      if (mistakeCategories.mistakes.length > 0) {
        feedbacks.push(`${mistakeCategories.mistakes.length} mistake${mistakeCategories.mistakes.length > 1 ? 's' : ''} detected`);
      }

      if (mistakeCategories.atkees.length > 0) {
        feedbacks.push(`${mistakeCategories.atkees.length} atkee${mistakeCategories.atkees.length > 1 ? 's' : ''} noted`);
      }

      if (mistakeCategories.tajweed.length > 0) {
        feedbacks.push(`${mistakeCategories.tajweed.length} Tajweed error${mistakeCategories.tajweed.length > 1 ? 's' : ''} identified`);
      }

      if (feedbacks.length > 0) {
        draft += feedbacks.join(', ') + '. ';
      }

      // Add improvement suggestions
      if (mistakeCategories.tajweed.length > mistakeCategories.mistakes.length) {
        draft += 'Focus on Tajweed rules, especially proper pronunciation and elongation. ';
      }

      if (mistakeCategories.mistakes.length > mistakeCategories.tajweed.length) {
        draft += 'Work on memorization accuracy and word recognition. ';
      }

      // Add notes if available
      const mistakesWithNotes = mistakes.filter(m => m.note && m.note.trim());
      if (mistakesWithNotes.length > 0) {
        draft += 'Please review the specific notes marked in the Mushaf. ';
      }

      draft += 'Continue practicing and focus on the areas mentioned above.';

      // Simulate AI processing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      onDraftGenerated(draft);
    } catch (error) {
      console.error('Error generating draft:', error);
      alert('Failed to generate comment draft. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generateDraft}
      disabled={disabled || isGenerating || mistakes.length === 0}
      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
      title="Generate a review comment draft based on marked mistakes"
    >
      {isGenerating ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Generating...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Generate Review Summary</span>
        </>
      )}
    </button>
  );
};


