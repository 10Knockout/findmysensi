export class GridEvaluator {
  private hits: number = 0;
  private misses: number = 0;

  public processHit() {
    this.hits++;
  }

  public processMiss() {
    this.misses++;
  }

  public computeFinalScore(): number {
    const totalShots = this.hits + this.misses;
    if (totalShots === 0) return 0;
    
    const accuracy = this.hits / totalShots;
    // Score is 1000 points per hit, multiplied by accuracy to heavily penalize spam
    return Math.floor((this.hits * 1000) * accuracy);
  }
}
