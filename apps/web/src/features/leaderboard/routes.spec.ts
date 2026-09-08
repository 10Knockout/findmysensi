import { describe, expect, it } from "vitest";
import { getModeLeaderboardRoutes } from "./routes.js";

describe("getModeLeaderboardRoutes", () => {
  it("builds encoded per-mode paths", () => {
    const routes = getModeLeaderboardRoutes("switch-track");
    expect(routes.play).toBe("/app/train/switch-track");
    expect(routes.results).toBe("/app/train/switch-track/results");
    expect(routes.hub).toBe("/app");
  });
});
