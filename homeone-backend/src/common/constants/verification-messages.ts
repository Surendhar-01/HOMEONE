/**
 * Canonical in-app copy for the four provider verification statuses.
 * The backend returns these strings to the mobile app so the wording stays
 * identical across platforms and can be changed in one place.
 */
export const VERIFICATION_MESSAGES = {
  PENDING: {
    title: 'Pending Verification',
    message:
      'Your registration has been submitted successfully. Your documents are under verification. Please wait for admin approval.',
  },
  APPROVED: {
    title: 'Approved',
    message:
      'Congratulations! Your service provider account has been approved. You can now access your service provider dashboard.',
  },
  REJECTED: {
    title: 'Rejected',
    message:
      'Your service provider registration has been rejected. Please review the verification details and contact support or resubmit the required documents.',
  },
  BLOCKED: {
    title: 'Blocked',
    message:
      'Your service provider account has been blocked by the administrator. Please contact support for further information.',
  },
} as const;

export type VerificationStatusKey = keyof typeof VERIFICATION_MESSAGES;
