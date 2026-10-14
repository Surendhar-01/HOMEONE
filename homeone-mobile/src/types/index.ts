export type UserRole = 'CUSTOMER' | 'PROFESSIONAL' | 'ADMIN';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType?: string;
  userId: string;
  role: UserRole | null;
  emailVerified: boolean;
  mobileVerified: boolean;
}

export interface AuthPrincipal {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole | null;
  roles: UserRole[];
  fullName: string | null;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
}

export interface Profile {
  id: string;
  fullName: string;
  mobileNumber: string | null;
  email: string;
  profilePhotoPath: string | null;
  profilePhotoUrl: string | null;
  role: UserRole | null;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerHome {
  id: string;
  customerId: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  label: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDomain {
  id: string;
  domainName: string;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceItem {
  id: string;
  domainId: string;
  serviceName: string;
  isActive: boolean;
  createdAt: string;
}

export interface WorkingHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ProviderDocument {
  id: string;
  document_type: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  signedUrl?: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  domainId: string;
  domainName: string | null;
  yearsOfExperience: number;
  languagesSpoken: string[];
  businessAddress: string;
  latitude: number | null;
  longitude: number | null;
  hasCertificate: boolean;
  isOnline: boolean;
  verificationStatus: VerificationStatus;
  verificationReason: string | null;
  verifiedAt: string | null;
  submittedAt: string | null;
  skills: { id: string; serviceId: string; serviceName: string }[];
  workingHours: { day_of_week: number; start_time: string; end_time: string }[];
  documents: ProviderDocument[];
  documentsComplete: boolean;
  canAccessDashboard: boolean;
}

export interface VerificationStatusInfo {
  verificationStatus: VerificationStatus;
  verificationReason: string | null;
  verifiedAt: string | null;
  title: string;
  message: string;
  canAccessDashboard: boolean;
}

export interface PendingProvider {
  id: string;
  fullName: string | null;
  mobileNumber: string | null;
  email: string | null;
  domainName: string | null;
  yearsOfExperience: number;
  languagesSpoken: string[];
  submittedAt: string | null;
  verificationStatus: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export type DayOption = { value: number; label: string };

export const DAYS_OF_WEEK: DayOption[] = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export const LANGUAGES = [
  'Tamil',
  'English',
  'Hindi',
  'Telugu',
  'Malayalam',
  'Kannada',
] as const;
