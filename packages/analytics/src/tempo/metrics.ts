/**
 * Tempo metrics for rhythmic click-timing scenarios.
 */
export interface TempoMetrics {
  readonly perfect: number;
  readonly early: number;
  readonly late: number;
  readonly miss: number;
  readonly totalBeats: number;
  readonly perfectPercentage: number;
  readonly hitPercentage: number;
}

export class TempoMetricsTracker {
  private perfect: number = 0;
  private early: number = 0;
  private late: number = 0;
  private miss: number = 0;

  public recordJudgement(
    judgement: "perfect" | "early" | "late" | "miss",
  ): void {
    this[judgement]++;
  }

  public computeMetrics(): TempoMetrics {
    const total = this.perfect + this.early + this.late + this.miss;
    const hits = this.perfect + this.early + this.late;

    return Object.freeze({
      perfect: this.perfect,
      early: this.early,
      late: this.late,
      miss: this.miss,
      totalBeats: total,
      perfectPercentage:
        total > 0 ? Math.round((this.perfect / total) * 10000) / 100 : 0,
      hitPercentage: total > 0 ? Math.round((hits / total) * 10000) / 100 : 0,
    });
  }
}

export function createTempoMetricsTracker(): TempoMetricsTracker {
  return new TempoMetricsTracker();
}
