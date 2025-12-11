import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend,
  subtitle,
  onClick,
  className = ''
}) => {
  const badgeLabel = icon?.trim() || title.slice(0, 2).toUpperCase();

  return (
    <div 
      className={`bg-white rounded-xl border-2 border-gray-200 p-6 shadow-md hover:shadow-lg transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-primary/40 hover:-translate-y-0.5' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-3xl font-bold text-primary mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-sm font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500">{trend.label || 'vs last period'}</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-soft-primary to-primary/10 text-base font-bold text-primary shadow-sm">
            {badgeLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
