import { describe, expect, it } from "vitest";
import { seasonRank } from "./season-rank.js";

describe("seasonal score tiers", () => {
  it("withholds badges until enough players have an eligible score", () => {
    expect(seasonRank(1, 29)).toBeNull();
    expect(seasonRank(1, 30)?.name).toBe("Diamond");
  });

  it("uses the inclusive published boundary for each tier", () => {
    expect(seasonRank(1, 100)?.name).toBe("Grandmaster");
    expect(seasonRank(10, 100)?.name).toBe("Diamond");
    expect(seasonRank(11, 100)?.name).toBe("Platinum");
    expect(seasonRank(20, 100)?.name).toBe("Platinum");
    expect(seasonRank(21, 100)?.name).toBe("Gold");
    expect(seasonRank(101, 100)).toBeNull();
  });
});
