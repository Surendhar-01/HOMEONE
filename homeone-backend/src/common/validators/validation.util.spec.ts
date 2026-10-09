import {
  MOBILE_REGEX,
  PASSWORD_RULES_MESSAGE,
  normaliseMobile,
  passwordsMatch,
  validatePassword,
} from './validation.util';

describe('validation.util', () => {
  describe('validatePassword', () => {
    it('rejects a missing password', () => {
      expect(validatePassword(undefined)).toBe(
        'Password is required and must be at least 8 characters.',
      );
    });

    it('rejects a password under 8 characters', () => {
      expect(validatePassword('Ab1')).toBe(
        'Password is required and must be at least 8 characters.',
      );
    });

    it('rejects a password without an uppercase letter', () => {
      expect(validatePassword('lowercase1')).toBe(PASSWORD_RULES_MESSAGE);
    });

    it('rejects a password without a lowercase letter', () => {
      expect(validatePassword('UPPERCASE1')).toBe(PASSWORD_RULES_MESSAGE);
    });

    it('rejects a password without a number', () => {
      expect(validatePassword('NoDigitsHere')).toBe(PASSWORD_RULES_MESSAGE);
    });

    it('accepts a compliant password', () => {
      expect(validatePassword('StrongPass1')).toBeNull();
    });

    it('rejects a password over 128 characters', () => {
      expect(validatePassword(`Aa1${'x'.repeat(130)}`)).toBe(
        'Password must be at most 128 characters.',
      );
    });
  });

  describe('passwordsMatch', () => {
    it('detects a mismatch', () => {
      expect(passwordsMatch('StrongPass1', 'StrongPass2')).toBe(false);
    });

    it('detects a match', () => {
      expect(passwordsMatch('StrongPass1', 'StrongPass1')).toBe(true);
    });
  });

  describe('normaliseMobile', () => {
    it('strips formatting characters', () => {
      expect(normaliseMobile('+91 (98765) 432-10')).toBe('+919876543210');
    });

    it('leaves a clean number untouched', () => {
      expect(normaliseMobile('+919876543210')).toBe('+919876543210');
    });
  });

  describe('MOBILE_REGEX', () => {
    it.each([
      ['+919876543210', true],
      ['9876543210', true],
      ['+9198765', true],
      ['12345', false],
      ['+9198765432101234', false],
      ['not-a-number', false],
    ])('%s -> %s', (value, expected) => {
      expect(MOBILE_REGEX.test(value)).toBe(expected);
    });
  });
});
