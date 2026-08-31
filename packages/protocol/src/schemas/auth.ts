import { z } from "zod";

export const RegisterRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().email(),
  username: z
    .string()
    .regex(/^[A-Za-z0-9@_!#$|-]+$/)
    .min(3)
    .max(24),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[^A-Za-z0-9]/),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  emailVerified: z.boolean(),
  createdAt: z.string().or(z.date()).optional(),
});

export type SessionUser = z.infer<typeof SessionUserSchema>;

export const SessionResponseSchema = z.object({
  user: SessionUserSchema.nullable(),
  session: z
    .object({
      id: z.string(),
      userId: z.string(),
      expiresAt: z.string().or(z.date()),
    })
    .nullable(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
