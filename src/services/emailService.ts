import { VisitorRecord } from '../types';
import { updateVisitorRecord } from './visitorService';
import { fetchAdminBranches } from './branchService';

export interface EmailSendResult {
  success: boolean;
  admin_email_status?: 'pending' | 'sent' | 'failed' | 'skipped';
  visitor_email_status?: 'pending' | 'sent' | 'failed' | 'skipped';
  admin_email_sent_at?: string | null;
  visitor_email_sent_at?: string | null;
  email_error?: string | null;
  message?: string;
  error?: string;
}

/**
 * Triggers automatic email notification after a successful visitor registration.
 * Sends notification to selected branch administrator and confirmation to visitor (if email provided).
 * Fails safely: never interrupts or invalidates visitor registration.
 */
export async function triggerRegistrationEmailNotification(
  visitor: VisitorRecord
): Promise<EmailSendResult> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitor_id: visitor.id || 'lookup',
        target: 'all',
        force: false,
        fallback_visitor: visitor,
      }),
    });

    if (!response.ok) {
      console.warn('Email API response not OK:', response.status, response.statusText);
      return {
        success: false,
        error: `Server responded with HTTP ${response.status}`,
      };
    }

    const data: EmailSendResult = await response.json();
    return data;
  } catch (err: any) {
    console.warn('Automatic email notification could not be dispatched:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Network error triggering email notification.',
    };
  }
}

/**
 * Manual Resend function for authenticated administrators.
 * Can target either 'admin' (Branch Administrator) or 'visitor' (Prospective Student Parents).
 */
export async function manualResendEmail(
  visitor: VisitorRecord,
  target: 'admin' | 'visitor'
): Promise<EmailSendResult> {
  try {
    // Resolve branch details to provide latest branch admin email
    let fallbackBranch: any = null;
    try {
      const branches = await fetchAdminBranches();
      fallbackBranch = branches.find((b) => b.id === visitor.branch_id) || null;
    } catch {
      // Safe fallback
    }

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitor_id: visitor.id,
        target,
        force: true, // Manual resend bypasses previous 'sent' check
        fallback_visitor: visitor,
        fallback_branch: fallbackBranch,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Server error (${response.status}): ${errorText || response.statusText}`,
      };
    }

    const data: EmailSendResult = await response.json();

    // Update local storage and DB state with new delivery status
    await updateVisitorRecord(visitor.id, {
      ...(data.admin_email_status ? { admin_email_status: data.admin_email_status } : {}),
      ...(data.visitor_email_status ? { visitor_email_status: data.visitor_email_status } : {}),
      ...(data.admin_email_sent_at !== undefined ? { admin_email_sent_at: data.admin_email_sent_at } : {}),
      ...(data.visitor_email_sent_at !== undefined ? { visitor_email_sent_at: data.visitor_email_sent_at } : {}),
      email_error: data.email_error,
    });

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to resend email due to a network error.',
    };
  }
}
