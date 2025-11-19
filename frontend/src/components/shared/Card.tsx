import React from 'react';
import { cardClasses } from '../../styles/classes';

interface CardProps {
  variant?: 'container' | 'containerHover' | 'header' | 'section';
  hover?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  variant = 'container',
  hover = false,
  children,
  className = '',
  onClick,
}) => {
  const getVariantClasses = () => {
    if (variant === 'containerHover' || hover) {
      return cardClasses.containerHover;
    }
    return cardClasses[variant];
  };

  return (
    <div
      className={`${getVariantClasses()} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;

