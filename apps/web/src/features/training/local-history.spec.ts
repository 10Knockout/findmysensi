import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LocalPracticeHistory,
  PracticeSummaryRecord,
} from "./local-history.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Privacy-Safe Local Practice History", () => {
  it("saves and retrieves practice summary records without persisting raw inputs", () => {
    const history = new LocalPracticeHistory();
    history.clear();

    const sample1: PracticeSummaryRecord = {
      id: "run-1",
      modeId: "grid",
      timestamp: 1000000,
      score: 54000,
      hits: 60,
      shots: 65,
      misses: 5,
      accuracyPercentage: 92.3,
      durationSeconds: 60,
      killsPerSecond: 1.0,
      exactReplayPreserved: true,
      inputOverflowEvents: 0,
      inputHighWaterMark: 12,
    };

    const sample2: PracticeSummaryRecord = {
      id: "run-2",
      modeId: "tracking",
      timestamp: 1000500,
      score: 30000,
      hits: 30,
      shots: 35,
      misses: 5,
      accuracyPercentage: 85.7,
      durationSeconds: 60,
      killsPerSecond: 0.5,
      exactReplayPreserved: false,
      inputOverflowEvents: 2,
      inputHighWaterMark: 4096,
    };

    history.save(sample1);
    history.save(sample2);

    const all = history.getAll();
    expect(all.length).toBe(2);
    expect(all[0]?.id).toBe("run-2");

    const gridOnly = history.getAll("grid");
    expect(gridOnly.length).toBe(1);
    expect(gridOnly[0]?.id).toBe("run-1");

    history.clear();
    expect(history.getAll().length).toBe(0);
  });

  it("treats corrupted or wrong-shaped persisted history as empty instead of crashing results", () => {
    const localStorage = {
      getItem: vi.fn(() => JSON.stringify({ not: "an array" })),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("window", { localStorage });

    const history = new LocalPracticeHistory();

    expect(() => history.getAll("grid")).not.toThrow();
    expect(history.getAll("grid")).toEqual([]);
  });
});
