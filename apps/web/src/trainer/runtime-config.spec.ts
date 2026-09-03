import { TrainerSettingsSchema } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { resolveGridshotRuntimeConfig } from "./runtime-config.js";

describe("Gridshot runtime configuration", () => {
  const defaults = TrainerSettingsSchema.parse({});

  it("maps FindMySensi sensitivity into the canonical Q20 browser gain", () => {
    const resolved = resolveGridshotRuntimeConfig({
      ...defaults,
      fmsSensitivity: "1.5",
    });
    expect(resolved.inputGain.degreesPerInputUnit).toBe(0.075);
    expect(resolved.inputGain.fixedPointAngleUnitsPerInputUnit).toBe(
      3_665_038_759,
    );
  });

  it("maps input processing presets into buffer capacities", () => {
    expect(
      resolveGridshotRuntimeConfig({ ...defaults, inputProcessing: "1000" })
        .inputBufferCapacity,
    ).toBe(2_048);
    expect(
      resolveGridshotRuntimeConfig({ ...defaults, inputProcessing: "8000" })
        .inputBufferCapacity,
    ).toBe(16_384);
    expect(
      resolveGridshotRuntimeConfig({ ...defaults, inputProcessing: "maximum" })
        .inputBufferCapacity,
    ).toBe(32_768);
  });

  it("never changes sensitivity when only input processing changes", () => {
    const low = resolveGridshotRuntimeConfig({
      ...defaults,
      fmsSensitivity: "1.25",
      inputProcessing: "1000",
    });
    const high = resolveGridshotRuntimeConfig({
      ...defaults,
      fmsSensitivity: "1.25",
      inputProcessing: "8000",
    });

    expect(low.inputGain).toEqual(high.inputGain);
    expect(low.inputBufferCapacity).not.toBe(high.inputBufferCapacity);
  });

  it("preserves presentation settings without creating mechanical target controls", () => {
    const resolved = resolveGridshotRuntimeConfig({
      ...defaults,
      fovDegrees: 120,
      targetColor: "#FF00AA",
      targetOpacity: 0.75,
      targetOutline: true,
      scalingMode: "stretch",
    });

    expect(resolved.fovDegrees).toBe(120);
    expect(resolved.targetColor).toBe("#FF00AA");
    expect(resolved.targetOpacity).toBe(0.75);
    expect(resolved.targetOutline).toBe(true);
    expect(resolved.scalingMode).toBe("stretch");
    expect("targetRadius" in resolved).toBe(false);
  });
});
