import React from 'react';
import { Ticket } from '../../types/ticket';

interface TicketInsightBannerProps {
  ticket: Ticket;
  previousTickets?: Ticket[];
}

/**
 * Contextual insight banner for admin review
 * Provides non-judgmental insights about ticket patterns
 */
export const TicketInsightBanner: React.FC<TicketInsightBannerProps> = ({
  ticket,
  previousTickets = [],
}) => {
  const getInsights = () => {
    const insights: string[] = [];

    if (!ticket.mistakes || ticket.mistakes.length === 0) {
      return null; // No insights if no mistakes
    }

    // Categorize current ticket mistakes
    const currentTajweed = ticket.mistakes.filter(m => {
      const type = (m.type || '').toLowerCase();
      return ['madd', 'ikhfa', 'holding', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'].includes(type);
    }).length;
    const currentMistakes = ticket.mistakes.filter(m => {
      const type = (m.type || '').toLowerCase();
      return type !== 'atkee' && !['madd', 'ikhfa', 'holding', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'].includes(type);
    }).length;

    // Compare with previous tickets for same student
    const studentPreviousTickets: Ticket[] = previousTickets.filter((t: Ticket) => 
      t.studentId === ticket.studentId && 
      t.id !== ticket.id &&
      t.mistakes && t.mistakes.length > 0
    );

    if (studentPreviousTickets.length > 0) {
      // Calculate average mistakes from previous tickets
      const avgMistakes = studentPreviousTickets.reduce((sum, t) => {
        const mistakes = t.mistakes?.filter(m => {
          const type = (m.type || '').toLowerCase();
          return type !== 'atkee' && !['madd', 'ikhfa', 'holding', 'tech'].includes(type);
        }).length || 0;
        return sum + mistakes;
      }, 0) / studentPreviousTickets.length;

      const avgTajweed = studentPreviousTickets.reduce((sum, t) => {
      const tajweed = t.mistakes?.filter(m => {
        const type = (m.type || '').toLowerCase();
          return ['madd', 'ikhfa', 'holding', 'tech'].includes(type);
        }).length || 0;
        return sum + tajweed;
      }, 0) / studentPreviousTickets.length;

      // Generate insights
      if (currentTajweed > avgTajweed * 1.2) {
        insights.push(`This ticket has ${Math.round((currentTajweed / avgTajweed - 1) * 100)}% more Tajweed errors than average.`);
      } else if (currentTajweed < avgTajweed * 0.8) {
        insights.push(`Tajweed errors are ${Math.round((1 - currentTajweed / avgTajweed) * 100)}% lower than average.`);
      }

      if (currentMistakes > avgMistakes * 1.2) {
        insights.push(`Mistake count is ${Math.round((currentMistakes / avgMistakes - 1) * 100)}% higher than average.`);
      } else if (currentMistakes < avgMistakes * 0.8) {
        insights.push(`Mistake count is ${Math.round((1 - currentMistakes / avgMistakes) * 100)}% lower than average.`);
      }
    }

    // General insights
    if (currentTajweed > currentMistakes) {
      insights.push('Focus area: Tajweed rules need attention.');
    }

    if (ticket.mistakes.length > 10) {
      insights.push('High mistake count detected. Consider additional review.');
    }

    return insights.length > 0 ? insights : null;
  };

  const insights = getInsights();

  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">💡</span>
        <div className="flex-1">
          <p className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wide">Insights</p>
          {insights.map((insight, idx) => (
            <p key={idx} className="text-sm text-blue-900 mb-1">{insight}</p>
          ))}
        </div>
      </div>
    </div>
  );
};


