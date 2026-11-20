import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Heart, Building2, ChevronRight } from 'lucide-react';
import { KideaLogo } from '../common/KideaLogo';
import { useLanguage } from '../../hooks/useLanguage';

const BRANCH_LIST = [
  'Kidea Cawang',
  'Kidea Galaxy',
  'Kidea Bekasi Timur',
  'Kidea Tangerang Selatan',
];

export const Footer: React.FC = () => {
  const { t, language } = useLanguage();

  // Split address into Head Office title and detail street if period exists for cleaner typography
  const addressParts = t.footer.address.split('. ');
  const officeTitle = addressParts.length > 1 ? addressParts[0] : null;
  const streetAddress =
    addressParts.length > 1 ? addressParts.slice(1).join('. ') : t.footer.address;

  return (
    <footer className="bg-gradient-to-b from-[#FFF9F2] to-[#FFF3E4] border-t border-[#FED7AA] text-stone-700 mt-auto relative overflow-hidden">
      {/* Top decorative warm accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FED7AA]/40 via-[#F37321]/50 to-[#FED7AA]/40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Column 1: Brand, Tagline & Branches */}
          <div className="md:col-span-5 space-y-4 text-center md:text-left">
            <div className="flex justify-center md:justify-start">
              <KideaLogo size="sm" />
            </div>

            <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto md:mx-0 leading-relaxed font-medium">
              {t.footer.tagline}
            </p>

            {/* Branch Network Pills */}
            <div className="pt-1 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#9A3412]">
                <Building2 className="w-3.5 h-3.5 text-[#F37321]" />
                <span>{language === 'id' ? 'Jaringan Cabang Kami' : 'Our School Branches'}</span>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                {BRANCH_LIST.map((branch) => (
                  <span
                    key={branch}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 border border-[#FED7AA] text-[11px] font-semibold text-stone-700 shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F37321]" />
                    {branch}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div className="md:col-span-3 space-y-3 text-center md:text-left">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#9A3412]">
              {language === 'id' ? 'Navigasi Cepat' : 'Quick Links'}
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[#EA580C] font-medium transition-colors group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#F37321] transition-transform group-hover:translate-x-0.5" />
                  <span>{t.nav.home}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[#EA580C] font-medium transition-colors group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#F37321] transition-transform group-hover:translate-x-0.5" />
                  <span>{t.nav.register}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Head Office & Contact */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#9A3412] text-center md:text-left">
              {language === 'id' ? 'Kantor Pusat & Kontak' : 'Head Office & Contact'}
            </h3>

            <div className="p-4 rounded-2xl bg-white/80 border border-[#FED7AA]/90 shadow-2xs space-y-3">
              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FFEDD5] border border-[#FED7AA] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#F37321]" />
                </div>
                <div className="text-xs leading-relaxed text-left">
                  {officeTitle && (
                    <p className="font-bold text-stone-800">{officeTitle}</p>
                  )}
                  <p className="text-stone-600">{streetAddress}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#FED7AA]/50" />

              {/* Phone */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FFEDD5] border border-[#FED7AA] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[#F37321]" />
                </div>
                <div className="text-xs text-left">
                  <p className="text-[11px] text-stone-400 font-medium">
                    {language === 'id' ? 'Telepon Kantor Pusat' : 'Head Office Phone'}
                  </p>
                  <a
                    href={`tel:${t.footer.phone.replace(/\s+/g, '')}`}
                    className="font-bold text-stone-800 hover:text-[#EA580C] transition-colors"
                  >
                    {t.footer.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-8 pt-5 border-t border-[#FED7AA]/70 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-3">
          <p className="text-center sm:text-left">{t.footer.copyright}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-[#FED7AA]/80 text-stone-600 font-semibold text-[11px]">
            <span>{t.footer.schoolName}</span>
            <Heart className="w-3.5 h-3.5 text-[#F37321] fill-[#F37321]" />
          </div>
        </div>
      </div>
    </footer>
  );
};
