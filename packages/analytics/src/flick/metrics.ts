/**
 * Shared metrics interface for flick/click-based scenarios
 * (Pinpoint, Multi, Headline).
 */
export interface FlickMetrics {
  readonly hits: number;
  readonly shots: number;
  readonly misses: number;
  readonly accuracyPercentage: number;
  readonly acquisitionTicks: readonly number[];
  readonly avgAcquisitionTicks: number;
  readonly killsPerSecond: number;
}

export class FlickMetricsTracker {
  private hits: number = 0;
  private shots: number = 0;
  private misses: number = 0;
  private acquisitionTicks: number[] = [];
  private targetSpawnTicks: Map<number, number> = new Map();

  public recordTargetSpawn(targetId: number, tick: number): void {
    this.targetSpawnTicks.set(targetId, tick);
  }

  public recordShot(tick: number, hitTargetId: number | null): void {
    this.shots++;
    if (hitTargetId !== null) {
      this.hits++;
      const spawnTick = this.targetSpawnTicks.get(hitTargetId);
      if (spawnTick !== undefined) {
        const delta = Math.max(0, tick - spawnTick);
        this.acquisitionTicks.push(delta);
        this.targetSpawnTicks.delete(hitTargetId);
      }
    } else {
      this.misses++;
    }
  }

  /**
   * A target expired without ever being clicked (e.g. Pinpoint's
   * lifetime-based despawn). Counts as a miss without inflating shots,
   * since the player never fired -- shots/accuracy must reflect only
   * actual click attempts.
   */
  public recordExpiration(_tick: number): void {
    this.misses++;
  }

  public computeMetrics(
    totalDurationTicks: number,
    tickRateHz: number = 128,
  ): FlickMetrics {
    const accuracy = this.shots > 0 ? (this.hits / this.shots) * 100 : 0;
    const avgAcq =
      this.acquisitionTicks.length > 0
        ? this.acquisitionTicks.reduce((a, b) => a + b, 0) /
          this.acquisitionTicks.length
        : 0;
    const durationSeconds =
      totalDurationTicks > 0 ? totalDurationTicks / tickRateHz : 1;
    const kps = this.hits / durationSeconds;

    return Object.freeze({
      hits: this.hits,
      shots: this.shots,
      misses: this.misses,
      accuracyPercentage: Math.round(accuracy * 100) / 100,
      acquisitionTicks: Object.freeze([...this.acquisitionTicks]),
      avgAcquisitionTicks: Math.round(avgAcq * 10) / 10,
      killsPerSecond: Math.round(kps * 100) / 100,
    });
  }
}

export function createFlickMetricsTracker(): FlickMetricsTracker {
  return new FlickMetricsTracker();
}
