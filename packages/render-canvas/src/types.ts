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

export interface PotatoRendererOptions {
  readonly backgroundColor?: string | undefined;
  readonly crosshair?: Partial<CrosshairConfig> | undefined;
  readonly target?: Partial<TargetRenderConfig> | undefined;
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
