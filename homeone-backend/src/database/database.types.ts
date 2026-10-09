export type UserRole = 'CUSTOMER' | 'PROFESSIONAL' | 'ADMIN';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';

export type DocumentType = 'GOVERNMENT_ID' | 'CERTIFICATE' | 'WORK_PHOTO';

export interface ProfileRow {
  id: string;
  full_name: string;
  mobile_number: string | null;
  email: string;
  profile_photo_path: string | null;
  is_email_verified: boolean;
  is_mobile_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface CustomerHomeRow {
  id: string;
  customer_id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  label: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceDomainRow {
  id: string;
  domain_name: string;
  is_active: boolean;
  created_at: string;
}

export interface ServiceRow {
  id: string;
  domain_id: string;
  service_name: string;
  is_active: boolean;
  created_at: string;
}

export interface ServiceProviderRow {
  id: string;
  user_id: string;
  domain_id: string;
  years_of_experience: number;
  languages_spoken: string[];
  business_address: string;
  latitude: number | null;
  longitude: number | null;
  has_certificate: boolean;
  verification_status: VerificationStatus;
  verification_reason: string | null;
  verified_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderSkillRow {
  id: string;
  provider_id: string;
  service_id: string;
}

export interface ProviderDocumentRow {
  id: string;
  provider_id: string;
  document_type: DocumentType;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
}

export interface ProviderWorkingHourRow {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface ProviderVerificationHistoryRow {
  id: string;
  provider_id: string;
  old_status: VerificationStatus | null;
  new_status: VerificationStatus;
  reason: string | null;
  reviewed_by: string;
  reviewed_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole | null;
  roles: UserRole[];
  fullName: string | null;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
}