import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalAchievements } from "./local-achievements.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const ZERO_LIFETIME = {
  totalSessions: 0,
  totalShots: 0,
  totalPracticeSeconds: 0,
};

describe("LocalAchievements (sticky, persisted unlocks)", () => {
  it("unlocks nothing with no history", () => {
    const store = new LocalAchievements();
    store.clear();
    expect(store.getUnlocked().size).toBe(0);
  });

  it("unlocks and persists first-session after one real session", () => {
    const store = new LocalAchievements();
    store.clear();

    const newlyUnlocked = store.sync([], {
      ...ZERO_LIFETIME,
      totalSessions: 1,
    });
    expect(newlyUnlocked.has("first-session")).toBe(true);
    expect(store.getUnlocked().has("first-session")).toBe(true);
  });

  it("stays unlocked (sticky) even if a later sync's snapshot no longer qualifies", () => {
    const store = new LocalAchievements();
    store.clear();

    store.sync([], { ...ZERO_LIFETIME, totalSessions: 10 });
    expect(store.getUnlocked().has("sessions-10")).toBe(true);

    // A later sync with a lower-looking lifetime snapshot (shouldn't
    // realistically happen, but must never un-unlock something earned).
    store.sync([], { ...ZERO_LIFETIME, totalSessions: 1 });
    expect(store.getUnlocked().has("sessions-10")).toBe(true);
  });

  it("only reports achievements newly unlocked by this sync call, not re-reports old ones", () => {
    const store = new LocalAchievements();
    store.clear();

    const first = store.sync([], { ...ZERO_LIFETIME, totalSessions: 1 });
    expect(first.has("first-session")).toBe(true);

    const second = store.sync([], { ...ZERO_LIFETIME, totalSessions: 1 });
    expect(second.has("first-session")).toBe(false);
  });
});
