import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("live sensitivity calibration flow", () => {
  it("uses real trainer blocks and the multi-mode recommendation kernel", () => {
    const source = readFileSync(
      new URL("./CalibrationFlow.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("<TrainerBootstrap");
    expect(source).toContain("buildCandidateOrder");
    expect(source).toContain("recommendSensitivityAcrossModes");
    expect(source).not.toContain("Sensi Battle");
    expect(source).not.toContain("Math.random");
  });
});
