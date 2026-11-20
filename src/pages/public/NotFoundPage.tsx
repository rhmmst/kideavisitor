import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useLanguage } from '../../hooks/useLanguage';

export const NotFoundPage: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <Card variant="warm" padding="lg" className="border-2 border-[#FED7AA] space-y-5">
        <div className="w-16 h-16 rounded-full bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center mx-auto text-2xl font-display font-extrabold">
          404
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-stone-900">
            {language === 'id' ? 'Halaman Tidak Ditemukan' : 'Page Not Found'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            {language === 'id'
              ? 'Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.'
              : 'The page you are looking for does not exist or has been moved.'}
          </p>
        </div>

        <Link to="/" className="inline-block">
          <Button variant="primary" size="md" leftIcon={<Home className="w-4 h-4" />}>
            {language === 'id' ? 'Kembali ke Beranda' : 'Back to Home'}
          </Button>
        </Link>
      </Card>
    </div>
  );
};

