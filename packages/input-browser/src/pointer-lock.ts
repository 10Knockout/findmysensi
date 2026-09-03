export interface PointerLockOptions {
  unadjustedMovement?: boolean;
}

export interface PointerLockResult {
  readonly rawRequested: boolean;
  readonly rawGranted: boolean;
}

export interface PointerLockController {
  requestLock(
    target: HTMLElement,
    options?: PointerLockOptions,
  ): Promise<PointerLockResult>;
  exitLock(doc?: Document): Promise<void>;
  isLocked(doc?: Document): boolean;
  hasUnadjustedSupport(): boolean;
}

export class BrowserPointerLockController implements PointerLockController {
  private rawGranted: boolean = false;

  public async requestLock(
    target: HTMLElement,
    options: PointerLockOptions = { unadjustedMovement: true },
  ): Promise<PointerLockResult> {
    const rawRequested = Boolean(options.unadjustedMovement);

    if (rawRequested) {
      try {
        const result = (
          target as HTMLElement & {
            requestPointerLock(opts?: unknown): Promise<void> | void;
          }
        ).requestPointerLock({ unadjustedMovement: true });

        if (
          result &&
          typeof (result as PromiseLike<void>).then === "function"
        ) {
          await result;
          this.rawGranted = true;
        } else {
          // Legacy void-returning implementations cannot prove that the raw
          // option was honored, even if pointer lock itself succeeds.
          this.rawGranted = false;
        }
        return { rawRequested: true, rawGranted: this.rawGranted };
      } catch {
        // Falling back to standard pointer lock if unadjustedMovement was rejected
        this.rawGranted = false;
      }
    }

    // Standard Pointer Lock fallback
    const fallbackResult = (
      target as HTMLElement & {
        requestPointerLock(opts?: unknown): Promise<void> | void;
      }
    ).requestPointerLock();

    if (
      fallbackResult &&
      typeof (fallbackResult as PromiseLike<void>).then === "function"
    ) {
      await fallbackResult;
    }

    return { rawRequested, rawGranted: false };
  }

  public async exitLock(
    doc: Document | unknown = typeof document !== "undefined"
      ? document
      : undefined,
  ): Promise<void> {
    const d = doc as Document | undefined;
    if (d && typeof d.exitPointerLock === "function") {
      d.exitPointerLock();
    }
    this.rawGranted = false;
  }

  public isLocked(
    doc: Document | unknown = typeof document !== "undefined"
      ? document
      : undefined,
  ): boolean {
    const d = doc as Document | undefined;
    return Boolean(d?.pointerLockElement);
  }

  public hasUnadjustedSupport(): boolean {
    return this.rawGranted;
  }
}

export function createPointerLockController(): PointerLockController {
  return new BrowserPointerLockController();
}
