import { afterEach, describe, expect, it, vi } from "vitest";
import type { PracticeRunSubmissionV2 } from "@findmysensi/protocol";
import { BrowserApiClient } from "../src/browser.js";

const run: PracticeRunSubmissionV2 = {
  protocolVersion: 2,
  runClass: "practice",
  runId: "practice-client-test",
  modeId: "grid",
  scenarioVersion: 0,
  scoringVersion: 0,
  analyticsVersion: 1,
  seed: [1, 2, 3, 4],
  startedAt: 1_000,
  completedAt: 61_000,
  activeDurationMs: 60_000,
  finalScore: 9_000,
  clientEligibility: {
    leaderboardEligible: true,
    invalidationReasons: [],
  },
  settings: {
    fmsSensitivity: "0.175",
    nominalDpi: 800,
    cmPer360: 54.43,
    fovDegrees: 103,
    resolution: "1920x1080",
    backingWidth: 1920,
    backingHeight: 1080,
    cssWidth: 1920,
    cssHeight: 1080,
    devicePixelRatio: 1,
    scalingMode: "fill",
    fullscreen: true,
    graphicsPreset: "automatic",
    crosshairCode: null,
    rawPointerInputAccepted: true,
    platform: "Windows",
    browser: "Chrome",
    medianRenderFps: null,
    p95FrameTimeMs: null,
    inputOverflowEvents: 0,
    inputHighWaterMark: 0,
  },
  summary: {
    id: "practice-client-test",
    modeId: "grid",
    timestamp: 61_000,
    score: 9_000,
    durationSeconds: 60,
    exactReplayPreserved: true,
    inputOverflowEvents: 0,
    inputHighWaterMark: 12,
    hits: 90,
    shots: 100,
    misses: 10,
    accuracyPercentage: 90,
    killsPerSecond: 1.5,
    averageAcquisitionTicks: 32,
  },
};

function responseBody() {
  return {
    protocolVersion: 2,
    runId: run.runId,
    submissionStatus: "stored",
    runClass: "practice",
    competitiveStatus: "listed",
    leaderboard: {
      board: {
        boardId: "grid:scenario-0:scoring-0",
        modeId: "grid",
        scenarioVersion: 0,
        scoringVersion: 0,
      },
      totalPlayers: 0,
      percentileMinimumPlayers: 10,
      standing: null,
    },
  };
}

describe("BrowserApiClient Protocol V2 runs", () => {
  afterEach(() => vi.restoreAllMocks());

  it("posts an idempotent practice payload with keepalive", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(responseBody()), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await new BrowserApiClient().submitPracticeRunV2(run);

    expect(result.ok).toBe(true);
    expect(result.data?.competitiveStatus).toBe("listed");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v2/runs",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        credentials: "include",
      }),
    );
    const requestBody = fetchSpy.mock.calls[0]?.[1]?.body;
    expect(typeof requestBody).toBe("string");
    expect(JSON.parse(requestBody as string)).toEqual(run);
  });

  it("fails closed when the server returns a malformed V2 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await new BrowserApiClient().submitPracticeRunV2(run);
    expect(result).toEqual({
      ok: false,
      error: "The run-sync response was invalid.",
    });
  });

  it("does not send a malformed local run record", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await new BrowserApiClient().submitPracticeRunV2({
      ...run,
      summary: { ...run.summary, timestamp: run.completedAt - 1 },
    });

    expect(result).toEqual({
      ok: false,
      error: "The local run record was invalid.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a valid-shaped response for the wrong run", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ...responseBody(), runId: "practice-other-run" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      new BrowserApiClient().submitPracticeRunV2(run),
    ).resolves.toEqual({
      ok: false,
      error: "The run-sync response was invalid.",
    });
  });
});

describe("BrowserApiClient Protocol V2 leaderboard", () => {
  afterEach(() => vi.restoreAllMocks());

  it("requests one versioned board and rejects identity drift", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          protocolVersion: 2,
          board: {
            boardId: "grid:scenario-2:scoring-3",
            modeId: "grid",
            scenarioVersion: 2,
            scoringVersion: 3,
          },
          rows: [],
          totalPlayers: 0,
          percentileMinimumPlayers: 10,
          standing: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const client = new BrowserApiClient();
    await expect(client.getLeaderboardV2("grid", 2, 3)).resolves.toMatchObject({
      ok: true,
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v2/leaderboards/grid/2/3/50/0",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );

    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          protocolVersion: 2,
          board: {
            boardId: "grid:scenario-2:scoring-4",
            modeId: "grid",
            scenarioVersion: 2,
            scoringVersion: 4,
          },
          rows: [],
          totalPlayers: 0,
          percentileMinimumPlayers: 10,
          standing: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    await expect(client.getLeaderboardV2("grid", 2, 3)).resolves.toEqual({
      ok: false,
      error: "The leaderboard response was invalid.",
    });
  });

  it("accepts a matching monthly board and sends bounded page parameters", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          protocolVersion: 2,
          board: {
            boardId: "grid:scenario-0:scoring-0:season-2026-09",
            modeId: "grid",
            scenarioVersion: 0,
            scoringVersion: 0,
            seasonId: "2026-09",
            seasonStartsAt: "2026-09-01T00:00:00.000Z",
            seasonEndsAt: "2026-10-01T00:00:00.000Z",
          },
          rows: [],
          totalPlayers: 70,
          percentileMinimumPlayers: 10,
          standing: null,
          page: { offset: 20, limit: 10, hasMore: true },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      new BrowserApiClient().getLeaderboardV2("grid", 0, 0, {
        limit: 10,
        offset: 20,
      }),
    ).resolves.toMatchObject({ ok: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v2/leaderboards/grid/0/0/10/20",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
