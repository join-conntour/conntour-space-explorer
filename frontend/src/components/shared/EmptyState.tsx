import React from 'react';
import { emptyStateClasses } from '../../styles/classes';

interface EmptyStateProps {
  message: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, className = '' }) => {
  return (
    <div className={`${emptyStateClasses.container} ${className}`}>
      <p className={emptyStateClasses.text}>{message}</p>
    </div>
  );
};

export default EmptyState;

