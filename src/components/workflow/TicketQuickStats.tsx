import React from 'react';
import { MushafMistake } from '@umar-academy/mushaf';

interface TicketQuickStatsProps {
  mistakes: MushafMistake[];
  ticketType: 'sabq' | 'sabqi' | 'manzil';
}

/**
 * Quick stats component showing mistake counts per type
 * Used in AdminTicketReview for quick overview
 */
export const TicketQuickStats: React.FC<TicketQuickStatsProps> = ({
  mistakes,
  ticketType,
}) => {
  const categorizeMistakes = () => {
    const regularMistakes = mistakes.filter(m => {
      const type = m.type.toLowerCase();
      return type !== 'atkee' && !['madd', 'ikhfa', 'holding', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'].includes(type);
    });
    const atkeeMistakes = mistakes.filter(m => m.type.toLowerCase() === 'atkee');
    const tajweedMistakes = mistakes.filter(m => {
      const type = m.type.toLowerCase();
      return ['madd', 'ikhfa', 'holding', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'].includes(type);
    });
    return {
      mistakes: regularMistakes.length,
      atkee: atkeeMistakes.length,
      tajweed: tajweedMistakes.length,
      total: mistakes.length,
    };
  };

  const stats = categorizeMistakes();

  const getTypeColor = (type: 'sabq' | 'sabqi' | 'manzil') => {
    const colors = {
      sabq: 'bg-purple-100 text-purple-800 border-purple-300',
      sabqi: 'bg-blue-100 text-blue-800 border-blue-300',
      manzil: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[type];
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <div className={`p-3 rounded-lg border-2 ${getTypeColor(ticketType)}`}>
        <p className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Total</p>
        <p className="text-2xl font-extrabold">{stats.total}</p>
      </div>
      <div className="p-3 rounded-lg border-2 border-red-200 bg-red-50">
        <p className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">🔴 Mistakes</p>
        <p className="text-2xl font-extrabold text-red-800">{stats.mistakes}</p>
      </div>
      <div className="p-3 rounded-lg border-2 border-yellow-200 bg-yellow-50">
        <p className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">🟡 Atkees</p>
        <p className="text-2xl font-extrabold text-yellow-800">{stats.atkee}</p>
      </div>
      <div className="p-3 rounded-lg border-2 border-gray-200 bg-gray-50">
        <p className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">🔵 Tajweed</p>
        <p className="text-2xl font-extrabold text-gray-800">{stats.tajweed}</p>
      </div>
    </div>
  );
};


