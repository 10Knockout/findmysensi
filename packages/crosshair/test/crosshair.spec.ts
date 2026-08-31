import { describe, it, expect } from "vitest";
import {
  CrosshairConfigSchema,
  CROSSHAIR_PRESETS,
  getCrosshairPreset,
  encodeCrosshairShareCode,
  decodeCrosshairShareCode,
} from "../src/index.js";

describe("Crosshair Schema & Share Codes (@findmysensi/crosshair)", () => {
  it("validates valid default configuration", () => {
    const validConfig = {
      style: "cross" as const,
      color: "#00ff88",
      size: 6,
      thickness: 2,
      gap: 3,
      dot: false,
      dotSize: 2,
      outline: true,
      outlineThickness: 1,
      outlineColor: "#000000",
      opacity: 1,
    };

    const parsed = CrosshairConfigSchema.parse(validConfig);
    expect(parsed.color).toBe("#00ff88");
  });

  it("retrieves valid preset by id", () => {
    const preset = getCrosshairPreset("pro_cyan_dot");
    expect(preset).toBeDefined();
    expect(preset?.config.color).toBe("#00f0ff");
    expect(preset?.config.style).toBe("dot");
  });

  it("encodes and decodes share codes faithfully (roundtrip)", () => {
    const original = CROSSHAIR_PRESETS[0]!.config;
    const shareCode = encodeCrosshairShareCode(original);

    expect(shareCode.startsWith("FMS1-")).toBe(true);

    const recovered = decodeCrosshairShareCode(shareCode);
    expect(recovered).toEqual(original);
  });

  it("rejects invalid share codes with bad prefix or payload", () => {
    expect(() => decodeCrosshairShareCode("INVALID-xyz")).toThrow();
    expect(() => decodeCrosshairShareCode("FMS1-invalid_base64_!!!")).toThrow();
  });
});
