import React from 'react';
import { alertClasses } from '../../styles/classes';

interface ErrorMessageProps {
  message: string | React.ReactNode;
  variant?: 'error' | 'warning' | 'info';
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  variant = 'error',
  className = '',
}) => {
  return (
    <div className={`${alertClasses[variant]} ${className}`}>
      {message}
    </div>
  );
};

export default ErrorMessage;

