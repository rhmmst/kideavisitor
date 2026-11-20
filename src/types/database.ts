export type Gender = 'Male' | 'Female';

export type TrialStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type EmailDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface DbBranch {
  id: string;
  branch_name: string;
  admin_phone: string | null;
  admin_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbActiveBranch {
  id: string;
  branch_name: string;
}

export interface DbVisitor {
  id: string;
  branch_id: string;
  created_at: string;
  child_name: string;
  gender: string;
  birth_place: string;
  birth_date: string;
  religion: string;
  address: string;
  father_name: string;
  mother_name: string;
  phone_number: string;
  email: string | null;
  class_category: string;
  school_session: string | null;
  trial_date: string;
  trial_status: TrialStatus;
  admin_email_status: EmailDeliveryStatus;
  visitor_email_status: EmailDeliveryStatus;
  admin_email_sent_at: string | null;
  visitor_email_sent_at: string | null;
  admin_email_error: string | null;
  visitor_email_error: string | null;
}

export interface DbVisitorWithBranch extends DbVisitor {
  branches?: {
    branch_name: string;
    admin_email: string | null;
    admin_phone: string | null;
  } | null;
}

export interface DbAdminUser {
  id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
}
