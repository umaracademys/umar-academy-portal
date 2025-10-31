import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 p-6 ${className}`}>
      {title && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
