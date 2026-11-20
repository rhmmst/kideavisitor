import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  PhoneCall,
  Mail,
  MapPin,
  Baby,
  Building2,
  ChevronRight,
  Send,
  MessageCircle
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { 
  CLASS_CATEGORIES, 
  CLASS_SESSIONS_MAP, 
  ClassCategory 
} from '../../constants/classSessions';
import { 
  fetchVisitors, 
  updateVisitorStatus, 
  updateVisitorRecord, 
  deleteVisitorRecord,
  shouldAutoCompleteTrial
} from '../../services/visitorService';
import { fetchAdminBranches } from '../../services/branchService';
import { manualResendEmail } from '../../services/emailService';
import { getCurrentAdminProfile, AdminProfile } from '../../services/authService';
import { INITIAL_BRANCHES, Branch } from '../../constants/branches';
import { exportVisitorsToExcel } from '../../utils/excelExport';
import { useLanguage } from '../../hooks/useLanguage';
import { VisitorRecord, TrialStatus, EmailDeliveryStatus } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const { t, language } = useLanguage();

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals state
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [editingVisitor, setEditingVisitor] = useState<VisitorRecord | null>(null);
  const [deletingVisitor, setDeletingVisitor] = useState<VisitorRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Email Resend state
  const [resendTarget, setResendTarget] = useState<'admin' | 'visitor' | null>(null);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendToast, setResendToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load admin profile, visitors & branches on mount
  const loadData = async () => {
    setLoading(true);
    try {
      const profile = await getCurrentAdminProfile();
      setAdminProfile(profile);

      if (profile && !profile.isSuperAdmin && profile.branchId) {
        setBranchFilter(profile.branchId);
      }

      const [visitorData, branchData] = await Promise.all([
        fetchVisitors(),
        fetchAdminBranches(),
      ]);
      setVisitors(visitorData);
      if (branchData && branchData.length > 0) {
        setBranches(branchData);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered visitor list
  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      // Strict branch authorization check for branch admins
      if (adminProfile && !adminProfile.isSuperAdmin && adminProfile.branchId) {
        if (v.branch_id !== adminProfile.branchId) {
          return false;
        }
      }

      // Branch filter
      const matchesBranch =
        branchFilter === 'all' ||
        v.branch_id === branchFilter ||
        v.branch_name === branchFilter;

      // Category filter
      const matchesCategory = categoryFilter === 'all' || v.classCategory === categoryFilter;

      // Date filter (matches trialDate or created_at date)
      const matchesDate = 
        !dateFilter ||
        v.trialDate === dateFilter ||
        (v.created_at && v.created_at.startsWith(dateFilter));

      // Search term
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        v.childName.toLowerCase().includes(q) ||
        v.fatherName.toLowerCase().includes(q) ||
        v.motherName.toLowerCase().includes(q) ||
        (v.branch_name && v.branch_name.toLowerCase().includes(q)) ||
        v.phone.includes(q);

      return matchesBranch && matchesCategory && matchesDate && matchesSearch;
    });
  }, [visitors, branchFilter, categoryFilter, dateFilter, searchTerm]);

  // Overall Dashboard Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const totalVisitors = visitors.length;

    const todayRegistrations = visitors.filter((v) =>
      v.created_at && v.created_at.startsWith(todayStr)
    ).length;

    const upcomingTrials = visitors.filter((v) => {
      const s = String(v.status || '').toLowerCase();
      return Boolean(v.trialDate) && v.trialDate >= todayStr && (s === 'pending' || s === 'confirmed' || s === 'scheduled');
    }).length;

    return { totalVisitors, todayRegistrations, upcomingTrials };
  }, [visitors]);

  // Breakdown Statistics by Branch
  const branchBreakdowns = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return branches.map((b) => {
      const branchVisitors = visitors.filter(
        (v) => v.branch_id === b.id || v.branch_name === b.branch_name
      );
      const total = branchVisitors.length;
      const today = branchVisitors.filter(
        (v) => v.created_at && v.created_at.startsWith(todayStr)
      ).length;
      const upcoming = branchVisitors.filter((v) => {
        const s = String(v.status || '').toLowerCase();
        return Boolean(v.trialDate) && v.trialDate >= todayStr && (s === 'pending' || s === 'confirmed' || s === 'scheduled');
      }).length;

      return {
        branch: b,
        total,
        today,
        upcoming,
      };
    });
  }, [branches, visitors]);

  // Handle status change
  const handleStatusChange = async (id: string, newStatus: TrialStatus) => {
    const targetVisitor = visitors.find((v) => v.id === id);
    // Only 'confirmed' can transition to 'completed', and 'confirmed' with past trialDate auto-completes
    let resolvedStatus: TrialStatus = newStatus;
    if (
      newStatus === 'completed' &&
      targetVisitor &&
      targetVisitor.status !== 'confirmed' &&
      targetVisitor.status !== 'completed'
    ) {
      return;
    }
    if (
      resolvedStatus === 'confirmed' &&
      targetVisitor &&
      shouldAutoCompleteTrial('confirmed', targetVisitor.trialDate)
    ) {
      resolvedStatus = 'completed';
    }

    await updateVisitorStatus(id, resolvedStatus);
    setVisitors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: resolvedStatus } : v))
    );
    if (selectedVisitor && selectedVisitor.id === id) {
      setSelectedVisitor((prev) => (prev ? { ...prev, status: resolvedStatus } : null));
    }
  };

  // Handle Confirm Trial Class via WhatsApp Web
  const handleConfirmTrialViaWhatsApp = async (v: VisitorRecord) => {
    // 1. Normalize phone number to international format (62...)
    let waPhone = (v.phone || '').replace(/[^0-9]/g, '');
    if (waPhone.startsWith('0')) {
      waPhone = '62' + waPhone.slice(1);
    } else if (waPhone.startsWith('8')) {
      waPhone = '62' + waPhone;
    }

    // 2. Format Trial Date
    const parsedDate = v.trialDate ? new Date(`${v.trialDate}T00:00:00`) : null;
    const formattedDate =
      parsedDate && !isNaN(parsedDate.getTime())
        ? parsedDate.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : v.trialDate ||
          (language === 'id'
            ? 'Menunggu Konfirmasi Jadwal'
            : 'To Be Scheduled');

    const branchLabel = v.branch_name || 'TK Kidea';

    // 3. Build WhatsApp message confirming Trial Class date and session
    const message =
      language === 'id'
        ? `Halo Bapak/Ibu Orang Tua dari *${v.childName}* (${v.fatherName} / ${v.motherName}),\n\nTerima kasih telah mendaftar di *${branchLabel}*.\nKami menginformasikan bahwa jadwal *Trial Class* putra/putri Anda telah *TERKONFIRMASI* dengan rincian berikut:\n\n• *Nama Murid:* ${v.childName}\n• *Cabang:* ${branchLabel}\n• *Kategori Kelas:* ${v.classCategory}\n• *Tanggal Trial:* ${formattedDate}\n• *Sesi Sekolah:* ${v.schoolSession}\n\nKami menantikan kehadiran Bapak/Ibu beserta ananda ${v.childName} di ${branchLabel}. Terima kasih!`
        : `Hello Parents of *${v.childName}* (${v.fatherName} / ${v.motherName}),\n\nThank you for registering at *${branchLabel}*.\nWe would like to inform you that your child's *Trial Class* schedule has been *CONFIRMED* with the following details:\n\n• *Child Name:* ${v.childName}\n• *Branch:* ${branchLabel}\n• *Class Category:* ${v.classCategory}\n• *Trial Date:* ${formattedDate}\n• *School Session:* ${v.schoolSession}\n\nWe look forward to welcoming you and ${v.childName} at ${branchLabel}. Thank you!`;

    // 4. Open WhatsApp Web in a new tab
    if (waPhone) {
      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    // 5. Update status to 'confirmed' (or 'completed' if trialDate has already passed)
    const nextStatus: TrialStatus = shouldAutoCompleteTrial('confirmed', v.trialDate)
      ? 'completed'
      : 'confirmed';

    await updateVisitorStatus(v.id, nextStatus);
    setVisitors((prev) =>
      prev.map((item) => (item.id === v.id ? { ...item, status: nextStatus } : item))
    );
    if (selectedVisitor && selectedVisitor.id === v.id) {
      setSelectedVisitor((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
  };

  // Handle Delete Confirmation
  const handleDelete = async () => {
    if (!deletingVisitor) return;
    await deleteVisitorRecord(deletingVisitor.id);
    setVisitors((prev) => prev.filter((v) => v.id !== deletingVisitor.id));
    setDeletingVisitor(null);
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVisitor) return;

    const resolvedStatus: TrialStatus = shouldAutoCompleteTrial(
      editingVisitor.status,
      editingVisitor.trialDate
    )
      ? 'completed'
      : editingVisitor.status;

    const updatedRecord: VisitorRecord = {
      ...editingVisitor,
      status: resolvedStatus,
    };

    await updateVisitorRecord(updatedRecord.id, updatedRecord);
    setVisitors((prev) =>
      prev.map((v) => (v.id === updatedRecord.id ? updatedRecord : v))
    );
    if (selectedVisitor && selectedVisitor.id === updatedRecord.id) {
      setSelectedVisitor(updatedRecord);
    }
    setEditingVisitor(null);
  };

  // Handle Excel Export
  const handleExcelExport = async () => {
    try {
      setIsExporting(true);
      await exportVisitorsToExcel(filteredVisitors);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: TrialStatus | string) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'pending':
      case 'scheduled':
        return <Badge variant="yellow" size="sm">{language === 'id' ? 'Menunggu' : 'Pending'}</Badge>;
      case 'confirmed':
      case 'rescheduled':
        return <Badge variant="blue" size="sm">{language === 'id' ? 'Terkonfirmasi' : 'Confirmed'}</Badge>;
      case 'completed':
      case 'attended':
        return <Badge variant="green" size="sm">{language === 'id' ? 'Selesai / Hadir' : 'Completed'}</Badge>;
      case 'cancelled':
        return <Badge variant="rose" size="sm">{language === 'id' ? 'Dibatalkan' : 'Cancelled'}</Badge>;
      default:
        return <Badge variant="stone" size="sm">{status}</Badge>;
    }
  };

  const getEmailStatusBadge = (status?: EmailDeliveryStatus, timestamp?: string | null) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{t.admin.emailStatusSent}</span>
            {timestamp && (
              <span className="font-mono text-[10px] text-emerald-700">
                ({new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>{t.admin.emailStatusFailed}</span>
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
            <span>{t.admin.emailStatusSkipped}</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>{t.admin.emailStatusPending}</span>
          </span>
        );
    }
  };

  const handleConfirmResend = async () => {
    if (!resendTarget || !selectedVisitor) return;
    setIsResending(true);
    setResendToast(null);

    try {
      const result = await manualResendEmail(selectedVisitor, resendTarget);
      if (result.success) {
        setResendToast({
          type: 'success',
          message:
            language === 'id'
              ? 'Email notifikasi berhasil dikirim via Resend.'
              : 'Notification email has been resent successfully via Resend.',
        });
        const updated: VisitorRecord = {
          ...selectedVisitor,
          ...(resendTarget === 'admin'
            ? {
                admin_email_status: 'sent',
                admin_email_sent_at: result.admin_email_sent_at || new Date().toISOString(),
              }
            : {
                visitor_email_status: 'sent',
                visitor_email_sent_at: result.visitor_email_sent_at || new Date().toISOString(),
              }),
          email_error: result.email_error || null,
        };
        setSelectedVisitor(updated);
        setVisitors((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      } else {
        setResendToast({
          type: 'error',
          message:
            result.error ||
            (language === 'id'
              ? 'Gagal mengirim email. Periksa konfigurasi Resend API.'
              : 'Failed to send email. Check Resend API configuration.'),
        });
      }
    } catch (err: any) {
      setResendToast({
        type: 'error',
        message: err?.message || 'Error occurred while resending email.',
      });
    } finally {
      setIsResending(false);
      setResendTarget(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {t.admin.dashboardTitle}
            </h1>
            {adminProfile && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]">
                <Building2 className="w-3.5 h-3.5 text-[#F37321]" />
                <span>
                  {adminProfile.isSuperAdmin
                    ? language === 'id'
                      ? 'Super Admin • Semua Cabang'
                      : 'Super Admin • All Branches'
                    : `${language === 'id' ? 'Admin Cabang' : 'Branch Admin'} • ${adminProfile.branchName}`}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-600">
            {adminProfile && !adminProfile.isSuperAdmin && adminProfile.branchName
              ? language === 'id'
                ? `Menampilkan khusus data calon peserta didik cabang ${adminProfile.branchName}.`
                : `Showing prospective student records exclusively for ${adminProfile.branchName}.`
              : t.admin.dashboardSubtitle}
          </p>
        </div>

        <div>
          <Button
            variant="secondary"
            size="md"
            onClick={handleExcelExport}
            isLoading={isExporting}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            {t.admin.exportBtn}
          </Button>
        </div>
      </div>

      {/* DASHBOARD STATISTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="warm" padding="sm" className="space-y-2 border-[#FED7AA]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">{t.admin.statTotal}</span>
            <div className="w-8 h-8 rounded-xl bg-white border border-[#FED7AA] flex items-center justify-center text-[#F37321] shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-stone-900">{stats.totalVisitors}</span>
            <span className="text-[11px] text-[#EA580C] font-semibold">{language === 'id' ? 'calon murid' : 'students'}</span>
          </div>
        </Card>

        <Card variant="default" padding="sm" className="space-y-2 border-[#FED7AA]/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">{t.admin.statToday}</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFEDD5] flex items-center justify-center text-[#F37321]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-stone-900">{stats.todayRegistrations}</span>
            <span className="text-[11px] text-stone-500 font-medium">{language === 'id' ? 'pendaftar baru' : 'new'}</span>
          </div>
        </Card>

        <Card variant="default" padding="sm" className="space-y-2 border-[#FED7AA]/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">{t.admin.statUpcoming}</span>
            <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-[#D97706]">{stats.upcomingTrials}</span>
            <span className="text-[11px] text-amber-700 font-medium">{language === 'id' ? 'sesi trial' : 'sessions'}</span>
          </div>
        </Card>
      </div>

      {/* BREAKDOWN BY BRANCH (Super Admin Only) */}
      {(!adminProfile || adminProfile.isSuperAdmin) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#EA580C]" />
              <h2 className="font-display text-xs font-bold text-stone-800 uppercase tracking-wider">
                {language === 'id' ? 'Statistik per Cabang Sekolah' : 'Branch Statistics Breakdown'}
              </h2>
            </div>
            <span className="text-[11px] text-stone-500">
              {language === 'id' ? 'Klik kartu cabang untuk memfilter data tabel' : 'Click branch card to filter table records'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {branchBreakdowns.map(({ branch, total, today, upcoming }) => {
              const isSelected = branchFilter === branch.id;
              return (
                <div
                  key={branch.id}
                  onClick={() => setBranchFilter(isSelected ? 'all' : branch.id)}
                  className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border text-left ${
                    isSelected
                      ? 'bg-[#FFF7ED] border-[#F37321] ring-2 ring-[#F37321]/30 shadow-sm'
                      : 'bg-white hover:bg-[#FFFDF9] border-[#FED7AA]/70 hover:border-[#FED7AA]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-stone-900 truncate">
                      {branch.branch_name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        branch.is_active ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-stone-300'
                      }`}
                      title={branch.is_active ? 'Aktif' : 'Nonaktif'}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#FED7AA]/40 text-center">
                    <div className="p-1.5 rounded-xl bg-[#FFF5EA]/70">
                      <span className="block text-[10px] text-stone-500 font-medium leading-none">Total</span>
                      <span className="font-display text-sm font-extrabold text-[#EA580C] mt-1 block">
                        {total}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-[#FFEDD5]/50">
                      <span className="block text-[10px] text-stone-500 font-medium leading-none">
                        {language === 'id' ? 'Hari Ini' : 'Today'}
                      </span>
                      <span className="font-display text-sm font-extrabold text-stone-800 mt-1 block">
                        {today}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-[#FEF3C7]/60">
                      <span className="block text-[10px] text-stone-500 font-medium leading-none">
                        {language === 'id' ? 'Trial' : 'Trial'}
                      </span>
                      <span className="font-display text-sm font-extrabold text-amber-600 mt-1 block">
                        {upcoming}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-2 text-[10px] font-bold text-[#EA580C] text-center">
                      ✓ {language === 'id' ? 'Filter Aktif (Klik untuk reset)' : 'Filtered (Click to reset)'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS BAR */}
      <Card id="visitors" variant="default" padding="sm" className="space-y-4 border-[#FED7AA]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="md:col-span-4">
            <Input
              placeholder={t.admin.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Branch Filter (Super Admin can switch, Branch Admin is locked to their branch) */}
          <div className="md:col-span-3">
            {adminProfile && !adminProfile.isSuperAdmin ? (
              <div className="w-full rounded-2xl border border-[#FED7AA] bg-[#FFF9F2] px-4 py-2.5 text-sm font-bold text-[#9A3412] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#F37321] shrink-0" />
                <span className="truncate">{adminProfile.branchName}</span>
              </div>
            ) : (
              <Select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">-- {t.admin.filterAllBranches} --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">-- {t.admin.filterAllCategory} --</option>
              {CLASS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          {/* Date Filter */}
          <div className="md:col-span-2">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title={language === 'id' ? 'Filter berdasarkan tanggal' : 'Filter by date'}
            />
          </div>
        </div>

        {/* Active filter count / Clear filter */}
        {((adminProfile?.isSuperAdmin && branchFilter !== 'all') || categoryFilter !== 'all' || dateFilter || searchTerm) && (
          <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
            <span>
              {language === 'id' ? `Menampilkan ${filteredVisitors.length} dari ${visitors.length} data` : `Showing ${filteredVisitors.length} of ${visitors.length} records`}
            </span>
            <button
              type="button"
              onClick={() => {
                setBranchFilter(
                  adminProfile && !adminProfile.isSuperAdmin && adminProfile.branchId
                    ? adminProfile.branchId
                    : 'all'
                );
                setCategoryFilter('all');
                setDateFilter('');
                setSearchTerm('');
              }}
              className="text-[#EA580C] font-semibold hover:underline"
            >
              {language === 'id' ? 'Reset Semua Filter' : 'Clear All Filters'}
            </button>
          </div>
        )}
      </Card>

      {/* VISITOR DATA TABLE */}
      <Card variant="default" padding="none" className="overflow-hidden border border-[#FED7AA]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FFF9F2] border-b border-[#FED7AA] text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                <th className="py-3 px-4">{t.admin.colBranch}</th>
                <th className="py-3 px-4">{t.admin.colRegDate}</th>
                <th className="py-3 px-4">{t.admin.colChild}</th>
                <th className="py-3 px-4">{t.admin.colParent}</th>
                <th className="py-3 px-4">{t.admin.colPhone}</th>
                <th className="py-3 px-4">{t.admin.colCategory}</th>
                <th className="py-3 px-4">{t.admin.colSession}</th>
                <th className="py-3 px-4">{t.admin.colTrialDate}</th>
                <th className="py-3 px-4">{t.admin.colStatus}</th>
                <th className="py-3 px-4 text-right">{t.admin.colAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FED7AA]/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-stone-500">
                    <p className="font-semibold text-sm">Memuat data pengunjung...</p>
                  </td>
                </tr>
              ) : filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-500">
                    <p className="font-semibold text-sm">
                      {language === 'id' ? 'Tidak ada data pengunjung yang cocok' : 'No matching visitor records found'}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      {language === 'id' ? 'Coba ubah kata kunci pencarian atau reset filter.' : 'Try adjusting your search query or reset filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((v) => {
                  const regDate = v.created_at ? v.created_at.split('T')[0] : '-';
                  return (
                    <tr key={v.id} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Branch */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FFF5EA] text-[#9A3412] font-semibold text-xs border border-[#FED7AA]">
                          <Building2 className="w-3.5 h-3.5 text-[#F37321]" />
                          <span>{v.branch_name || 'TK Kidea'}</span>
                        </span>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 font-mono text-stone-600">
                        {regDate}
                      </td>

                      {/* Child Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{v.childName}</div>
                        <div className="text-[11px] text-stone-400">{v.age} • {v.gender}</div>
                      </td>

                      {/* Parent Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-800">{v.fatherName}</div>
                        <div className="text-[11px] text-stone-500">{v.motherName}</div>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-mono text-stone-700">
                          <PhoneCall className="w-3 h-3 text-[#F37321]" />
                          <span>{v.phone}</span>
                        </div>
                      </td>

                      {/* Class Category */}
                      <td className="py-3.5 px-4 font-semibold text-[#EA580C]">
                        {v.classCategory}
                      </td>

                      {/* School Session */}
                      <td className="py-3.5 px-4 text-stone-600">
                        {v.schoolSession}
                      </td>

                      {/* Trial Date */}
                      <td className="py-3.5 px-4 font-medium text-stone-900">
                        {v.trialDate ? (
                          v.trialDate
                        ) : (
                          <span className="text-stone-400 italic text-[11px] font-normal">
                            {language === 'id' ? 'Belum dijadwalkan' : 'Not scheduled'}
                          </span>
                        )}
                      </td>

                      {/* Trial Status dropdown / badge */}
                      <td className="py-3.5 px-4">
                        <select
                          value={v.status}
                          onChange={(e) => handleStatusChange(v.id, e.target.value as TrialStatus)}
                          className="text-xs font-semibold rounded-lg border border-[#FED7AA] bg-white px-2 py-1 text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#F37321]"
                        >
                          <option value="pending">{language === 'id' ? 'Menunggu' : 'Pending'}</option>
                          <option value="confirmed">{language === 'id' ? 'Terkonfirmasi' : 'Confirmed'}</option>
                          <option
                            value="completed"
                            disabled={v.status !== 'confirmed' && v.status !== 'completed'}
                          >
                            {language === 'id' ? 'Selesai (Hadir)' : 'Completed'}
                          </option>
                          <option value="cancelled">{language === 'id' ? 'Dibatalkan' : 'Cancelled'}</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Confirm Trial Class via WhatsApp Web button */}
                          <button
                            type="button"
                            onClick={() => handleConfirmTrialViaWhatsApp(v)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors text-[11px] font-bold shadow-2xs"
                            title={
                              language === 'id'
                                ? 'Konfirmasi Trial Class via WhatsApp Web'
                                : 'Confirm Trial Class via WhatsApp Web'
                            }
                          >
                            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{language === 'id' ? 'Konfirmasi WA' : 'Confirm WA'}</span>
                          </button>

                          {/* View button */}
                          <button
                            type="button"
                            onClick={() => setSelectedVisitor(v)}
                            className="p-1.5 rounded-xl border border-[#FED7AA] text-stone-600 hover:bg-[#FFF5EA] hover:text-[#EA580C]"
                            title={t.admin.viewDetails}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => setEditingVisitor(v)}
                            className="p-1.5 rounded-xl border border-[#FED7AA] text-stone-600 hover:bg-[#FFF5EA] hover:text-[#EA580C]"
                            title={t.admin.edit}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#EA580C]" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => setDeletingVisitor(v)}
                            className="p-1.5 rounded-xl border border-[#FED7AA] text-stone-600 hover:bg-rose-50 hover:text-rose-700"
                            title={t.admin.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* VIEW DETAILS MODAL */}
      <Modal
        isOpen={Boolean(selectedVisitor)}
        onClose={() => setSelectedVisitor(null)}
        title={language === 'id' ? 'Detail Data Calon Murid' : 'Prospective Student Details'}
        maxWidth="lg"
      >
        {selectedVisitor && (
          <div className="space-y-4">
            {/* Status & Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FFF9F2] border border-[#FED7AA]">
              <div>
                <span className="text-[10px] text-stone-400 block font-semibold uppercase">ID Pendaftaran</span>
                <span className="font-mono text-sm font-bold text-[#EA580C]">{selectedVisitor.id}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedVisitor.status)}
                <button
                  type="button"
                  onClick={() => handleConfirmTrialViaWhatsApp(selectedVisitor)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>
                    {language === 'id'
                      ? 'Konfirmasi Trial via WhatsApp'
                      : 'Confirm Trial via WhatsApp'}
                  </span>
                </button>
              </div>
            </div>

            {/* Branch Info */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFF5EA] border border-[#FED7AA]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#FED7AA] flex items-center justify-center text-[#F37321] shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">
                    {language === 'id' ? 'Cabang TK Kidea Terdaftar' : 'Registered TK Kidea Branch'}
                  </span>
                  <span className="font-bold text-sm text-[#9A3412]">
                    {selectedVisitor.branch_name || 'TK Kidea'}
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#EA580C] bg-white px-3 py-1 rounded-xl border border-[#FED7AA]">
                {selectedVisitor.branch_id ? selectedVisitor.branch_id.slice(0, 8) : 'Default'}
              </span>
            </div>

            {/* Child Info */}
            <div className="space-y-2">
              <span className="font-display font-bold text-xs uppercase text-[#EA580C] tracking-wider block">
                A. Informasi Calon Murid
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">Nama Murid</span>
                  <span className="font-bold text-stone-900">{selectedVisitor.childName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">Jenis Kelamin</span>
                  <span className="font-bold text-stone-900">{selectedVisitor.gender}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">Tempat, Tgl Lahir</span>
                  <span className="font-bold text-stone-900">{selectedVisitor.placeOfBirth}, {selectedVisitor.dateOfBirth}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">Usia & Agama</span>
                  <span className="font-bold text-stone-900">{selectedVisitor.age} • {selectedVisitor.religion}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA] text-xs">
                <span className="text-stone-400 block text-[10px]">Alamat Tempat Tinggal</span>
                <span className="text-stone-800">{selectedVisitor.address}</span>
              </div>
            </div>

            {/* Parent Info */}
            <div className="space-y-2 pt-2 border-t border-[#FED7AA]">
              <span className="font-display font-bold text-xs uppercase text-[#EA580C] tracking-wider block">
                B. Informasi Orang Tua
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">Nama Ayah</span>
                  <span className="font-bold text-stone-900">{selectedVisitor.fatherName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">Nama Ibu</span>
                  <span className="font-bold text-stone-900">{selectedVisitor.motherName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">WhatsApp</span>
                  <span className="font-bold text-stone-900">{selectedVisitor.phone}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">Email</span>
                  <span className="font-bold text-stone-900">{selectedVisitor.email}</span>
                </div>
              </div>
            </div>

            {/* Class & Trial Info */}
            <div className="space-y-2 pt-2 border-t border-[#FED7AA]">
              <span className="font-display font-bold text-xs uppercase text-[#EA580C] tracking-wider block">
                C. Kategori Kelas & Jadwal Trial
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">Kelas</span>
                  <span className="font-bold text-[#EA580C]">{selectedVisitor.classCategory}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">Sesi</span>
                  <span className="font-bold text-stone-900">{selectedVisitor.schoolSession}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#FED7AA]">
                  <span className="text-stone-400 block text-[10px]">Tgl Trial</span>
                  <span className="font-bold text-stone-900">
                    {selectedVisitor.trialDate ||
                      (language === 'id' ? 'Belum dijadwalkan' : 'Not scheduled')}
                  </span>
                </div>
              </div>
            </div>

            {/* D. Automatic Email Notifications Section */}
            {(() => {
              const branchForSelected = branches.find((b) => b.id === selectedVisitor.branch_id);
              const branchAdminEmail = branchForSelected?.admin_email?.trim() || null;
              const visitorEmail = selectedVisitor.email?.trim() || null;

              return (
                <div className="space-y-3 pt-2.5 border-t border-[#FED7AA]">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-xs uppercase text-[#EA580C] tracking-wider block">
                      {t.admin.secEmailNotification}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono font-semibold bg-[#FFEDD5] px-2 py-0.5 rounded-md border border-[#FED7AA]/60">
                      Resend API
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* 1. Branch Admin Email */}
                    <div className="p-3 rounded-xl bg-white border border-[#FED7AA] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#F37321]" />
                          <span>{t.admin.adminEmailLabel}</span>
                        </span>
                        {getEmailStatusBadge(
                          selectedVisitor.admin_email_status,
                          selectedVisitor.admin_email_sent_at
                        )}
                      </div>
                      <div className="font-mono text-stone-800 bg-[#FFFDF9] p-2 rounded-lg border border-[#FED7AA]/60 text-xs truncate">
                        {branchAdminEmail || (
                          <span className="text-stone-400 italic font-sans text-[11px]">
                            {t.admin.noBranchEmailSet}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!branchAdminEmail || isResending}
                        onClick={() => setResendTarget('admin')}
                        className="w-full justify-center text-xs"
                        leftIcon={<Send className="w-3 h-3 text-[#F37321]" />}
                      >
                        {t.admin.resendAdminEmailBtn}
                      </Button>
                    </div>

                    {/* 2. Visitor Email */}
                    <div className="p-3 rounded-xl bg-white border border-[#FED7AA] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#F37321]" />
                          <span>{t.admin.visitorEmailLabel}</span>
                        </span>
                        {getEmailStatusBadge(
                          selectedVisitor.visitor_email_status,
                          selectedVisitor.visitor_email_sent_at
                        )}
                      </div>
                      <div className="font-mono text-stone-800 bg-[#FFFDF9] p-2 rounded-lg border border-[#FED7AA]/60 text-xs truncate">
                        {visitorEmail || (
                          <span className="text-stone-400 italic font-sans text-[11px]">
                            {t.admin.noVisitorEmailSet}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!visitorEmail || isResending}
                        onClick={() => setResendTarget('visitor')}
                        className="w-full justify-center text-xs"
                        leftIcon={<Send className="w-3 h-3 text-[#F37321]" />}
                      >
                        {t.admin.resendVisitorEmailBtn}
                      </Button>
                    </div>
                  </div>

                  {/* Error banner if email_error exists */}
                  {selectedVisitor.email_error && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-bold">Info Resend / Pengiriman: </span>
                        <span>{selectedVisitor.email_error}</span>
                      </div>
                    </div>
                  )}

                  {/* Toast feedback banner */}
                  {resendToast && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                        resendToast.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <span>{resendToast.message}</span>
                      <button
                        type="button"
                        onClick={() => setResendToast(null)}
                        className="text-stone-400 hover:text-stone-700 font-bold ml-2 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="pt-3 flex justify-end">
              <Button variant="primary" size="md" onClick={() => setSelectedVisitor(null)}>
                {language === 'id' ? 'Tutup' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRM RESEND EMAIL MODAL */}
      <Modal
        isOpen={Boolean(resendTarget)}
        onClose={() => setResendTarget(null)}
        title={t.admin.resendConfirmTitle}
        maxWidth="sm"
      >
        {resendTarget && selectedVisitor && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FFEDD5] text-[#F37321] flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="font-bold text-sm text-stone-900">
                {resendTarget === 'admin'
                  ? `${t.admin.resendAdminEmailBtn} (${selectedVisitor.branch_name || 'TK Kidea'})`
                  : `${t.admin.resendVisitorEmailBtn} (${selectedVisitor.childName})`}
              </p>
              <p className="text-xs text-stone-600 leading-relaxed">
                {t.admin.resendConfirmDesc}
              </p>
              <p className="text-xs font-mono font-semibold text-[#EA580C] bg-[#FFF5EA] py-1 px-3 rounded-lg border border-[#FED7AA] inline-block mt-1">
                {resendTarget === 'admin'
                  ? (branches.find((b) => b.id === selectedVisitor.branch_id)?.admin_email || 'admin@kidea.sch.id')
                  : selectedVisitor.email}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                size="md"
                disabled={isResending}
                onClick={() => setResendTarget(null)}
                className="w-1/2 justify-center"
              >
                {t.admin.cancel}
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isResending}
                onClick={handleConfirmResend}
                className="w-1/2 justify-center"
                leftIcon={<Send className="w-4 h-4" />}
              >
                {t.admin.confirmResend}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={Boolean(editingVisitor)}
        onClose={() => setEditingVisitor(null)}
        title={t.admin.edit}
        maxWidth="lg"
      >
        {editingVisitor && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Select
                  label="Cabang TK Kidea / School Branch"
                  value={editingVisitor.branch_id || ''}
                  disabled={Boolean(adminProfile && !adminProfile.isSuperAdmin)}
                  onChange={(e) => {
                    if (adminProfile && !adminProfile.isSuperAdmin) return;
                    const sel = branches.find((b) => b.id === e.target.value);
                    setEditingVisitor({
                      ...editingVisitor,
                      branch_id: e.target.value,
                      branch_name: sel?.branch_name || editingVisitor.branch_name,
                    });
                  }}
                  required
                >
                  <option value="">-- Pilih Cabang / Select Branch --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                label="Nama Murid / Child Name"
                value={editingVisitor.childName}
                onChange={(e) => setEditingVisitor({ ...editingVisitor, childName: e.target.value })}
                required
              />

              <Select
                label="Jenis Kelamin / Gender"
                value={editingVisitor.gender}
                onChange={(e) => setEditingVisitor({ ...editingVisitor, gender: e.target.value })}
                required
              >
                <option value="Male">Laki-laki / Male</option>
                <option value="Female">Perempuan / Female</option>
              </Select>

              <Input
                label="Nama Ayah / Father Name"
                value={editingVisitor.fatherName}
                onChange={(e) => setEditingVisitor({ ...editingVisitor, fatherName: e.target.value })}
                required
              />

              <Input
                label="Nama Ibu / Mother Name"
                value={editingVisitor.motherName}
                onChange={(e) => setEditingVisitor({ ...editingVisitor, motherName: e.target.value })}
                required
              />

              <Input
                label="WhatsApp / Phone"
                value={editingVisitor.phone}
                onChange={(e) => setEditingVisitor({ ...editingVisitor, phone: e.target.value })}
                required
              />

              <Input
                label="Email"
                type="email"
                value={editingVisitor.email}
                onChange={(e) => setEditingVisitor({ ...editingVisitor, email: e.target.value })}
                required
              />

              <Select
                label="Kategori Kelas / Class Category"
                value={editingVisitor.classCategory}
                onChange={(e) => {
                  const newCat = e.target.value as ClassCategory;
                  const newSessions = CLASS_SESSIONS_MAP[newCat] || [];
                  setEditingVisitor({
                    ...editingVisitor,
                    classCategory: newCat,
                    schoolSession: newSessions[0] || '',
                  });
                }}
                required
              >
                {CLASS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>

              <Select
                label="Sesi Sekolah / School Session"
                value={editingVisitor.schoolSession}
                onChange={(e) => setEditingVisitor({ ...editingVisitor, schoolSession: e.target.value })}
                required
              >
                {(CLASS_SESSIONS_MAP[editingVisitor.classCategory] || []).map((ses) => (
                  <option key={ses} value={ses}>
                    {ses}
                  </option>
                ))}
              </Select>

              <Input
                label="Tanggal Trial / Trial Date (Opsional)"
                type="date"
                value={editingVisitor.trialDate || ''}
                onChange={(e) => setEditingVisitor({ ...editingVisitor, trialDate: e.target.value })}
              />

              <Select
                label="Status Trial"
                value={editingVisitor.status}
                onChange={(e) => setEditingVisitor({ ...editingVisitor, status: e.target.value as TrialStatus })}
                required
              >
                <option value="pending">{language === 'id' ? 'Menunggu / Pending' : 'Pending'}</option>
                <option value="confirmed">{language === 'id' ? 'Terkonfirmasi / Confirmed' : 'Confirmed'}</option>
                <option
                  value="completed"
                  disabled={
                    editingVisitor.status !== 'confirmed' && editingVisitor.status !== 'completed'
                  }
                >
                  {language === 'id' ? 'Selesai / Completed (Attended)' : 'Completed'}
                </option>
                <option value="cancelled">{language === 'id' ? 'Dibatalkan / Cancelled' : 'Cancelled'}</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 tracking-wide mb-1">
                Alamat Tempat Tinggal / Address
              </label>
              <textarea
                rows={2}
                value={editingVisitor.address}
                onChange={(e) => setEditingVisitor({ ...editingVisitor, address: e.target.value })}
                className="w-full rounded-2xl border border-[#FED7AA] bg-white px-4 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#F37321]/30"
                required
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#FED7AA]">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setEditingVisitor(null)}
              >
                {t.admin.cancel}
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
              >
                {t.admin.saveChanges}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deletingVisitor)}
        onClose={() => setDeletingVisitor(null)}
        title={t.admin.deleteConfirmTitle}
        maxWidth="sm"
      >
        {deletingVisitor && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="font-bold text-sm text-stone-900">
                {deletingVisitor.childName} ({deletingVisitor.classCategory})
              </p>
              <p className="text-xs text-stone-600 leading-relaxed">
                {t.admin.deleteConfirmDesc}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setDeletingVisitor(null)}
                className="w-1/2 justify-center"
              >
                {t.admin.cancel}
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={handleDelete}
                className="w-1/2 justify-center"
              >
                {t.admin.confirmDelete}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
