import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'flat' | 'warm' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}) => {
  const baseStyles = 'rounded-3xl transition-all duration-200';

  const variants = {
    default: 'bg-white border border-[#FED7AA]/60 shadow-[0_4px_20px_-4px_rgba(243,115,33,0.06)]',
    flat: 'bg-[#FFFDF9] border border-[#FED7AA]',
    warm: 'bg-gradient-to-b from-[#FFFDF9] to-[#FFF7ED] border border-[#FED7AA] shadow-[0_4px_16px_-4px_rgba(243,115,33,0.08)]',
    interactive: 'bg-white border border-[#FED7AA]/60 shadow-[0_4px_20px_-4px_rgba(243,115,33,0.06)] hover:border-[#FB923C] hover:shadow-[0_8px_30px_-6px_rgba(243,115,33,0.15)] hover:-translate-y-0.5 cursor-pointer',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-4 sm:p-5',
    md: 'p-6 sm:p-8',
    lg: 'p-8 sm:p-10',
  };

  return (
    <div
      className={twMerge(clsx(baseStyles, variants[variant], paddings[padding], className))}
      {...props}
    >
      {children}
    </div>
  );
};
