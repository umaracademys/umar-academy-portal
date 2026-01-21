import React, { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
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
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]';
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 hover:shadow-md focus:ring-primary border border-primary',
    secondary: 'bg-soft-primary text-primary hover:bg-primary/10 focus:ring-primary border border-primary/30',
    outline: 'bg-transparent text-primary hover:bg-soft-primary focus:ring-primary border border-primary',
    danger: 'bg-error text-white hover:bg-error/90 hover:shadow-md focus:ring-error border border-error',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300 border border-transparent hover:border-gray-300',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
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

