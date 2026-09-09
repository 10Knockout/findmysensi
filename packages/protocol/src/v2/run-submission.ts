import { z } from "zod";

export const PROTOCOL_VERSION_V2 = 2 as const;
export const LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2 = 10;

export const PracticeModeIdV2Schema = z.enum([
  "grid",
  "multi",
  "pinpoint",
  "anchor-flick",
  "microshot",
  "motion-flick",
  "reaction",
  "strafe",
  "smooth-track",
  "switch-track",
  "headline",
  "turn180",
]);

export type PracticeModeIdV2 = z.infer<typeof PracticeModeIdV2Schema>;

export const RunInvalidationReasonV2Schema = z.enum([
  "paused-mid-run",
  "settings-changed-mid-run",
  "sensitivity-changed-mid-run",
  "pointer-lock-lost",
  "raw-input-unavailable",
  "simulation-desync",
  "debug-override-active",
  "run-incomplete",
]);

const RunIdV2Schema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const EpochMillisecondsSchema = z.number().int().nonnegative().safe();
const NonnegativeIntegerSchema = z
  .number()
  .int()
  .nonnegative()
  .max(2_147_483_647);
const PercentageSchema = z.number().min(0).max(100);

export const RunSettingsSnapshotV2Schema = z
  .object({
    fmsSensitivity: z
      .string()
      .max(32)
      .regex(/^\d+(?:\.\d+)?$/)
      .refine(
        (value) => Number(value) > 0 && Number(value) <= 100,
        "fmsSensitivity must be within the supported runtime range",
      ),
    nominalDpi: z.number().int().min(1).max(100_000).nullable(),
    cmPer360: z.number().positive().max(1_000_000).nullable(),
    fovDegrees: z.number().min(40).max(140),
    resolution: z.string().min(1).max(32),
    backingWidth: z.number().int().min(1).max(16_384),
    backingHeight: z.number().int().min(1).max(16_384),
    cssWidth: z.number().int().min(1).max(16_384),
    cssHeight: z.number().int().min(1).max(16_384),
    devicePixelRatio: z.number().positive().max(8),
    scalingMode: z.enum(["fit", "stretch", "black-bars", "fill"]),
    fullscreen: z.boolean(),
    graphicsPreset: z.enum(["automatic", "potato", "low", "balanced", "high"]),
    crosshairCode: z.string().max(512).nullable(),
    rawPointerInputAccepted: z.boolean(),
    platform: z.string().min(1).max(32),
    browser: z.string().min(1).max(32),
    medianRenderFps: z.number().positive().max(1_000).nullable(),
    p95FrameTimeMs: z.number().nonnegative().max(60_000).nullable(),
    inputOverflowEvents: NonnegativeIntegerSchema,
    inputHighWaterMark: NonnegativeIntegerSchema,
  })
  .strict();

const PracticeSummaryBaseV2Schema = z
  .object({
    id: RunIdV2Schema,
    timestamp: EpochMillisecondsSchema,
    score: NonnegativeIntegerSchema,
    durationSeconds: z.number().int().positive().max(86_400),
    exactReplayPreserved: z.boolean(),
    inputOverflowEvents: NonnegativeIntegerSchema,
    inputHighWaterMark: NonnegativeIntegerSchema,
  })
  .strict();

const ClickPracticeSummaryV2Schema = PracticeSummaryBaseV2Schema.extend({
  modeId: z.enum([
    "grid",
    "multi",
    "pinpoint",
    "anchor-flick",
    "microshot",
    "motion-flick",
    "reaction",
    "headline",
    "turn180",
  ]),
  hits: NonnegativeIntegerSchema,
  shots: NonnegativeIntegerSchema,
  misses: NonnegativeIntegerSchema,
  accuracyPercentage: PercentageSchema,
  killsPerSecond: z.number().nonnegative().max(10_000),
  averageAcquisitionTicks: z.number().nonnegative().max(10_000_000).optional(),
})
  .strict()
  .superRefine((summary, context) => {
    if (summary.hits + summary.misses !== summary.shots) {
      context.addIssue({
        code: "custom",
        path: ["misses"],
        message: "hits + misses must equal shots",
      });
    }
    const expectedAccuracy =
      summary.shots === 0 ? 0 : (summary.hits / summary.shots) * 100;
    if (Math.abs(summary.accuracyPercentage - expectedAccuracy) > 0.02) {
      context.addIssue({
        code: "custom",
        path: ["accuracyPercentage"],
        message: "accuracyPercentage does not match hits and shots",
      });
    }
  });

const TrackingPracticeSummaryV2Schema = PracticeSummaryBaseV2Schema.extend({
  modeId: z.enum(["smooth-track", "strafe"]),
  onTargetTicks: NonnegativeIntegerSchema,
  totalTicks: NonnegativeIntegerSchema,
  onTargetPercentage: PercentageSchema,
  averageErrorUnits: z.number().nonnegative().max(0xffffffff),
  maxErrorUnits: z.number().nonnegative().max(0xffffffff),
})
  .strict()
  .superRefine(validateTrackingSummary);

const SwitchTrackPracticeSummaryV2Schema = PracticeSummaryBaseV2Schema.extend({
  modeId: z.literal("switch-track"),
  switchesCompleted: NonnegativeIntegerSchema,
  onTargetTicks: NonnegativeIntegerSchema,
  totalTicks: NonnegativeIntegerSchema,
  onTargetPercentage: PercentageSchema,
  averageErrorUnits: z.number().nonnegative().max(0xffffffff),
  maxErrorUnits: z.number().nonnegative().max(0xffffffff),
  averageAcquisitionTicks: z.number().nonnegative().max(10_000_000),
})
  .strict()
  .superRefine(validateTrackingSummary);

function validateTrackingSummary(
  summary: {
    onTargetTicks: number;
    totalTicks: number;
    onTargetPercentage: number;
  },
  context: z.RefinementCtx,
): void {
  if (summary.onTargetTicks > summary.totalTicks) {
    context.addIssue({
      code: "custom",
      path: ["onTargetTicks"],
      message: "onTargetTicks cannot exceed totalTicks",
    });
  }
  const expectedPercentage =
    summary.totalTicks === 0
      ? 0
      : (summary.onTargetTicks / summary.totalTicks) * 100;
  if (Math.abs(summary.onTargetPercentage - expectedPercentage) > 0.02) {
    context.addIssue({
      code: "custom",
      path: ["onTargetPercentage"],
      message: "onTargetPercentage does not match tracking ticks",
    });
  }
}

export const PracticeSummaryV2Schema = z.union([
  ClickPracticeSummaryV2Schema,
  TrackingPracticeSummaryV2Schema,
  SwitchTrackPracticeSummaryV2Schema,
]);

export const PracticeRunSubmissionV2Schema = z
  .object({
    protocolVersion: z.literal(PROTOCOL_VERSION_V2),
    runClass: z.literal("practice"),
    runId: RunIdV2Schema,
    modeId: PracticeModeIdV2Schema,
    scenarioVersion: z.number().int().nonnegative().max(65_535),
    scoringVersion: z.number().int().nonnegative().max(65_535),
    analyticsVersion: z.number().int().positive().max(65_535),
    seed: z.tuple([
      z.number().int().min(0).max(0xffffffff),
      z.number().int().min(0).max(0xffffffff),
      z.number().int().min(0).max(0xffffffff),
      z.number().int().min(0).max(0xffffffff),
    ]),
    startedAt: EpochMillisecondsSchema,
    completedAt: EpochMillisecondsSchema,
    activeDurationMs: z.number().int().positive().max(86_400_000),
    finalScore: NonnegativeIntegerSchema,
    clientEligibility: z
      .object({
        leaderboardEligible: z.boolean(),
        invalidationReasons: z.array(RunInvalidationReasonV2Schema).max(8),
      })
      .strict(),
    settings: RunSettingsSnapshotV2Schema,
    summary: PracticeSummaryV2Schema,
  })
  .strict()
  .superRefine((run, context) => {
    if (run.completedAt < run.startedAt) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "completedAt cannot precede startedAt",
      });
    }
    if (run.summary.id !== run.runId) {
      context.addIssue({
        code: "custom",
        path: ["summary", "id"],
        message: "summary.id must match runId",
      });
    }
    if (run.summary.timestamp !== run.completedAt) {
      context.addIssue({
        code: "custom",
        path: ["summary", "timestamp"],
        message: "summary.timestamp must match completedAt",
      });
    }
    if (run.summary.modeId !== run.modeId) {
      context.addIssue({
        code: "custom",
        path: ["summary", "modeId"],
        message: "summary.modeId must match modeId",
      });
    }
    if (run.summary.score !== run.finalScore) {
      context.addIssue({
        code: "custom",
        path: ["summary", "score"],
        message: "summary.score must match finalScore",
      });
    }
    if (
      run.summary.durationSeconds !== Math.round(run.activeDurationMs / 1_000)
    ) {
      context.addIssue({
        code: "custom",
        path: ["summary", "durationSeconds"],
        message: "summary duration must match activeDurationMs",
      });
    }
    const uniqueReasons = new Set(run.clientEligibility.invalidationReasons);
    if (
      uniqueReasons.size !== run.clientEligibility.invalidationReasons.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["clientEligibility", "invalidationReasons"],
        message: "invalidationReasons cannot contain duplicates",
      });
    }
    if (
      run.clientEligibility.leaderboardEligible !==
      (run.clientEligibility.invalidationReasons.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["clientEligibility"],
        message: "client eligibility must agree with invalidationReasons",
      });
    }
  });

export type PracticeRunSubmissionV2 = z.infer<
  typeof PracticeRunSubmissionV2Schema
>;

export const LeaderboardBoardV2Schema = z
  .object({
    boardId: z.string().min(1).max(192),
    modeId: PracticeModeIdV2Schema,
    scenarioVersion: z.number().int().nonnegative().max(65_535),
    scoringVersion: z.number().int().nonnegative().max(65_535),
    // Optional defaults keep public-first deploys compatible with the older
    // non-seasonal API response. New API responses always include all three.
    seasonId: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    seasonStartsAt: z.string().datetime().optional(),
    seasonEndsAt: z.string().datetime().optional(),
  })
  .strict();

export const LeaderboardRowV2Schema = z
  .object({
    rank: z.number().int().positive(),
    username: z.string().min(1).max(24),
    avatarId: z.string().min(1).max(64).optional(),
    frameId: z.string().min(1).max(64).optional(),
    tagId: z.string().min(1).max(64).optional(),
    score: NonnegativeIntegerSchema,
    accuracyPercentage: z.number().min(0).max(100).nullable().optional(),
    achievedAt: z.string().datetime(),
  })
  .strict();

export const LeaderboardStandingV2Schema = z
  .object({
    rank: z.number().int().positive(),
    score: NonnegativeIntegerSchema,
    accuracyPercentage: z.number().min(0).max(100).nullable().optional(),
    percentile: z.number().min(0).max(100).nullable(),
    totalPlayers: z.number().int().positive(),
    achievedAt: z.string().datetime(),
  })
  .strict();

export const LeaderboardContextV2Schema = z
  .object({
    board: LeaderboardBoardV2Schema,
    totalPlayers: z.number().int().nonnegative(),
    percentileMinimumPlayers: z.literal(LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2),
    standing: LeaderboardStandingV2Schema.nullable(),
    page: z
      .object({
        offset: z.number().int().nonnegative(),
        limit: z.number().int().positive().max(50),
        hasMore: z.boolean(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((leaderboard, context) => {
    const standing = leaderboard.standing;
    if (!standing) return;

    if (
      standing.totalPlayers !== leaderboard.totalPlayers ||
      standing.rank > leaderboard.totalPlayers
    ) {
      context.addIssue({
        code: "custom",
        path: ["standing"],
        message: "standing must belong to the returned leaderboard population",
      });
    }

    const expectedPercentile = calculateLeaderboardPercentileV2(
      standing.rank,
      leaderboard.totalPlayers,
    );
    if (
      (expectedPercentile === null && standing.percentile !== null) ||
      (expectedPercentile !== null &&
        (standing.percentile === null ||
          Math.abs(standing.percentile - expectedPercentile) > 0.000001))
    ) {
      context.addIssue({
        code: "custom",
        path: ["standing", "percentile"],
        message: "percentile must match the declared leaderboard population",
      });
    }
  });

export type LeaderboardContextV2 = z.infer<typeof LeaderboardContextV2Schema>;

export const PracticeRunSubmissionResponseV2Schema = z
  .object({
    protocolVersion: z.literal(PROTOCOL_VERSION_V2),
    runId: RunIdV2Schema,
    submissionStatus: z.enum(["stored", "already-stored"]),
    runClass: z.literal("practice"),
    // Transitional: web must accept "listed" (new) before the API deploy that
    // sends it, and "practice-only" (old) until that deploy lands. A follow-up
    // narrows this to z.literal("listed").
    competitiveStatus: z.enum(["practice-only", "listed"]),
    leaderboard: LeaderboardContextV2Schema,
  })
  .strict();

export type PracticeRunSubmissionResponseV2 = z.infer<
  typeof PracticeRunSubmissionResponseV2Schema
>;

export const LeaderboardResponseV2Schema =
  LeaderboardContextV2Schema.safeExtend({
    protocolVersion: z.literal(PROTOCOL_VERSION_V2),
    rows: z.array(LeaderboardRowV2Schema).max(100),
  }).strict();

export type LeaderboardResponseV2 = z.infer<typeof LeaderboardResponseV2Schema>;
export type LeaderboardRowV2 = z.infer<typeof LeaderboardRowV2Schema>;
export type LeaderboardStandingV2 = z.infer<typeof LeaderboardStandingV2Schema>;

export function calculateLeaderboardPercentileV2(
  rank: number,
  totalPlayers: number,
): number | null {
  if (
    !Number.isInteger(rank) ||
    !Number.isInteger(totalPlayers) ||
    rank < 1 ||
    totalPlayers < LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2 ||
    rank > totalPlayers
  ) {
    return null;
  }
  const percentile = 100 * (1 - (rank - 1) / Math.max(1, totalPlayers - 1));
  return Math.min(100, Math.max(0, percentile));
}
