import React from 'react';
import { Link } from 'react-router-dom';

interface KideaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean; // kept for compatibility
  to?: string;
}

export const KideaLogo: React.FC<KideaLogoProps> = ({
  className = '',
  size = 'md',
  to = '/',
}) => {
  const heightClasses = {
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-12',
    lg: 'h-14 sm:h-16',
  };

  const imageElement = (
    <img
      src="/kidea-logo.png"
      alt="Kidea Preschool & Kindergarten Logo"
      className={`${heightClasses[size]} w-auto object-contain transition-transform duration-200 group-hover:scale-105`}
    />
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`inline-flex items-center group transition-transform ${className}`}
        title="TK Kidea Preschool & Kindergarten"
      >
        {imageElement}
      </Link>
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      {imageElement}
    </div>
  );
};
