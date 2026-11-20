import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function ensureServerEnv() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)) {
    return;
  }
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {
    // Ignore file read errors in serverless environments
  }
}

const VALID_CATEGORIES = [
  'Mom & I Bright Baby',
  'Toddler',
  'Playgroup',
  'Preschool',
  'K1',
  'K2',
];

const VALID_SESSIONS: Record<string, string[]> = {
  'Mom & I Bright Baby': ['09:00 - 10:00', '10:15 - 11:15'],
  'Toddler': ['08:00 - 10:00', '10:15 - 12:15'],
  'Playgroup': ['08:00 - 10:00', '10:15 - 12:15'],
  'Preschool': ['08:00 - 10:00', '10:15 - 12:15'],
  'K1': [],
  'K2': [],
};

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    if (res.setHeader) res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
      }
    }

    const {
      branch_id,
      child_name,
      gender,
      birth_place,
      birth_date,
      religion,
      address,
      father_name,
      mother_name,
      phone_number,
      email,
      class_category,
      school_session,
      trial_date,
    } = body || {};

    // 1. Validation of required fields
    if (!branch_id || typeof branch_id !== 'string') {
      return res.status(400).json({ success: false, error: 'Pilih cabang sekolah / Branch selection is required.' });
    }
    if (!child_name || typeof child_name !== 'string' || !child_name.trim()) {
      return res.status(400).json({ success: false, error: 'Nama murid harus diisi / Child name is required.' });
    }
    if (!gender || (gender !== 'Male' && gender !== 'Female')) {
      return res.status(400).json({ success: false, error: 'Pilih jenis kelamin / Gender is required.' });
    }
    if (!birth_place || !birth_place.trim()) {
      return res.status(400).json({ success: false, error: 'Tempat lahir harus diisi / Place of birth is required.' });
    }
    if (!birth_date) {
      return res.status(400).json({ success: false, error: 'Tanggal lahir harus diisi / Birth date is required.' });
    }
    if (!religion || !religion.trim()) {
      return res.status(400).json({ success: false, error: 'Agama harus dipilih / Religion is required.' });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, error: 'Alamat tempat tinggal harus diisi / Address is required.' });
    }
    if (!father_name || !father_name.trim()) {
      return res.status(400).json({ success: false, error: 'Nama ayah harus diisi / Father name is required.' });
    }
    if (!mother_name || !mother_name.trim()) {
      return res.status(400).json({ success: false, error: 'Nama ibu harus diisi / Mother name is required.' });
    }
    if (!phone_number || !phone_number.trim()) {
      return res.status(400).json({ success: false, error: 'Nomor telepon / WhatsApp harus diisi / Phone number is required.' });
    }
    if (!class_category || !VALID_CATEGORIES.includes(class_category)) {
      return res.status(400).json({ success: false, error: 'Kategori kelas tidak valid / Invalid class category.' });
    }
    if (!trial_date) {
      return res.status(400).json({ success: false, error: 'Tanggal trial class harus diisi / Trial date is required.' });
    }

    // Email validation (optional)
    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim() : null;
    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Format email tidak valid / Invalid email format.' });
    }

    // Session validation: for K1 and K2, must be NULL
    let cleanSession: string | null = null;
    if (class_category === 'K1' || class_category === 'K2') {
      cleanSession = null;
    } else {
      const allowed = VALID_SESSIONS[class_category] || [];
      // Clean up session string if it has "Session X: " prefix
      const normalizedSession = (school_session || '').replace(/^Session \d+:\s*/i, '').trim();
      if (allowed.includes(normalizedSession)) {
        cleanSession = normalizedSession;
      } else if (allowed.includes(school_session)) {
        cleanSession = school_session;
      } else if (allowed.length > 0) {
        cleanSession = allowed[0];
      }
    }

    // 2. Connect via server-side Supabase client
    ensureServerEnv();
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const cleanUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!cleanUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: 'Konfigurasi database server belum lengkap / Server database configuration is missing.',
      });
    }

    const supabaseAdmin = createClient(cleanUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 3. Verify Branch existence
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id, branch_name, admin_email, is_active')
      .eq('id', branch_id)
      .single();

    if (branchError || !branch) {
      return res.status(400).json({
        success: false,
        error: 'Cabang sekolah yang dipilih tidak ditemukan / Selected school branch not found.',
      });
    }

    if (!branch.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Cabang sekolah ini sedang tidak aktif menerima pendaftaran.',
      });
    }

    // 4. Duplicate registration check (same child name and phone number)
    const normalizedChild = child_name.trim().toLowerCase();
    const cleanPhone = phone_number.replace(/[^0-9]/g, '');

    const { data: existingVisitors } = await supabaseAdmin
      .from('visitors')
      .select('id, child_name, phone_number')
      .ilike('child_name', normalizedChild)
      .eq('phone_number', phone_number.trim())
      .limit(1);

    if (existingVisitors && existingVisitors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Data calon murid ini dengan nomor telepon tersebut sudah pernah didaftarkan. / A registration with this child name and phone number already exists.',
      });
    }

    // 5. Insert into public.visitors
    const newVisitorRow = {
      branch_id,
      child_name: child_name.trim(),
      gender,
      birth_place: birth_place.trim(),
      birth_date,
      religion: religion.trim(),
      address: address.trim(),
      father_name: father_name.trim(),
      mother_name: mother_name.trim(),
      phone_number: phone_number.trim(),
      email: cleanEmail,
      class_category,
      school_session: cleanSession,
      trial_date,
      trial_status: 'pending',
      admin_email_status: 'pending',
      visitor_email_status: cleanEmail ? 'pending' : 'skipped',
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('visitors')
      .insert([newVisitorRow])
      .select('*, branches(branch_name)')
      .single();

    if (insertError || !inserted) {
      console.error('Visitor insert error:', insertError);
      return res.status(500).json({
        success: false,
        error: insertError?.message || 'Gagal menyimpan data pendaftaran ke database.',
      });
    }

    // 6. Return success response
    return res.status(201).json({
      success: true,
      data: inserted,
      message: 'Pendaftaran calon murid berhasil disimpan ke database.',
    });
  } catch (err: any) {
    console.error('Unhandled register error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Terjadi kesalahan internal pada server pendaftaran.',
    });
  }
}
