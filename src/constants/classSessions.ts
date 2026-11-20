export type ClassCategory = 
  | 'Mom & I Bright Baby'
  | 'Toddler'
  | 'Playgroup'
  | 'Preschool'
  | 'K1'
  | 'K2';

export interface ClassSessionOption {
  id: string;
  name: string;
  time: string;
}

export const CLASS_CATEGORIES: ClassCategory[] = [
  'Mom & I Bright Baby',
  'Toddler',
  'Playgroup',
  'Preschool',
  'K1',
  'K2',
];

export const CLASS_SESSIONS_MAP: Record<ClassCategory, string[]> = {
  'Mom & I Bright Baby': [
    'Session 1: 09:00 - 10:00',
    'Session 2: 10:15 - 11:15',
  ],
  'Toddler': [
    'Session 1: 08:00 - 10:00',
    'Session 2: 10:15 - 12:15',
  ],
  'Playgroup': [
    'Session 1: 08:00 - 10:00',
    'Session 2: 10:15 - 12:15',
  ],
  'Preschool': [
    'Session 1: 08:00 - 10:00',
    'Session 2: 10:15 - 12:15',
  ],
  'K1': [
    '08:00 - 11:45',
  ],
  'K2': [
    '08:00 - 12:00',
  ],
};

export const RELIGION_OPTIONS = [
  'Islam',
  'Kristen Protestan',
  'Katolik',
  'Hindu',
  'Buddha',
  'Konghucu',
  'Lainnya / Other',
];

export const GENDER_OPTIONS = [
  { value: 'Male', labelId: 'Laki-laki', labelEn: 'Male' },
  { value: 'Female', labelId: 'Perempuan', labelEn: 'Female' },
];

/**
 * Calculates child's age in years and months automatically from Date of Birth.
 */
export function calculateAge(dobString: string, lang: 'id' | 'en' = 'en'): string {
  if (!dobString) return '';
  const dob = new Date(dobString);
  const today = new Date();
  if (isNaN(dob.getTime()) || dob > today) return '';

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  const days = today.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years === 0 && months === 0) {
    return lang === 'id' ? '< 1 Bulan' : '< 1 Month';
  }

  if (lang === 'id') {
    if (years === 0) return `${months} Bulan`;
    if (months === 0) return `${years} Tahun`;
    return `${years} Tahun ${months} Bulan`;
  } else {
    if (years === 0) return `${months} Months`;
    if (months === 0) return `${years} Years`;
    return `${years} Years ${months} Months`;
  }
}

