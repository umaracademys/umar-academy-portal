import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  const badgeLabel = icon?.trim() || title.slice(0, 2).toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-3xl font-bold text-primary">{value}</p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-soft-primary text-base font-bold text-primary">
            {badgeLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
