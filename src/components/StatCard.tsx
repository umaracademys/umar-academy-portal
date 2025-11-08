import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  const badgeLabel = icon?.trim() || title.slice(0, 2).toUpperCase();

  return (
    <div className="rounded-2xl border border-accent-soft bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-soft">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
        </div>
        <div className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-soft-primary text-sm font-semibold text-primary">
          {badgeLabel}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
