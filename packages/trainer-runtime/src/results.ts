export interface PracticeRunSummaryBase {
  readonly id: string;
  readonly timestamp: number;
  readonly score: number;
  readonly durationSeconds: number;
  readonly exactReplayPreserved: boolean;
  readonly inputOverflowEvents: number;
  readonly inputHighWaterMark: number;
}

interface ClickPracticeSummaryBase extends PracticeRunSummaryBase {
  readonly hits: number;
  readonly shots: number;
  readonly misses: number;
  readonly accuracyPercentage: number;
  readonly killsPerSecond: number;
}

export interface GridPracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "grid";
}

export interface PinpointPracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "pinpoint";
}

export interface MultiPracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "multi";
}

export interface HeadlinePracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "headline";
}

export type PracticeSummaryRecord =
  | GridPracticeSummary
  | PinpointPracticeSummary
  | MultiPracticeSummary
  | HeadlinePracticeSummary;
