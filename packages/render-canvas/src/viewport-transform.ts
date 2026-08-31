import {
  AngleUnits,
  degreesToAngleUnits,
  wrapYaw,
} from "@findmysensi/aim-core";

export type ScaleMode = "fit" | "stretch" | "black-bars";

export interface ViewportTransformConfig {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly dpr?: number | undefined;
  readonly scaleMode?: ScaleMode | undefined;
  readonly horizontalFovDegrees?: number | undefined;
}

export interface DisplayRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ViewportTransform {
  simToDisplay(yaw: AngleUnits, pitch: AngleUnits): { x: number; y: number };
  displayToSim(x: number, y: number): { yaw: AngleUnits; pitch: AngleUnits };
  readonly displayRect: DisplayRect;
  readonly scaleFactor: number;
  readonly dpr: number;
}

const CANONICAL_ASPECT = 16 / 9;
const REFERENCE_HEIGHT = 1080;

export class CanonicalViewportTransform implements ViewportTransform {
  public readonly displayRect: DisplayRect;
  public readonly scaleFactor: number;
  public readonly dpr: number;

  private readonly hFovUnits: number;
  private readonly vFovUnits: number;
  private readonly pxPerAngleUnitX: number;
  private readonly pxPerAngleUnitY: number;
  private readonly centerX: number;
  private readonly centerY: number;

  constructor(config: ViewportTransformConfig) {
    const {
      canvasWidth,
      canvasHeight,
      dpr = 1,
      scaleMode = "fit",
      horizontalFovDegrees = 103,
    } = config;

    this.dpr = dpr;
    this.hFovUnits = degreesToAngleUnits(horizontalFovDegrees);
    this.vFovUnits = Math.round(this.hFovUnits / CANONICAL_ASPECT);

    if (scaleMode === "stretch") {
      this.displayRect = {
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
      };
    } else {
      // "fit" or "black-bars": preserve 16:9 aspect ratio centered within canvas
      const currentAspect = canvasWidth / Math.max(1, canvasHeight);

      if (currentAspect > CANONICAL_ASPECT) {
        // Canvas is wider than 16:9 (pillarbox)
        const width = canvasHeight * CANONICAL_ASPECT;
        const x = (canvasWidth - width) / 2;
        this.displayRect = {
          x: Math.round(x),
          y: 0,
          width: Math.round(width),
          height: canvasHeight,
        };
      } else {
        // Canvas is taller than 16:9 (letterbox)
        const height = canvasWidth / CANONICAL_ASPECT;
        const y = (canvasHeight - height) / 2;
        this.displayRect = {
          x: 0,
          y: Math.round(y),
          width: canvasWidth,
          height: Math.round(height),
        };
      }
    }

    this.scaleFactor = this.displayRect.height / (REFERENCE_HEIGHT * dpr);
    this.centerX = this.displayRect.x + this.displayRect.width / 2;
    this.centerY = this.displayRect.y + this.displayRect.height / 2;

    this.pxPerAngleUnitX = this.displayRect.width / this.hFovUnits;
    this.pxPerAngleUnitY = this.displayRect.height / this.vFovUnits;
  }

  public simToDisplay(
    yaw: AngleUnits,
    pitch: AngleUnits,
  ): { x: number; y: number } {
    const x = this.centerX + yaw * this.pxPerAngleUnitX;
    const y = this.centerY - pitch * this.pxPerAngleUnitY;
    return { x, y };
  }

  public displayToSim(
    x: number,
    y: number,
  ): { yaw: AngleUnits; pitch: AngleUnits } {
    const yaw = Math.round((x - this.centerX) / this.pxPerAngleUnitX);
    const pitch = Math.round((this.centerY - y) / this.pxPerAngleUnitY);
    return {
      yaw: wrapYaw(yaw),
      pitch: wrapYaw(pitch),
    };
  }
}

export function createViewportTransform(
  config: ViewportTransformConfig,
): ViewportTransform {
  return new CanonicalViewportTransform(config);
}
