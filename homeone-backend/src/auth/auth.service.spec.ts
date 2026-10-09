import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { authConfig } from '../config/configuration';

const serviceClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({ maybeSingle: jest.fn(async () => ({ data: null })) })),
    })),
  })),
  auth: { admin: { signOut: jest.fn() } },
};

const anonClient = {
  auth: {
    resend: jest.fn(async () => ({ data: {}, error: null })),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    verifyOtp: jest.fn(),
    refreshSession: jest.fn(),
    resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
    updateUser: jest.fn(),
  },
};

describe('AuthService OTP resend cooldown', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [authConfig],
          envFilePath: [],
        }),
      ],
      providers: [
        AuthService,
        { provide: 'SUPABASE_SERVICE', useValue: serviceClient },
        { provide: 'SUPABASE_ANON_CLIENT', useValue: anonClient },
      ],
    })
      .overrideProvider('SUPABASE_SERVICE')
      .useValue(serviceClient)
      .overrideProvider('SUPABASE_ANON_CLIENT')
      .useValue(anonClient)
      .compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('dispatches the first OTP without a cooldown block', async () => {
    const result = await service.resendOtp('customer@example.com', 'signup');

    expect(result.otpSent).toBe(true);
    expect(result.otpChannel).toBe('email');
    expect(anonClient.auth.resend).toHaveBeenCalledTimes(1);
  });

  it('blocks an immediate second request', async () => {
    await service.resendOtp('customer@example.com', 'signup');

    await expect(service.resendOtp('customer@example.com', 'signup')).rejects.toThrow(
      /Please wait \d+ second/,
    );
    expect(anonClient.auth.resend).toHaveBeenCalledTimes(1);
  });

  it('allows another request once the cooldown has elapsed', async () => {
    await service.resendOtp('customer@example.com', 'signup');
    jest.advanceTimersByTime(61_000);

    const result = await service.resendOtp('customer@example.com', 'signup');
    expect(result.otpSent).toBe(true);
    expect(anonClient.auth.resend).toHaveBeenCalledTimes(2);
  });

  it('tracks the cooldown per email address', async () => {
    await service.resendOtp('first@example.com', 'signup');

    const result = await service.resendOtp('second@example.com', 'signup');
    expect(result.otpSent).toBe(true);
    expect(anonClient.auth.resend).toHaveBeenCalledTimes(2);
  });

  it('normalises the email address before applying the cooldown', async () => {
    await service.resendOtp('customer@example.com', 'signup');

    await expect(service.resendOtp('  Customer@Example.com  ', 'signup')).rejects.toThrow(
      /Please wait/,
    );
  });
});
