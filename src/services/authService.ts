import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { INITIAL_BRANCHES } from '../constants/branches';

export type AdminRole = 'super_admin' | 'branch_admin';

export interface AdminProfile {
  userId: string;
  email: string;
  role: AdminRole;
  isSuperAdmin: boolean;
  branchId: string | null;
  branchName: string | null;
}

export interface AuthResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  profile?: AdminProfile | null;
  error?: string;
}

/**
 * Canonical mapping for the 5 official TK Kidea administrators
 */
const CANONICAL_ADMIN_MAP: Record<
  string,
  { role: AdminRole; branchId: string | null; branchName: string | null }
> = {
  // 1. Super Admin (All Branches)
  'itsupport@harapanprestasi.sch.id': {
    role: 'super_admin',
    branchId: null,
    branchName: null,
  },
  // 2. Kidea Cawang
  'kidea.school@gmail.com': {
    role: 'branch_admin',
    branchId: '90bad582-f074-4924-a4c3-3ca62609f663',
    branchName: 'Kidea Cawang',
  },
  // 3. Kidea Bekasi Timur
  'kidea.bekasitimur@gmail.com': {
    role: 'branch_admin',
    branchId: '378ed2bd-e50f-4723-ae80-c36aec82868b',
    branchName: 'Kidea Bekasi Timur',
  },
  // 4. Kidea Galaxy
  'kideagalaxy.kindergarten@gmail.com': {
    role: 'branch_admin',
    branchId: '06216cb7-2b45-4546-851f-7d8319b9a23f',
    branchName: 'Kidea Galaxy',
  },
  // 5. Kidea Tangerang Selatan
  'kidea.tangsel@gmail.com': {
    role: 'branch_admin',
    branchId: '55bb5bfe-8b6b-4bea-8e45-77b6ee156ca3',
    branchName: 'Kidea Tangerang Selatan',
  },
};

const CANONICAL_USER_ID_MAP: Record<
  string,
  { role: AdminRole; branchId: string | null; branchName: string | null }
> = {
  '2fc4ca25-476a-449d-9769-98f2e6f7f9a8': {
    role: 'super_admin',
    branchId: null,
    branchName: null,
  },
  'f970825f-31c6-4f51-a00c-0879de391755': {
    role: 'branch_admin',
    branchId: '90bad582-f074-4924-a4c3-3ca62609f663',
    branchName: 'Kidea Cawang',
  },
  'f2a2734e-0347-46fb-8bbe-02e625fe0acb': {
    role: 'branch_admin',
    branchId: '378ed2bd-e50f-4723-ae80-c36aec82868b',
    branchName: 'Kidea Bekasi Timur',
  },
  'aa7d64f6-82ac-40af-9e35-52c0df728f79': {
    role: 'branch_admin',
    branchId: '06216cb7-2b45-4546-851f-7d8319b9a23f',
    branchName: 'Kidea Galaxy',
  },
  'd2e34d6c-179e-4704-955f-b5fa05084abf': {
    role: 'branch_admin',
    branchId: '55bb5bfe-8b6b-4bea-8e45-77b6ee156ca3',
    branchName: 'Kidea Tangerang Selatan',
  },
};

function resolveBranchNameById(branchId: string | null | undefined): string | null {
  if (!branchId) return null;
  const found = INITIAL_BRANCHES.find((b) => b.id === branchId);
  return found ? found.branch_name : null;
}

/**
 * Checks if a given user is an active administrator in public.admin_users
 */
export async function checkAdminStatus(userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    // 1. Try Supabase RPC 'is_admin' if available
    const { data: rpcResult, error: rpcError } = await supabase.rpc('is_admin');
    if (!rpcError && typeof rpcResult === 'boolean') {
      return rpcResult;
    }

    // 2. Fallback: Query public.admin_users directly
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) return false;

    const { data, error } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('user_id', currentUserId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return Boolean(data.is_active);
  } catch (err) {
    console.error('Error verifying admin authorization:', err);
    return false;
  }
}

/**
 * Resolves the role (super_admin vs branch_admin) and assigned branch for an authenticated admin user.
 */
export async function resolveAdminProfile(user?: User | null): Promise<AdminProfile | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const targetUser = user || (await supabase.auth.getUser()).data.user;
    if (!targetUser) return null;

    const email = (targetUser.email || '').trim().toLowerCase();
    const userId = targetUser.id;

    // 1. Check public.admin_users table (supports optional role & branch_id columns if migrated)
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    // Verify user is an active admin
    if (!adminRow) {
      const isRpcAdmin = await checkAdminStatus(userId);
      if (!isRpcAdmin) return null;
    }

    // 2. Determine role & branchId from DB row -> canonical email/userId map -> JWT app_metadata
    const canonicalByEmail = CANONICAL_ADMIN_MAP[email];
    const canonicalById = CANONICAL_USER_ID_MAP[userId];
    const canonical = canonicalByEmail || canonicalById;

    const dbRole = (adminRow as any)?.role as AdminRole | undefined;
    const dbBranchId = (adminRow as any)?.branch_id as string | null | undefined;

    const metaRole = targetUser.app_metadata?.role as AdminRole | undefined;
    const metaBranchId = targetUser.app_metadata?.branch_id as string | null | undefined;
    const metaBranchName = targetUser.app_metadata?.branch_name as string | null | undefined;

    let role: AdminRole = 'branch_admin';
    let branchId: string | null = null;
    let branchName: string | null = null;

    if (dbRole === 'super_admin' || canonical?.role === 'super_admin' || metaRole === 'super_admin') {
      role = 'super_admin';
      branchId = null;
      branchName = null;
    } else {
      role = 'branch_admin';
      branchId = dbBranchId || canonical?.branchId || metaBranchId || null;
      branchName =
        canonical?.branchName ||
        metaBranchName ||
        resolveBranchNameById(branchId) ||
        null;
    }

    return {
      userId,
      email: targetUser.email || email,
      role,
      isSuperAdmin: role === 'super_admin',
      branchId,
      branchName,
    };
  } catch (err) {
    console.error('Failed to resolve admin profile:', err);
    return null;
  }
}

/**
 * Convenience getter for the current logged-in administrator's profile
 */
export async function getCurrentAdminProfile(): Promise<AdminProfile | null> {
  const session = await getAdminSession();
  if (!session?.user) return null;
  return resolveAdminProfile(session.user);
}

/**
 * Authenticates administrator using Supabase email + password.
 * Strictly verifies the user exists in public.admin_users with is_active = true
 * and resolves their branch authorization profile.
 */
export async function signInAdmin(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase belum dikonfigurasi. Periksa file .env Anda.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return {
        success: false,
        error: error?.message || 'Email atau kata sandi tidak valid.',
      };
    }

    // Verify authorized active admin status & resolve profile
    const profile = await resolveAdminProfile(data.user);
    if (!profile) {
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          'Akses ditolak: Akun ini tidak terdaftar sebagai administrator aktif di TK Kidea.',
      };
    }

    if (profile.role === 'branch_admin' && !profile.branchId) {
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          'Akses ditolak: Akun admin cabang ini belum terhubung ke cabang TK Kidea manapun.',
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
      profile,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan saat masuk.',
    };
  }
}

/**
 * Terminates the current admin session
 */
export async function signOutAdmin(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Error during sign out:', err);
  }
}

/**
 * Gets current active session
 */
export async function getAdminSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Gets current authenticated user
 */
export async function getAdminUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Listens for auth state changes (sign in, sign out, token refresh)
 */
export function onAdminAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
