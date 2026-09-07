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

export interface MicroshotPracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "microshot";
}

export interface ReactionPracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "reaction";
}

export interface AnchorFlickPracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "anchor-flick";
}

export interface MotionFlickPracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "motion-flick";
}

export interface Turn180PracticeSummary extends ClickPracticeSummaryBase {
  readonly modeId: "turn180";
}

/** Shared shape for the no-click tracking modes. */
interface TrackingPracticeSummaryBase extends PracticeRunSummaryBase {
  readonly onTargetTicks: number;
  readonly totalTicks: number;
  readonly onTargetPercentage: number;
  readonly averageErrorUnits: number;
  readonly maxErrorUnits: number;
}

export interface SmoothTrackPracticeSummary extends TrackingPracticeSummaryBase {
  readonly modeId: "smooth-track";
}

export interface StrafePracticeSummary extends TrackingPracticeSummaryBase {
  readonly modeId: "strafe";
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
  | AnchorFlickPracticeSummary
  | MotionFlickPracticeSummary
  | Turn180PracticeSummary
  | SmoothTrackPracticeSummary
  | SwitchTrackPracticeSummary;
