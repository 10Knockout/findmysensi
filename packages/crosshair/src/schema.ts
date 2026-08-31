import { z } from "zod";

export type CrosshairStyle = "cross" | "dot" | "circle" | "classic";

export const CrosshairStyleSchema = z.enum([
  "cross",
  "dot",
  "circle",
  "classic",
]);

export const HexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid HEX color format");

export const CrosshairConfigSchema = z.object({
  style: CrosshairStyleSchema.default("cross"),
  color: HexColorSchema.default("#00ff88"),
  size: z.number().int().min(1).max(100).default(6),
  thickness: z.number().int().min(1).max(50).default(2),
  gap: z.number().int().min(0).max(100).default(3),
  dot: z.boolean().default(false),
  dotSize: z.number().int().min(1).max(20).default(2),
  outline: z.boolean().default(true),
  outlineThickness: z.number().int().min(1).max(10).default(1),
  outlineColor: HexColorSchema.default("#000000"),
  opacity: z.number().min(0).max(1).default(1),
});

export type CrosshairConfig = {
  style: CrosshairStyle;
  color: string;
  size: number;
  thickness: number;
  gap: number;
  dot: boolean;
  dotSize: number;
  outline: boolean;
  outlineThickness: number;
  outlineColor: string;
  opacity: number;
};
