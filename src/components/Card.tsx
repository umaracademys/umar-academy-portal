import React, { ReactNode, memo } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = memo(({ title, children, className = '' }) => {
  return (
    <div className={`relative overflow-hidden rounded-xl border-2 border-primary/20 bg-white shadow-lg p-3 sm:p-4 md:p-6 ${className}`}>
      {/* Subtle glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
      
      {title && (
        <div className="relative mb-3 sm:mb-4 md:mb-6 pb-2 sm:pb-3 md:pb-4 border-b-2 border-primary/10">
          <h3 className="text-base sm:text-lg md:text-xl font-black text-primary">{title}</h3>
        </div>
      )}
      <div className="relative">
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
