import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { VisitorRecord } from '../types';
import { INITIAL_BRANCHES } from '../constants/branches';
import { calculateAge } from '../constants/classSessions';
import { getCurrentAdminProfile } from './authService';

function resolveBranchName(branchId?: string | null): string | undefined {
  if (!branchId) return undefined;
  const match = INITIAL_BRANCHES.find((b) => b.id === branchId);
  return match?.branch_name;
}

export function normalizeStatusToDb(status: string): 'pending' | 'confirmed' | 'completed' | 'cancelled' {
  const s = (status || '').toLowerCase();
  if (s === 'scheduled' || s === 'pending') return 'pending';
  if (s === 'attended' || s === 'completed') return 'completed';
  if (s === 'cancelled') return 'cancelled';
  if (s === 'confirmed' || s === 'rescheduled') return 'confirmed';
  return 'pending';
}

/**
 * Returns today's date in local timezone formatted as YYYY-MM-DD
 */
export function getLocalTodayDateStr(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Checks whether a visitor's trial status should automatically transition from 'confirmed' to 'completed'.
 * Rule: ONLY 'confirmed' status transitions to 'completed' when trialDate has passed (trialDate < today).
 */
export function shouldAutoCompleteTrial(status: string, trialDate?: string | null): boolean {
  if (!trialDate) return false;
  const normalized = normalizeStatusToDb(status);
  if (normalized !== 'confirmed') return false;
  const todayStr = getLocalTodayDateStr();
  return trialDate < todayStr;
}

/**
 * Converts a database visitor row to the frontend VisitorRecord format
 */
export function dbToVisitorRecord(v: any): VisitorRecord {
  const birthDate = v.birth_date || v.dateOfBirth || '';
  const calculatedAge = birthDate ? calculateAge(birthDate, 'en') : (v.age || '-');

  return {
    id: v.id,
    created_at: v.created_at || new Date().toISOString(),
    branch_id: v.branch_id,
    branch_name:
      v.branches?.branch_name ||
      v.branch_name ||
      resolveBranchName(v.branch_id) ||
      'TK Kidea',
    childName: v.child_name || v.childName || '',
    gender: v.gender || 'Male',
    placeOfBirth: v.birth_place || v.placeOfBirth || '',
    dateOfBirth: birthDate,
    age: calculatedAge,
    religion: v.religion || '',
    address: v.address || '',
    fatherName: v.father_name || v.fatherName || '',
    motherName: v.mother_name || v.motherName || '',
    phone: v.phone_number || v.phone || '',
    email: v.email || '',
    classCategory: v.class_category || v.classCategory || 'Toddler',
    schoolSession:
      v.school_session ||
      (v.class_category === 'K1'
        ? '08:00 - 11:45'
        : v.class_category === 'K2'
        ? '08:00 - 12:00'
        : v.schoolSession || '-'),
    trialDate: v.trial_date || v.trialDate || '',
    status: v.trial_status || v.status || 'pending',
    admin_email_status: v.admin_email_status || 'pending',
    visitor_email_status: v.visitor_email_status || (v.email ? 'pending' : 'skipped'),
    admin_email_sent_at: v.admin_email_sent_at || null,
    visitor_email_sent_at: v.visitor_email_sent_at || null,
    email_error: v.admin_email_error || v.visitor_email_error || v.email_error || null,
  };
}

/**
 * Retrieves visitor records from public.visitors joined with public.branches.
 * Enforces role-based authorization:
 * - Super Admin: retrieves all visitors across all branches.
 * - Branch Admin: strictly retrieves only visitors belonging to their assigned branch_id.
 */
export async function fetchVisitors(): Promise<VisitorRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const profile = await getCurrentAdminProfile();
      if (!profile) {
        return [];
      }

      let query = supabase
        .from('visitors')
        .select('*, branches(branch_name, admin_email, admin_phone)');

      // Enforce branch isolation for branch admins
      if (!profile.isSuperAdmin && profile.branchId) {
        query = query.eq('branch_id', profile.branchId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        const autoCompleteIds: string[] = [];
        const mapped = data.map((row: any) => {
          const record = dbToVisitorRecord(row);
          if (shouldAutoCompleteTrial(record.status, record.trialDate)) {
            record.status = 'completed';
            if (record.id) {
              autoCompleteIds.push(record.id);
            }
          }
          return record;
        });

        // Persist automatic 'confirmed' -> 'completed' transitions to Supabase in the background
        if (autoCompleteIds.length > 0) {
          supabase
            .from('visitors')
            .update({ trial_status: 'completed' })
            .in('id', autoCompleteIds)
            .then(({ error: updateErr }) => {
              if (updateErr) {
                console.warn('Auto-complete trial status sync warning:', updateErr.message);
              }
            });
        }

        if (!profile.isSuperAdmin && profile.branchId) {
          return mapped.filter((v) => v.branch_id === profile.branchId);
        }
        return mapped;
      }
      if (error) {
        console.warn('Supabase fetch visitors error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch visitors exception:', err);
    }
  }

  return [];
}

/**
 * Checks if a duplicate registration exists for the same child and phone number
 */
export async function checkDuplicate(childName: string, phone: string): Promise<boolean> {
  const visitors = await fetchVisitors();
  const cName = childName.trim().toLowerCase();
  const pPhone = phone.replace(/[^0-9]/g, '');

  return visitors.some(
    (v) =>
      v.childName.trim().toLowerCase() === cName &&
      v.phone.replace(/[^0-9]/g, '') === pPhone
  );
}

/**
 * Creates a new visitor registration record in public.visitors.
 * Respects all constraints (NULL school_session for K1/K2, optional email, valid trial date).
 */
export async function createVisitor(
  formData: Omit<VisitorRecord, 'id' | 'created_at' | 'status'>
): Promise<{ success: boolean; data?: VisitorRecord; error?: string }> {
  // Normalize session: For K1 and K2, must be NULL
  let cleanSession: string | null = null;
  if (formData.classCategory === 'K1' || formData.classCategory === 'K2') {
    cleanSession = null;
  } else if (formData.schoolSession) {
    cleanSession = formData.schoolSession.replace(/^Session \d+:\s*/i, '').trim();
  }

  const cleanEmail = formData.email?.trim() || null;

  // Only include the 14 public registration columns granted for anon INSERT
  const publicDbPayload = {
    branch_id: formData.branch_id,
    child_name: formData.childName.trim(),
    gender: formData.gender,
    birth_place: formData.placeOfBirth.trim(),
    birth_date: formData.dateOfBirth,
    religion: formData.religion,
    address: formData.address.trim(),
    father_name: formData.fatherName.trim(),
    mother_name: formData.motherName.trim(),
    phone_number: formData.phone.trim(),
    email: cleanEmail,
    class_category: formData.classCategory,
    school_session: cleanSession,
    trial_date: formData.trialDate,
  };

  // 1. Direct Supabase client insertion (without .select() so anon never touches restricted SELECT on visitors/branches)
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('visitors')
        .insert([publicDbPayload]);

      if (!error) {
        return {
          success: true,
          data: dbToVisitorRecord({
            ...publicDbPayload,
            id: '',
            created_at: new Date().toISOString(),
            branch_name: formData.branch_name || resolveBranchName(formData.branch_id),
            trial_status: 'pending',
            admin_email_status: 'pending',
            visitor_email_status: cleanEmail ? 'pending' : 'skipped',
          }),
        };
      }

      if (error && error.code === '23505') {
        return {
          success: false,
          error:
            'Data calon murid ini dengan nomor telepon tersebut sudah pernah didaftarkan. / A registration with this child name and phone number already exists.',
        };
      }
    } catch (err: any) {
      console.warn('Direct client-side Supabase insert error:', err);
    }
  }

  // 2. Server-side API endpoint fallback (/api/register)
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(publicDbPayload),
    });

    const result = await response.json();
    if (response.ok && result.success && result.data) {
      return { success: true, data: dbToVisitorRecord(result.data) };
    }

    if (result.error) {
      return { success: false, error: result.error };
    }
  } catch (err: any) {
    console.error('Registration server endpoint exception:', err);
  }

  return {
    success: false,
    error: 'Gagal menyimpan pendaftaran ke database Supabase. Silakan periksa koneksi internet Anda.',
  };
}

/**
 * Updates the trial status of a visitor in public.visitors
 * Enforces branch authorization for branch admins.
 */
export async function updateVisitorStatus(
  id: string,
  newStatus: string
): Promise<boolean> {
  const dbStatus = normalizeStatusToDb(newStatus);
  if (isSupabaseConfigured()) {
    try {
      const profile = await getCurrentAdminProfile();
      if (!profile) return false;

      let query = supabase
        .from('visitors')
        .update({ trial_status: dbStatus })
        .eq('id', id);

      if (!profile.isSuperAdmin && profile.branchId) {
        query = query.eq('branch_id', profile.branchId);
      }

      const { error } = await query;
      if (!error) return true;
      console.warn('Supabase update visitor status failed:', error.message);
    } catch (err) {
      console.warn('Supabase update visitor status exception:', err);
    }
  }
  return false;
}

/**
 * Updates an existing visitor record in public.visitors
 * Enforces branch authorization for branch admins.
 */
export async function updateVisitorRecord(
  id: string,
  updates: Partial<VisitorRecord>
): Promise<boolean> {
  const profile = await getCurrentAdminProfile();
  if (!profile) return false;

  const dbUpdates: any = {};
  if (updates.childName !== undefined) dbUpdates.child_name = updates.childName.trim();
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
  if (updates.placeOfBirth !== undefined) dbUpdates.birth_place = updates.placeOfBirth.trim();
  if (updates.dateOfBirth !== undefined) dbUpdates.birth_date = updates.dateOfBirth;
  if (updates.religion !== undefined) dbUpdates.religion = updates.religion;
  if (updates.address !== undefined) dbUpdates.address = updates.address.trim();
  if (updates.fatherName !== undefined) dbUpdates.father_name = updates.fatherName.trim();
  if (updates.motherName !== undefined) dbUpdates.mother_name = updates.motherName.trim();
  if (updates.phone !== undefined) dbUpdates.phone_number = updates.phone.trim();
  if (updates.email !== undefined) dbUpdates.email = updates.email?.trim() || null;
  if (updates.classCategory !== undefined) dbUpdates.class_category = updates.classCategory;
  if (updates.schoolSession !== undefined || updates.classCategory !== undefined) {
    const cat = updates.classCategory;
    if (cat === 'K1' || cat === 'K2') {
      dbUpdates.school_session = null;
    } else if (updates.schoolSession) {
      dbUpdates.school_session = updates.schoolSession.replace(/^Session \d+:\s*/i, '').trim() || null;
    }
  }
  if (updates.trialDate !== undefined) dbUpdates.trial_date = updates.trialDate;
  if (updates.status !== undefined) dbUpdates.trial_status = normalizeStatusToDb(updates.status);
  // Only super_admin is allowed to reassign a visitor to a different branch
  if (updates.branch_id !== undefined && profile.isSuperAdmin) {
    dbUpdates.branch_id = updates.branch_id;
  }
  if (updates.admin_email_status !== undefined) dbUpdates.admin_email_status = updates.admin_email_status;
  if (updates.visitor_email_status !== undefined) dbUpdates.visitor_email_status = updates.visitor_email_status;
  if (updates.admin_email_sent_at !== undefined) dbUpdates.admin_email_sent_at = updates.admin_email_sent_at;
  if (updates.visitor_email_sent_at !== undefined) dbUpdates.visitor_email_sent_at = updates.visitor_email_sent_at;
  if (updates.email_error !== undefined) {
    dbUpdates.admin_email_error = updates.email_error;
    dbUpdates.visitor_email_error = updates.email_error;
  }

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('visitors')
        .update(dbUpdates)
        .eq('id', id);

      if (!profile.isSuperAdmin && profile.branchId) {
        query = query.eq('branch_id', profile.branchId);
      }

      const { error } = await query;

      if (!error) return true;
      console.warn('Supabase update visitor record failed:', error.message);
    } catch (err) {
      console.warn('Supabase update visitor record exception:', err);
    }
  }
  return false;
}

/**
 * Deletes a visitor record from public.visitors
 * Enforces branch authorization for branch admins.
 */
export async function deleteVisitorRecord(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const profile = await getCurrentAdminProfile();
      if (!profile) return false;

      let query = supabase.from('visitors').delete().eq('id', id);
      if (!profile.isSuperAdmin && profile.branchId) {
        query = query.eq('branch_id', profile.branchId);
      }

      const { error } = await query;
      if (!error) return true;
      console.warn('Supabase delete visitor failed:', error.message);
    } catch (err) {
      console.warn('Supabase delete visitor exception:', err);
    }
  }
  return false;
}
