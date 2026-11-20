import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`inline-flex items-center p-1 rounded-full bg-[#FFF5EA] border border-[#FED7AA] ${className}`}>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
          language === 'en'
            ? 'bg-[#F37321] text-white shadow-xs'
            : 'text-stone-600 hover:text-[#EA580C]'
        }`}
        title="English"
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('id')}
        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
          language === 'id'
            ? 'bg-[#F37321] text-white shadow-xs'
            : 'text-stone-600 hover:text-[#EA580C]'
        }`}
        title="Bahasa Indonesia"
      >
        <span>🇮🇩</span>
        <span>ID</span>
      </button>
    </div>
  );
};
