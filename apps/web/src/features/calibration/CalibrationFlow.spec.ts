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
    expect(source).toContain("SensitivityGamePicker");
    expect(source).toContain("runtimeFmsToGameSensitivity");
    expect(source).toContain(
      "displayedRecommendation.conversion.targetSensitivity",
    );
    expect(source).toContain(
      "fmsSensitivity: formatSensitivity(selectedSensitivity)",
    );
    expect(source).not.toContain("Sensi Battle");
    expect(source).not.toContain("Math.random");
  });

  it("keeps target choice out of blinded trainer block labels", () => {
    const source = readFileSync(
      new URL("./CalibrationFlow.tsx", import.meta.url),
      "utf8",
    );
    const trainerBlock = source.slice(
      source.indexOf("<TrainerBootstrap"),
      source.indexOf("if (recommendation)"),
    );
    expect(trainerBlock).not.toContain("targetGame");
    expect(trainerBlock).not.toContain("SENSITIVITY_PROFILES");
  });
});
