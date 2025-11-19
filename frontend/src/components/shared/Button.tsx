import React from 'react';
import { buttonClasses } from '../../styles/classes';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'clear' | 'icon' | 'iconDanger' | 'tab';
  active?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  active = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return disabled ? buttonClasses.primaryDisabled : buttonClasses.primary;
      case 'secondary':
        return disabled ? buttonClasses.secondaryDisabled : buttonClasses.secondary;
      case 'clear':
        return buttonClasses.clear;
      case 'icon':
        return buttonClasses.icon;
      case 'iconDanger':
        return buttonClasses.iconDanger;
      case 'tab':
        return `${buttonClasses.tab} ${active ? buttonClasses.tabActive : buttonClasses.tabInactive}`;
      default:
        return buttonClasses.primary;
    }
  };

  return (
    <button
      className={`${getVariantClasses()} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

