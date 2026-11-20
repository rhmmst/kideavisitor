import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Sparkles } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { KideaLogo } from '../../components/common/KideaLogo';
import { useLanguage } from '../../hooks/useLanguage';

export const LandingPage: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 sm:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background warm ambient gradients */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-[#FED7AA]/40 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-[#FEF3C7]/50 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-3xl w-full text-center space-y-7">

        {/* Hero Card */}
        <Card variant="warm" padding="lg" className="border-2 border-[#FED7AA] shadow-xl shadow-orange-500/5 space-y-6">
          {/* Official Kidea Logo Centerpiece */}
          <div className="flex justify-center py-2">
            <KideaLogo size="lg" to="/" />
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight">
              {t.hero.title}
            </h1>
            <p className="font-display text-lg sm:text-xl font-bold text-[#EA580C]">
              {t.hero.subtitle}
            </p>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base text-stone-600 max-w-xl mx-auto leading-relaxed">
            {t.hero.desc}
          </p>

          {/* Main Action Button */}
          <div className="pt-2 flex justify-center">
            <Link to="/register">
              <Button
                variant="primary"
                size="lg"
                className="px-8 py-3.5 text-base shadow-lg shadow-orange-500/25"
                leftIcon={<CalendarCheck className="w-5 h-5" />}
              >
                {t.hero.registerBtn}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
