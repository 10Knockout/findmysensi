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
 * profile decoration. Avatars, selectable frames, and tags are curated
 * presets. Arbitrary uploads stay out of the profile and leaderboard path.
 */

export interface AvatarOption {
  readonly id: string;
  readonly label: string;
  readonly imageSrc: string;
  readonly colorHex: string;
}

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  { id: "neon-sentinel", label: "Neon Sentinel", imageSrc: "/profile/avatars/neon-sentinel.webp", colorHex: "#bdff2d" },
  { id: "pulse-ronin", label: "Pulse Ronin", imageSrc: "/profile/avatars/pulse-ronin.webp", colorHex: "#2dd4ff" },
  { id: "prism-operative", label: "Prism Operative", imageSrc: "/profile/avatars/prism-operative.webp", colorHex: "#c084fc" },
  { id: "circuit-fox", label: "Circuit Fox", imageSrc: "/profile/avatars/circuit-fox.webp", colorHex: "#fb7185" },
  { id: "void-ranger", label: "Void Ranger", imageSrc: "/profile/avatars/void-ranger.webp", colorHex: "#818cf8" },
  { id: "ember-scout", label: "Ember Scout", imageSrc: "/profile/avatars/ember-scout.webp", colorHex: "#fb923c" },
  { id: "aqua-striker", label: "Aqua Striker", imageSrc: "/profile/avatars/aqua-striker.webp", colorHex: "#22d3ee" },
  { id: "glitch-warden", label: "Glitch Warden", imageSrc: "/profile/avatars/glitch-warden.webp", colorHex: "#f472b6" },
  { id: "solar-spectre", label: "Solar Spectre", imageSrc: "/profile/avatars/solar-spectre.webp", colorHex: "#facc15" },
  { id: "chrome-oracle", label: "Chrome Oracle", imageSrc: "/profile/avatars/chrome-oracle.webp", colorHex: "#e2e8f0" },
];

export interface ProfileFrameOption {
  readonly id: string;
  readonly label: string;
  readonly imageSrc: string | null;
}

export const PROFILE_FRAME_OPTIONS: readonly ProfileFrameOption[] = [
  { id: "frame-none", label: "No frame", imageSrc: null },
  { id: "neon-green", label: "Neon Green", imageSrc: "/profile/frames/neon-green.webp" },
  { id: "electric-blue", label: "Electric Blue", imageSrc: "/profile/frames/electric-blue.webp" },
  { id: "plasma-purple", label: "Plasma Purple", imageSrc: "/profile/frames/plasma-purple.webp" },
  { id: "solar-gold", label: "Solar Gold", imageSrc: "/profile/frames/solar-gold.webp" },
  { id: "ember-red", label: "Ember Red", imageSrc: "/profile/frames/ember-red.webp" },
  { id: "cyan-circuit", label: "Cyan Circuit", imageSrc: "/profile/frames/cyan-circuit.webp" },
  { id: "prism-shift", label: "Prism Shift", imageSrc: "/profile/frames/prism-shift.webp" },
  { id: "void-black", label: "Void Black", imageSrc: "/profile/frames/void-black.webp" },
  { id: "chrome-silver", label: "Chrome Silver", imageSrc: "/profile/frames/chrome-silver.webp" },
  { id: "radiant-white", label: "Radiant White", imageSrc: "/profile/frames/radiant-white.webp" },
];

export interface GamerTagOption {
  readonly id: string;
  readonly label: string;
}

export const GAMER_TAG_OPTIONS: readonly GamerTagOption[] = [
  { id: "tag-none", label: "No tag" },
  { id: "one-tap", label: "One Tap" },
  { id: "aim-demon", label: "Aim Demon" },
  { id: "clutch-mind", label: "Clutch Mind" },
  { id: "head-hunter", label: "Head Hunter" },
  { id: "flick-master", label: "Flick Master" },
  { id: "pixel-peek", label: "Pixel Peek" },
  { id: "dead-center", label: "Dead Center" },
  { id: "calm-crosshair", label: "Calm Crosshair" },
  { id: "entry-spark", label: "Entry Spark" },
  { id: "angle-holder", label: "Angle Holder" },
  { id: "snap-shot", label: "Snap Shot" },
  { id: "track-star", label: "Track Star" },
  { id: "reflex-ace", label: "Reflex Ace" },
  { id: "eco-warrior", label: "Eco Warrior" },
  { id: "last-alive", label: "Last Alive" },
  { id: "silent-carry", label: "Silent Carry" },
  { id: "queue-crusher", label: "Queue Crusher" },
  { id: "focus-fire", label: "Focus Fire" },
  { id: "clean-sweep", label: "Clean Sweep" },
  { id: "aim-architect", label: "Aim Architect" },
];

export function gamerTagLabel(tagId: string): string | null {
  const tag = GAMER_TAG_OPTIONS.find((option) => option.id === tagId);
  return tag && tag.id !== "tag-none" ? tag.label : null;
}

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
