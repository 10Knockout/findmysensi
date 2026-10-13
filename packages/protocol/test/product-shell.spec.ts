import { describe, expect, it } from "vitest";
import {
  LeaderboardResponseSchema,
  RegisterRequestSchema,
  TrainerSettingsSchema,
} from "../src/index.js";

describe("phase 1 product shell protocol", () => {
  it.each(["0", "0.0", "101", "9999999999999999999999999999999999999999"])(
    "rejects sensitivity %s that cannot initialize a training run",
    (fmsSensitivity) => {
      expect(TrainerSettingsSchema.safeParse({ fmsSensitivity }).success).toBe(
        false,
      );
    },
  );

  it("requires both dimensions when saving a custom resolution", () => {
    expect(
      TrainerSettingsSchema.safeParse({ resolution: "custom" }).success,
    ).toBe(false);
    expect(
      TrainerSettingsSchema.safeParse({
        resolution: "custom",
        customResolutionWidth: 1920,
      }).success,
    ).toBe(false);
    expect(
      TrainerSettingsSchema.safeParse({
        resolution: "custom",
        customResolutionWidth: 1920,
        customResolutionHeight: 1080,
      }).success,
    ).toBe(true);
  });
  it("registers with credentials and explicit 18+ attestation", () => {
    const parsed = RegisterRequestSchema.safeParse({
      username: "Knockout",
      email: "ko@example.com",
      password: "Strong!Pass1",
      ageAttested: true,
    });

    expect(parsed.success).toBe(true);
  });

  it("does not accept legacy first/last-name registration fields", () => {
    const parsed = RegisterRequestSchema.safeParse({
      firstName: "Not",
      lastName: "Required",
      username: "Knockout",
      email: "ko@example.com",
      password: "Strong!Pass1",
      ageAttested: true,
    });

    expect(parsed.success).toBe(false);
  });

  it("defaults trainer FOV and weapon hand while allowing unknown DPI", () => {
    const parsed = TrainerSettingsSchema.parse({});

    expect(parsed.fovDegrees).toBe(103);
    expect(parsed.nominalDpi).toBeNull();
    expect(parsed.weaponHand).toBe("right");
    expect(TrainerSettingsSchema.parse({ weaponHand: "left" }).weaponHand).toBe(
      "left",
    );
    expect(
      TrainerSettingsSchema.safeParse({ weaponHand: "center" }).success,
    ).toBe(false);
  });

  it("keeps target geometry, style, movement and score outside mutable settings", () => {
    const parsed = TrainerSettingsSchema.safeParse({
      targetRadius: 100000,
      targetStyle: "screen-sized",
      targetSpeed: 0,
      pointsPerHit: 10000,
    });

    expect(parsed.success).toBe(false);
  });

  it("models leaderboards per mode instead of as one global board", () => {
    const grid = LeaderboardResponseSchema.parse({
      modeId: "gridshot",
      rows: [
        {
          rank: 1,
          userId: "user-1",
          username: "Knockout",
          score: 12345,
          achievedAt: "2026-08-31T12:00:00.000Z",
        },
      ],
    });

    expect(grid.modeId).toBe("gridshot");
    expect(grid.rows).toHaveLength(1);
  });
});
