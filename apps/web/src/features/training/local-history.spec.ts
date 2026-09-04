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
      modeId: "smooth-track",
      timestamp: 1000500,
      score: 30000,
      durationSeconds: 60,
      onTargetTicks: 3000,
      totalTicks: 7680,
      onTargetPercentage: 39.06,
      averageErrorUnits: 10000,
      maxErrorUnits: 50000,
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

  it("tracks lifetime stats independently of the capped history window", () => {
    const history = new LocalPracticeHistory();
    history.clear();

    for (let i = 0; i < 3; i++) {
      history.save({
        id: `run-${i}`,
        modeId: "grid",
        timestamp: i,
        score: 1000,
        hits: 40,
        shots: 50,
        misses: 10,
        accuracyPercentage: 80,
        durationSeconds: 60,
        killsPerSecond: 0.66,
        exactReplayPreserved: true,
        inputOverflowEvents: 0,
        inputHighWaterMark: 0,
      });
    }

    const stats = history.getLifetimeStats();
    expect(stats.totalSessions).toBe(3);
    expect(stats.totalShots).toBe(150);
    expect(stats.totalPracticeSeconds).toBe(180);

    history.clear();
    const cleared = history.getLifetimeStats();
    expect(cleared.totalSessions).toBe(0);
    expect(cleared.totalShots).toBe(0);
    expect(cleared.totalPracticeSeconds).toBe(0);
  });

  it("keeps lifetime stats growing past the 100-record capped history window", () => {
    const history = new LocalPracticeHistory();
    history.clear();

    for (let i = 0; i < 105; i++) {
      history.save({
        id: `run-${i}`,
        modeId: "smooth-track",
        timestamp: i,
        score: 100,
        durationSeconds: 10,
        onTargetTicks: 5,
        totalTicks: 10,
        onTargetPercentage: 50,
        averageErrorUnits: 1,
        maxErrorUnits: 2,
        exactReplayPreserved: true,
        inputOverflowEvents: 0,
        inputHighWaterMark: 0,
      });
    }

    expect(history.getAll().length).toBe(100);
    expect(history.getLifetimeStats().totalSessions).toBe(105);
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

  it("restores valid tracking and tempo summaries from local storage", () => {
    const base = {
      timestamp: 1,
      score: 100,
      durationSeconds: 60,
      exactReplayPreserved: true,
      inputOverflowEvents: 0,
      inputHighWaterMark: 1,
    };
    const records: PracticeSummaryRecord[] = [
      {
        ...base,
        id: "track",
        modeId: "smooth-track",
        onTargetTicks: 10,
        totalTicks: 20,
        onTargetPercentage: 50,
        averageErrorUnits: 10,
        maxErrorUnits: 20,
      },
      {
        ...base,
        id: "tempo",
        modeId: "tempo",
        perfect: 1,
        early: 2,
        late: 3,
        miss: 4,
        totalBeats: 10,
        perfectPercentage: 10,
        hitPercentage: 60,
      },
    ];
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => JSON.stringify(records)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    });

    const history = new LocalPracticeHistory();
    expect(history.getAll("smooth-track")[0]?.id).toBe("track");
    expect(history.getAll("tempo")[0]?.id).toBe("tempo");
  });
});
