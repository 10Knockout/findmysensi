import { PracticeSummaryRecord } from "./results.js";

export interface WorkoutDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Ordered sequence of exercises to play, drawn only from the fixed mode catalog. */
  readonly modeIds: readonly PracticeSummaryRecord["modeId"][];
}

/**
 * Curated preset workouts. Every mode id here must be one of the real,
 * shipped exercises -- no user-generated content, no custom exercise
 * creation. Ordering is deliberate (warm-up-style progression within each
 * workout), not alphabetical or arbitrary.
 */
export const WORKOUT_DEFINITIONS: readonly WorkoutDefinition[] = [
  {
    id: "precision-workout",
    title: "Precision Workout",
    description:
      "Tight, deliberate corrections. Builds endpoint control before speed work.",
    modeIds: ["microshot", "pinpoint", "headline"],
  },
  {
    id: "tracking-workout",
    title: "Tracking Workout",
    description:
      "Continuous and moving-target control across the tracking family.",
    modeIds: ["smooth-track", "strafe", "switch-track"],
  },
  {
    id: "speed-workout",
    title: "Speed Workout",
    description: "Fast acquisition and target switching under time pressure.",
    modeIds: ["reaction", "grid", "multi"],
  },
  {
    id: "complete-aim-workout",
    title: "Complete Aim Workout",
    description:
      "One pass through every skill category: flick, precision, switching, and tracking.",
    modeIds: [
      "grid",
      "pinpoint",
      "multi",
      "smooth-track",
      "switch-track",
      "reaction",
    ],
  },
];

export function getWorkoutById(id: string): WorkoutDefinition | undefined {
  return WORKOUT_DEFINITIONS.find((w) => w.id === id);
}
