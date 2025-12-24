import React from 'react';
import Button from './Button';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  pendingCount?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    badge?: number;
  }>;
  quickLinks?: Array<{
    label: string;
    to: string;
    variant?: 'primary' | 'secondary' | 'outline';
  }>;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = React.memo(({
  title,
  subtitle,
  badge,
  pendingCount,
  actions = [],
  quickLinks = [],
}) => {
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between shadow-md">
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {badge}
            </span>
          )}
          {pendingCount !== undefined && pendingCount > 0 && (
            <span className="rounded-full bg-red-500 text-white px-2.5 py-1 text-xs font-bold animate-pulse">
              {pendingCount} pending
            </span>
          )}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-primary">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-600 max-w-2xl">{subtitle}</p>
        )}
      </div>
      
      {(actions.length > 0 || quickLinks.length > 0) && (
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          {quickLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.to}
              className={`inline-flex items-center justify-center rounded-lg border-2 border-primary/30 px-4 py-2 text-xs font-bold text-primary transition hover:bg-soft-primary hover:border-primary ${link.variant === 'secondary' ? 'bg-accent/10 border-accent/30 text-accent hover:bg-accent/20' : ''}`}
            >
              {link.label}
            </a>
          ))}
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant || 'primary'}
              size="sm"
              onClick={action.onClick}
              className="relative"
            >
              {action.label}
              {action.badge !== undefined && action.badge > 0 && (
                <span className="ml-2 rounded-full bg-red-500 text-white px-2 py-0.5 text-xs font-bold">
                  {action.badge}
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;

