/**
 * Responsive card — dashboards, assignments, tickets.
 * Mobile-first: stacks well on small screens; use in grid on desktop.
 */
import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const paddingMap = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'md' }) => (
  <div
    className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${paddingMap[padding]} ${className}`}
    role="article"
  >
    {children}
  </div>
);

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`mb-3 sm:mb-4 ${className}`}>{children}</div>
);

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 ${className}`}>{children}</div>
);

export default Card;
