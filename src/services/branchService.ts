import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Branch, PublicBranch, INITIAL_BRANCHES } from '../constants/branches';
import { getCurrentAdminProfile } from './authService';

const BRANCH_STORAGE_KEY = 'kidea_branches';

function getStoredBranches(): Branch[] {
  try {
    const raw = localStorage.getItem(BRANCH_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(INITIAL_BRANCHES));
      return INITIAL_BRANCHES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(INITIAL_BRANCHES));
      return INITIAL_BRANCHES;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to parse stored branches:', err);
    return INITIAL_BRANCHES;
  }
}

function setStoredBranches(branches: Branch[]) {
  try {
    localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(branches));
  } catch (err) {
    console.warn('Failed to save branches to localStorage:', err);
  }
}

/**
 * Public function for visitors: retrieves active branch names and IDs from public.active_branches view.
 * NEVER exposes admin_phone or admin_email to anonymous visitors.
 */
export async function fetchPublicBranches(): Promise<PublicBranch[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('active_branches')
        .select('id, branch_name')
        .order('branch_name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as PublicBranch[];
      }
      if (error) {
        console.warn('Failed to query public.active_branches from Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Supabase public branches query exception:', err);
    }
  }

  const stored = getStoredBranches();
  return stored
    .filter((b) => b.is_active)
    .map((b) => ({
      id: b.id,
      branch_name: b.branch_name,
      is_active: b.is_active,
    }));
}

/**
 * Admin function: retrieves branches with full details (admin_phone, admin_email, is_active).
 * Enforces role-based authorization:
 * - Super Admin: receives all 4 branches.
 * - Branch Admin: strictly receives only their assigned branch.
 */
export async function fetchAdminBranches(): Promise<Branch[]> {
  const profile = await getCurrentAdminProfile();

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('branches')
        .select('*')
        .order('branch_name', { ascending: true });

      if (profile && !profile.isSuperAdmin && profile.branchId) {
        query = query.eq('id', profile.branchId);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const list = data as Branch[];
        if (profile?.isSuperAdmin) {
          setStoredBranches(list);
        }
        return list;
      }
      if (error) {
        console.warn('Failed to query branches from Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Supabase admin branches fetch error:', err);
    }
  }

  const stored = getStoredBranches();
  if (profile && !profile.isSuperAdmin && profile.branchId) {
    return stored.filter((b) => b.id === profile.branchId);
  }
  return stored;
}

/**
 * Updates branch information (admin_phone, admin_email, is_active).
 * Enforces role-based authorization so a branch admin can only update their own branch.
 */
export async function updateBranch(
  id: string,
  updates: Partial<Branch>
): Promise<{ success: boolean; data?: Branch; error?: string }> {
  const profile = await getCurrentAdminProfile();
  if (!profile) {
    return {
      success: false,
      error: 'Sesi administrator tidak valid. Silakan login kembali.',
    };
  }

  if (!profile.isSuperAdmin && profile.branchId !== id) {
    return {
      success: false,
      error: 'Akses ditolak: Anda hanya dapat mengubah pengaturan cabang Anda sendiri.',
    };
  }

  const current = await fetchAdminBranches();

  if (updates.branch_name) {
    const isDuplicate = current.some(
      (b) =>
        b.id !== id &&
        b.branch_name.trim().toLowerCase() === updates.branch_name!.trim().toLowerCase()
    );
    if (isDuplicate) {
      return {
        success: false,
        error: 'Nama cabang sudah digunakan / Branch name already exists.',
      };
    }
  }

  const updatedTimestamp = new Date().toISOString();
  const updatePayload = {
    ...updates,
    updated_at: updatedTimestamp,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('branches')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const nextList = current.map((b) => (b.id === id ? (data as Branch) : b));
        if (profile.isSuperAdmin) {
          setStoredBranches(nextList);
        }
        return { success: true, data: data as Branch };
      }
      if (error) {
        console.warn('Supabase branch update failed:', error.message);
        return {
          success: false,
          error: error.message,
        };
      }
    } catch (err: any) {
      console.warn('Supabase branch update error:', err);
      return {
        success: false,
        error: err?.message || 'Gagal memperbarui data cabang.',
      };
    }
  }

  let updatedRecord: Branch | undefined;
  const nextList = current.map((b) => {
    if (b.id === id) {
      updatedRecord = { ...b, ...updatePayload };
      return updatedRecord;
    }
    return b;
  });

  if (profile.isSuperAdmin) {
    setStoredBranches(nextList);
  }
  return { success: true, data: updatedRecord };
}
