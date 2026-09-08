import { TrainerSettingsSchema } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { resolveTrainerRuntimeConfig } from "./runtime-config.js";

describe("shared trainer runtime configuration", () => {
  const defaults = TrainerSettingsSchema.parse({});

  it("maps one Aimlabs-native sensitivity into the canonical Q20 browser gain", () => {
    const resolved = resolveTrainerRuntimeConfig({
      ...defaults,
      fmsSensitivity: "1.5",
    });
    expect(resolved.inputGain.degreesPerInputUnit).toBe(0.075);
    expect(resolved.inputGain.fixedPointAngleUnitsPerInputUnit).toBe(
      3_665_038_759,
    );
  });

  it("accepts one global sensitivity and rejects per-game settings", () => {
    const resolved = resolveTrainerRuntimeConfig({
      ...defaults,
      fmsSensitivity: "0.175",
    });

    expect(resolved.inputGain.fmsSensitivity).toBe("0.175");
    expect(
      TrainerSettingsSchema.safeParse({
        ...defaults,
        sensitivityByGame: { grid: "0.175", reaction: "0.2" },
      }).success,
    ).toBe(false);
  });

  it("always resolves the safe, 8000 Hz-capable input buffer with no user-facing preset", () => {
    expect(resolveTrainerRuntimeConfig(defaults).inputBufferCapacity).toBe(
      16_384,
    );
    // The legacy inputProcessing field may still be present on old
    // persisted settings; it must be accepted but ignored, never consulted
    // for buffer sizing.
    expect(
      resolveTrainerRuntimeConfig({ ...defaults, inputProcessing: "1000" })
        .inputBufferCapacity,
    ).toBe(16_384);
    expect(
      resolveTrainerRuntimeConfig({ ...defaults, inputProcessing: "8000" })
        .inputBufferCapacity,
    ).toBe(16_384);
    expect(
      resolveTrainerRuntimeConfig({ ...defaults, inputProcessing: "maximum" })
        .inputBufferCapacity,
    ).toBe(16_384);
  });

  it("never changes sensitivity or buffer capacity based on the legacy input processing field", () => {
    const low = resolveTrainerRuntimeConfig({
      ...defaults,
      fmsSensitivity: "1.25",
      inputProcessing: "1000",
    });
    const high = resolveTrainerRuntimeConfig({
      ...defaults,
      fmsSensitivity: "1.25",
      inputProcessing: "8000",
    });

    expect(low.inputGain).toEqual(high.inputGain);
    expect(low.inputBufferCapacity).toBe(high.inputBufferCapacity);
  });

  it("preserves presentation settings without creating mechanical target controls", () => {
    const resolved = resolveTrainerRuntimeConfig({
      ...defaults,
      fovDegrees: 120,
      targetColor: "#FF00AA",
      targetOpacity: 0.75,
      targetOutline: true,
      scalingMode: "stretch",
      weaponHand: "left",
    });

    expect(resolved.fovDegrees).toBe(120);
    expect(resolved.targetColor).toBe("#FF00AA");
    expect(resolved.targetOpacity).toBe(0.75);
    expect(resolved.targetOutline).toBe(true);
    expect(resolved.scalingMode).toBe("stretch");
    expect(resolved.weaponHand).toBe("left");
    expect("targetRadius" in resolved).toBe(false);
  });
});
