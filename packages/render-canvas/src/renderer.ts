import {
  createAngleUnits,
  QUARTER_TURN_UNITS,
  RenderSnapshotView,
  shortestSignedAngleDelta,
} from "@findmysensi/aim-core";
import {
  AimRenderer,
  CrosshairConfig,
  PlayAreaRenderConfig,
  PotatoRendererOptions,
  TargetRenderConfig,
} from "./types.js";
import { ViewportTransform } from "./viewport-transform.js";

const DEFAULT_CROSSHAIR: CrosshairConfig = {
  style: "cross",
  color: "#00ff88",
  size: 6,
  thickness: 2,
  gap: 3,
  dot: false,
  dotSize: 2,
  outline: true,
  outlineThickness: 1,
  outlineColor: "#000000",
  opacity: 1,
};

const DEFAULT_TARGET: TargetRenderConfig = {
  bodyColor: "#ff3366",
  opacity: 1,
  borderColor: "#ffffff",
  borderWidth: 2,
};

const DEFAULT_BACKGROUND = "#0f1117";

const DEFAULT_PLAY_AREA: Omit<
  PlayAreaRenderConfig,
  "widthUnits" | "heightUnits"
> = {
  color: "#00ff88",
  lineWidth: 1,
  opacity: 0.16,
};

/**
 * The viewport projects angles through `tan()`, which flips sign past +/-90 deg
 * and would mirror off-frustum geometry onto the opposite side of the screen.
 * Pinning relative angles just inside a quarter turn keeps them on the correct
 * side; anything that far out is off-screen and gets clipped anyway.
 */
const MAX_PROJECTABLE_ANGLE_UNITS = QUARTER_TURN_UNITS - 1;

function toProjectableAngle(units: number): number {
  if (units > MAX_PROJECTABLE_ANGLE_UNITS) return MAX_PROJECTABLE_ANGLE_UNITS;
  if (units < -MAX_PROJECTABLE_ANGLE_UNITS) return -MAX_PROJECTABLE_ANGLE_UNITS;
  return units;
}

export class Canvas2DPotatoRenderer implements AimRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private viewport: ViewportTransform | null = null;
  private backgroundColor: string = DEFAULT_BACKGROUND;
  private crosshair: CrosshairConfig = DEFAULT_CROSSHAIR;
  private target: TargetRenderConfig = DEFAULT_TARGET;
  private playArea: PlayAreaRenderConfig | null = null;

  public initialize(
    canvas: HTMLCanvasElement,
    viewport: ViewportTransform,
    options?: PotatoRendererOptions,
  ): void {
    this.canvas = canvas;
    this.viewport = viewport;
    this.ctx = canvas.getContext("2d", {
      alpha: false,
    }) as CanvasRenderingContext2D | null;

    if (options?.backgroundColor) {
      this.backgroundColor = options.backgroundColor;
    }
    if (options?.crosshair) {
      this.crosshair = { ...DEFAULT_CROSSHAIR, ...options.crosshair };
    }
    if (options?.target) {
      this.target = { ...DEFAULT_TARGET, ...options.target };
    }
    this.playArea = options?.playArea
      ? { ...DEFAULT_PLAY_AREA, ...options.playArea }
      : null;
  }

  public render(snapshot: RenderSnapshotView): void {
    const ctx = this.ctx;
    const vp = this.viewport;
    const canvas = this.canvas;

    if (!ctx || !vp || !canvas) return;

    const { width: canvasWidth, height: canvasHeight } = canvas;
    const { x: rectX, y: rectY, width: rectW, height: rectH } = vp.displayRect;

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(rectX, rectY, rectW, rectH);

    if (typeof ctx.save === "function") ctx.save();
    if (
      typeof ctx.beginPath === "function" &&
      typeof ctx.rect === "function" &&
      typeof ctx.clip === "function"
    ) {
      ctx.beginPath();
      ctx.rect(rectX, rectY, rectW, rectH);
      ctx.clip();
    }

    const targetCount = snapshot.targetCount;
    const playerYaw = snapshot.playerYaw;
    const playerPitch = snapshot.playerPitch;

    this.renderPlayArea(ctx, vp, playerYaw, playerPitch);

    for (let i = 0; i < targetCount; i++) {
      const rawTargetX = snapshot.targetX[i] ?? 0;
      const rawTargetY = snapshot.targetY[i] ?? 0;
      const rawRadius = snapshot.targetRadius[i] ?? 0;

      const relYaw = shortestSignedAngleDelta(
        playerYaw,
        createAngleUnits(rawTargetX),
      );
      const relPitch = rawTargetY - playerPitch;
      const screenPos = vp.simToDisplay(
        toProjectableAngle(relYaw),
        toProjectableAngle(relPitch),
      );
      const radiusPx = Math.max(2, vp.angleRadiusToPixels(rawRadius));

      ctx.globalAlpha = this.target.opacity;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = this.target.bodyColor;
      ctx.fill();

      if (this.target.borderWidth > 0) {
        ctx.lineWidth = this.target.borderWidth;
        ctx.strokeStyle = this.target.borderColor;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    this.renderCrosshair(ctx, rectX + rectW / 2, rectY + rectH / 2);
    if (typeof ctx.restore === "function") ctx.restore();
  }

  private renderPlayArea(
    ctx: CanvasRenderingContext2D,
    vp: ViewportTransform,
    playerYaw: number,
    playerPitch: number,
  ): void {
    const config = this.playArea;
    if (!config || config.opacity <= 0 || config.lineWidth <= 0) return;
    if (typeof ctx.strokeRect !== "function") return;

    const halfWidth = Math.floor(config.widthUnits / 2);
    const halfHeight = Math.floor(config.heightUnits / 2);

    // Yaw wraps, so each edge is measured along the shortest path from the
    // player. Pitch never wraps, so it is a plain difference.
    const relLeft = shortestSignedAngleDelta(
      createAngleUnits(playerYaw),
      createAngleUnits(wrapPositive(-halfWidth)),
    );
    const relRight = shortestSignedAngleDelta(
      createAngleUnits(playerYaw),
      createAngleUnits(wrapPositive(halfWidth)),
    );

    const left = vp.simToDisplay(toProjectableAngle(relLeft), 0).x;
    const right = vp.simToDisplay(toProjectableAngle(relRight), 0).x;
    const top = vp.simToDisplay(
      0,
      toProjectableAngle(halfHeight - playerPitch),
    ).y;
    const bottom = vp.simToDisplay(
      0,
      toProjectableAngle(-halfHeight - playerPitch),
    ).y;

    ctx.globalAlpha = config.opacity;
    ctx.lineWidth = config.lineWidth;
    ctx.strokeStyle = config.color;
    ctx.strokeRect(left, top, right - left, bottom - top);
    ctx.globalAlpha = 1;
  }

  private renderCrosshair(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
  ): void {
    const config = this.crosshair;
    ctx.globalAlpha = config.opacity;

    if (config.style === "circle") {
      ctx.beginPath();
      ctx.arc(centerX, centerY, config.size, 0, Math.PI * 2);
      this.strokeCrosshairPath(ctx, config);
    } else if (config.style !== "dot") {
      this.buildCrosshairArms(ctx, centerX, centerY, config);
      this.strokeCrosshairPath(ctx, config);
    }

    if (config.dot || config.style === "dot") {
      const dotRadius = Math.max(1, config.dotSize / 2);
      if (config.outline) {
        ctx.beginPath();
        ctx.arc(
          centerX,
          centerY,
          dotRadius + config.outlineThickness,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = config.outlineColor;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(centerX, centerY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = config.color;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private buildCrosshairArms(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    config: CrosshairConfig,
  ): void {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - config.gap);
    ctx.lineTo(centerX, centerY - config.gap - config.size);
    ctx.moveTo(centerX, centerY + config.gap);
    ctx.lineTo(centerX, centerY + config.gap + config.size);
    ctx.moveTo(centerX - config.gap, centerY);
    ctx.lineTo(centerX - config.gap - config.size, centerY);
    ctx.moveTo(centerX + config.gap, centerY);
    ctx.lineTo(centerX + config.gap + config.size, centerY);
  }

  private strokeCrosshairPath(
    ctx: CanvasRenderingContext2D,
    config: CrosshairConfig,
  ): void {
    if (config.outline) {
      ctx.lineWidth = config.thickness + config.outlineThickness * 2;
      ctx.strokeStyle = config.outlineColor;
      ctx.stroke();
    }
    ctx.lineWidth = config.thickness;
    ctx.strokeStyle = config.color;
    ctx.stroke();
  }

  public resize(viewport: ViewportTransform): void {
    this.viewport = viewport;
  }

  public dispose(): void {
    this.canvas = null;
    this.ctx = null;
    this.viewport = null;
  }
}

function wrapPositive(units: number): number {
  const full = QUARTER_TURN_UNITS * 4;
  const remainder = units % full;
  return remainder < 0 ? remainder + full : remainder;
}

export function createAimRenderer(): AimRenderer {
  return new Canvas2DPotatoRenderer();
}
