import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).min(1, 'Name cannot be empty'),
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z.string({ required_error: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string({ required_error: 'Verification token is required' }),
  }),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email address is required' }).email('Invalid email address'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z.string({ required_error: 'Password is required' }),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refresh_token: z.string({ required_error: 'Refresh token is required' }),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email address is required' }).email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string({ required_error: 'Reset token is required' }),
    new_password: z.string({ required_error: 'New password is required' }).min(6, 'Password must be at least 6 characters'),
  }),
});
