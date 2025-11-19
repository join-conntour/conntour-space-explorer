import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-4',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className={`text-center ${className}`}>
      <div className={`inline-block animate-spin rounded-full ${sizeClasses[size]} border-purple-500/30 border-t-purple-400`}></div>
    </div>
  );
};

export default LoadingSpinner;

