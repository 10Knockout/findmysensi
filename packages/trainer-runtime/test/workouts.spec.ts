import { describe, expect, it } from "vitest";
import { getWorkoutById, WORKOUT_DEFINITIONS } from "../src/workouts.js";

const REAL_MODE_IDS = new Set([
  "grid",
  "pinpoint",
  "multi",
  "headline",
  "strafe",
  "smooth-track",
  "microshot",
  "reaction",
  "switch-track",
]);

describe("WORKOUT_DEFINITIONS", () => {
  it("every workout draws only from the fixed exercise catalog", () => {
    for (const workout of WORKOUT_DEFINITIONS) {
      expect(workout.modeIds.length).toBeGreaterThan(0);
      for (const modeId of workout.modeIds) {
        expect(REAL_MODE_IDS.has(modeId)).toBe(true);
      }
    }
  });

  it("has unique workout ids", () => {
    const ids = WORKOUT_DEFINITIONS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getWorkoutById", () => {
  it("finds a real workout by id", () => {
    expect(getWorkoutById("precision-workout")?.title).toBe(
      "Precision Workout",
    );
  });

  it("returns undefined for an unknown id rather than throwing", () => {
    expect(getWorkoutById("not-a-real-workout")).toBeUndefined();
  });
});
