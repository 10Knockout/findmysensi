// Browsers cannot reliably report the mouse's actual hardware polling rate
// (event coalescing varies by OS/browser/driver), and the buffer must be
// sized before any events have been observed. Rather than guess a smaller
// capacity ahead of time and risk dropping legitimate high-rate input, the
// pipeline always allocates the buffer sized for the safe, 8000 Hz-capable
// case. The memory cost of a typed-array ring buffer at this size is a few
// tens of kilobytes, which is negligible next to the risk of losing events.
export const SAFE_INPUT_BUFFER_CAPACITY = 16_384;
export const SAFE_INPUT_BATCH_BUDGET_MS = 2.5;

export interface InputProcessingPolicy {
  getEffectiveCapacity(): number;
  getEffectiveBatchBudgetMs(): number;
}

export class DefaultInputProcessingPolicy implements InputProcessingPolicy {
  public getEffectiveCapacity(): number {
    return SAFE_INPUT_BUFFER_CAPACITY;
  }

  public getEffectiveBatchBudgetMs(): number {
    return SAFE_INPUT_BATCH_BUDGET_MS;
  }
}

export function createDefaultProcessingPolicy(): InputProcessingPolicy {
  return new DefaultInputProcessingPolicy();
}
