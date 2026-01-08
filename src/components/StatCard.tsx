import React, { useMemo } from 'react';

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

const StatCard: React.FC<StatCardProps> = React.memo(({ 
  title, 
  value, 
  icon, 
  trend,
  subtitle,
  onClick,
  className = ''
}) => {
  const badgeLabel = useMemo(() => icon?.trim() || title.slice(0, 2).toUpperCase(), [icon, title]);
  
  // Color schemes for different stat types - Primary & Accent theme
  const colorSchemes = {
    default: {
      gradient: 'from-primary to-primary',
      bg: 'from-primary/20 to-primary/10',
      border: 'border-primary/30',
      text: 'text-primary',
      glow: 'shadow-primary/20',
      iconBg: 'from-primary/20 to-primary/10'
    },
    students: {
      gradient: 'from-primary to-accent',
      bg: 'from-primary/20 to-accent/10',
      border: 'border-primary/30',
      text: 'text-primary',
      glow: 'shadow-primary/20',
      iconBg: 'from-primary/20 to-accent/10'
    },
    assessments: {
      gradient: 'from-primary to-primary',
      bg: 'from-primary/20 to-primary/10',
      border: 'border-primary/30',
      text: 'text-primary',
      glow: 'shadow-primary/20',
      iconBg: 'from-primary/20 to-primary/10'
    },
    tickets: {
      gradient: 'from-accent to-accent',
      bg: 'from-accent/20 to-accent/10',
      border: 'border-accent/30',
      text: 'text-accent',
      glow: 'shadow-accent/20',
      iconBg: 'from-accent/20 to-accent/10'
    }
  };
  
  const getColorScheme = () => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('student')) return colorSchemes.students;
    if (lowerTitle.includes('assessment')) return colorSchemes.assessments;
    if (lowerTitle.includes('ticket')) return colorSchemes.tickets;
    return colorSchemes.default;
  };
  
  const colors = getColorScheme();

  return (
    <div 
      className={`relative overflow-hidden rounded-xl border ${colors.border} bg-gradient-to-br ${colors.bg} backdrop-blur-xl p-6 shadow-xl ${colors.glow} transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-2xl' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Animated background glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors.gradient} rounded-full blur-2xl opacity-20`}></div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
        backgroundSize: '20px 20px'
      }}></div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
          <p className={`text-4xl font-black ${colors.text} mb-1`}>{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-400">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-sm font-bold ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-slate-500">{trend.label || 'vs last period'}</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className={`relative inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${colors.iconBg} border ${colors.border} shadow-lg`}>
            <span className={`text-lg font-black ${colors.text}`}>{badgeLabel}</span>
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${colors.gradient} opacity-0 hover:opacity-20 transition-opacity`}></div>
          </div>
        </div>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
