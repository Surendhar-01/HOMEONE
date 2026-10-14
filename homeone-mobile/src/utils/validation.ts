export const MOBILE_REGEX = /^\+?[0-9]{7,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidMobile(mobile: string): boolean {
  return MOBILE_REGEX.test(mobile.replace(/[\s()-]/g, ''));
}

export function normaliseMobile(mobile: string): string {
  return mobile.replace(/[\s()-]/g, '');
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must include an uppercase letter, a lowercase letter and a number.';
  }
  if (password.length > 128) {
    return 'Password must be at most 128 characters.';
  }
  return null;
}

export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

export function validateCustomerSignup(values: {
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}): string | null {
  if (values.fullName.trim().length < 2) return 'Full name is required.';
  if (!isValidMobile(values.mobileNumber)) {
    return 'Enter a valid mobile number (7-15 digits, optional +country code).';
  }
  if (!isValidEmail(values.email)) return 'Enter a valid email address.';
  const passwordError = validatePassword(values.password);
  if (passwordError) return passwordError;
  if (values.password !== values.confirmPassword) {
    return 'Password and confirm password do not match.';
  }
  if (!values.agreedToTerms) {
    return 'You must accept the Terms and Conditions before registering.';
  }
  return null;
}
