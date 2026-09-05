import {
  createAngleUnits,
  RenderSnapshotView,
  shortestSignedAngleDelta,
} from "@findmysensi/aim-core";
import {
  AimRenderer,
  CrosshairConfig,
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

export class Canvas2DPotatoRenderer implements AimRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private viewport: ViewportTransform | null = null;
  private backgroundColor: string = DEFAULT_BACKGROUND;
  private crosshair: CrosshairConfig = DEFAULT_CROSSHAIR;
  private target: TargetRenderConfig = DEFAULT_TARGET;

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

    for (let i = 0; i < targetCount; i++) {
      const rawTargetX = snapshot.targetX[i] ?? 0;
      const rawTargetY = snapshot.targetY[i] ?? 0;
      const rawRadius = snapshot.targetRadius[i] ?? 0;

      const relYaw = shortestSignedAngleDelta(
        playerYaw,
        createAngleUnits(rawTargetX),
      );
      const relPitch = rawTargetY - playerPitch;
      const screenPos = vp.simToDisplay(relYaw, relPitch);
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

export function createAimRenderer(): AimRenderer {
  return new Canvas2DPotatoRenderer();
}
