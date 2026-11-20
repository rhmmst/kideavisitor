import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

function ensureServerEnv() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.RESEND_API_KEY) {
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Regex for strict email validation and header injection prevention
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  // Disallow CRLF, carriage returns, commas, semicolons, and control characters to prevent header injection
  if (/[\r\n\t%,;<>\\"]/.test(trimmed)) return false;
  return EMAIL_REGEX.test(trimmed);
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '-';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeVisitor(v: any) {
  if (!v) return {};
  const childName = v.child_name || v.childName || '';
  const gender = v.gender || '';
  const placeOfBirth = v.birth_place || v.placeOfBirth || '';
  const dateOfBirth = v.birth_date || v.dateOfBirth || '';
  const religion = v.religion || '';
  const address = v.address || '';
  const fatherName = v.father_name || v.fatherName || '';
  const motherName = v.mother_name || v.motherName || '';
  const phone = v.phone_number || v.phone || '';
  const email = v.email || '';
  const classCategory = v.class_category || v.classCategory || '';
  const schoolSession =
    v.school_session ||
    v.schoolSession ||
    (classCategory === 'K1' ? '08:00 - 11:45' : classCategory === 'K2' ? '08:00 - 12:00' : '-');
  const rawTrialDate = v.trial_date || v.trialDate || '';
  const trialDate =
    !rawTrialDate || rawTrialDate === '2099-12-31'
      ? 'To Be Scheduled / Menunggu Konfirmasi'
      : rawTrialDate;
  const created_at = v.created_at || new Date().toISOString();

  let age = v.age || '';
  if (!age && dateOfBirth) {
    const birth = new Date(dateOfBirth);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    age = `${years} Tahun ${months} Bulan`;
  }

  return {
    ...v,
    childName,
    gender,
    placeOfBirth,
    dateOfBirth,
    age,
    religion,
    address,
    fatherName,
    motherName,
    phone,
    email,
    classCategory,
    schoolSession,
    trialDate,
    created_at,
  };
}

/**
 * Builds professional branded HTML email for Branch Admin
 */
function buildAdminEmailHtml(visitor: any, branchName: string): string {
  const formattedDate = visitor.created_at
    ? new Date(visitor.created_at).toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    })
    : new Date().toLocaleString('id-ID');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Visitor Registration - TK Kidea ${escapeHtml(branchName)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #292524;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F6F0; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #FED7AA;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #F37321 0%, #EA580C 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px;">TK KIDEA</div>
              <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; opacity: 0.95;">Visitor Management System</div>
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 20px; margin-top: 14px; font-size: 13px; font-weight: 700;">
                Cabang: ${escapeHtml(branchName)}
              </div>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 24px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #9A3412; margin-top: 0; margin-bottom: 8px;">
                Pendaftaran Calon Murid Baru
              </h2>
              <p style="font-size: 13px; color: #57534E; margin-top: 0; margin-bottom: 20px; line-height: 1.5;">
                Terdapat pendaftaran kunjungan &amp; Trial Class baru yang masuk untuk cabang <strong>${escapeHtml(branchName)}</strong>. Berikut rincian lengkap calon peserta didik:
              </p>

              <!-- Child Information -->
              <table width="100%" style="background-color: #FFFDF9; border: 1px solid #FED7AA; border-radius: 12px; margin-bottom: 16px; border-collapse: collapse;">
                <tr>
                  <td colspan="2" style="background-color: #FFEDD5; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #9A3412; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 11px 11px 0 0;">
                    A. INFORMASI CALON MURID
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C; width: 38%; border-bottom: 1px solid #FED7AA;">Nama Murid</td>
                  <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #1C1917; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.childName)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C; border-bottom: 1px solid #FED7AA;">Jenis Kelamin</td>
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #1C1917; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.gender)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C; border-bottom: 1px solid #FED7AA;">Tempat, Tgl Lahir</td>
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #1C1917; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.placeOfBirth)}, ${escapeHtml(visitor.dateOfBirth)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C; border-bottom: 1px solid #FED7AA;">Usia &amp; Agama</td>
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #1C1917; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.age)} • ${escapeHtml(visitor.religion)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C;">Alamat Tinggal</td>
                  <td style="padding: 10px 14px; font-size: 12px; color: #1C1917;">${escapeHtml(visitor.address)}</td>
                </tr>
              </table>

              <!-- Parent Information -->
              <table width="100%" style="background-color: #FFFDF9; border: 1px solid #FED7AA; border-radius: 12px; margin-bottom: 16px; border-collapse: collapse;">
                <tr>
                  <td colspan="2" style="background-color: #FFEDD5; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #9A3412; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 11px 11px 0 0;">
                    B. INFORMASI ORANG TUA
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C; width: 38%; border-bottom: 1px solid #FED7AA;">Nama Ayah</td>
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #1C1917; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.fatherName)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C; border-bottom: 1px solid #FED7AA;">Nama Ibu</td>
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #1C1917; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.motherName)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C; border-bottom: 1px solid #FED7AA;">No. WhatsApp</td>
                  <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #EA580C; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.phone)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C;">Email Orang Tua</td>
                  <td style="padding: 10px 14px; font-size: 12px; color: #1C1917;">${escapeHtml(visitor.email) || '-'}</td>
                </tr>
              </table>

              <!-- Class Information -->
              <table width="100%" style="background-color: #FFFDF9; border: 1px solid #FED7AA; border-radius: 12px; margin-bottom: 24px; border-collapse: collapse;">
                <tr>
                  <td colspan="2" style="background-color: #FFEDD5; padding: 10px 14px; font-size: 12px; font-weight: 800; color: #9A3412; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 11px 11px 0 0;">
                    C. KELAS &amp; JADWAL TRIAL
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C; width: 38%; border-bottom: 1px solid #FED7AA;">Kategori Kelas</td>
                  <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #EA580C; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.classCategory)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C; border-bottom: 1px solid #FED7AA;">Sesi Sekolah</td>
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #1C1917; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.schoolSession)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C; border-bottom: 1px solid #FED7AA;">Tanggal Trial Class</td>
                  <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #16A34A; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.trialDate)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #78716C;">Waktu Registrasi</td>
                  <td style="padding: 10px 14px; font-size: 12px; color: #57534E;">${escapeHtml(formattedDate)}</td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #78716C; text-align: center; margin: 0;">
                Harap segera menghubungi orang tua calon murid untuk konfirmasi ketersediaan slot kelas.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #FFF9F2; border-top: 1px solid #FED7AA; padding: 18px 24px; text-align: center; font-size: 11px; color: #A8A29E;">
              © 2026 TK Kidea (Preschool &amp; Kindergarten) • Visitor Management System
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds professional branded HTML email for Visitor Confirmation
 */
function buildVisitorEmailHtml(visitor: any, branchName: string): string {
  const parentSalutation =
    visitor.fatherName || visitor.motherName || 'Parents of ' + visitor.childName;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmation - TK Kidea</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #292524;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F6F0; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #FED7AA;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #F37321 0%, #EA580C 100%); padding: 36px 24px; text-align: center; color: #ffffff;">
              <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px;">TK KIDEA</div>
              <div style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; opacity: 0.95;">
                Preschool &amp; Kindergarten
              </div>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="font-size: 15px; font-weight: 700; color: #1C1917; margin-top: 0; margin-bottom: 12px;">
                Dear Mr./Mrs. ${escapeHtml(parentSalutation)},
              </p>
              <p style="font-size: 14px; color: #44403C; line-height: 1.6; margin-top: 0; margin-bottom: 14px;">
                Thank you for registering your child at <strong>TK Kidea</strong>.
              </p>
              <p style="font-size: 14px; color: #44403C; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
                Your registration has been successfully received. Below are your registration details:
              </p>

              <!-- Registration Details Box -->
              <table width="100%" style="background-color: #FFFDF9; border: 1px solid #FED7AA; border-radius: 14px; margin-bottom: 24px; border-collapse: collapse; overflow: hidden;">
                <tr>
                  <td colspan="2" style="background-color: #FFEDD5; padding: 12px 16px; font-size: 12px; font-weight: 800; color: #9A3412; text-transform: uppercase; letter-spacing: 0.5px;">
                    REGISTRATION DETAILS
                  </td>
                </tr>
                <tr>
                  <td style="padding: 11px 16px; font-size: 13px; color: #78716C; width: 40%; border-bottom: 1px solid #FED7AA;">Child Name</td>
                  <td style="padding: 11px 16px; font-size: 13px; font-weight: 700; color: #1C1917; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.childName)}</td>
                </tr>
                <tr>
                  <td style="padding: 11px 16px; font-size: 13px; color: #78716C; border-bottom: 1px solid #FED7AA;">Branch</td>
                  <td style="padding: 11px 16px; font-size: 13px; font-weight: 700; color: #EA580C; border-bottom: 1px solid #FED7AA;">${escapeHtml(branchName)}</td>
                </tr>
                <tr>
                  <td style="padding: 11px 16px; font-size: 13px; color: #78716C; border-bottom: 1px solid #FED7AA;">Class Category</td>
                  <td style="padding: 11px 16px; font-size: 13px; font-weight: 600; color: #1C1917; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.classCategory)}</td>
                </tr>
                <tr>
                  <td style="padding: 11px 16px; font-size: 13px; color: #78716C; border-bottom: 1px solid #FED7AA;">School Session</td>
                  <td style="padding: 11px 16px; font-size: 13px; font-weight: 600; color: #1C1917; border-bottom: 1px solid #FED7AA;">${escapeHtml(visitor.schoolSession)}</td>
                </tr>
                <tr>
                  <td style="padding: 11px 16px; font-size: 13px; color: #78716C;">Trial Class Date</td>
                  <td style="padding: 11px 16px; font-size: 13px; font-weight: 700; color: #16A34A;">${escapeHtml(visitor.trialDate)}</td>
                </tr>
              </table>

              <p style="font-size: 14px; color: #44403C; line-height: 1.6; margin-bottom: 24px;">
                We look forward to welcoming you and your child to TK Kidea. Our admissions team will contact you shortly to coordinate the trial session preparations.
              </p>

              <div style="font-size: 13px; color: #57534E; line-height: 1.5; border-top: 1px solid #FED7AA; margin-top: 24px; padding-top: 18px;">
                Best regards,<br>
                <strong style="color: #9A3412;">TK Kidea Admissions Team</strong><br>
                <span>${escapeHtml(branchName)}</span>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #FFF9F2; border-top: 1px solid #FED7AA; padding: 18px 24px; text-align: center; font-size: 11px; color: #A8A29E;">
              © 2026 TK Kidea Preschool &amp; Kindergarten • All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Serverless API handler: /api/send-email
 */
export default async function handler(req: any, res: any) {
  // 1. Only allow POST
  if (req.method !== 'POST') {
    if (res.setHeader) res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.',
    });
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

    const { visitor_id, target = 'all', force = false } = body || {};

    if (!visitor_id || typeof visitor_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Parameter "visitor_id" is required and must be a string.',
      });
    }

    // 2. Initialize Supabase Server-side Admin Client
    ensureServerEnv();
    const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const cleanUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let visitor: any = null;
    let branch: any = null;
    let resolvedVisitorId = visitor_id;

    if (cleanUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(cleanUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Retrieve visitor record by UUID if valid UUID
      if (UUID_REGEX.test(visitor_id)) {
        const { data: visitorData } = await supabaseAdmin
          .from('visitors')
          .select('*')
          .eq('id', visitor_id)
          .maybeSingle();
        if (visitorData) {
          visitor = visitorData;
          resolvedVisitorId = visitorData.id;
        }
      }

      // If not found by UUID (e.g. inserted by anon without RETURNING id), look up by fallback_visitor fields
      if (!visitor && body.fallback_visitor) {
        const fb = normalizeVisitor(body.fallback_visitor);
        if (fb.child_name && fb.phone_number) {
          let query = supabaseAdmin
            .from('visitors')
            .select('*')
            .eq('child_name', fb.child_name)
            .eq('phone_number', fb.phone_number);
          if (fb.branch_id) {
            query = query.eq('branch_id', fb.branch_id);
          }
          const { data: matchedVisitor } = await query
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (matchedVisitor) {
            visitor = matchedVisitor;
            resolvedVisitorId = matchedVisitor.id;
          }
        }
      }

      if (!visitor) {
        if (body.fallback_visitor) {
          visitor = body.fallback_visitor;
        } else {
          return res.status(404).json({
            success: false,
            error: `Visitor record not found for id: ${visitor_id}`,
          });
        }
      }

      // Retrieve associated branch
      const targetBranchId = visitor.branch_id || body.fallback_visitor?.branch_id;
      if (targetBranchId) {
        const { data: branchData } = await supabaseAdmin
          .from('branches')
          .select('*')
          .eq('id', targetBranchId)
          .maybeSingle();

        branch = branchData;
      }
    } else {
      // Graceful fallback for local development if server-side Supabase credentials are not provided
      if (body.fallback_visitor) {
        visitor = body.fallback_visitor;
        branch = body.fallback_branch || {
          branch_name: visitor.branch_name || 'TK Kidea',
          admin_email: visitor.branch_admin_email || null,
        };
      } else {
        return res.status(500).json({
          success: false,
          error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured on the server.',
        });
      }
    }

    const normalizedVisitor = normalizeVisitor(visitor);
    const branchName = branch?.branch_name || normalizedVisitor.branch_name || 'TK Kidea';
    const branchAdminEmail = branch?.admin_email?.trim() || null;
    const visitorEmail = normalizedVisitor.email?.trim() || null;

    // 3. Initialize Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.NOTIFICATION_FROM_EMAIL || 'TK Kidea <onboarding@resend.dev>';

    // Prepare status updates
    const updates: {
      admin_email_status?: 'pending' | 'sent' | 'failed' | 'skipped';
      visitor_email_status?: 'pending' | 'sent' | 'failed' | 'skipped';
      admin_email_sent_at?: string | null;
      visitor_email_sent_at?: string | null;
      email_error?: string | null;
      admin_email_error?: string | null;
      visitor_email_error?: string | null;
    } = {};

    let adminErrorMsg: string | null = null;
    let visitorErrorMsg: string | null = null;
    const errorMessages: string[] = [];

    if (!resendApiKey) {
      const keyError = 'RESEND_API_KEY is not configured on the server.';
      if (target === 'all' || target === 'admin') updates.admin_email_status = 'failed';
      if (target === 'all' || target === 'visitor') updates.visitor_email_status = 'failed';
      updates.email_error = keyError;

      // Update Supabase if connected
      if (cleanUrl && supabaseServiceKey && UUID_REGEX.test(resolvedVisitorId)) {
        const supabaseAdmin = createClient(cleanUrl, supabaseServiceKey, {
          auth: { persistSession: false },
        });
        await supabaseAdmin
          .from('visitors')
          .update({
            admin_email_status: updates.admin_email_status,
            visitor_email_status: updates.visitor_email_status,
            admin_email_error: keyError,
            visitor_email_error: keyError,
          })
          .eq('id', resolvedVisitorId);
      }

      return res.status(200).json({
        success: false,
        warning: keyError,
        ...updates,
      });
    }

    const resend = new Resend(resendApiKey);

    // ==========================================
    // 4. Send Email to Branch Admin
    // ==========================================
    if (target === 'all' || target === 'admin') {
      const alreadySent = visitor.admin_email_status === 'sent';

      if (alreadySent && !force) {
        // Skip duplicate sending
        updates.admin_email_status = 'sent';
      } else if (!branchAdminEmail) {
        // Branch has no admin email configured
        updates.admin_email_status = 'skipped';
        errorMessages.push(`Branch admin email not configured for ${branchName}.`);
      } else if (!isValidEmail(branchAdminEmail)) {
        // Invalid email format detected
        updates.admin_email_status = 'failed';
        errorMessages.push(`Invalid branch admin email address: ${branchAdminEmail}`);
      } else {
        // Send email via Resend
        try {
          const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: branchAdminEmail,
            subject: `New Visitor Registration - TK Kidea ${branchName}`,
            html: buildAdminEmailHtml(normalizedVisitor, branchName),
          });

          if (error) {
            updates.admin_email_status = 'failed';
            adminErrorMsg = `Admin email error: ${error.message}`;
            errorMessages.push(adminErrorMsg);
          } else {
            updates.admin_email_status = 'sent';
            updates.admin_email_sent_at = new Date().toISOString();
          }
        } catch (err: any) {
          updates.admin_email_status = 'failed';
          adminErrorMsg = `Admin email exception: ${err?.message || err}`;
          errorMessages.push(adminErrorMsg);
        }
      }
    }

    // ==========================================
    // 5. Send Confirmation Email to Visitor
    // ==========================================
    if (target === 'all' || target === 'visitor') {
      const alreadySent = normalizedVisitor.visitor_email_status === 'sent';

      if (alreadySent && !force) {
        // Skip duplicate sending
        updates.visitor_email_status = 'sent';
      } else if (!visitorEmail) {
        // Visitor has no email provided
        updates.visitor_email_status = 'skipped';
      } else if (!isValidEmail(visitorEmail)) {
        // Invalid email format detected
        updates.visitor_email_status = 'failed';
        visitorErrorMsg = `Invalid visitor email address: ${visitorEmail}`;
        errorMessages.push(visitorErrorMsg);
      } else {
        // Send confirmation email via Resend
        try {
          const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: visitorEmail,
            subject: 'Registration Confirmation - TK Kidea',
            html: buildVisitorEmailHtml(normalizedVisitor, branchName),
          });

          if (error) {
            updates.visitor_email_status = 'failed';
            visitorErrorMsg = `Visitor email error: ${error.message}`;
            errorMessages.push(visitorErrorMsg);
          } else {
            updates.visitor_email_status = 'sent';
            updates.visitor_email_sent_at = new Date().toISOString();
          }
        } catch (err: any) {
          updates.visitor_email_status = 'failed';
          visitorErrorMsg = `Visitor email exception: ${err?.message || err}`;
          errorMessages.push(visitorErrorMsg);
        }
      }
    }

    // Compile combined error message if any
    if (errorMessages.length > 0) {
      updates.email_error = errorMessages.join(' | ');
    } else {
      updates.email_error = null;
    }

    // 6. Update database record in Supabase
    if (cleanUrl && supabaseServiceKey && UUID_REGEX.test(resolvedVisitorId)) {
      const supabaseAdmin = createClient(cleanUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });
      const dbUpdates: Record<string, any> = {};
      if (updates.admin_email_status !== undefined) dbUpdates.admin_email_status = updates.admin_email_status;
      if (updates.visitor_email_status !== undefined) dbUpdates.visitor_email_status = updates.visitor_email_status;
      if (updates.admin_email_sent_at !== undefined) dbUpdates.admin_email_sent_at = updates.admin_email_sent_at;
      if (updates.visitor_email_sent_at !== undefined) dbUpdates.visitor_email_sent_at = updates.visitor_email_sent_at;
      if (adminErrorMsg !== null) dbUpdates.admin_email_error = adminErrorMsg;
      if (visitorErrorMsg !== null) dbUpdates.visitor_email_error = visitorErrorMsg;

      await supabaseAdmin.from('visitors').update(dbUpdates).eq('id', resolvedVisitorId);
    }

    return res.status(200).json({
      success:
        updates.admin_email_status !== 'failed' && updates.visitor_email_status !== 'failed',
      visitor_id: resolvedVisitorId,
      admin_email: branchAdminEmail,
      visitor_email: visitorEmail,
      ...updates,
    });
  } catch (error: any) {
    console.error('Unhandled error in /api/send-email:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal Server Error while sending email notification.',
    });
  }
}
