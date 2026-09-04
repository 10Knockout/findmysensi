export interface SwitchTrackMetrics {
  readonly switchesCompleted: number;
  readonly onTargetTicks: number;
  readonly totalTicks: number;
  readonly onTargetPercentage: number;
  readonly averageErrorUnits: number;
  readonly maxErrorUnits: number;
  readonly averageAcquisitionTicks: number;
}

export class SwitchTrackMetricsTracker {
  private switchesCompleted = 0;
  private onTargetTicks = 0;
  private totalTicks = 0;
  private totalErrorUnits = 0;
  private maxErrorUnits = 0;
  private acquisitionCount = 0;
  private acquisitionTickTotal = 0;

  public recordSample(errorUnits: number, onTarget: boolean): void {
    this.totalTicks++;
    if (onTarget) this.onTargetTicks++;
    this.totalErrorUnits += errorUnits;
    this.maxErrorUnits = Math.max(this.maxErrorUnits, errorUnits);
  }

  public recordAcquisition(ticks: number): void {
    this.acquisitionCount++;
    this.acquisitionTickTotal += ticks;
  }

  public recordSwitch(): void {
    this.switchesCompleted++;
  }

  public computeMetrics(): SwitchTrackMetrics {
    return Object.freeze({
      switchesCompleted: this.switchesCompleted,
      onTargetTicks: this.onTargetTicks,
      totalTicks: this.totalTicks,
      onTargetPercentage:
        this.totalTicks > 0
          ? Math.round((this.onTargetTicks / this.totalTicks) * 10_000) / 100
          : 0,
      averageErrorUnits:
        this.totalTicks > 0
          ? Math.round(this.totalErrorUnits / this.totalTicks)
          : 0,
      maxErrorUnits: Math.round(this.maxErrorUnits),
      averageAcquisitionTicks:
        this.acquisitionCount > 0
          ? Math.round(this.acquisitionTickTotal / this.acquisitionCount)
          : 0,
    });
  }
}

export function createSwitchTrackMetricsTracker(): SwitchTrackMetricsTracker {
  return new SwitchTrackMetricsTracker();
}
