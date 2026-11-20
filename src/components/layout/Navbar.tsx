import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, CalendarCheck } from 'lucide-react';
import { KideaLogo } from '../common/KideaLogo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { Button } from '../common/Button';
import { useLanguage } from '../../hooks/useLanguage';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-[#FFFBF5]/90 backdrop-blur-md border-b border-[#FED7AA]/70 shadow-[0_2px_12px_rgba(243,115,33,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Official Kidea Logo */}
          <KideaLogo size="md" />

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              to="/"
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
                location.pathname === '/'
                  ? 'text-[#EA580C] font-bold bg-[#FFEDD5]'
                  : 'text-stone-700 hover:text-[#EA580C] hover:bg-[#FFF5EA]'
              }`}
            >
              {t.nav.home}
            </Link>

            <Link
              to="/register"
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
                location.pathname === '/register'
                  ? 'text-[#EA580C] font-bold bg-[#FFEDD5]'
                  : 'text-stone-700 hover:text-[#EA580C] hover:bg-[#FFF5EA]'
              }`}
            >
              {t.nav.register}
            </Link>
          </nav>

          {/* Right Actions: Language Switcher and Register Visit Button */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />

            <Link to="/register">
              <Button
                variant="primary"
                size="md"
                leftIcon={<CalendarCheck className="w-4 h-4" />}
              >
                {t.nav.register}
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-2xl bg-white border border-[#FED7AA] text-stone-700 hover:bg-[#FFF5EA]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-[#EA580C]" /> : <Menu className="w-6 h-6 text-stone-700" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (No admin login for outside visitors) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#FED7AA] bg-[#FFFDF9] px-5 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-2xl text-base font-medium transition-colors ${
                location.pathname === '/'
                  ? 'text-[#EA580C] font-bold bg-[#FFEDD5]'
                  : 'text-stone-700 hover:bg-[#FFF5EA] hover:text-[#EA580C]'
              }`}
            >
              {t.nav.home}
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-2xl text-base font-medium transition-colors ${
                location.pathname === '/register'
                  ? 'text-[#EA580C] font-bold bg-[#FFEDD5]'
                  : 'text-stone-700 hover:bg-[#FFF5EA] hover:text-[#EA580C]'
              }`}
            >
              {t.nav.register}
            </Link>
          </nav>

          <div className="pt-2">
            <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="md" className="w-full justify-center">
                <CalendarCheck className="w-4 h-4 mr-2" />
                {t.nav.register}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
