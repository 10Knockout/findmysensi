/**
 * Tracking metrics for continuous-beam scenarios (Smooth Track, Strafe click-tracking).
 */
export interface TrackingMetrics {
  readonly onTargetTicks: number;
  readonly totalTicks: number;
  readonly onTargetPercentage: number;
  readonly averageErrorUnits: number;
  readonly maxErrorUnits: number;
}

export class TrackingMetricsTracker {
  private onTargetTicks: number = 0;
  private totalTicks: number = 0;
  private totalErrorUnits: number = 0;
  private maxErrorUnits: number = 0;

  public recordSample(errorUnits: number, onTarget: boolean): void {
    this.totalTicks++;
    if (onTarget) this.onTargetTicks++;
    this.totalErrorUnits += errorUnits;
    this.maxErrorUnits = Math.max(this.maxErrorUnits, errorUnits);
  }

  public computeMetrics(): TrackingMetrics {
    const avgError =
      this.totalTicks > 0 ? this.totalErrorUnits / this.totalTicks : 0;

    return Object.freeze({
      onTargetTicks: this.onTargetTicks,
      totalTicks: this.totalTicks,
      onTargetPercentage:
        this.totalTicks > 0
          ? Math.round((this.onTargetTicks / this.totalTicks) * 10000) / 100
          : 0,
      averageErrorUnits: Math.round(avgError),
      maxErrorUnits: Math.round(this.maxErrorUnits),
    });
  }
}

export function createTrackingMetricsTracker(): TrackingMetricsTracker {
  return new TrackingMetricsTracker();
}
