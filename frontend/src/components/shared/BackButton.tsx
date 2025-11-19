import React from 'react';
import Button from './Button';
import Icon from './Icon';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`absolute left-0 top-1/2 transform -translate-y-1/2 flex items-center gap-2 text-purple-300 hover:text-white transition-all duration-200 whitespace-nowrap z-10 pl-6 pr-4 py-2 rounded-r-full hover:bg-purple-500/20 ${className}`}
    >
      <Icon name="back" />
      <span className="font-semibold">Back</span>
    </button>
  );
};

export default BackButton;

