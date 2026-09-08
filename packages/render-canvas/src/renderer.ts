import {
  createAngleUnits,
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

// Depth in a flat-shaded room comes from value contrast between surfaces, not
// from the projection maths. The ladder below runs dark ceiling -> mid walls ->
// light floor so the eye reads distance immediately, while staying inside the
// dark palette the rest of the product uses. Left and right walls differ
// slightly so a corner never collapses into one flat mass.
const ARENA_CEILING = "#3a424c";
const ARENA_FRONT_WALL = "#525b66";
const ARENA_REAR_WALL = "#49515b";
const ARENA_LEFT_WALL = "#4d5661";
const ARENA_RIGHT_WALL = "#57606b";
const ARENA_FLOOR = "#7e858d";
const ARENA_FLOOR_ALT = "#8d949c";
const ARENA_GRID = "#9aa6b2";
const ARENA_EDGE = "#b6c1cc";

// Proportions of a real aim-trainer box: the far wall fills most of the frame,
// the side walls stay visible at the frame edges and the ceiling sits close
// enough overhead to read as a surface. A wider or deeper hall pushes those
// references off-screen and the view flattens out into an empty backdrop.
const HALL_HALF_WIDTH = 10;
const HALL_FLOOR_Y = -2.6;
const HALL_CEILING_Y = 3.4;
const HALL_HALF_DEPTH = 13;
const HALL_NEAR_PLANE = 0.08;

// Where the weapon sits relative to the player's eye, in metres. It is held
// right of centre and below the sight line, angled slightly inwards and up so
// the barrel converges on the crosshair the way a real hold does.
// Screen placement is set by the X/Z and Y/Z ratios; the absolute distance then
// sets how large the weapon renders. Pushing it back while holding those ratios
// keeps it in the same corner of the frame but shrinks it.
// These five numbers were fitted, not guessed. They are coupled — moving the
// weapon changes its apparent size, and pitch moves both ends of the barrel at
// once — so they were solved together against a screen-space acceptance table
// (muzzle, sights and slide centre as percentages of a 16:9 viewport) taken
// from the reference composition.
const WEAPON_POSITION_X = 0.0827;
const WEAPON_POSITION_Y = -0.0679;
const WEAPON_POSITION_Z = 0.4703;
const WEAPON_YAW_RADIANS = -0.009;
// Negative pitch raises the muzzle: model gz maps to world y through
// `-gz * sin(pitch)`, so a positive angle would make the barrel droop. Muzzle up
// is also what puts the eye above the slide, which is the only way the top
// surface shows as a long receding face instead of a thin edge.
const WEAPON_PITCH_RADIANS = -0.0626;
// Narrower than the world FOV on purpose: at 103 degrees a weapon this close to
// the eye would smear across half the frame. Shooters solve this with a
// dedicated viewmodel FOV, and this ratio is that knob.
const VIEWMODEL_FOCAL_RATIO = 0.9;

/**
 * Scales a hex colour towards white or black. Box faces derive their shade from
 * one base colour this way, which is what produces the faceted look without a
 * hand-authored colour per polygon.
 */
function shadeHex(hex: string, factor: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number): string => {
    const raw = Math.round(((value >> shift) & 0xff) * factor);
    return Math.max(0, Math.min(255, raw)).toString(16).padStart(2, "0");
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

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

interface Point3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface TrainingHallFace {
  readonly color: string;
  readonly points: readonly (readonly [number, number])[];
}

export interface TrainingHallGeometry {
  readonly faces: readonly TrainingHallFace[];
  readonly gridLines: readonly (readonly [
    readonly [number, number],
    readonly [number, number],
  ])[];
  readonly edges: readonly (readonly [
    readonly [number, number],
    readonly [number, number],
  ])[];
}

/** @deprecated Use TrainingHallFace. */
export type CubeRoomFace = TrainingHallFace;
/** @deprecated Use TrainingHallGeometry. */
export type CubeRoomGeometry = TrainingHallGeometry;

interface HallSurface {
  readonly color: string;
  readonly points: readonly Point3D[];
}

/**
 * Corner lists run as a loop, so bilinear interpolation over (u, v) walks the
 * surface without needing per-surface axis maths.
 */
const HALL_SURFACES: readonly {
  readonly color: string;
  readonly checker: boolean;
  readonly corners: readonly [Point3D, Point3D, Point3D, Point3D];
}[] = [
  {
    color: ARENA_FRONT_WALL,
    checker: false,
    corners: [
      { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
      { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
      { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
      { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
    ],
  },
  {
    color: ARENA_REAR_WALL,
    checker: false,
    corners: [
      { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
      { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
      { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
      { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
    ],
  },
  {
    color: ARENA_LEFT_WALL,
    checker: false,
    corners: [
      { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
      { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
      { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
      { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
    ],
  },
  {
    color: ARENA_RIGHT_WALL,
    checker: false,
    corners: [
      { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
      { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
      { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
      { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
    ],
  },
  {
    color: ARENA_CEILING,
    checker: false,
    corners: [
      { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
      { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
      { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
      { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
    ],
  },
  {
    color: ARENA_FLOOR,
    checker: true,
    corners: [
      { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
      { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
      { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
      { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
    ],
  },
];

function lerpPoint(from: Point3D, to: Point3D, t: number): Point3D {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: from.z + (to.z - from.z) * t,
  };
}

function quadPoint(
  corners: readonly [Point3D, Point3D, Point3D, Point3D],
  u: number,
  v: number,
): Point3D {
  return lerpPoint(
    lerpPoint(corners[0], corners[1], u),
    lerpPoint(corners[3], corners[2], u),
    v,
  );
}

/**
 * Builds the room's fill surfaces.
 *
 * The projection is rectilinear, so a straight edge in the room stays straight
 * on screen and a flat surface is already exact as one quad. Walls and ceiling
 * are therefore emitted whole — subdividing them would cost fills and change
 * nothing. Only the floor is split, purely to paint the checkerboard that gives
 * the room its distance cue; those tiles are coplanar, so they never need
 * sorting against one another.
 */
function createHallFaces(steps: number): readonly HallSurface[] {
  const faces: HallSurface[] = [];

  for (const surface of HALL_SURFACES) {
    if (!surface.checker) {
      faces.push({ color: surface.color, points: surface.corners });
      continue;
    }

    for (let iu = 0; iu < steps; iu++) {
      const u0 = iu / steps;
      const u1 = (iu + 1) / steps;
      for (let iv = 0; iv < steps; iv++) {
        const v0 = iv / steps;
        const v1 = (iv + 1) / steps;
        faces.push({
          color: (iu + iv) % 2 === 1 ? ARENA_FLOOR_ALT : surface.color,
          points: [
            quadPoint(surface.corners, u0, v0),
            quadPoint(surface.corners, u1, v0),
            quadPoint(surface.corners, u1, v1),
            quadPoint(surface.corners, u0, v1),
          ],
        });
      }
    }
  }

  return faces;
}

const HALL_EDGES: readonly (readonly [Point3D, Point3D])[] = [
  [
    { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
    { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
  ],
  [
    { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
    { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
  ],
  [
    { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
    { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
  ],
  [
    { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
    { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
  ],
  [
    { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
    { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
  ],
  [
    { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
    { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
  ],
  [
    { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
    { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
  ],
  [
    { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
    { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
  ],
  [
    { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
    { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
  ],
  [
    { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: -HALL_HALF_DEPTH },
    { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: -HALL_HALF_DEPTH },
  ],
  [
    { x: HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
    { x: HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
  ],
  [
    { x: -HALL_HALF_WIDTH, y: HALL_FLOOR_Y, z: HALL_HALF_DEPTH },
    { x: -HALL_HALF_WIDTH, y: HALL_CEILING_Y, z: HALL_HALF_DEPTH },
  ],
];

/** Builds a sparse, fixed training hall around the player. */
export function createTrainingHallGeometry(
  vp: ViewportTransform,
  playerYaw: number,
  playerPitch: number,
  divisions = 3,
): TrainingHallGeometry {
  const yaw = (playerYaw / FULL_TURN_UNITS) * Math.PI * 2;
  const pitch = (playerPitch / FULL_TURN_UNITS) * Math.PI * 2;
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);
  const sinPitch = Math.sin(pitch);
  const cosPitch = Math.cos(pitch);

  const toCamera = (point: Point3D): Point3D => ({
    x: point.x * cosYaw - point.z * sinYaw,
    y:
      -point.x * sinYaw * sinPitch +
      point.y * cosPitch -
      point.z * cosYaw * sinPitch,
    z:
      point.x * sinYaw * cosPitch +
      point.y * sinPitch +
      point.z * cosYaw * cosPitch,
  });
  const toScreen = (point: Point3D): readonly [number, number] => {
    // `simToDisplay` is a pinhole projection: it applies tan() to both angles,
    // so it needs tan(yaw) = x/z AND tan(pitch) = y/z. Deriving pitch from the
    // full 3D distance (hypot(x, z)) instead of z compresses the vertical as
    // the point moves sideways, which bows every straight edge into a curve —
    // a cylindrical projection, not the rectilinear one the rest of the
    // viewport uses. Both angles are measured against z for that reason.
    const yawUnits =
      (Math.atan2(point.x, point.z) / (Math.PI * 2)) * FULL_TURN_UNITS;
    const pitchUnits =
      (Math.atan2(point.y, point.z) / (Math.PI * 2)) * FULL_TURN_UNITS;
    const screen = vp.simToDisplay(yawUnits, pitchUnits);
    return [screen.x, screen.y];
  };

  const safeDivisions = Math.max(2, Math.min(4, Math.round(divisions)));
  // With a rectilinear projection a flat surface is exact as a single quad, so
  // only the floor is subdivided, and only to draw the checker pattern.
  const faceSource = createHallFaces(safeDivisions * 3);

  const visibleFaces = faceSource
    .flatMap((face) => {
      const clipped = clipPolygonToNearPlane(face.points.map(toCamera));
      if (clipped.length < 3) return [];
      const depth =
        clipped.reduce((sum, point) => sum + point.z, 0) / clipped.length;
      return [{ color: face.color, points: clipped.map(toScreen), depth }];
    })
    .sort((left, right) => right.depth - left.depth)
    .map(({ color, points }) => ({ color, points }));

  const projectSegment = (
    segment: readonly [Point3D, Point3D],
  ): readonly [readonly [number, number], readonly [number, number]] | null => {
    const clipped = clipSegmentToNearPlane(
      toCamera(segment[0]),
      toCamera(segment[1]),
    );
    return clipped ? [toScreen(clipped[0]), toScreen(clipped[1])] : null;
  };

  const gridLines = createHallPanelLines(safeDivisions)
    .map(projectSegment)
    .filter((line): line is NonNullable<typeof line> => line !== null);
  const edges = HALL_EDGES.map(projectSegment).filter(
    (line): line is NonNullable<typeof line> => line !== null,
  );

  return { faces: visibleFaces, gridLines, edges };
}

/** @deprecated Kept for compatibility with the first room prototype. */
export function createCubeRoomGeometry(
  vp: ViewportTransform,
  playerYaw: number,
  playerPitch: number,
  divisions = 3,
): TrainingHallGeometry {
  return createTrainingHallGeometry(vp, playerYaw, playerPitch, divisions);
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
  private weaponHand: "right" | "left" = "right";

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
    this.weaponHand = options?.weaponHand ?? "right";
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
    const divisions =
      this.graphicsPreset === "potato"
        ? 2
        : this.graphicsPreset === "high"
          ? 4
          : 3;
    const room = createTrainingHallGeometry(
      vp,
      playerYaw,
      playerPitch,
      divisions,
    );

    ctx.globalAlpha = 1;
    for (const face of room.faces) {
      fillPolygon(ctx, face.color, face.points);
    }

    ctx.globalAlpha = this.graphicsPreset === "potato" ? 0.1 : 0.14;
    ctx.lineWidth = Math.max(1, vp.dpr * 0.7);
    ctx.strokeStyle = ARENA_GRID;
    strokeSegments(ctx, room.gridLines);

    ctx.globalAlpha = 0.28;
    ctx.lineWidth = Math.max(1, vp.dpr);
    ctx.strokeStyle = ARENA_EDGE;
    strokeSegments(ctx, room.edges);
    ctx.globalAlpha = 1;
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
    const bottom = y + height;
    const scale = Math.max(0.42, Math.min(1.5, height / 1080, width / 1280));
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

    for (const shape of createLightweightViewModelGeometry(
      vp.displayRect,
      playerPitch,
      this.weaponHand,
    )) {
      fillPolygon(ctx, shape.color, shape.points);
    }
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

export interface LightweightViewModelPolygon {
  readonly color: string;
  readonly points: readonly (readonly [number, number])[];
}

/**
 * Flat, texture-free pistol and glove geometry. Keeping this as a small fixed
 * polygon list makes the viewmodel deterministic and inexpensive on low-end
 * integrated graphics while still reading clearly at a glance.
 */
export function createLightweightViewModelGeometry(
  displayRect: Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>,
  playerPitch: number,
  weaponHand: "right" | "left" = "right",
): readonly LightweightViewModelPolygon[] {
  const { x, y, width, height } = displayRect;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const pitchDegrees = (playerPitch / FULL_TURN_UNITS) * 360;
  const downLook = Math.max(0, Math.min(1, (-pitchDegrees - 42) / 42));
  const lowered = downLook * height * 0.1;

  // Weapons render on their own focal length, the way shooters keep a separate
  // viewmodel FOV from the world FOV. Nothing here feeds back into aim maths.
  const focal = width * VIEWMODEL_FOCAL_RATIO;
  const cosPitch = Math.cos(WEAPON_PITCH_RADIANS);
  const sinPitch = Math.sin(WEAPON_PITCH_RADIANS);
  const cosYaw = Math.cos(WEAPON_YAW_RADIANS);
  const sinYaw = Math.sin(WEAPON_YAW_RADIANS);

  // Model space: gx across the weapon, gy up it, gz towards the muzzle, with
  // the origin at the rear underside of the slide.
  const project = (
    gx: number,
    gy: number,
    gz: number,
  ): readonly [number, number, number] => {
    const pitchedY = gy * cosPitch - gz * sinPitch;
    const pitchedZ = gy * sinPitch + gz * cosPitch;
    const worldX = WEAPON_POSITION_X + gx * cosYaw + pitchedZ * sinYaw;
    const worldY = WEAPON_POSITION_Y + pitchedY;
    const worldZ = WEAPON_POSITION_Z - gx * sinYaw + pitchedZ * cosYaw;
    const safeZ = Math.max(0.05, worldZ);
    return [
      centerX + (focal * worldX) / safeZ,
      centerY - (focal * worldY) / safeZ + lowered,
      safeZ,
    ];
  };

  const faces: {
    color: string;
    depth: number;
    points: (readonly [number, number])[];
  }[] = [];

  // `bias` pulls a face towards the camera for sorting only. Decals such as the
  // top rail or the sight dots sit exactly on the surface they decorate, so
  // their centroid depth ties with it and the draw order becomes arbitrary — the
  // decal then vanishes at random. A small bias settles the tie permanently.
  const addQuad = (
    color: string,
    corners: readonly (readonly [number, number, number])[],
    bias = 0,
  ): void => {
    const projected = corners.map(([gx, gy, gz]) => project(gx, gy, gz));
    const depth =
      projected.reduce((sum, entry) => sum + entry[2], 0) / projected.length -
      bias;
    faces.push({
      color,
      depth,
      points: projected.map(([sx, sy]) => [sx, sy] as const),
    });
  };

  // One box carries six shaded faces, which is what gives the model its faceted
  // low-poly read without hand-picking a colour per polygon.
  const addBox = (
    base: string,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
  ): void => {
    addQuad(shadeHex(base, 1.3), [
      [x0, y1, z0],
      [x1, y1, z0],
      [x1, y1, z1],
      [x0, y1, z1],
    ]);
    addQuad(shadeHex(base, 0.5), [
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y0, z0],
      [x0, y0, z0],
    ]);
    addQuad(shadeHex(base, 0.78), [
      [x0, y0, z0],
      [x0, y0, z1],
      [x0, y1, z1],
      [x0, y1, z0],
    ]);
    addQuad(shadeHex(base, 1.1), [
      [x1, y0, z1],
      [x1, y0, z0],
      [x1, y1, z0],
      [x1, y1, z1],
    ]);
    addQuad(shadeHex(base, 0.66), [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z0],
      [x0, y1, z0],
    ]);
    addQuad(shadeHex(base, 0.9), [
      [x1, y0, z1],
      [x0, y0, z1],
      [x0, y1, z1],
      [x1, y1, z1],
    ]);
  };

  // Forearm and fist, behind and below everything else. The forearm stops
  // short rather than running metres past the frame: this close to the eye the
  // perspective divide magnifies every extra centimetre into thousands of
  // off-screen pixels that still cost rasterisation time.
  addBox("#151a21", -0.048, 0.034, -0.2, -0.11, -0.1, -0.02);
  addBox("#1a1f27", -0.042, 0.036, -0.115, -0.024, -0.03, 0.052);
  // Finger rows, so the hand reads as fingers wrapped round a grip rather than
  // one black block.
  addBox("#242b35", -0.028, 0.038, -0.052, -0.024, 0.03, 0.064);
  addBox("#1f2630", -0.028, 0.038, -0.082, -0.055, 0.028, 0.06);
  addBox("#1a212a", -0.027, 0.037, -0.11, -0.085, 0.024, 0.054);
  // Thumb lying up the right side of the frame, which is the face the player's
  // eye is on and would otherwise show as a bare slab.
  addBox("#242b35", 0.014, 0.036, -0.03, -0.004, 0.03, 0.1);

  // Grip and magazine.
  addBox("#181d23", -0.015, 0.015, -0.115, -0.03, -0.012, 0.046);
  addBox("#12161b", -0.017, 0.017, -0.127, -0.115, -0.014, 0.048);

  // Frame, slide and suppressor. The slide is the dominant shape, so it carries
  // the width; the sights sit on top of it at the heights the placement fit was
  // solved against, which is why its thickness grows downwards rather than up.
  addBox("#242930", -0.019, 0.019, -0.036, 0.001, 0.02, 0.16);
  addBox("#565d68", -0.021, 0.021, 0, 0.028, 0, 0.2);
  addBox("#454c56", -0.023, 0.023, -0.002, 0.03, 0.2, 0.38);

  // Cocking serrations, standing just proud of the slide sides.
  addBox("#3a414b", -0.0225, 0.0225, 0.005, 0.025, 0.03, 0.038);
  addBox("#3a414b", -0.0225, 0.0225, 0.005, 0.025, 0.048, 0.056);
  addBox("#3a414b", -0.0225, 0.0225, 0.005, 0.025, 0.066, 0.074);

  // Sight blocks and the brass collar under the front post.
  addBox("#191c21", -0.013, 0.013, 0.028, 0.042, 0.004, 0.016);
  addBox("#d8a63a", -0.008, 0.008, 0.026, 0.03, 0.19, 0.206);
  addBox("#191c21", -0.006, 0.006, 0.028, 0.044, 0.192, 0.204);

  // Flat inserts: the polished top rail, the bore, and the three sight dots.
  // These stay unshaded so they read as material rather than lit surface, and
  // carry a depth bias so they never lose the sort to the face beneath them.
  const decalBias = 0.004;
  addQuad(
    "#596474",
    [
      [-0.015, 0.0281, 0.022],
      [0.015, 0.0281, 0.022],
      [0.015, 0.0281, 0.188],
      [-0.015, 0.0281, 0.188],
    ],
    decalBias,
  );
  addQuad(
    "#080c11",
    [
      [-0.011, 0.005, 0.3801],
      [0.011, 0.005, 0.3801],
      [0.011, 0.021, 0.3801],
      [-0.011, 0.021, 0.3801],
    ],
    decalBias,
  );
  addQuad(
    "#bdff2d",
    [
      [-0.0115, 0.0315, 0.0039],
      [-0.0045, 0.0315, 0.0039],
      [-0.0045, 0.0385, 0.0039],
      [-0.0115, 0.0385, 0.0039],
    ],
    decalBias,
  );
  addQuad(
    "#bdff2d",
    [
      [0.0045, 0.0315, 0.0039],
      [0.0115, 0.0315, 0.0039],
      [0.0115, 0.0385, 0.0039],
      [0.0045, 0.0385, 0.0039],
    ],
    decalBias,
  );
  addQuad(
    "#bdff2d",
    [
      [-0.004, 0.0335, 0.1919],
      [0.004, 0.0335, 0.1919],
      [0.004, 0.0405, 0.1919],
      [-0.004, 0.0405, 0.1919],
    ],
    decalBias,
  );

  // Painter's algorithm: the parts barely interpenetrate, so sorting whole
  // faces back to front resolves the model without a depth buffer.
  faces.sort((left, right) => right.depth - left.depth);

  const mirrorAxis = x * 2 + width;
  return faces.map((face) => ({
    color: face.color,
    points:
      weaponHand === "right"
        ? face.points
        : face.points.map(
            ([sx, sy]) => [mirrorAxis - sx, sy] as readonly [number, number],
          ),
  }));
}

function createHallPanelLines(
  divisions: number,
): readonly (readonly [Point3D, Point3D])[] {
  const lines: Array<readonly [Point3D, Point3D]> = [];
  const wallDepths = [-HALL_HALF_DEPTH, HALL_HALF_DEPTH] as const;
  const wallSides = [-HALL_HALF_WIDTH, HALL_HALF_WIDTH] as const;
  const horizontalPlanes = [HALL_FLOOR_Y, HALL_CEILING_Y] as const;

  for (let index = 1; index < divisions; index++) {
    const ratio = index / divisions;
    const gridX = -HALL_HALF_WIDTH + ratio * HALL_HALF_WIDTH * 2;
    const gridY = HALL_FLOOR_Y + ratio * (HALL_CEILING_Y - HALL_FLOOR_Y);
    const gridZ = -HALL_HALF_DEPTH + ratio * HALL_HALF_DEPTH * 2;

    for (const z of wallDepths) {
      lines.push(
        [
          { x: gridX, y: HALL_FLOOR_Y, z },
          { x: gridX, y: HALL_CEILING_Y, z },
        ],
        [
          { x: -HALL_HALF_WIDTH, y: gridY, z },
          { x: HALL_HALF_WIDTH, y: gridY, z },
        ],
      );
    }
    for (const x of wallSides) {
      lines.push(
        [
          { x, y: HALL_FLOOR_Y, z: gridZ },
          { x, y: HALL_CEILING_Y, z: gridZ },
        ],
        [
          { x, y: gridY, z: -HALL_HALF_DEPTH },
          { x, y: gridY, z: HALL_HALF_DEPTH },
        ],
      );
    }
    for (const y of horizontalPlanes) {
      lines.push(
        [
          { x: gridX, y, z: -HALL_HALF_DEPTH },
          { x: gridX, y, z: HALL_HALF_DEPTH },
        ],
        [
          { x: -HALL_HALF_WIDTH, y, z: gridZ },
          { x: HALL_HALF_WIDTH, y, z: gridZ },
        ],
      );
    }
  }

  return lines;
}

function clipPolygonToNearPlane(points: readonly Point3D[]): Point3D[] {
  const output: Point3D[] = [];
  for (let index = 0; index < points.length; index++) {
    const current = points[index]!;
    const previous = points[(index + points.length - 1) % points.length]!;
    const currentVisible = current.z >= HALL_NEAR_PLANE;
    const previousVisible = previous.z >= HALL_NEAR_PLANE;
    if (currentVisible !== previousVisible) {
      output.push(intersectNearPlane(previous, current));
    }
    if (currentVisible) output.push(current);
  }
  return output;
}

function clipSegmentToNearPlane(
  start: Point3D,
  end: Point3D,
): readonly [Point3D, Point3D] | null {
  const startVisible = start.z >= HALL_NEAR_PLANE;
  const endVisible = end.z >= HALL_NEAR_PLANE;
  if (!startVisible && !endVisible) return null;
  if (startVisible && endVisible) return [start, end];
  const intersection = intersectNearPlane(start, end);
  return startVisible ? [start, intersection] : [intersection, end];
}

function intersectNearPlane(start: Point3D, end: Point3D): Point3D {
  const ratio = (HALL_NEAR_PLANE - start.z) / (end.z - start.z);
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
    z: HALL_NEAR_PLANE,
  };
}

function strokeSegments(
  ctx: CanvasRenderingContext2D,
  segments: readonly (readonly [
    readonly [number, number],
    readonly [number, number],
  ])[],
): void {
  ctx.beginPath();
  for (const [start, end] of segments) {
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
  }
  ctx.stroke();
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
