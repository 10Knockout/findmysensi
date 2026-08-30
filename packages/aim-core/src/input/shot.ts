export class ShotStateTracker {
  private isButtonDown: boolean = false;

  /**
   * Evaluates button state transition.
   * Returns true ONLY on transition from UP (false) to DOWN (true).
   * Held down button returns false (strictly no autofire).
   */
  public processButton(isDown: boolean): boolean {
    if (isDown) {
      if (!this.isButtonDown) {
        this.isButtonDown = true;
        return true; // Shot fired
      }
      return false; // Held down
    } else {
      this.isButtonDown = false;
      return false;
    }
  }

  public reset(): void {
    this.isButtonDown = false;
  }

  public isDown(): boolean {
    return this.isButtonDown;
  }
}

export function createShotTracker(): ShotStateTracker {
  return new ShotStateTracker();
}
