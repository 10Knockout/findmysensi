import { z } from "zod";

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().regex(/^[a-zA-Z0-9_]+$/).min(3).max(20),
  password: z.string().min(8).max(100),
  ageAttestation: z.literal(true, {
    errorMap: () => ({ message: "You must be 18 or older to register." }),
  }),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
