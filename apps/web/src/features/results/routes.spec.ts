import { describe, expect, it } from "vitest";
import { getPracticeResultsRoutes } from "./routes.js";

describe("practice results routes", () => {
  it("keeps play-again, hub, and login continuation inside the authenticated app", () => {
    expect(getPracticeResultsRoutes("grid")).toEqual({
      playAgain: "/app/train/grid",
      hub: "/app",
      login: "/login?next=%2Fapp%2Ftrain%2Fgrid%2Fresults",
    });
  });
});
