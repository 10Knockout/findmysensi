import { describe, it, expect } from "vitest";
import { GridEvaluator } from "../src/grid/grid-evaluator.js";

describe("Grid Evaluator", () => {
  it("should correctly evaluate scores based on hits and accuracy", () => {
    const evaluator = new GridEvaluator();
    evaluator.processHit();
    evaluator.processHit();
    evaluator.processMiss();
    
    // 2 hits, 1 miss -> 2000 points * 2/3 accuracy = 1333
    const score = evaluator.computeFinalScore();
    expect(score).toBe(1333);
  });
});
