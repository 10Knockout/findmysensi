import { z } from "zod";

export const HandshakeRequestSchema = z.object({
  scenario: z.enum(["tracking-1", "flicking-1"]),
  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  clientVersion: z.string().min(1).max(50),
});

export type HandshakeRequest = z.infer<typeof HandshakeRequestSchema>;

export const HandshakeResponseSchema = z.object({
  ticketId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  claims: z.object({
    userId: z.string().optional(),
    scenarioId: z.string(),
  }),
  signature: z.string(),
});

export type HandshakeResponse = z.infer<typeof HandshakeResponseSchema>;
