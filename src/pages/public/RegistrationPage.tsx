import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MapPin,
  User,
  Users,
  GraduationCap,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import {
  CLASS_CATEGORIES,
  CLASS_SESSIONS_MAP,
  RELIGION_OPTIONS,
  GENDER_OPTIONS,
  ClassCategory,
  calculateAge
} from '../../constants/classSessions';
import { fetchPublicBranches } from '../../services/branchService';
import { createVisitor } from '../../services/visitorService';
import { triggerRegistrationEmailNotification } from '../../services/emailService';
import { useLanguage } from '../../hooks/useLanguage';
import { VisitorRecord, PublicBranch } from '../../types';

const registrationSchema = z.object({
  branch_id: z.string().min(1, 'Silakan pilih cabang sekolah terlebih dahulu / Please select a school branch'),
  branch_name: z.string().optional(),
  childName: z.string().min(2, 'Nama murid harus diisi / Child name is required'),
  gender: z.string().min(1, 'Pilih jenis kelamin / Select gender'),
  placeOfBirth: z.string().min(2, 'Tempat lahir harus diisi / Place of birth is required'),
  dateOfBirth: z.string().min(1, 'Tanggal lahir harus diisi / Date of birth is required'),
  age: z.string().min(1, 'Usia anak tidak valid / Invalid child age'),
  religion: z.string().min(1, 'Pilih agama / Select religion'),
  address: z.string().min(5, 'Alamat harus diisi / Address is required'),
  fatherName: z.string().min(2, 'Nama ayah harus diisi / Father name is required'),
  motherName: z.string().min(2, 'Nama ibu harus diisi / Mother name is required'),
  phone: z.string().min(9, 'Nomor WhatsApp tidak valid / Valid WhatsApp number is required'),
  email: z.string().email('Format email tidak valid / Invalid email format'),
  classCategory: z.enum([
    'Mom & I Bright Baby',
    'Toddler',
    'Playgroup',
    'Preschool',
    'K1',
    'K2',
  ]),
  schoolSession: z.string().min(1, 'Pilih sesi sekolah / School session is required'),
  trialDate: z.string().min(1, 'Pilih tanggal trial class / Trial date is required'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const todayStr = new Date().toISOString().split('T')[0];

  const [branches, setBranches] = useState<PublicBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(true);
  const [branchError, setBranchError] = useState<string>('');
  const [submissionSuccess, setSubmissionSuccess] = useState<VisitorRecord | null>(null);
  const [duplicateError, setDuplicateError] = useState<string>('');

  const loadBranches = async () => {
    setLoadingBranches(true);
    setBranchError('');
    try {
      const data = await fetchPublicBranches();
      if (data && data.length > 0) {
        setBranches(data);
      } else {
        setBranchError(
          language === 'id'
            ? 'Tidak dapat memuat daftar cabang dari database.'
            : 'Could not load branch list from database.'
        );
      }
    } catch {
      setBranchError(
        language === 'id'
          ? 'Gagal memuat cabang sekolah dari database.'
          : 'Failed to load school branches from database.'
      );
    } finally {
      setLoadingBranches(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      branch_id: '',
      branch_name: '',
      childName: '',
      gender: '',
      placeOfBirth: '',
      dateOfBirth: '',
      age: '',
      religion: '',
      address: '',
      fatherName: '',
      motherName: '',
      phone: '',
      email: '',
      classCategory: 'Toddler',
      schoolSession: CLASS_SESSIONS_MAP['Toddler'][0],
      trialDate: '',
    },
  });

  const selectedBranchId = watch('branch_id');
  const selectedCategory = watch('classCategory') as ClassCategory;
  const selectedDob = watch('dateOfBirth');
  const calculatedAge = watch('age');

  // Load available active branches from public.active_branches
  useEffect(() => {
    loadBranches();
  }, []);

  // Automatically calculate age when Date of Birth changes
  useEffect(() => {
    if (selectedDob) {
      const ageStr = calculateAge(selectedDob, language);
      setValue('age', ageStr, { shouldValidate: true });
    }
  }, [selectedDob, language, setValue]);

  // Automatically update school sessions when class category changes
  useEffect(() => {
    if (selectedCategory) {
      const availableSessions = CLASS_SESSIONS_MAP[selectedCategory];
      if (availableSessions && availableSessions.length > 0) {
        setValue('schoolSession', availableSessions[0], { shouldValidate: true });
      }
    }
  }, [selectedCategory, setValue]);

  const onSubmit = async (data: RegistrationFormData) => {
    setDuplicateError('');

    // Ensure branch_name is populated
    const branchMatch = branches.find((b) => b.id === data.branch_id);
    const payload = {
      ...data,
      branch_name: branchMatch?.branch_name || data.branch_name,
    };

    const result = await createVisitor(payload);

    if (!result.success) {
      setDuplicateError(result.error || 'Terjadi kesalahan saat pendaftaran.');
      return;
    }

    if (result.data) {
      setSubmissionSuccess(result.data);

      // Trigger automatic email notifications in the background:
      // 1. Send notification to branch admin email (branches.admin_email)
      // 2. Send confirmation to visitor email (if provided)
      // Failed email sending will never interrupt or invalidate visitor registration
      triggerRegistrationEmailNotification(result.data).catch((err) => {
        console.warn('Background email notification trigger error:', err);
      });
    }
  };

  const handleResetForm = () => {
    reset();
    setSubmissionSuccess(null);
    setDuplicateError('');
  };

  const isFixedSession = selectedCategory === 'K1' || selectedCategory === 'K2';
  const availableSessions = CLASS_SESSIONS_MAP[selectedCategory] || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-[#EA580C] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'id' ? 'Kembali ke Beranda' : 'Back to Home'}</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900">
          {t.register.title}
        </h1>
        <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
          {t.register.subtitle}
        </p>
      </div>

      {/* Duplicate Error Banner */}
      {duplicateError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{language === 'id' ? 'Pendaftaran Duplikat' : 'Duplicate Submission'}</p>
            <p className="mt-0.5">{duplicateError}</p>
          </div>
        </div>
      )}

      {/* FORM CARD */}
      <Card variant="warm" padding="lg" className="border-2 border-[#FED7AA] shadow-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* ========================================================= */}
          {/* 1. BRANCH SELECTION (APPEARS AT THE VERY TOP OF THE FORM) */}
          {/* ========================================================= */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-stone-900 font-display font-bold text-base pb-2 border-b border-[#FED7AA]">
              <MapPin className="w-5 h-5 text-[#F37321]" />
              <span>{t.register.secBranch}</span>
              <span className="text-rose-500">*</span>
            </div>

            <p className="text-xs text-stone-600">
              {language === 'id'
                ? 'Silakan tentukan cabang TK Kidea yang akan Anda kunjungi:'
                : 'Please select which TK Kidea branch you wish to visit:'}
            </p>

            {loadingBranches ? (
              <div className="p-6 text-center text-xs text-stone-500 bg-white/70 rounded-2xl border border-[#FED7AA]/50 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
                <span>{language === 'id' ? 'Memuat daftar cabang sekolah dari database...' : 'Loading school branches from database...'}</span>
              </div>
            ) : branchError ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{branchError}</span>
                </div>
                <button
                  type="button"
                  onClick={loadBranches}
                  className="px-3 py-1 bg-white text-rose-700 font-bold rounded-lg border border-rose-300 hover:bg-rose-50 cursor-pointer"
                >
                  {language === 'id' ? 'Coba Lagi' : 'Retry'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {branches.map((b) => {
                  const isSelected = selectedBranchId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setValue('branch_id', b.id, { shouldValidate: true });
                        setValue('branch_name', b.branch_name);
                      }}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${isSelected
                        ? 'bg-[#FFEDD5] border-[#F37321] ring-2 ring-[#F37321]/30 shadow-xs'
                        : 'bg-white border-[#FED7AA]/70 hover:border-[#F37321] hover:bg-[#FFF5EA]'
                        }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#F37321] text-white shadow-xs' : 'bg-[#FFF5EA] text-[#F37321]'
                        }`}>
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-bold block truncate ${isSelected ? 'text-[#9A3412]' : 'text-stone-800'
                          }`}>
                          {b.branch_name}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="inline-block w-3 h-3 rounded-full bg-[#F37321] shrink-0 ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {errors.branch_id && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.branch_id.message}</span>
              </p>
            )}
          </div>

          {/* A. CHILD INFORMATION */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-stone-900 font-display font-bold text-base pb-2 border-b border-[#FED7AA]">
              <User className="w-5 h-5 text-[#F37321]" />
              <span>{t.register.secChild}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t.register.childName}
                bilingualSub={language === 'id' ? 'Child Full Name' : 'Nama Murid'}
                placeholder="Contoh: Kenzo Alfarizi"
                required
                error={errors.childName?.message}
                {...register('childName')}
              />

              <Select
                label={t.register.gender}
                bilingualSub={language === 'id' ? 'Gender' : 'Jenis Kelamin'}
                required
                error={errors.gender?.message}
                {...register('gender')}
              >
                <option value="">-- {t.register.selectGender} --</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {language === 'id' ? g.labelId : g.labelEn}
                  </option>
                ))}
              </Select>

              <Input
                label={t.register.placeOfBirth}
                bilingualSub={language === 'id' ? 'Place of Birth' : 'Tempat Lahir'}
                placeholder="Contoh: Jakarta"
                required
                error={errors.placeOfBirth?.message}
                {...register('placeOfBirth')}
              />

              <Input
                label={t.register.dateOfBirth}
                bilingualSub={language === 'id' ? 'Date of Birth' : 'Tanggal Lahir'}
                type="date"
                max={todayStr}
                required
                error={errors.dateOfBirth?.message}
                {...register('dateOfBirth')}
              />

              {/* Automatically calculated Age */}
              <Input
                label={t.register.age}
                bilingualSub={language === 'id' ? 'Age (Calculated)' : 'Usia Terhitung'}
                placeholder={language === 'id' ? 'Otomatis dari tanggal lahir' : 'Calculated automatically'}
                value={calculatedAge}
                readOnly
                className="bg-[#FFF5EA] font-semibold text-[#9A3412] cursor-not-allowed border-[#FED7AA]"
                error={errors.age?.message}
              />

              <Select
                label={t.register.religion}
                bilingualSub={language === 'id' ? 'Religion' : 'Agama'}
                required
                error={errors.religion?.message}
                {...register('religion')}
              >
                <option value="">-- {t.register.selectReligion} --</option>
                {RELIGION_OPTIONS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 tracking-wide mb-1.5">
                <span>{t.register.address}</span>
                <span className="text-stone-400 font-normal ml-1">
                  / {language === 'id' ? 'Residential Address' : 'Alamat'}
                </span>
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Jl. Graha Raya Bintaro Blok C No. 5, Tangerang Selatan"
                className={`w-full rounded-2xl border bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F37321]/30 focus:border-[#F37321] ${errors.address ? 'border-rose-400 bg-rose-50/20' : 'border-[#FED7AA]'
                  }`}
                {...register('address')}
              />
              {errors.address && (
                <p className="text-xs text-rose-600 font-medium mt-1">{errors.address.message}</p>
              )}
            </div>
          </div>

          {/* B. PARENT INFORMATION */}
          <div className="space-y-4 pt-4 border-t border-[#FED7AA]">
            <div className="flex items-center gap-2 text-stone-900 font-display font-bold text-base pb-2 border-b border-[#FED7AA]">
              <Users className="w-5 h-5 text-[#F37321]" />
              <span>{t.register.secParent}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t.register.fatherName}
                bilingualSub={language === 'id' ? "Father's Name" : 'Nama Ayah'}
                placeholder="Contoh: Ayah Dimas Alfarizi"
                required
                error={errors.fatherName?.message}
                {...register('fatherName')}
              />

              <Input
                label={t.register.motherName}
                bilingualSub={language === 'id' ? "Mother's Name" : 'Nama Ibu'}
                placeholder="Contoh: Bunda Sarah Amelia"
                required
                error={errors.motherName?.message}
                {...register('motherName')}
              />

              <Input
                label={t.register.phone}
                bilingualSub={language === 'id' ? 'WhatsApp Number' : 'No. WhatsApp'}
                placeholder="0812xxxxxxxx"
                required
                error={errors.phone?.message}
                {...register('phone')}
              />

              <Input
                label={t.register.email}
                bilingualSub={language === 'id' ? 'Email Address' : 'Email'}
                type="email"
                placeholder="sarah.amelia@gmail.com"
                required
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
          </div>

          {/* C. CLASS CATEGORY & D. SCHOOL SESSION */}
          <div className="space-y-4 pt-4 border-t border-[#FED7AA]">
            <div className="flex items-center gap-2 text-stone-900 font-display font-bold text-base pb-2 border-b border-[#FED7AA]">
              <GraduationCap className="w-5 h-5 text-[#F59E0B]" />
              <span>{t.register.secClass} &amp; {t.register.secSession}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              {/* Category Picker */}
              <div>
                <Select
                  label={t.register.secClass}
                  bilingualSub={language === 'id' ? 'Class Category' : 'Kategori Kelas'}
                  required
                  error={errors.classCategory?.message}
                  {...register('classCategory')}
                >
                  {CLASS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>

              {/* School Session (Dynamic based on Category) */}
              <div>
                {isFixedSession ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-stone-700 tracking-wide">
                      <span>{t.register.secSession}</span>
                      <span className="text-stone-400 font-normal ml-1">
                        / {language === 'id' ? 'School Session' : 'Sesi Sekolah'}
                      </span>
                    </label>
                    <div className="p-3 rounded-2xl bg-[#FFEDD5] border border-[#FED7AA] text-xs">
                      <p className="font-bold text-[#9A3412] text-sm">{availableSessions[0]}</p>
                      <p className="text-[#C2410C] text-[11px] mt-0.5">
                        {language === 'id' ? 'Jadwal tunggal tetap (tidak perlu memilih sesi).' : 'Fixed schedule (no session selection required).'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Select
                    label={t.register.secSession}
                    bilingualSub={language === 'id' ? 'School Session' : 'Sesi Sekolah'}
                    required
                    error={errors.schoolSession?.message}
                    {...register('schoolSession')}
                  >
                    {availableSessions.map((ses) => (
                      <option key={ses} value={ses}>
                        {ses}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* E. TRIAL CLASS SCHEDULE */}
          <div className="space-y-4 pt-4 border-t border-[#FED7AA]">
            <div className="flex items-center gap-2 text-stone-900 font-display font-bold text-base pb-2 border-b border-[#FED7AA]">
              <Calendar className="w-5 h-5 text-[#F37321]" />
              <span>{t.register.secTrial}</span>
            </div>

            <div className="max-w-md">
              <Input
                label={t.register.trialDate}
                bilingualSub={language === 'id' ? 'Trial Class Date' : 'Tanggal Trial'}
                type="date"
                min={todayStr}
                required
                error={errors.trialDate?.message}
                helperText={language === 'id' ? 'Pilih tanggal kunjungan / trial class (hari kerja)' : 'Select trial class date (weekdays)'}
                {...register('trialDate')}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[#FED7AA] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-stone-500">
              {language === 'id'
                ? '* Seluruh data di atas diperlukan untuk konfirmasi Trial Class.'
                : '* All fields above are required for Trial Class confirmation.'}
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full sm:w-auto shadow-md shadow-orange-500/20"
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
            >
              {isSubmitting ? t.register.submitting : t.register.submitBtn}
            </Button>
          </div>
        </form>
      </Card>

      {/* SIMPLE SUCCESS CONFIRMATION MODAL WITH SELECTED BRANCH DISPLAYED */}
      {submissionSuccess && (
        <Modal
          isOpen={Boolean(submissionSuccess)}
          onClose={() => setSubmissionSuccess(null)}
          title={t.register.successTitle}
          maxWidth="md"
        >
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-[#FFEDD5] text-[#9A3412] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-[#F37321]" />
            </div>

            <div className="space-y-1">
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {t.register.successDesc}
              </p>
            </div>

            {/* Simple Summary Box */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#FED7AA] text-left text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-[#FED7AA]/60">
                <span className="text-stone-500">{language === 'id' ? 'Cabang Sekolah' : 'School Branch'}:</span>
                <span className="font-bold text-[#EA580C]">{submissionSuccess.branch_name || 'TK Kidea'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FED7AA]/60">
                <span className="text-stone-500">{language === 'id' ? 'Nama Murid' : 'Child Name'}:</span>
                <span className="font-bold text-stone-900">{submissionSuccess.childName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FED7AA]/60">
                <span className="text-stone-500">{language === 'id' ? 'Kategori Kelas' : 'Class Category'}:</span>
                <span className="font-bold text-[#EA580C]">{submissionSuccess.classCategory}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FED7AA]/60">
                <span className="text-stone-500">{language === 'id' ? 'Sesi Sekolah' : 'School Session'}:</span>
                <span className="font-bold text-stone-900">{submissionSuccess.schoolSession}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FED7AA]/60">
                <span className="text-stone-500">{language === 'id' ? 'Tanggal Trial' : 'Trial Date'}:</span>
                <span className="font-bold text-stone-900">{submissionSuccess.trialDate}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-500">{language === 'id' ? 'No. WhatsApp' : 'WhatsApp'}:</span>
                <span className="font-bold text-stone-900">{submissionSuccess.phone}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleResetForm}
                className="w-full sm:w-1/2 justify-center"
              >
                {t.register.registerAnother}
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setSubmissionSuccess(null);
                  navigate('/');
                }}
                className="w-full sm:w-1/2 justify-center"
              >
                {t.register.backHome}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
