import {
  AngleDeltaUnits,
  createAngleDeltaUnits,
  createPitchUnits,
  degreesToAngleDeltaUnits,
  FULL_TURN_UNITS,
  PitchUnits,
} from "@findmysensi/aim-core";

export type ScaleMode = "fit" | "stretch" | "black-bars" | "fill";

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
  simToDisplay(
    yawDelta: AngleDeltaUnits | number,
    pitch: PitchUnits | number,
  ): { x: number; y: number };
  displayToSim(
    x: number,
    y: number,
  ): {
    yaw: AngleDeltaUnits;
    pitch: PitchUnits;
  };
  angleRadiusToPixels(radiusAngleUnits: number): number;
  readonly displayRect: DisplayRect;
  readonly scaleFactor: number;
  readonly dpr: number;
  readonly horizontalFovUnits: number;
}

const CANONICAL_ASPECT = 16 / 9;
const REFERENCE_HEIGHT = 1080;

export class CanonicalViewportTransform implements ViewportTransform {
  public readonly displayRect: DisplayRect;
  public readonly scaleFactor: number;
  public readonly dpr: number;
  public readonly horizontalFovUnits: number;

  private readonly vFovUnits: number;
  private readonly focalLengthX: number;
  private readonly focalLengthY: number;
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
    this.horizontalFovUnits = degreesToAngleDeltaUnits(horizontalFovDegrees);
    const hFovRad = (this.horizontalFovUnits / FULL_TURN_UNITS) * (2 * Math.PI);
    const halfTanH = Math.tan(hFovRad / 2);

    if (scaleMode === "fill") {
      this.displayRect = {
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
      };
      const currentAspect = canvasWidth / Math.max(1, canvasHeight);
      const halfTanV = halfTanH / currentAspect;
      const vFovRad = 2 * Math.atan(halfTanV);
      this.vFovUnits = Math.max(
        1,
        Math.round((vFovRad / (2 * Math.PI)) * FULL_TURN_UNITS),
      );
    } else if (scaleMode === "stretch") {
      this.displayRect = {
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
      };
      const halfTanV = halfTanH / CANONICAL_ASPECT;
      const vFovRad = 2 * Math.atan(halfTanV);
      this.vFovUnits = Math.round((vFovRad / (2 * Math.PI)) * FULL_TURN_UNITS);
    } else {
      const halfTanV = halfTanH / CANONICAL_ASPECT;
      const vFovRad = 2 * Math.atan(halfTanV);
      this.vFovUnits = Math.round((vFovRad / (2 * Math.PI)) * FULL_TURN_UNITS);
      const currentAspect = canvasWidth / Math.max(1, canvasHeight);

      if (currentAspect > CANONICAL_ASPECT) {
        const width = canvasHeight * CANONICAL_ASPECT;
        const x = (canvasWidth - width) / 2;
        this.displayRect = {
          x: Math.round(x),
          y: 0,
          width: Math.round(width),
          height: canvasHeight,
        };
      } else {
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

    const vFovRad = (this.vFovUnits / FULL_TURN_UNITS) * (2 * Math.PI);
    this.focalLengthX = (this.displayRect.width / 2) / Math.tan(hFovRad / 2);
    this.focalLengthY = (this.displayRect.height / 2) / Math.tan(vFovRad / 2);
  }

  public simToDisplay(
    yawDelta: AngleDeltaUnits | number,
    pitch: PitchUnits | number,
  ): { x: number; y: number } {
    const yawRad = (yawDelta / FULL_TURN_UNITS) * (2 * Math.PI);
    const pitchRad = (pitch / FULL_TURN_UNITS) * (2 * Math.PI);
    const x = this.centerX + this.focalLengthX * Math.tan(yawRad);
    const y = this.centerY - this.focalLengthY * Math.tan(pitchRad);
    return { x, y };
  }

  public displayToSim(
    x: number,
    y: number,
  ): { yaw: AngleDeltaUnits; pitch: PitchUnits } {
    const yawRad = Math.atan((x - this.centerX) / this.focalLengthX);
    const pitchRad = Math.atan((this.centerY - y) / this.focalLengthY);
    const yaw = Math.round((yawRad / (2 * Math.PI)) * FULL_TURN_UNITS);
    const pitch = Math.round((pitchRad / (2 * Math.PI)) * FULL_TURN_UNITS);
    return {
      yaw: createAngleDeltaUnits(yaw),
      pitch: createPitchUnits(pitch),
    };
  }

  public angleRadiusToPixels(radiusAngleUnits: number): number {
    if (!Number.isSafeInteger(radiusAngleUnits) || radiusAngleUnits < 0) {
      throw new RangeError(
        "Target radius must be a non-negative safe integer.",
      );
    }
    const rad = (radiusAngleUnits / FULL_TURN_UNITS) * (2 * Math.PI);
    return this.focalLengthX * Math.tan(rad);
  }
}

export function createViewportTransform(
  config: ViewportTransformConfig,
): ViewportTransform {
  return new CanonicalViewportTransform(config);
}
