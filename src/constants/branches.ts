export interface Branch {
  id: string;
  branch_name: string;
  admin_phone?: string | null;
  admin_email?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PublicBranch {
  id: string;
  branch_name: string;
  is_active?: boolean;
}

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: '90bad582-f074-4924-a4c3-3ca62609f663',
    branch_name: 'Kidea Cawang',
    admin_phone: null,
    admin_email: null,
    is_active: true,
    created_at: '2026-11-17T08:35:32.55643+00:00',
    updated_at: '2026-11-17T08:35:32.55643+00:00',
  },
  {
    id: '06216cb7-2b45-4546-851f-7d8319b9a23f',
    branch_name: 'Kidea Galaxy',
    admin_phone: null,
    admin_email: null,
    is_active: true,
    created_at: '2026-11-17T08:35:32.55643+00:00',
    updated_at: '2026-11-17T08:35:32.55643+00:00',
  },
  {
    id: '378ed2bd-e50f-4723-ae80-c36aec82868b',
    branch_name: 'Kidea Bekasi Timur',
    admin_phone: null,
    admin_email: null,
    is_active: true,
    created_at: '2026-11-17T08:35:32.55643+00:00',
    updated_at: '2026-11-17T08:35:32.55643+00:00',
  },
  {
    id: '55bb5bfe-8b6b-4bea-8e45-77b6ee156ca3',
    branch_name: 'Kidea Tangerang Selatan',
    admin_phone: null,
    admin_email: null,
    is_active: true,
    created_at: '2026-11-17T08:35:32.55643+00:00',
    updated_at: '2026-11-17T08:35:32.55643+00:00',
  },
];

export const BRANCH_NAMES = [
  'Kidea Cawang',
  'Kidea Galaxy',
  'Kidea Bekasi Timur',
  'Kidea Tangerang Selatan',
] as const;
