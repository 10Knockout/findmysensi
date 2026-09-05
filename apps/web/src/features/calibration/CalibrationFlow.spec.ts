import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("live sensitivity calibration flow", () => {
  it("uses real trainer blocks and deterministic decision kernels", () => {
    const source = readFileSync(
      new URL("./CalibrationFlow.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("<TrainerBootstrap");
    expect(source).toContain("buildCandidateOrder");
    expect(source).toContain("buildBattleOrder");
    expect(source).toContain("recommendSensitivity");
    expect(source).toContain("decideBattle");
    expect(source).toContain("accuracyPercentage");
    expect(source).not.toContain("Math.random");
  });
});
