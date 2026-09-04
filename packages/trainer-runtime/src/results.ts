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

export interface StrafePracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "strafe";
}

export interface MicroshotPracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "microshot";
}

export interface ReactionPracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "reaction";
}

export interface SmoothTrackPracticeSummary extends PracticeRunSummaryBase {
  readonly modeId: "smooth-track";
  readonly onTargetTicks: number;
  readonly totalTicks: number;
  readonly onTargetPercentage: number;
  readonly averageErrorUnits: number;
  readonly maxErrorUnits: number;
}

export interface TempoPracticeSummary extends PracticeRunSummaryBase {
  readonly modeId: "tempo";
  readonly perfect: number;
  readonly early: number;
  readonly late: number;
  readonly miss: number;
  readonly totalBeats: number;
  readonly perfectPercentage: number;
  readonly hitPercentage: number;
}

export interface SwitchTrackPracticeSummary extends PracticeRunSummaryBase {
  readonly modeId: "switch-track";
  readonly switchesCompleted: number;
  readonly onTargetTicks: number;
  readonly totalTicks: number;
  readonly onTargetPercentage: number;
  readonly averageErrorUnits: number;
  readonly maxErrorUnits: number;
  readonly averageAcquisitionTicks: number;
}

export type PracticeSummaryRecord =
  | GridPracticeSummary
  | PinpointPracticeSummary
  | MultiPracticeSummary
  | HeadlinePracticeSummary
  | StrafePracticeSummary
  | MicroshotPracticeSummary
  | ReactionPracticeSummary
  | SmoothTrackPracticeSummary
  | TempoPracticeSummary
  | SwitchTrackPracticeSummary;
