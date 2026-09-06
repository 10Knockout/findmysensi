import { RenderSnapshotView } from "@findmysensi/aim-core";
import { ViewportTransform } from "./viewport-transform.js";

export interface CrosshairConfig {
  readonly style: "cross" | "dot" | "circle" | "classic";
  readonly color: string;
  readonly size: number;
  readonly thickness: number;
  readonly gap: number;
  readonly dot: boolean;
  readonly dotSize: number;
  readonly outline: boolean;
  readonly outlineThickness: number;
  readonly outlineColor: string;
  readonly opacity: number;
}

export interface TargetRenderConfig {
  readonly bodyColor: string;
  readonly opacity: number;
  readonly borderColor: string;
  readonly borderWidth: number;
}

export type RendererGraphicsPreset =
  "automatic" | "potato" | "low" | "balanced" | "high";

export interface PlayAreaRenderConfig {
  /** Full width of the scenario spawn area, in angle units. */
  readonly widthUnits: number;
  /** Full height of the scenario spawn area, in angle units. */
  readonly heightUnits: number;
  readonly color: string;
  readonly lineWidth: number;
  readonly opacity: number;
}

export interface PotatoRendererOptions {
  readonly backgroundColor?: string | undefined;
  readonly graphicsPreset?: RendererGraphicsPreset | undefined;
  readonly crosshair?: Partial<CrosshairConfig> | undefined;
  readonly target?: Partial<TargetRenderConfig> | undefined;
  /**
   * Draws the scenario's play area as a faint outline. Omit to draw nothing.
   * Requires at least `widthUnits` and `heightUnits`.
   */
  readonly playArea?:
    | (Pick<PlayAreaRenderConfig, "widthUnits" | "heightUnits"> &
        Partial<PlayAreaRenderConfig>)
    | undefined;
}

export interface AimRenderer {
  initialize(
    canvas: HTMLCanvasElement,
    viewport: ViewportTransform,
    options?: PotatoRendererOptions,
  ): void;
  render(snapshot: RenderSnapshotView): void;
  resize(viewport: ViewportTransform): void;
  dispose(): void;
}
