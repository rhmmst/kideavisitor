import { ClassCategory } from '../constants/classSessions';
import { Branch, PublicBranch } from '../constants/branches';

export type Language = 'id' | 'en';

export type TrialStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type EmailDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type { Branch, PublicBranch };

export interface VisitorRecord {
  id: string;
  created_at: string;
  // Branch Information
  branch_id?: string | null;
  branch_name?: string | null;
  // Child Information
  childName: string;
  gender: string;
  placeOfBirth: string;
  dateOfBirth: string;
  age: string;
  religion: string;
  address: string;
  // Parent Information
  fatherName: string;
  motherName: string;
  phone: string;
  email?: string;
  // Class & Session
  classCategory: ClassCategory;
  schoolSession: string;
  // Trial Class
  trialDate: string;
  status: TrialStatus;
  // Email Notification Tracking
  admin_email_status?: EmailDeliveryStatus;
  visitor_email_status?: EmailDeliveryStatus;
  admin_email_sent_at?: string | null;
  visitor_email_sent_at?: string | null;
  email_error?: string | null;
}

export interface DashboardStats {
  totalVisitors: number;
  todayRegistrations: number;
  upcomingTrials: number;
  branchCounts?: Record<string, number>;
}
