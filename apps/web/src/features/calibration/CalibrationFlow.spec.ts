import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("live sensitivity calibration flow", () => {
  it("uses real trainer blocks with seeded blind A/B comparisons", () => {
    const source = readFileSync(
      new URL("./CalibrationFlow.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("<TrainerBootstrap");
    expect(source).toContain("comparePair");
    expect(source).toContain("runSeed={pair.seed}");
    expect(source).toContain("SensitivityGamePicker");
    expect(source).toContain("runtimeFmsToGameSensitivity");
    expect(source).toContain("equivalent.targetSensitivity");
    expect(source).toContain("fmsSensitivity: value");
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
      source.indexOf("if (!settings) {", source.indexOf("<TrainerBootstrap")),
    );
    expect(trainerBlock).not.toContain("SENSITIVITY_PROFILES");
  });
});
