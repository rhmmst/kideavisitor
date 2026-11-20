import React from 'react';
import { Menu, Calendar, Clock } from 'lucide-react';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useLanguage } from '../../hooks/useLanguage';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
  const { language } = useLanguage();

  const todayDate = new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="h-16 bg-[#FFFDF9] border-b border-[#FED7AA] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_8px_rgba(243,115,33,0.03)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl bg-white border border-[#FED7AA] text-stone-700 hover:bg-[#FFF5EA]"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-stone-700" />
        </button>

        {/* Date indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#FED7AA] text-xs font-medium text-stone-700">
          <Calendar className="w-3.5 h-3.5 text-[#F37321]" />
          <span>{todayDate}</span>
          <span className="text-stone-300">|</span>
          <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>08:00 - 16:00 WIB</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />

        {/* Status Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFEDD5] border border-[#FED7AA] text-xs font-semibold text-[#9A3412]">
          <span className="w-2 h-2 rounded-full bg-[#F37321] animate-pulse"></span>
          <span>{language === 'id' ? 'Sistem Aktif' : 'System Live'}</span>
        </div>
      </div>
    </header>
  );
};
