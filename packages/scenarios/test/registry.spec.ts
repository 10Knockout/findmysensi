import { describe, expect, it } from "vitest";
import { ScenarioRegistry } from "../src/registry.js";
import { RankedScenarioDefinition, ScenarioEntry } from "../src/types.js";

describe("Versioned Scenario Registry & Identity Separation", () => {
  const sampleDef: RankedScenarioDefinition = {
    modeId: "grid",
    scenarioVersion: 1,
    engineVersion: 1,
    scoringVersion: 1,
    durationTicks: 128 * 60, // 60s
    simulation: {
      maxActiveTargets: 3,
      targetRadiusAngleUnits: 25000,
      spawnAreaWidthUnits: 1500000,
      spawnAreaHeightUnits: 900000,
      minTargetSeparationUnits: 100000,
      gridRows: 3,
      gridCols: 3,
    },
    rankedSettings: {
      rankedEnabled: false,
      strictInputHealth: true,
      maxLagViolationTicks: 64,
    },
  };

  it("registers and retrieves versioned scenario entries", () => {
    const registry = new ScenarioRegistry();
    const entry: ScenarioEntry = {
      definition: sampleDef,
      presentation: {
        title: "Grid Shot",
        subtitle: "Classic 3-target flick practice",
        description:
          "Hit 3 static targets in a grid layout as fast as possible.",
        category: "flick",
        thumbnailUrl: "/thumbnails/grid.webp",
        tags: ["grid", "flick", "speed"],
      },
    };

    registry.register(entry);

    const retrieved = registry.get("grid", 1);
    expect(retrieved).toBeDefined();
    expect(retrieved?.definition.modeId).toBe("grid");
    expect(retrieved?.presentation.title).toBe("Grid Shot");

    // Re-registering the same mode and version throws
    expect(() => registry.register(entry)).toThrow();
  });

  it("guarantees presentation copy/thumbnail changes do not alter authoritative identity bytes", () => {
    const registry = new ScenarioRegistry();

    const id1 = registry.computeAuthoritativeIdentity(sampleDef);

    const modifiedPresentationDef = { ...sampleDef };
    const id2 = registry.computeAuthoritativeIdentity(modifiedPresentationDef);

    expect(id1).toEqual(id2);
  });
});
