import {
  createAngleUnits,
  degreesToAngleDeltaUnits,
  degreesToAngleUnits,
  FULL_TURN_UNITS,
  QUARTER_TURN_UNITS,
  RenderSnapshotView,
  shortestSignedAngleDelta,
} from "@findmysensi/aim-core";
import {
  AimRenderer,
  CrosshairConfig,
  PlayAreaRenderConfig,
  PotatoRendererOptions,
  RendererGraphicsPreset,
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
const ARENA_CEILING = "#151a22";
const ARENA_WALL = "#1b222c";
const ARENA_FLOOR = "#0b1017";
const ARENA_GRID = "#758397";
const ARENA_EDGE = "#a7b3c2";

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
  private graphicsPreset: RendererGraphicsPreset = "automatic";

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
    if (options?.graphicsPreset) {
      this.graphicsPreset = options.graphicsPreset;
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

    this.renderArena(ctx, vp, playerYaw, playerPitch);
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
      if (
        Math.abs(relYaw) >= QUARTER_TURN_UNITS ||
        Math.abs(relPitch) >= QUARTER_TURN_UNITS
      ) {
        continue;
      }
      const screenPos = vp.simToDisplay(relYaw, relPitch);
      const radiusPx = Math.max(2, vp.angleRadiusToPixels(rawRadius));
      if (
        screenPos.x + radiusPx < rectX ||
        screenPos.x - radiusPx > rectX + rectW ||
        screenPos.y + radiusPx < rectY ||
        screenPos.y - radiusPx > rectY + rectH
      ) {
        continue;
      }

      this.renderTargetSphere(ctx, screenPos.x, screenPos.y, radiusPx);
    }

    this.renderViewModel(ctx, vp, playerPitch);
    this.renderCrosshair(ctx, rectX + rectW / 2, rectY + rectH / 2);
    if (typeof ctx.restore === "function") ctx.restore();
  }

  private renderArena(
    ctx: CanvasRenderingContext2D,
    vp: ViewportTransform,
    playerYaw: number,
    playerPitch: number,
  ): void {
    const { x, y, width, height } = vp.displayRect;
    const bottom = y + height;
    const ceilingBottom = this.projectWorldPitch(
      vp,
      degreesToAngleDeltaUnits(35),
      playerPitch,
      y,
      bottom,
    );
    const floorTop = this.projectWorldPitch(
      vp,
      degreesToAngleDeltaUnits(-35),
      playerPitch,
      y,
      bottom,
    );

    ctx.globalAlpha = 1;
    ctx.fillStyle = ARENA_CEILING;
    ctx.fillRect(x, y, width, Math.max(0, ceilingBottom - y));
    ctx.fillStyle = ARENA_WALL;
    ctx.fillRect(
      x,
      ceilingBottom,
      width,
      Math.max(0, floorTop - ceilingBottom),
    );
    ctx.fillStyle = ARENA_FLOOR;
    ctx.fillRect(x, floorTop, width, Math.max(0, bottom - floorTop));

    const gridStepDegrees =
      this.graphicsPreset === "potato"
        ? 30
        : this.graphicsPreset === "high"
          ? 10
          : 15;

    ctx.globalAlpha = this.graphicsPreset === "potato" ? 0.14 : 0.2;
    ctx.lineWidth = Math.max(1, vp.dpr * 0.75);
    ctx.strokeStyle = ARENA_GRID;
    ctx.beginPath();

    for (
      let worldYawDegrees = 0;
      worldYawDegrees < 360;
      worldYawDegrees += gridStepDegrees
    ) {
      const relativeYaw = shortestSignedAngleDelta(
        createAngleUnits(playerYaw),
        degreesToAngleUnits(worldYawDegrees),
      );
      if (Math.abs(relativeYaw) >= QUARTER_TURN_UNITS) continue;
      const screenX = vp.simToDisplay(relativeYaw, 0).x;
      if (screenX < x || screenX > x + width) continue;
      ctx.moveTo(screenX, y);
      ctx.lineTo(screenX, bottom);
    }

    for (
      let worldPitchDegrees = -75;
      worldPitchDegrees <= 75;
      worldPitchDegrees += gridStepDegrees
    ) {
      const relativePitch =
        degreesToAngleDeltaUnits(worldPitchDegrees) - playerPitch;
      if (Math.abs(relativePitch) >= QUARTER_TURN_UNITS) continue;
      const screenY = vp.simToDisplay(0, relativePitch).y;
      if (screenY < y || screenY > bottom) continue;
      ctx.moveTo(x, screenY);
      ctx.lineTo(x + width, screenY);
    }
    ctx.stroke();

    ctx.globalAlpha = 0.32;
    ctx.lineWidth = Math.max(1, vp.dpr);
    ctx.strokeStyle = ARENA_EDGE;
    ctx.beginPath();
    ctx.moveTo(x, ceilingBottom);
    ctx.lineTo(x + width, ceilingBottom);
    ctx.moveTo(x, floorTop);
    ctx.lineTo(x + width, floorTop);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private projectWorldPitch(
    vp: ViewportTransform,
    worldPitch: number,
    playerPitch: number,
    top: number,
    bottom: number,
  ): number {
    const relativePitch = worldPitch - playerPitch;
    if (relativePitch >= QUARTER_TURN_UNITS) return top;
    if (relativePitch <= -QUARTER_TURN_UNITS) return bottom;
    const projected = vp.simToDisplay(0, relativePitch).y;
    return Math.max(top, Math.min(bottom, projected));
  }

  private renderTargetSphere(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
  ): void {
    ctx.globalAlpha = this.target.opacity * 0.28;
    ctx.beginPath();
    ctx.arc(
      x + radius * 0.13,
      y + radius * 0.18,
      radius * 1.04,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#000000";
    ctx.fill();

    ctx.globalAlpha = this.target.opacity;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (
      this.graphicsPreset !== "potato" &&
      this.graphicsPreset !== "low" &&
      typeof ctx.createRadialGradient === "function"
    ) {
      const gradient = ctx.createRadialGradient(
        x - radius * 0.32,
        y - radius * 0.34,
        Math.max(1, radius * 0.06),
        x,
        y,
        radius,
      );
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.18, this.target.bodyColor);
      gradient.addColorStop(1, "#111827");
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = this.target.bodyColor;
    }
    ctx.fill();

    if (this.target.borderWidth > 0) {
      ctx.lineWidth = this.target.borderWidth;
      ctx.strokeStyle = this.target.borderColor;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private renderViewModel(
    ctx: CanvasRenderingContext2D,
    vp: ViewportTransform,
    playerPitch: number,
  ): void {
    const { x, y, width, height } = vp.displayRect;
    const right = x + width;
    const bottom = y + height;
    const scale = Math.max(0.55, Math.min(1.5, height / 1080));
    const pitchDegrees = (playerPitch / FULL_TURN_UNITS) * 360;
    const downLook = Math.max(0, Math.min(1, (-pitchDegrees - 42) / 42));

    if (downLook > 0) {
      const bootY = bottom - (24 + downLook * 92) * scale;
      const spread = (34 + downLook * 42) * scale;
      const bootWidth = 34 * scale;
      const bootHeight = 92 * scale;
      fillPolygon(ctx, "#070a0e", [
        [x + width / 2 - spread - bootWidth, bottom],
        [x + width / 2 - spread - bootWidth * 0.72, bootY],
        [x + width / 2 - spread + bootWidth * 0.55, bootY - bootHeight * 0.08],
        [x + width / 2 - spread + bootWidth, bottom],
      ]);
      fillPolygon(ctx, "#070a0e", [
        [x + width / 2 + spread - bootWidth, bottom],
        [x + width / 2 + spread - bootWidth * 0.55, bootY - bootHeight * 0.08],
        [x + width / 2 + spread + bootWidth * 0.72, bootY],
        [x + width / 2 + spread + bootWidth, bottom],
      ]);
    }

    const lowered = downLook * 70 * scale;
    fillPolygon(ctx, "#263141", [
      [right - 310 * scale, bottom],
      [right - 255 * scale, bottom - 152 * scale + lowered],
      [right - 170 * scale, bottom - 126 * scale + lowered],
      [right - 120 * scale, bottom],
    ]);
    fillPolygon(ctx, "#0a0f16", [
      [right - 220 * scale, bottom - 135 * scale + lowered],
      [right - 195 * scale, bottom - 245 * scale + lowered],
      [right - 111 * scale, bottom - 230 * scale + lowered],
      [right - 76 * scale, bottom - 95 * scale + lowered],
      [right - 128 * scale, bottom - 70 * scale + lowered],
    ]);
    fillPolygon(ctx, "#64748b", [
      [right - 194 * scale, bottom - 244 * scale + lowered],
      [right - 92 * scale, bottom - 256 * scale + lowered],
      [right - 49 * scale, bottom - 233 * scale + lowered],
      [right - 112 * scale, bottom - 218 * scale + lowered],
    ]);
    ctx.globalAlpha = 1;
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

function fillPolygon(
  ctx: CanvasRenderingContext2D,
  color: string,
  points: readonly (readonly [number, number])[],
): void {
  const first = points[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);
  for (let index = 1; index < points.length; index++) {
    const point = points[index]!;
    ctx.lineTo(point[0], point[1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function wrapPositive(units: number): number {
  const full = QUARTER_TURN_UNITS * 4;
  const remainder = units % full;
  return remainder < 0 ? remainder + full : remainder;
}

export function createAimRenderer(): AimRenderer {
  return new Canvas2DPotatoRenderer();
}
