import React, { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  mobileFullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  fullWidth = false,
  mobileFullWidth = false,
}) => {
  const baseClasses = 'font-extrabold transition-all duration-200 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary border-2 border-primary',
    accent: 'bg-accent text-primary hover:bg-accent/90 focus:ring-accent border-2 border-accent',
    secondary: 'bg-soft-primary text-primary hover:bg-primary/10 focus:ring-primary border-2 border-primary/30',
    outline: 'bg-transparent text-primary hover:bg-soft-primary focus:ring-primary border-2 border-primary',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-2 border-red-600',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm',
    md: 'px-4 py-2 text-sm sm:px-6 sm:py-2.5 sm:text-base',
    lg: 'px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-lg',
  };
  
  const widthClasses = fullWidth 
    ? 'w-full' 
    : mobileFullWidth 
      ? 'w-full sm:w-auto' 
      : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;

