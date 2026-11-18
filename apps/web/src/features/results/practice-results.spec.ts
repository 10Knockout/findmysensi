import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("results terminology integrity", () => {
  it("uses truthful local-result and eligibility copy", () => {
    const source = readFileSync(
      new URL("./PracticeResults.tsx", import.meta.url),
      "utf8",
    );
    const normalizedSource = source.replace(/\s+/g, " ");

    expect(normalizedSource).not.toContain(
      "Practice Mode (Offline / Not Synced)",
    );
    expect(normalizedSource).not.toContain(
      "Results from your practice session.",
    );
    expect(normalizedSource).not.toContain("No recent practice run recorded.");
    expect(normalizedSource).toContain("Local Result · Not Submitted");
    expect(normalizedSource).toContain(
      "This result is available on this device.",
    );
    expect(normalizedSource).toContain(
      "No recent local {resolvedTaskName} result found.",
    );
    expect(normalizedSource).toContain("Not leaderboard eligible");
    expect(normalizedSource).toContain("submitPracticeRunV2");
    expect(normalizedSource).toContain("Saved to Account");
    expect(normalizedSource).toContain("Saved to Account · Practice Only");
    expect(normalizedSource).toContain("Retry sync");
    expect(normalizedSource).not.toContain("authoritative Ranked verification");
    expect(normalizedSource).toContain("View leaderboard");
  });

  it("login page describes access as aim training rather than a single mode", () => {
    const loginSource = readFileSync(
      new URL("../../../app/login/page.tsx", import.meta.url),
      "utf8",
    );

    expect(loginSource).not.toContain("Sign in to access Gridshot");
    expect(loginSource).toContain("Sign in to access aim training");
  });
});
