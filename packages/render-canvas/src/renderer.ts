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
  color: "#00ff88",
  size: 6,
  thickness: 2,
  gap: 3,
  dot: false,
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
      desynchronized: true,
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

    const centerX = rectX + rectW / 2;
    const centerY = rectY + rectH / 2;
    const { color, size, thickness, gap, dot } = this.crosshair;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;

    if (dot) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, thickness / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - gap);
    ctx.lineTo(centerX, centerY - gap - size);
    ctx.moveTo(centerX, centerY + gap);
    ctx.lineTo(centerX, centerY + gap + size);
    ctx.moveTo(centerX - gap, centerY);
    ctx.lineTo(centerX - gap - size, centerY);
    ctx.moveTo(centerX + gap, centerY);
    ctx.lineTo(centerX + gap + size, centerY);
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
