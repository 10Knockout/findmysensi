export interface PracticeRunSummaryBase {
  readonly id: string;
  readonly timestamp: number;
  readonly score: number;
  readonly durationSeconds: number;
  readonly exactReplayPreserved: boolean;
  readonly inputOverflowEvents: number;
  readonly inputHighWaterMark: number;
}

export interface GridPracticeSummary extends PracticeRunSummaryBase {
  readonly modeId: "grid";
  readonly hits: number;
  readonly shots: number;
  readonly misses: number;
  readonly accuracyPercentage: number;
  readonly killsPerSecond: number;
}

// More variants join this union as each mode ships (M4/M5). Kept as a
// 1-member union rather than a plain interface so future modes are additive,
// not a breaking reshape.
export type PracticeSummaryRecord = GridPracticeSummary;
