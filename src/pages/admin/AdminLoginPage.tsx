import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { KideaLogo } from '../../components/common/KideaLogo';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { useLanguage } from '../../hooks/useLanguage';
import { signInAdmin, getAdminSession, checkAdminStatus } from '../../services/authService';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if admin is already authenticated
  useEffect(() => {
    let isMounted = true;
    const checkExistingAuth = async () => {
      const session = await getAdminSession();
      if (session && session.user) {
        const isAdmin = await checkAdminStatus(session.user.id);
        if (isAdmin && isMounted) {
          navigate('/admin/dashboard', { replace: true });
        }
      }
    };
    checkExistingAuth();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleFillDemo = () => {
    setEmail('kidea.school@gmail.com');
    setPassword('');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError(
        language === 'id'
          ? 'Silakan masukkan email dan kata sandi.'
          : 'Please enter both email and password.'
      );
      return;
    }

    setLoading(true);

    try {
      const result = await signInAdmin(email.trim(), password);
      if (result.success) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(
          result.error ||
            (language === 'id'
              ? 'Email atau kata sandi tidak valid.'
              : 'Invalid email or password.')
        );
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (language === 'id'
            ? 'Terjadi kesalahan saat masuk. Silakan coba lagi.'
            : 'An error occurred during login. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-7xl w-full mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-[#EA580C] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'id' ? 'Kembali ke Web Publik' : 'Back to Public Site'}</span>
        </Link>

        <LanguageSwitcher />
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <Card variant="warm" padding="lg" className="border-2 border-[#FED7AA] shadow-xl shadow-orange-500/5">
          <div className="text-center space-y-4 mb-6">
            <div className="flex justify-center">
              <KideaLogo size="lg" to="/" />
            </div>

            <div className="space-y-1">
              <h1 className="font-display text-2xl font-bold text-stone-900">
                {t.admin.loginTitle}
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                {t.admin.loginSubtitle}
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label={t.admin.emailLabel}
              type="email"
              placeholder="admin@kidea.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label={t.admin.passwordLabel}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            {error && (
              <p className="text-xs text-rose-600 font-medium text-center">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-md shadow-orange-500/20"
              isLoading={loading}
              leftIcon={<KeyRound className="w-4 h-4" />}
            >
              {t.admin.loginBtn}
            </Button>
          </form>

          {/* Demo Account Helper */}
          <div className="mt-6 pt-5 border-t border-[#FED7AA] text-center space-y-2">
            <p className="text-xs text-stone-500 font-medium">
              {t.admin.demoHint}
            </p>
            <button
              type="button"
              onClick={handleFillDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#FED7AA] text-xs font-semibold text-[#EA580C] hover:bg-[#FFF5EA] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
              <span>{t.admin.fillDemo}</span>
            </button>
          </div>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-stone-400">
        <p>TK Kidea Visitor Management System &copy; 2026. Internal School Staff Portal.</p>
      </div>
    </div>
  );
};
