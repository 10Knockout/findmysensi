import { CrosshairConfig } from "./schema.js";

export interface CrosshairPreset {
  readonly id: string;
  readonly name: string;
  readonly config: CrosshairConfig;
}

export const CROSSHAIR_PRESETS: CrosshairPreset[] = [
  {
    id: "default_green",
    name: "Default Emerald Cross",
    config: {
      style: "cross",
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
    },
  },
  {
    id: "pro_cyan_dot",
    name: "Cyan Precision Dot",
    config: {
      style: "dot",
      color: "#00f0ff",
      size: 2,
      thickness: 2,
      gap: 0,
      dot: true,
      dotSize: 3,
      outline: true,
      outlineThickness: 1,
      outlineColor: "#000000",
      opacity: 1,
    },
  },
  {
    id: "cs_classic_static",
    name: "CS Classic Static (Yellow)",
    config: {
      style: "classic",
      color: "#ffff00",
      size: 5,
      thickness: 1,
      gap: 2,
      dot: false,
      dotSize: 2,
      outline: true,
      outlineThickness: 1,
      outlineColor: "#000000",
      opacity: 1,
    },
  },
  {
    id: "val_compact_white",
    name: "Valorant Compact 1-4-2-2 (White)",
    config: {
      style: "cross",
      color: "#ffffff",
      size: 4,
      thickness: 2,
      gap: 2,
      dot: false,
      dotSize: 2,
      outline: true,
      outlineThickness: 1,
      outlineColor: "#000000",
      opacity: 1,
    },
  },
  {
    id: "circle_magenta",
    name: "Circle Focus (Magenta)",
    config: {
      style: "circle",
      color: "#ff007f",
      size: 8,
      thickness: 2,
      gap: 0,
      dot: true,
      dotSize: 2,
      outline: true,
      outlineThickness: 1,
      outlineColor: "#000000",
      opacity: 0.9,
    },
  },
];

export function getCrosshairPreset(id: string): CrosshairPreset | undefined {
  return CROSSHAIR_PRESETS.find((p) => p.id === id);
}
