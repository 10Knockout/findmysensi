import { z } from "zod";

export const LeaderboardRowSchema = z
  .object({
    rank: z.number().int().positive(),
    userId: z.string().min(1),
    username: z.string().min(1),
    score: z.number().int().nonnegative(),
    achievedAt: z.string().datetime(),
  })
  .strict();

export const LeaderboardResponseSchema = z
  .object({
    modeId: z.string().min(1).max(64),
    rows: z.array(LeaderboardRowSchema),
  })
  .strict();

export type LeaderboardRow = z.infer<typeof LeaderboardRowSchema>;
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
