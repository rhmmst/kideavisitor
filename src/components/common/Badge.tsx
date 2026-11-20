import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'orange' | 'yellow' | 'green' | 'blue' | 'rose' | 'stone';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'orange',
  size = 'md',
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full border';

  const variants = {
    orange: 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]',
    yellow: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
    green: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
    blue: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
    rose: 'bg-[#FFE4E6] text-[#9F1239] border-[#FECDD3]',
    stone: 'bg-stone-100 text-stone-700 border-stone-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {children}
    </span>
  );
};
