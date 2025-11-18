import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-soft-primary rounded-xl shadow-md hover:shadow-lg transition-shadow border-2 border-primary/30 p-6 ${className}`}>
      {title && (
        <div className="mb-4 pb-4 border-b-2 border-primary/30">
          <h3 className="text-lg font-bold text-primary">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
