import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  PhoneCall, 
  Mail, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ShieldAlert,
  Save,
  RotateCcw
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { fetchAdminBranches, updateBranch } from '../../services/branchService';
import { useLanguage } from '../../hooks/useLanguage';
import { Branch } from '../../types';

export const AdminBranchesPage: React.FC = () => {
  const { t, language } = useLanguage();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [saveError, setSaveError] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const loadBranches = async () => {
    setLoading(true);
    const data = await fetchAdminBranches();
    setBranches(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch({ ...branch });
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    setSaveError('');
    setIsSaving(true);

    const result = await updateBranch(editingBranch.id, {
      branch_name: editingBranch.branch_name,
      admin_phone: editingBranch.admin_phone?.trim() || null,
      admin_email: editingBranch.admin_email?.trim() || null,
      is_active: editingBranch.is_active,
    });

    setIsSaving(false);

    if (!result.success) {
      setSaveError(result.error || 'Gagal menyimpan perubahan cabang.');
      return;
    }

    setSaveSuccess(
      language === 'id' 
        ? 'Pengaturan cabang berhasil diperbarui!' 
        : 'Branch settings updated successfully!'
    );

    // Update state
    setBranches((prev) =>
      prev.map((b) => (b.id === editingBranch.id ? (result.data || editingBranch) : b))
    );

    setTimeout(() => {
      setEditingBranch(null);
      setSaveSuccess('');
    }, 900);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            {t.admin.branchesTitle}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            {t.admin.branchesSubtitle}
          </p>
        </div>

        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadBranches}
            leftIcon={<RotateCcw className="w-4 h-4 text-[#F37321]" />}
          >
            {language === 'id' ? 'Segarkan Data' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Security notice card */}
      <div className="p-4 rounded-2xl bg-[#FFF5EA] border border-[#FED7AA] flex items-start gap-3 text-xs text-stone-700">
        <ShieldAlert className="w-5 h-5 text-[#F37321] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-[#9A3412]">
            {language === 'id' ? 'Privasi & Keamanan Kontak Cabang' : 'Branch Contact Privacy & Security'}
          </p>
          <p className="text-stone-600 mt-0.5 leading-relaxed">
            {language === 'id'
              ? 'Nomor WhatsApp dan email admin setiap cabang hanya dapat diakses dan dikelola oleh administrator terautentikasi. Data ini tidak pernah terekspos ke pengunjung umum.'
              : 'Branch WhatsApp and email contact info are strictly confidential to authenticated administrators and are protected from public exposure.'}
          </p>
        </div>
      </div>

      {/* Branches List Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-stone-500 bg-white rounded-3xl border border-[#FED7AA]/60">
          <p className="font-semibold text-sm">Memuat data cabang...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {branches.map((b) => (
            <Card
              key={b.id}
              variant="default"
              padding="md"
              className={`border-2 transition-all space-y-4 ${
                b.is_active ? 'border-[#FED7AA]' : 'border-stone-200 bg-stone-50/50'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    b.is_active ? 'bg-[#FFEDD5] text-[#F37321]' : 'bg-stone-200 text-stone-500'
                  }`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-stone-900">
                      {b.branch_name}
                    </h3>
                    <p className="text-[11px] font-mono text-stone-400">
                      ID: {b.id.substring(0, 13)}...
                    </p>
                  </div>
                </div>

                {b.is_active ? (
                  <Badge variant="green" size="sm">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" />
                    {t.admin.activeStatus}
                  </Badge>
                ) : (
                  <Badge variant="rose" size="sm">
                    <XCircle className="w-3 h-3 text-rose-500 mr-1" />
                    {t.admin.inactiveStatus}
                  </Badge>
                )}
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                {/* WhatsApp */}
                <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#FED7AA]/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-500 text-[11px] font-medium">
                    <PhoneCall className="w-3.5 h-3.5 text-[#F37321]" />
                    <span>{t.admin.branchPhone}</span>
                  </div>
                  <p className="font-semibold text-stone-900 font-mono">
                    {b.admin_phone || (
                      <span className="text-stone-400 font-normal italic">
                        {t.admin.notConfigured}
                      </span>
                    )}
                  </p>
                </div>

                {/* Email */}
                <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#FED7AA]/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-500 text-[11px] font-medium">
                    <Mail className="w-3.5 h-3.5 text-[#F37321]" />
                    <span>{t.admin.branchEmail}</span>
                  </div>
                  <p className="font-semibold text-stone-900 truncate">
                    {b.admin_email || (
                      <span className="text-stone-400 font-normal italic">
                        {t.admin.notConfigured}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Edit Action Button */}
              <div className="pt-2 flex justify-end border-t border-[#FED7AA]/40">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(b)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5 text-[#EA580C]" />}
                >
                  {t.admin.editBranch}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      <Modal
        isOpen={Boolean(editingBranch)}
        onClose={() => setEditingBranch(null)}
        title={t.admin.editBranch}
        maxWidth="md"
      >
        {editingBranch && (
          <form onSubmit={handleSaveBranch} className="space-y-4">
            {saveError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {/* Branch Name */}
            <Input
              label={t.admin.branchName}
              bilingualSub={language === 'id' ? 'Branch Name' : 'Nama Cabang'}
              value={editingBranch.branch_name}
              onChange={(e) =>
                setEditingBranch({ ...editingBranch, branch_name: e.target.value })
              }
              required
            />

            {/* WhatsApp */}
            <Input
              label={t.admin.branchPhone}
              bilingualSub={language === 'id' ? 'Admin WhatsApp' : 'WhatsApp'}
              placeholder="Contoh: 081289001234"
              value={editingBranch.admin_phone || ''}
              onChange={(e) =>
                setEditingBranch({ ...editingBranch, admin_phone: e.target.value })
              }
              helperText={
                language === 'id'
                  ? 'Kosongkan jika belum ada kontak resmi.'
                  : 'Leave blank if not yet available.'
              }
            />

            {/* Email */}
            <Input
              label={t.admin.branchEmail}
              bilingualSub={language === 'id' ? 'Admin Email' : 'Email'}
              type="email"
              placeholder="admin.cawang@kidea.sch.id"
              value={editingBranch.admin_email || ''}
              onChange={(e) =>
                setEditingBranch({ ...editingBranch, admin_email: e.target.value })
              }
              helperText={
                language === 'id'
                  ? 'Kosongkan jika belum ada email resmi.'
                  : 'Leave blank if not yet available.'
              }
            />

            {/* Active Status Toggle */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-stone-700 tracking-wide mb-1.5">
                {t.admin.branchStatus}
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-2xl border border-[#FED7AA] bg-white flex-1 hover:bg-[#FFF5EA]">
                  <input
                    type="radio"
                    name="is_active"
                    checked={editingBranch.is_active}
                    onChange={() => setEditingBranch({ ...editingBranch, is_active: true })}
                    className="text-[#F37321] focus:ring-[#F37321]"
                  />
                  <span className="text-xs font-bold text-stone-800">
                    {t.admin.activeStatus}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-2xl border border-stone-200 bg-white flex-1 hover:bg-stone-50">
                  <input
                    type="radio"
                    name="is_active"
                    checked={!editingBranch.is_active}
                    onChange={() => setEditingBranch({ ...editingBranch, is_active: false })}
                    className="text-stone-600 focus:ring-stone-400"
                  />
                  <span className="text-xs font-semibold text-stone-600">
                    {t.admin.inactiveStatus}
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#FED7AA] flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setEditingBranch(null)}
              >
                {t.admin.cancel}
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {t.admin.saveChanges}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
