import { describe, expect, it } from "vitest";
import {
  buildBattleOrder,
  decideBattle,
  type BattleResult,
} from "../src/sensi-battle.js";

describe("buildBattleOrder", () => {
  it("returns exactly A and B, each once", () => {
    const order = buildBattleOrder([1, 2, 3, 4]);
    expect([...order].sort()).toEqual(["A", "B"]);
  });

  it("is deterministic for the same seed", () => {
    expect(buildBattleOrder([7, 7, 7, 7])).toEqual(
      buildBattleOrder([7, 7, 7, 7]),
    );
  });
});

function result(id: "A" | "B", accuracyPercentage: number): BattleResult {
  return { id, accuracyPercentage };
}

describe("decideBattle", () => {
  it("declares COULD_NOT_TELL when the gap is under 3 points", () => {
    const decision = decideBattle(result("A", 80), result("B", 81.5));
    expect(decision.winner).toBe("COULD_NOT_TELL");
  });

  it("picks the clear winner with HIGH confidence when the gap is >= 8", () => {
    const decision = decideBattle(result("A", 60), result("B", 90));
    expect(decision.winner).toBe("B");
    expect(decision.confidence).toBe("HIGH");
  });

  it("picks the winner with MODERATE confidence when the gap is 3-7.9", () => {
    const decision = decideBattle(result("A", 88), result("B", 82));
    expect(decision.winner).toBe("A");
    expect(decision.confidence).toBe("MODERATE");
  });

  it("never fabricates a winner when the two candidates tie exactly", () => {
    const decision = decideBattle(result("A", 75), result("B", 75));
    expect(decision.winner).toBe("COULD_NOT_TELL");
  });
});
