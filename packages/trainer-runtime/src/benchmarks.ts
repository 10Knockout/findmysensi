import { RankTier, rankForAccuracy } from "./ranks.js";
import { PracticeSummaryRecord } from "./results.js";

export type SkillCategory = "flick" | "precision" | "switching" | "tracking";

/**
 * Which of each category's real exercises currently share the click-family
 * accuracyPercentage metric. Mirrors the actual presentation.category
 * values already registered in @findmysensi/scenarios -- not a separate,
 * invented grouping. Modes without a shared metric (Smooth Track, Strafe
 * Track, Switch Track) are real members of these categories but do not yet
 * contribute a comparable number; adding their own metric families to this
 * benchmark is future work, not something to fake here.
 *
 * The tracking list is deliberately empty. Strafe Track used to sit here
 * while it was still a click mode; now that it scores on time-on-target it
 * has no accuracyPercentage to average, and a tracking benchmark built from
 * nothing would be a fabricated number. The category reports null until the
 * tracking family gets a benchmark of its own.
 */
const CATEGORY_CLICK_MODE_IDS: Record<
  SkillCategory,
  readonly PracticeSummaryRecord["modeId"][]
> = {
  flick: ["grid", "headline", "reaction", "anchor-flick", "turn180"],
  precision: ["microshot", "pinpoint"],
  switching: ["multi", "motion-flick"],
  tracking: [],
};

export interface SkillBenchmarkResult {
  readonly averageAccuracyPercentage: number;
  readonly rank: RankTier;
  readonly contributingModeIds: readonly PracticeSummaryRecord["modeId"][];
}

export type SkillBenchmarks = Record<
  SkillCategory,
  SkillBenchmarkResult | null
>;

function hasAccuracy(
  record: PracticeSummaryRecord,
): record is PracticeSummaryRecord & { accuracyPercentage: number } {
  return "accuracyPercentage" in record;
}

export function computeSkillBenchmarks(
  history: readonly PracticeSummaryRecord[],
): SkillBenchmarks {
  const result = {} as SkillBenchmarks;

  for (const category of Object.keys(
    CATEGORY_CLICK_MODE_IDS,
  ) as SkillCategory[]) {
    const modeIds = CATEGORY_CLICK_MODE_IDS[category];
    const relevant = history.filter(
      (r) => modeIds.includes(r.modeId) && hasAccuracy(r),
    ) as (PracticeSummaryRecord & { accuracyPercentage: number })[];

    if (relevant.length === 0) {
      result[category] = null;
      continue;
    }

    const sum = relevant.reduce((acc, r) => acc + r.accuracyPercentage, 0);
    const average = sum / relevant.length;
    const contributingModeIds = [...new Set(relevant.map((r) => r.modeId))];

    result[category] = {
      averageAccuracyPercentage: average,
      rank: rankForAccuracy(average),
      contributingModeIds,
    };
  }

  return result;
}
