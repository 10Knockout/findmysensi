import { FULL_TURN_UNITS } from "@findmysensi/aim-core";
import type { LeaderboardContextV2 } from "@findmysensi/protocol";
import {
  findPersonalBest,
  isLeaderboardComparable,
  type PracticeSummaryRecord,
  type RunRecord,
} from "@findmysensi/trainer-runtime";

export interface OverviewMetric {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
  readonly tone?: "accent" | "positive" | "negative" | "muted";
}

export interface ResultsOverview {
  readonly personalBest: RunRecord | null;
  readonly summaryMetrics: readonly OverviewMetric[];
  readonly detailMetrics: readonly OverviewMetric[];
}

const TICK_RATE_HZ = 128;

/**
 * Creates the small, immediately useful Overview model. Population-backed
 * rank and percentile remain explicit placeholders until verified submission
 * exists; local history must never be presented as a global leaderboard.
 */
export function buildResultsOverview(
  current: RunRecord,
  history: readonly RunRecord[],
  leaderboard: LeaderboardContextV2 | null = null,
): ResultsOverview {
  const comparableRuns = history.filter((run) =>
    isLeaderboardComparable(current, run),
  );
  const personalBest = findPersonalBest(comparableRuns, current.modeId);
  const previousPersonalBest = findPersonalBest(
    comparableRuns.filter((run) => run.runId !== current.runId),
    current.modeId,
  );
  const scoreDelta = previousPersonalBest
    ? current.finalScore - previousPersonalBest.finalScore
    : null;
  const scoreDeltaNote = getScoreDeltaNote(
    current,
    personalBest,
    previousPersonalBest,
    scoreDelta,
  );
  const summary = current.summary;

  return {
    personalBest,
    summaryMetrics: [
      {
        label: "Score",
        value: formatInteger(current.finalScore),
        tone: "accent",
      },
      {
        label: "Personal Best",
        value: personalBest ? formatInteger(personalBest.finalScore) : "—",
        ...(personalBest ? {} : { note: "No eligible PB yet" }),
      },
      {
        label: "Vs Personal Best",
        value: scoreDelta === null ? "—" : formatSignedInteger(scoreDelta),
        ...(scoreDeltaNote ? { note: scoreDeltaNote } : {}),
        tone:
          scoreDelta === null || scoreDelta === 0
            ? "muted"
            : scoreDelta > 0
              ? "positive"
              : "negative",
      },
      getAccuracyMetric(summary),
      getPrimaryMetric(current),
      ...getLeaderboardMetrics(leaderboard),
    ],
    detailMetrics: getDetailMetrics(current),
  };
}

function getLeaderboardMetrics(
  leaderboard: LeaderboardContextV2 | null,
): readonly [OverviewMetric, OverviewMetric] {
  const standing = leaderboard?.standing;
  if (!standing) {
    return [
      {
        label: "Leaderboard Rank",
        value: "—",
        note: "Sync your run to see your rank",
        tone: "muted",
      },
      {
        label: "Percentile",
        value: "—",
        note: "Awaiting sync",
        tone: "muted",
      },
    ];
  }

  return [
    {
      label: "Leaderboard Rank",
      value: `#${standing.rank.toLocaleString()}`,
      note: `Best of ${standing.totalPlayers.toLocaleString()} on this board`,
    },
    standing.percentile === null
      ? {
          label: "Percentile",
          value: "—",
          note: `Shown once ${leaderboard.percentileMinimumPlayers.toLocaleString()} players have a score`,
          tone: "muted",
        }
      : {
          label: "Percentile",
          value: `${formatDecimal(standing.percentile, 1)}%`,
          note: `Top of ${leaderboard.totalPlayers.toLocaleString()} ranked players`,
        },
  ];
}

function getAccuracyMetric(summary: PracticeSummaryRecord): OverviewMetric {
  if (
    summary.modeId === "smooth-track" ||
    summary.modeId === "strafe" ||
    summary.modeId === "switch-track"
  ) {
    return {
      label: "Tracking Accuracy",
      value: formatPercent(summary.onTargetPercentage),
    };
  }

  return {
    label: "Accuracy",
    value: formatPercent(summary.accuracyPercentage),
  };
}

function getPrimaryMetric(current: RunRecord): OverviewMetric {
  const summary = current.summary;
  if (summary.modeId === "smooth-track" || summary.modeId === "strafe") {
    return {
      label: "Score / Min",
      value: formatDecimal(scorePerMinute(current)),
    };
  }

  if (summary.modeId === "switch-track") {
    return {
      label: "Average Acquisition",
      value: formatTicks(summary.averageAcquisitionTicks),
    };
  }

  if (
    summary.modeId === "reaction" &&
    summary.averageAcquisitionTicks !== undefined
  ) {
    return {
      label: "Average Acquisition",
      value: formatTicks(summary.averageAcquisitionTicks),
    };
  }

  return {
    label: "Kills / Sec",
    value: formatDecimal(summary.killsPerSecond),
  };
}

function getDetailMetrics(current: RunRecord): readonly OverviewMetric[] {
  const summary = current.summary;
  const timing = [
    {
      label: "Active Time",
      value: formatDuration(current.activeDurationMs),
    },
  ] satisfies readonly OverviewMetric[];
  const common = [
    {
      label: "Score / Min",
      value: formatDecimal(scorePerMinute(current)),
    },
    ...timing,
  ] satisfies readonly OverviewMetric[];

  if (summary.modeId === "smooth-track" || summary.modeId === "strafe") {
    return [
      {
        label: "Time On Target",
        value: formatDuration(ticksToMs(summary.onTargetTicks)),
      },
      {
        label: "Time Off Target",
        value: formatDuration(
          ticksToMs(Math.max(0, summary.totalTicks - summary.onTargetTicks)),
        ),
      },
      {
        label: "Average Aim Error",
        value: formatAngleUnits(summary.averageErrorUnits),
      },
      {
        label: "Maximum Aim Error",
        value: formatAngleUnits(summary.maxErrorUnits),
      },
      ...timing,
    ];
  }

  if (summary.modeId === "switch-track") {
    const activeMinutes = current.activeDurationMs / 60_000;
    return [
      {
        label: "Switches Completed",
        value: formatInteger(summary.switchesCompleted),
      },
      {
        label: "Switches / Min",
        value: formatDecimal(
          activeMinutes > 0 ? summary.switchesCompleted / activeMinutes : 0,
        ),
      },
      {
        label: "Time On Target",
        value: formatDuration(ticksToMs(summary.onTargetTicks)),
      },
      {
        label: "Average Aim Error",
        value: formatAngleUnits(summary.averageErrorUnits),
      },
      {
        label: "Maximum Aim Error",
        value: formatAngleUnits(summary.maxErrorUnits),
      },
      ...common,
    ];
  }

  return [
    { label: "Targets Hit", value: formatInteger(summary.hits) },
    { label: "Total Shots", value: formatInteger(summary.shots) },
    { label: "Misses", value: formatInteger(summary.misses) },
    {
      label: "Average Acquisition",
      value:
        summary.averageAcquisitionTicks === undefined
          ? "—"
          : formatTicks(summary.averageAcquisitionTicks),
      ...(summary.averageAcquisitionTicks === undefined
        ? { note: "Available on new runs", tone: "muted" as const }
        : {}),
    },
    ...common,
  ];
}

function getScoreDeltaNote(
  current: RunRecord,
  personalBest: RunRecord | null,
  previousPersonalBest: RunRecord | null,
  delta: number | null,
): string | undefined {
  if (!previousPersonalBest || delta === null) {
    return current.leaderboardEligible ? "First run" : "Run not counted";
  }
  if (!current.leaderboardEligible) return "Run not counted for best";
  if (delta > 0 && current.runId === personalBest?.runId) {
    return "New personal best";
  }
  if (delta === 0) return "Matched personal best";
  return undefined;
}

function scorePerMinute(run: RunRecord): number {
  if (run.activeDurationMs <= 0) return 0;
  return run.finalScore / (run.activeDurationMs / 60_000);
}

function ticksToMs(ticks: number): number {
  return (ticks / TICK_RATE_HZ) * 1000;
}

function formatTicks(ticks: number): string {
  return `${Math.round(ticksToMs(ticks)).toLocaleString()} ms`;
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${formatDecimal(milliseconds / 1000)} s`;
}

function formatAngleUnits(units: number): string {
  return `${formatDecimal((units / FULL_TURN_UNITS) * 360, 2)}°`;
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString();
}

function formatSignedInteger(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${formatInteger(Math.abs(value))}`;
}

function formatPercent(value: number): string {
  return `${formatDecimal(value, 2)}%`;
}

function formatDecimal(
  value: number,
  maximumFractionDigits: number = 2,
): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits,
  });
}
