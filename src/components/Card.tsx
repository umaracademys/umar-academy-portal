import React, { ReactNode, memo } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = memo(({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 p-6 ${className}`}>
      {title && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-primary">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
