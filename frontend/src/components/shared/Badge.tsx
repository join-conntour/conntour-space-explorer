import React from 'react';
import { badgeClasses } from '../../styles/classes';

interface BadgeProps {
  variant?: 'keyword' | 'keywordLarge' | 'metadata' | 'metadataBlue' | 'metadataCyan' | 'confidence' | 'count' | 'timestamp' | 'resultCount';
  confidence?: 'high' | 'medium' | 'low';
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'keyword',
  confidence,
  children,
  className = '',
}) => {
  const getVariantClasses = () => {
    if (variant === 'confidence' && confidence) {
      return `${badgeClasses.confidence[confidence]} px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 shadow-sm`;
    }
    return badgeClasses[variant];
  };

  return (
    <span className={`${getVariantClasses()} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;

