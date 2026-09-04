import { RANK_TIERS } from "./ranks.js";
import type { PracticeSummaryRecord } from "./results.js";

const CLICK_MODE_IDS = new Set<PracticeSummaryRecord["modeId"]>([
  "grid",
  "pinpoint",
  "multi",
  "headline",
  "strafe",
  "microshot",
  "reaction",
]);

interface ClickAccuracyRecord {
  readonly accuracyPercentage: number;
}

function hasAccuracy(
  record: PracticeSummaryRecord,
): record is PracticeSummaryRecord & ClickAccuracyRecord {
  return CLICK_MODE_IDS.has(record.modeId);
}

/**
 * Highest real accuracy across click-based practice history -- the input
 * frameForAccuracy/titleForAccuracy expect. Returns 0 (Iron/lowest tier)
 * for empty or click-less history, never a fabricated placeholder.
 */
export function bestAccuracyFromHistory(
  history: readonly PracticeSummaryRecord[],
): number {
  let best = 0;
  for (const record of history) {
    if (!hasAccuracy(record)) continue;
    if (record.accuracyPercentage > best) best = record.accuracyPercentage;
  }
  return best;
}

/**
 * Profile cosmetics: avatars, frames, and titles. Frames and titles are
 * deliberately derived 1:1 from the existing RANK_TIERS (ranks.ts) rather
 * than a second, parallel progression system -- one source of truth for
 * "how good is this player," reused for both the leaderboard rank and the
 * profile decoration. Avatars are a free curated preset list (identity, not
 * a reward) rendered as glyph-on-color, so no image asset pipeline is
 * required.
 */

export interface AvatarOption {
  readonly id: string;
  readonly label: string;
  readonly glyph: string;
  readonly colorHex: string;
}

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  { id: "crosshair", label: "Crosshair", glyph: "◎", colorHex: "#22c55e" },
  { id: "target", label: "Target", glyph: "◉", colorHex: "#ef4444" },
  { id: "bolt", label: "Bolt", glyph: "⚡", colorHex: "#eab308" },
  { id: "flame", label: "Flame", glyph: "🔥", colorHex: "#f97316" },
  { id: "eye", label: "Eye", glyph: "◈", colorHex: "#3b82f6" },
  { id: "star", label: "Star", glyph: "★", colorHex: "#a855f7" },
  { id: "diamond", label: "Diamond", glyph: "◆", colorHex: "#06b6d4" },
  { id: "shield", label: "Shield", glyph: "⛨", colorHex: "#64748b" },
  { id: "wave", label: "Wave", glyph: "〜", colorHex: "#14b8a6" },
  { id: "spark", label: "Spark", glyph: "✦", colorHex: "#ec4899" },
  { id: "hex", label: "Hex", glyph: "⬡", colorHex: "#84cc16" },
  { id: "arrow", label: "Arrow", glyph: "➤", colorHex: "#f43f5e" },
];

export interface FrameTier {
  readonly id: string;
  readonly rankName: string;
  readonly colorHex: string;
}

const FRAME_COLORS: readonly string[] = [
  "#78716c", // Iron
  "#b45309", // Bronze
  "#94a3b8", // Silver
  "#eab308", // Gold
  "#22d3ee", // Platinum
  "#60a5fa", // Diamond
  "#a855f7", // Master
  "#f43f5e", // Grandmaster
  "#f8fafc", // Elite
];

export const FRAME_TIERS: readonly FrameTier[] = RANK_TIERS.map(
  (tier, index) => ({
    id: tier.name.toLowerCase(),
    rankName: tier.name,
    colorHex: FRAME_COLORS[index] ?? "#78716c",
  }),
);

function rankIndexForAccuracy(accuracyPercentage: number): number {
  const clamped = Math.max(0, Math.min(100, accuracyPercentage));
  let index = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (clamped >= RANK_TIERS[i]!.minAccuracyPercentage) {
      index = i;
    }
  }
  return index;
}

/** The profile frame earned by a player's best real accuracy so far. */
export function frameForAccuracy(accuracyPercentage: number): FrameTier {
  return FRAME_TIERS[rankIndexForAccuracy(accuracyPercentage)]!;
}

/** The profile title earned by a player's best real accuracy so far. */
export function titleForAccuracy(accuracyPercentage: number): string {
  const tier = RANK_TIERS[rankIndexForAccuracy(accuracyPercentage)]!;
  return `${tier.name} Aimer`;
}
