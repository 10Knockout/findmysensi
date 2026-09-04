import { createPrngV1 } from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { createMicroshotModeAdapter } from "../src/microshot-adapter.js";

describe("Microshot adapter", () => {
  it("replaces a hit target near the crosshair and records click metrics", () => {
    const adapter = createMicroshotModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    const first = adapter.getRenderTargets()[0]!;
    adapter.onShot(createTick(5), first.xAngleUnits, first.yAngleUnits, prng);

    expect(adapter.getRenderTargets()[0]!.id).not.toBe(first.id);
    expect(adapter.computeMetrics(128).hits).toBe(1);
  });
});
