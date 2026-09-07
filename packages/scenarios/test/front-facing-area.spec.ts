import { FULL_TURN_UNITS } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import { ANCHOR_FLICK_DEV_V0_DEFINITION } from "../src/anchor-flick/dev-v0.js";
import {
  DETERMINISTIC_GAIN_UNITS,
  LATTICE_QUANTUM_UNITS,
  MEDIUM_SPAWN_HALF_HEIGHT_DEGREES,
  MEDIUM_SPAWN_HALF_HEIGHT_UNITS,
  MEDIUM_SPAWN_HALF_WIDTH_DEGREES,
  MEDIUM_SPAWN_HALF_WIDTH_UNITS,
  MEDIUM_SPAWN_HEIGHT_UNITS,
  MEDIUM_SPAWN_WIDTH_UNITS,
} from "../src/front-facing-area.js";
import {
  GRID_DEV_V0_DEFINITION,
  generateGridSlots,
} from "../src/grid/dev-v0.js";
import {
  HEADLINE_DEPTH_RADIUS_UNITS,
  HEADLINE_DEV_V0_DEFINITION,
} from "../src/headline/dev-v0.js";
import { MOTION_FLICK_DEV_V0_DEFINITION } from "../src/motion-flick/dev-v0.js";
import {
  MULTI_DEV_V0_DEFINITION,
  MULTI_PEAK_RADIUS_UNITS,
} from "../src/multi/dev-v0.js";
import { PINPOINT_DEV_V0_DEFINITION } from "../src/pinpoint/dev-v0.js";
import {
  REACTION_DEV_V0_DEFINITION,
  REACTION_MAX_RADIUS_UNITS,
} from "../src/reaction/dev-v0.js";
import { STRAFE_DEV_V0_DEFINITION } from "../src/strafe/dev-v0.js";
import { SWITCH_TRACK_DEV_V0_DEFINITION } from "../src/switch-track/dev-v0.js";

const HORIZONTAL_FOV_DEGREES = 103;
const ASPECT_RATIO = 16 / 9;
const horizontalFovUnits = Math.round(
  (HORIZONTAL_FOV_DEGREES / 360) * FULL_TURN_UNITS,
);
const horizontalFovRadians = (HORIZONTAL_FOV_DEGREES / 180) * Math.PI;
const verticalFovRadians =
  2 * Math.atan(Math.tan(horizontalFovRadians / 2) / ASPECT_RATIO);
const verticalFovUnits = Math.round(
  (verticalFovRadians / (2 * Math.PI)) * FULL_TURN_UNITS,
);

const cases = [
  [
    GRID_DEV_V0_DEFINITION,
    GRID_DEV_V0_DEFINITION.simulation.targetRadiusAngleUnits,
  ],
  [
    PINPOINT_DEV_V0_DEFINITION,
    PINPOINT_DEV_V0_DEFINITION.simulation.targetRadiusAngleUnits,
  ],
  [MULTI_DEV_V0_DEFINITION, MULTI_PEAK_RADIUS_UNITS],
  [REACTION_DEV_V0_DEFINITION, REACTION_MAX_RADIUS_UNITS],
  [
    ANCHOR_FLICK_DEV_V0_DEFINITION,
    ANCHOR_FLICK_DEV_V0_DEFINITION.simulation.targetRadiusAngleUnits,
  ],
  [
    MOTION_FLICK_DEV_V0_DEFINITION,
    MOTION_FLICK_DEV_V0_DEFINITION.simulation.targetRadiusAngleUnits,
  ],
  [HEADLINE_DEV_V0_DEFINITION, HEADLINE_DEPTH_RADIUS_UNITS.near],
  [
    STRAFE_DEV_V0_DEFINITION,
    STRAFE_DEV_V0_DEFINITION.simulation.targetRadiusAngleUnits,
  ],
  [
    SWITCH_TRACK_DEV_V0_DEFINITION,
    SWITCH_TRACK_DEV_V0_DEFINITION.simulation.targetRadiusAngleUnits,
  ],
] as const;

describe("medium front-facing spawn envelope", () => {
  it("stays within half a lattice quantum of the nominal 24 by 14 degree half-extents", () => {
    // Snapping to the lattice quantum can move a half-extent by at most half a
    // quantum, so the envelope is nominal +/- ~0.054 deg per side. Anything
    // larger means the quantum or the nominal figures changed.
    const maximumDriftDegrees =
      (LATTICE_QUANTUM_UNITS / 2 / FULL_TURN_UNITS) * 360;

    const halfWidthDegrees =
      (MEDIUM_SPAWN_HALF_WIDTH_UNITS / FULL_TURN_UNITS) * 360;
    const halfHeightDegrees =
      (MEDIUM_SPAWN_HALF_HEIGHT_UNITS / FULL_TURN_UNITS) * 360;

    expect(
      Math.abs(halfWidthDegrees - MEDIUM_SPAWN_HALF_WIDTH_DEGREES),
    ).toBeLessThanOrEqual(maximumDriftDegrees);
    expect(
      Math.abs(halfHeightDegrees - MEDIUM_SPAWN_HALF_HEIGHT_DEGREES),
    ).toBeLessThanOrEqual(maximumDriftDegrees);

    expect(MEDIUM_SPAWN_WIDTH_UNITS).toBe(MEDIUM_SPAWN_HALF_WIDTH_UNITS * 2);
    expect(MEDIUM_SPAWN_HEIGHT_UNITS).toBe(MEDIUM_SPAWN_HALF_HEIGHT_UNITS * 2);
  });

  it("keeps every 5 by 5 grid slot exactly addressable from integer mouse input", () => {
    // generateGridSlots floors both the start offset and the step, so a
    // half-extent that is not a whole multiple of the lattice quantum drifts
    // the centre slot off zero and makes slot centres unreachable from whole
    // mouse counts. See tests/browser/grid-practice.spec.ts.
    expect(MEDIUM_SPAWN_HALF_WIDTH_UNITS % LATTICE_QUANTUM_UNITS).toBe(0);
    expect(MEDIUM_SPAWN_HALF_HEIGHT_UNITS % LATTICE_QUANTUM_UNITS).toBe(0);

    const slots = generateGridSlots(
      5,
      5,
      MEDIUM_SPAWN_WIDTH_UNITS,
      MEDIUM_SPAWN_HEIGHT_UNITS,
    );

    expect(slots).toHaveLength(25);
    for (const slot of slots) {
      const signedX =
        slot.xAngleUnits >= FULL_TURN_UNITS / 2
          ? slot.xAngleUnits - FULL_TURN_UNITS
          : slot.xAngleUnits;
      expect(Math.abs(signedX % DETERMINISTIC_GAIN_UNITS)).toBe(0);
      expect(Math.abs(slot.yAngleUnits % DETERMINISTIC_GAIN_UNITS)).toBe(0);
    }
  });

  it.each(cases)(
    "%s keeps the opposite edge visible at 103 FOV on 16:9",
    (definition, maximumRadius) => {
      expect(
        definition.simulation.spawnAreaWidthUnits + maximumRadius,
      ).toBeLessThan(horizontalFovUnits / 2);
      expect(
        definition.simulation.spawnAreaHeightUnits + maximumRadius,
      ).toBeLessThan(verticalFovUnits / 2);
    },
  );
});
