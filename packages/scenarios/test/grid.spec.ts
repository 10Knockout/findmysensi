import { describe, it, expect } from "vitest";
import { GridMechanics, GRID_MAX_TARGETS } from "../src/grid/mechanics.js";

describe("Grid Mechanics", () => {
  it("should spawn max targets deterministically", () => {
    const seed = new Uint8Array(16);
    const grid1 = new GridMechanics(seed);
    const grid2 = new GridMechanics(seed);

    expect(grid1.targets.length).toBe(GRID_MAX_TARGETS);
    expect(grid1.targets).toEqual(grid2.targets);
  });

  it("should process shot and respawn", () => {
    const seed = new Uint8Array(16);
    const grid = new GridMechanics(seed);
    const t0 = grid.targets[0]!;
    
    // Shoot exactly at target center
    const hit = grid.processShot(t0.xAngleUnits, t0.yAngleUnits);
    expect(hit).toBe(true);
    expect(grid.targets.length).toBe(GRID_MAX_TARGETS);
    
    // Original target should be gone
    const found = grid.targets.find(t => t.id === t0.id);
    expect(found).toBeUndefined();
  });
});
