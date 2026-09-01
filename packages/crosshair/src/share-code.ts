import { CrosshairConfig, CrosshairConfigSchema } from "./schema.js";

const PREFIX = "FMS1-";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function encodeCrosshairShareCode(config: CrosshairConfig): string {
  const parsed = CrosshairConfigSchema.parse(config);
  const json = JSON.stringify(parsed);
  return `${PREFIX}${bytesToBase64Url(new TextEncoder().encode(json))}`;
}

export function decodeCrosshairShareCode(code: string): CrosshairConfig {
  if (!code.startsWith(PREFIX)) {
    throw new Error(`Invalid share code prefix. Expected ${PREFIX}`);
  }
  const payload = code.slice(PREFIX.length);
  const json = new TextDecoder().decode(base64UrlToBytes(payload));
  return CrosshairConfigSchema.parse(JSON.parse(json));
}
