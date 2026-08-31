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
  private errorSamples: number[] = [];

  public recordSample(errorUnits: number, onTarget: boolean): void {
    this.totalTicks++;
    if (onTarget) this.onTargetTicks++;
    this.errorSamples.push(errorUnits);
  }

  public computeMetrics(): TrackingMetrics {
    const avgError =
      this.errorSamples.length > 0
        ? this.errorSamples.reduce((a, b) => a + b, 0) /
          this.errorSamples.length
        : 0;

    const maxError =
      this.errorSamples.length > 0 ? Math.max(...this.errorSamples) : 0;

    return Object.freeze({
      onTargetTicks: this.onTargetTicks,
      totalTicks: this.totalTicks,
      onTargetPercentage:
        this.totalTicks > 0
          ? Math.round((this.onTargetTicks / this.totalTicks) * 10000) / 100
          : 0,
      averageErrorUnits: Math.round(avgError),
      maxErrorUnits: Math.round(maxError),
    });
  }
}

export function createTrackingMetricsTracker(): TrackingMetricsTracker {
  return new TrackingMetricsTracker();
}
