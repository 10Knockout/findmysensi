import { describe, expect, it } from "vitest";
import {
  LeaderboardResponseSchema,
  RegisterRequestSchema,
  TrainerSettingsSchema,
} from "../src/index.js";

describe("phase 1 product shell protocol", () => {
  it("registers with username, email and password only", () => {
    const parsed = RegisterRequestSchema.safeParse({
      username: "Knockout",
      email: "ko@example.com",
      password: "Strong!Pass1",
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
    });

    expect(parsed.success).toBe(false);
  });

  it("defaults trainer FOV to 103 and allows unknown DPI", () => {
    const parsed = TrainerSettingsSchema.parse({});

    expect(parsed.fovDegrees).toBe(103);
    expect(parsed.nominalDpi).toBeNull();
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
