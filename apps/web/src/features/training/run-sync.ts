import type { PracticeRunSubmissionV2 } from "@findmysensi/protocol";
import type { RunRecord } from "@findmysensi/trainer-runtime";

/**
 * Maps the local run model onto Protocol V2 without making the runtime model a
 * wire contract. `clientEligibility` remains diagnostic; the secure service
 * never treats it as an authoritative competitive disposition.
 */
export function toPracticeRunSubmissionV2(
  run: RunRecord,
): PracticeRunSubmissionV2 {
  return {
    protocolVersion: 2,
    runClass: "practice",
    runId: run.runId,
    modeId: run.modeId,
    scenarioVersion: run.scenarioVersion,
    scoringVersion: run.scoringVersion,
    analyticsVersion: run.analyticsVersion,
    seed: [run.seed[0], run.seed[1], run.seed[2], run.seed[3]],
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    activeDurationMs: run.activeDurationMs,
    finalScore: run.finalScore,
    clientEligibility: {
      leaderboardEligible: run.leaderboardEligible,
      invalidationReasons: [...run.invalidationReasons],
    },
    settings: {
      ...run.settings,
      scalingMode: requireScalingMode(run.settings.scalingMode),
      graphicsPreset: requireGraphicsPreset(run.settings.graphicsPreset),
    },
    summary: { ...run.summary },
  };
}

function requireScalingMode(
  value: string,
): PracticeRunSubmissionV2["settings"]["scalingMode"] {
  switch (value) {
    case "fit":
    case "stretch":
    case "black-bars":
    case "fill":
      return value;
    default:
      throw new RangeError(`Unsupported run scaling mode: ${value}`);
  }
}

function requireGraphicsPreset(
  value: string,
): PracticeRunSubmissionV2["settings"]["graphicsPreset"] {
  switch (value) {
    case "automatic":
    case "potato":
    case "low":
    case "balanced":
    case "high":
      return value;
    default:
      throw new RangeError(`Unsupported run graphics preset: ${value}`);
  }
}
