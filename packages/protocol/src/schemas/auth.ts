import { z } from "zod";

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]+$/)
    .min(3)
    .max(20),
  password: z.string().min(8).max(100),
  ageAttestation: z.literal(true),
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
  password: z.string().min(8).max(100),
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
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
