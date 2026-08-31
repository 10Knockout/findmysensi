import { RenderSnapshotView, degreesToAngleUnits } from "@findmysensi/aim-core";
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
  borderColor: "#ffffff",
  borderWidth: 2,
};

const DEFAULT_BACKGROUND = "#0f1117";
const DEFAULT_HFOV_UNITS = degreesToAngleUnits(103);

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

    if (!ctx || !vp || !canvas) {
      return;
    }

    const { width: canvasWidth, height: canvasHeight } = canvas;
    const { x: rectX, y: rectY, width: rectW, height: rectH } = vp.displayRect;

    // 1. Fill entire canvas with true black (for letterbox/pillarbox margins)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Fill active 16:9 training viewport area
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(rectX, rectY, rectW, rectH);

    // 3. Render active targets relative to player view angle
    const targetCount = snapshot.targetCount;
    const playerYaw = snapshot.playerYaw;
    const playerPitch = snapshot.playerPitch;

    const pxPerAngleUnit = rectW / DEFAULT_HFOV_UNITS;

    for (let i = 0; i < targetCount; i++) {
      const rawTargetX = snapshot.targetX[i] ?? 0;
      const rawTargetY = snapshot.targetY[i] ?? 0;
      const rawRadius = snapshot.targetRadius[i] ?? 0;

      // Relative angular offset from player view center
      const relYaw = rawTargetX - playerYaw;
      const relPitch = rawTargetY - playerPitch;

      const screenPos = vp.simToDisplay(relYaw, relPitch);
      const radiusPx = Math.max(2, rawRadius * pxPerAngleUnit);

      // Draw flat circle body
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = this.target.bodyColor;
      ctx.fill();

      // Draw target border
      if (this.target.borderWidth > 0) {
        ctx.lineWidth = this.target.borderWidth;
        ctx.strokeStyle = this.target.borderColor;
        ctx.stroke();
      }
    }

    // 4. Render center crosshair
    const centerX = rectX + rectW / 2;
    const centerY = rectY + rectH / 2;
    const { color, size, thickness, gap, dot } = this.crosshair;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;

    // Center dot
    if (dot) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, thickness / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crosshair arms
    ctx.beginPath();
    // Top
    ctx.moveTo(centerX, centerY - gap);
    ctx.lineTo(centerX, centerY - gap - size);
    // Bottom
    ctx.moveTo(centerX, centerY + gap);
    ctx.lineTo(centerX, centerY + gap + size);
    // Left
    ctx.moveTo(centerX - gap, centerY);
    ctx.lineTo(centerX - gap - size, centerY);
    // Right
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
