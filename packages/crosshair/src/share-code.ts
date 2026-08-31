import { CrosshairConfig, CrosshairConfigSchema } from "./schema.js";

const PREFIX = "FMS1-";

/**
 * Encodes a CrosshairConfig into a portable, URL-safe share code.
 */
export function encodeCrosshairShareCode(config: CrosshairConfig): string {
  const parsed = CrosshairConfigSchema.parse(config);
  const jsonStr = JSON.stringify(parsed);
  const base64 = Buffer.from(jsonStr, "utf8").toString("base64url");
  return `${PREFIX}${base64}`;
}

/**
 * Decodes a portable share code into a validated CrosshairConfig.
 */
export function decodeCrosshairShareCode(code: string): CrosshairConfig {
  if (!code.startsWith(PREFIX)) {
    throw new Error(`Invalid share code prefix. Expected ${PREFIX}`);
  }
  const payload = code.slice(PREFIX.length);
  const jsonStr = Buffer.from(payload, "base64url").toString("utf8");
  const parsedObj = JSON.parse(jsonStr);
  return CrosshairConfigSchema.parse(parsedObj);
}
