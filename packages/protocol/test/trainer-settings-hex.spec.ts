import { describe, expect, it } from "vitest";
import {
  TrainerSettingsSchema,
  describeTrainerSettingsError,
  normalizeHexColor,
} from "../src/index.js";

describe("normalizeHexColor", () => {
  it("expands a 3-digit shorthand to lowercase #rrggbb", () => {
    expect(normalizeHexColor("#0F8")).toBe("#00ff88");
  });

  it("lowercases a 6-digit hex", () => {
    expect(normalizeHexColor("#7CFF6B")).toBe("#7cff6b");
  });

  it("adds a missing leading hash", () => {
    expect(normalizeHexColor("00fbff")).toBe("#00fbff");
  });

  it("leaves a non-hex value untouched so the schema can reject it", () => {
    expect(normalizeHexColor("rebeccapurple")).toBe("rebeccapurple");
  });
});

describe("TrainerSettingsSchema target colour", () => {
  it("accepts and normalises a legacy 3-digit hex instead of failing the save", () => {
    const parsed = TrainerSettingsSchema.safeParse({ targetColor: "#0f8" });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.targetColor).toBe("#00ff88");
  });

  it("still rejects a colour that is not hex at all", () => {
    const parsed = TrainerSettingsSchema.safeParse({
      targetColor: "not-a-colour",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(describeTrainerSettingsError(parsed.error)).toContain(
        "Target colour",
      );
    }
  });
});

describe("describeTrainerSettingsError", () => {
  it("names the offending field rather than a generic message", () => {
    const parsed = TrainerSettingsSchema.safeParse({ fovDegrees: 999 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(describeTrainerSettingsError(parsed.error)).toContain(
        "Field of view",
      );
    }
  });
});
