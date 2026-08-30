export type InputProcessingPreset =
  "auto" | 1000 | 2000 | 4000 | 8000 | "maximum";

export interface InputProcessingPolicy {
  getEffectiveCapacity(
    preset: InputProcessingPreset,
    observedRateHz?: number,
  ): number;
  getEffectiveBatchBudgetMs(preset: InputProcessingPreset): number;
}

export class DefaultInputProcessingPolicy implements InputProcessingPolicy {
  public getEffectiveCapacity(
    preset: InputProcessingPreset,
    observedRateHz: number = 1000,
  ): number {
    switch (preset) {
      case 1000:
        return 2048;
      case 2000:
        return 4096;
      case 4000:
        return 8192;
      case 8000:
        return 16384;
      case "maximum":
        return 32768;
      case "auto":
      default: {
        if (observedRateHz <= 1000) return 2048;
        if (observedRateHz <= 2000) return 4096;
        if (observedRateHz <= 4000) return 8192;
        return 16384;
      }
    }
  }

  public getEffectiveBatchBudgetMs(preset: InputProcessingPreset): number {
    switch (preset) {
      case 1000:
        return 1.0;
      case 2000:
        return 1.5;
      case 4000:
        return 2.0;
      case 8000:
        return 2.5;
      case "maximum":
        return 4.0;
      case "auto":
      default:
        return 2.0;
    }
  }
}

export function createDefaultProcessingPolicy(): InputProcessingPolicy {
  return new DefaultInputProcessingPolicy();
}
