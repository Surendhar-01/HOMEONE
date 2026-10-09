export const MOBILE_REGEX = /^\+?[0-9]{7,15}$/;

export const MOBILE_ERROR_MESSAGE =
  'Enter a valid mobile number (7-15 digits, optional +country code).';

export const PASSWORD_RULES_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number.';

const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const OTP_REGEX = /^\d{6}$/;
export const OTP_ERROR_MESSAGE = 'Enter the 6-digit verification code.';

export const CONFIRM_PASSWORD_ERROR_MESSAGE = 'Password and confirm password do not match.';

/** Returns an error message, or null when the password satisfies the policy. */
export function validatePassword(password: string | undefined): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return 'Password is required and must be at least 8 characters.';
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return 'Password must be at most 128 characters.';
  }
  if (!PASSWORD_COMPLEXITY.test(password)) {
    return PASSWORD_RULES_MESSAGE;
  }
  return null;
}

export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

/** Strips formatting characters users paste from their phone dialer. */
export function normaliseMobile(mobile: string): string {
  return mobile.replace(/[\s()-]/g, '');
}