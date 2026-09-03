import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("results terminology integrity", () => {
  it("does not contain obsolete user-facing 'Practice Mode' or 'practice session' copy", () => {
    const source = readFileSync(
      new URL("./PracticeResults.tsx", import.meta.url),
      "utf8",
    );

    const normalizedSource = source.replace(/\s+/g, " ");

    // Forbidden obsolete strings
    expect(normalizedSource).not.toContain(
      "Practice Mode (Offline / Not Synced)",
    );
    expect(normalizedSource).not.toContain(
      "Results from your practice session.",
    );
    expect(normalizedSource).not.toContain("No recent practice run recorded.");

    // Required truthful strings
    expect(normalizedSource).toContain("Local Result · Not Submitted");
    expect(normalizedSource).toContain(
      "This run is stored locally. Official leaderboard verification is not enabled yet.",
    );
    expect(normalizedSource).toContain("No recent local Gridshot result found.");
  });

  it("login page describes access as Gridshot training rather than practice", () => {
    const loginSource = readFileSync(
      new URL("../../../app/login/page.tsx", import.meta.url),
      "utf8",
    );

    expect(loginSource).not.toContain("Sign in to access Gridshot practice");
    expect(loginSource).toContain("Sign in to access Gridshot training");
  });
});
