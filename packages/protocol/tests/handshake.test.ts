import { describe, it, expect } from "vitest";
import {
  HandshakeRequestSchema,
  HandshakeResponseSchema,
} from "../src/index.js";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const GOLDEN_DIR = join(ROOT, "tests/golden/protocol-v1");

describe("Handshake Schemas vs Goldens", () => {
  it("should validate golden handshake request", () => {
    const json = JSON.parse(
      readFileSync(join(GOLDEN_DIR, "golden-handshake-request.json"), "utf-8"),
    );
    const result = HandshakeRequestSchema.safeParse(json);
    expect(result.success).toBe(true);
  });

  it("should validate golden handshake response", () => {
    const json = JSON.parse(
      readFileSync(join(GOLDEN_DIR, "golden-handshake-response.json"), "utf-8"),
    );
    const result = HandshakeResponseSchema.safeParse(json);
    expect(result.success).toBe(true);
  });

  it("should reject malformed requests", () => {
    const result = HandshakeRequestSchema.safeParse({
      scenario: "unknown",
      resolution: { width: -100, height: 1080 },
      clientVersion: "",
    });
    expect(result.success).toBe(false);
  });
});
