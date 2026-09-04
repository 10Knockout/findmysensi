export type MissDirection = "left" | "right" | "up" | "down" | "unclear";

export interface MissClassification {
  /** Which way the player needs to correct their aim to hit next time. */
  readonly direction: MissDirection;
  /** Distance from the target's edge to the aim point, in angle units. */
  readonly overshootAngleUnits: number;
}

/**
 * Classifies a missed shot by which side of the nearest target the aim
 * point landed on. dx/dy come from findNearestTarget's convention (target
 * minus aim, shortest path): positive dx means the target is to the right
 * of where the player aimed; positive dy means the target is above the aim
 * point (pitch increases upward, matching PracticeRunController's
 * convention -- mouse-down decreases pitch).
 *
 * Only ever called for confirmed misses -- never fabricates a direction
 * when the error is genuinely ambiguous (near-exact diagonal), reporting
 * "unclear" instead.
 */
export function classifyMiss(
  dx: number,
  dy: number,
  targetRadiusAngleUnits: number,
): MissClassification {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const overshootAngleUnits = Math.max(
    0,
    Math.round(Math.sqrt(dx * dx + dy * dy)) - targetRadiusAngleUnits,
  );

  // Require one axis to dominate meaningfully (>20% larger) before calling
  // a direction -- otherwise the miss is genuinely diagonal/ambiguous.
  if (absDx === 0 && absDy === 0) {
    return { direction: "unclear", overshootAngleUnits };
  }
  if (absDx > absDy * 1.2) {
    return { direction: dx > 0 ? "right" : "left", overshootAngleUnits };
  }
  if (absDy > absDx * 1.2) {
    return { direction: dy > 0 ? "up" : "down", overshootAngleUnits };
  }
  return { direction: "unclear", overshootAngleUnits };
}
