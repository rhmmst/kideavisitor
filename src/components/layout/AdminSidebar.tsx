import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, ArrowLeft, ShieldCheck, Building2, Crown } from 'lucide-react';
import { KideaLogo } from '../common/KideaLogo';
import { useLanguage } from '../../hooks/useLanguage';
import { signOutAdmin, getCurrentAdminProfile, AdminProfile } from '../../services/authService';

interface AdminSidebarProps {
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onClose }) => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentAdminProfile().then((profile) => {
      if (mounted) setAdminProfile(profile);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOutAdmin();
    } finally {
      if (onClose) onClose();
      navigate('/admin/login', { replace: true });
    }
  };

  const menuItems = [
    {
      label: t.admin.tabDashboard,
      icon: LayoutDashboard,
      path: '/admin/dashboard',
    },
    {
      label: t.admin.tabVisitors,
      icon: Users,
      path: '/admin/dashboard#visitors',
    },
    {
      label: t.admin.tabBranches,
      icon: Building2,
      path: '/admin/branches',
    },
  ];

  return (
    <aside className="w-64 h-full bg-[#FFFDF9] border-r border-[#FED7AA] flex flex-col justify-between p-5">
      <div className="space-y-6">
        {/* Logo & Role Badge */}
        <div className="space-y-2.5">
          <KideaLogo size="sm" to="/" />

          {adminProfile ? (
            <div className="p-2.5 rounded-2xl bg-[#FFF5EA] border border-[#FED7AA] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#9A3412]">
                {adminProfile.isSuperAdmin ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-[#F37321] shrink-0" />
                    <span>Super Admin</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-[#F37321] shrink-0" />
                    <span className="truncate">{adminProfile.branchName || 'Admin Cabang'}</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-stone-500 truncate font-medium" title={adminProfile.email}>
                {adminProfile.email}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FFEDD5] text-[#9A3412] text-xs font-semibold w-fit border border-[#FED7AA]/60">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F37321]" />
              <span>Admin Portal</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isExactPath = location.pathname === item.path;
            const isDashboardDefault =
              item.path === '/admin/dashboard' &&
              location.pathname === '/admin/dashboard' &&
              !location.hash;
            const isVisitorsHash =
              item.path === '/admin/dashboard#visitors' &&
              location.pathname === '/admin/dashboard' &&
              location.hash === '#visitors';
            const isActive = isExactPath || isDashboardDefault || isVisitorsHash;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-[#F37321] to-[#EA580C] text-white shadow-xs font-semibold'
                    : 'text-stone-700 hover:bg-[#FFF5EA] hover:text-[#EA580C]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="space-y-3 pt-6 border-t border-[#FED7AA]">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-[#EA580C] hover:bg-[#FFF5EA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'id' ? 'Kembali ke Web Publik' : 'Back to Public Site'}</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.admin.logout}</span>
        </button>
      </div>
    </aside>
  );
};
