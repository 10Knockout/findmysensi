import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrainerSettingsSchema } from "@findmysensi/protocol";
import { InGameSettingsModal } from "./InGameSettingsModal.js";
import { resolveTrainerRuntimeConfig } from "./runtime-config.js";
import { SensitivityEquivalents } from "../components/SensitivityEquivalents.js";

describe("saved browser sensitivity presentation", () => {
  const settings = TrainerSettingsSchema.parse({
    fmsSensitivity: "0.67925",
    nominalDpi: 1600,
  });

  it("renders the reported saved value with its canonical equivalent and turn distance", () => {
    const html = renderToStaticMarkup(
      React.createElement(InGameSettingsModal, {
        isOpen: true,
        onClose: () => {},
        currentSettings: settings,
        onSaveAndApply: async () => {},
      }),
    );
    expect(html).toContain("FindMySensi Browser Sensitivity");
    expect(html).toContain('value="0.67925"');
    expect(html).toContain("0.485179");
    expect(html).toContain("23.56 cm / 360");
    expect(html).not.toContain("16.8 cm / 360");
    expect(html).not.toContain("use this same number");
  });

  it("keeps the tested runtime gain when the recommendation is saved", () => {
    const runtime = resolveTrainerRuntimeConfig(settings);
    expect(runtime.inputGain.fmsSensitivity).toBe("0.67925");
    expect(runtime.inputGain.degreesPerInputUnit).toBeCloseTo(0.0339625, 10);
  });

  it("does not invent a turn distance or DPI for unknown hardware settings", () => {
    const html = renderToStaticMarkup(
      React.createElement(InGameSettingsModal, {
        isOpen: true,
        onClose: () => {},
        currentSettings: { ...settings, nominalDpi: null },
        onSaveAndApply: async () => {},
      }),
    );
    expect(html).toContain("Set your mouse DPI");
    expect(html).not.toContain('value="800"');
    expect(html).not.toContain("cm / 360");
  });

  it("shows unavailable metrics for invalid sensitivity instead of crashing", () => {
    const html = renderToStaticMarkup(
      React.createElement(SensitivityEquivalents, {
        sensitivity: 0,
        dpi: 1600,
      }),
    );
    expect(html).toContain("Unavailable");
    expect(html).not.toContain("NaN");
  });
});
