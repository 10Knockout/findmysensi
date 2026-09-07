import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("page return navigation", () => {
  it.each([
    "./login/page.tsx",
    "./register/page.tsx",
    "./reset-password/page.tsx",
    "../src/features/calibration/CalibrationFlow.tsx",
  ])("adds the shared back control to %s", (relativePath) => {
    expect(source(relativePath)).toContain("<BackLink");
  });

  it.each([
    ["./forgot-password/page.tsx", "Back to Sign In"],
    ["./verify/page.tsx", "Return to registration"],
    ["./tools/converter/page.tsx", "FindMySensi"],
    ["./tools/mouse-swap/page.tsx", "Trainer Home"],
    ["./app/profile/page.tsx", "Trainer Home"],
    ["../src/features/settings/SettingsClient.tsx", "Trainer Home"],
    ["./app/workouts/page.tsx", "Trainer Home"],
    ["../src/features/results/PracticeResults.tsx", "Return to Hub"],
    ["../src/trainer/TrainerBootstrap.tsx", "Back to trainer home"],
  ])("keeps the existing return control in %s", (relativePath, label) => {
    expect(source(relativePath)).toContain(label);
  });

  it("does not expose the removed Sensi Battle page", () => {
    expect(
      existsSync(new URL("./app/sensi-battle/page.tsx", import.meta.url)),
    ).toBe(false);
    expect(source("./app/page.tsx")).not.toContain("/app/sensi-battle");
  });
});
