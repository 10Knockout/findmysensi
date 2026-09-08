import {
  createAngleUnits,
  createPitchUnits,
  createSnapshotBuffer,
  FULL_TURN_UNITS,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it, vi } from "vitest";
import {
  createAimRenderer,
  createLightweightViewModelGeometry,
  createTrainingHallGeometry,
} from "../src/renderer.js";
import { createViewportTransform } from "../src/viewport-transform.js";

function createMockContext() {
  return {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
  };
}

describe("Canvas2D Potato Aim Renderer", () => {
  it("builds a bounded lower-right steel pistol with a black tactical glove", () => {
    const geometry = createLightweightViewModelGeometry(
      { x: 0, y: 0, width: 1920, height: 1080 },
      0,
    );
    const points = geometry.flatMap((shape) => shape.points);
    const colors = geometry.map((shape) => shape.color);

    // Budget guard, not a design limit. The weapon is a small solid built from
    // shaded boxes, so it costs roughly what the room costs; the ceiling keeps
    // that honest on integrated graphics as parts get added.
    expect(geometry.length).toBeLessThanOrEqual(128);
    // Steel slide, luminous iron sights and near-black glove plates are what
    // make the viewmodel read as a pistol rather than an abstract shape.
    expect(colors).toContain("#596474");
    expect(colors).toContain("#bdff2d");
    expect(colors).toContain("#080c11");
    // Stays in its own half of the frame and never crosses the far edge.
    expect(Math.min(...points.map(([x]) => x))).toBeGreaterThan(1920 / 2);
    expect(Math.max(...points.map(([x]) => x))).toBeLessThanOrEqual(1920);
    // The forearm deliberately runs off the bottom of the frame the way a
    // first-person arm does. How far it overshoots is not worth pinning: the
    // weapon sits centimetres from the eye, so the perspective divide turns a
    // small extra length into a large off-screen coordinate. What matters is
    // that the arm leaves the frame while the weapon itself stays in it.
    expect(Math.max(...points.map(([, y]) => y))).toBeGreaterThan(1080);
    expect(Math.min(...points.map(([, y]) => y))).toBeGreaterThan(0);
    const onScreen = points.filter(([, py]) => py >= 0 && py <= 1080);
    expect(onScreen.length / points.length).toBeGreaterThan(0.5);
  });

  it("mirrors the viewmodel exactly for left-hand mode", () => {
    const rect = { x: 40, y: 20, width: 1600, height: 900 };
    const right = createLightweightViewModelGeometry(rect, 0);
    const left = createLightweightViewModelGeometry(rect, 0, "left");

    expect(left).toHaveLength(right.length);
    for (let shapeIndex = 0; shapeIndex < right.length; shapeIndex++) {
      const rightShape = right[shapeIndex]!;
      const leftShape = left[shapeIndex]!;
      expect(leftShape.color).toBe(rightShape.color);
      for (
        let pointIndex = 0;
        pointIndex < rightShape.points.length;
        pointIndex++
      ) {
        const [rightX, rightY] = rightShape.points[pointIndex]!;
        const [leftX, leftY] = leftShape.points[pointIndex]!;
        expect(leftX).toBeCloseTo(rect.x * 2 + rect.width - rightX, 8);
        expect(leftY).toBeCloseTo(rightY, 8);
      }
    }
  });

  it("projects a deep training hall with visible perspective panels", () => {
    const viewport = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1080,
      horizontalFovDegrees: 103,
    });
    const room = createTrainingHallGeometry(viewport, 0, 0, 3);
    // Walls and ceiling are single quads; only the floor is split into tiles.
    const floorColors = new Set(["#7e858d", "#8d949c"]);
    const floorFaces = room.faces.filter((face) => floorColors.has(face.color));
    const farWallPoints = room.faces
      .filter((face) => face.color === "#525b66")
      .flatMap((face) => face.points);
    const farWallWidth =
      Math.max(...farWallPoints.map(([x]) => x)) -
      Math.min(...farWallPoints.map(([x]) => x));
    const farWallHeight =
      Math.max(...farWallPoints.map(([, y]) => y)) -
      Math.min(...farWallPoints.map(([, y]) => y));

    // Walls, ceiling and floor must all survive projection, otherwise the room
    // loses the surfaces the eye reads distance from.
    expect(new Set(room.faces.map((face) => face.color)).size).toBeGreaterThan(
      3,
    );
    // The checkerboard is the room's main distance cue, so both tile shades
    // must survive projection rather than collapsing to a single fill.
    expect(floorFaces.length).toBeGreaterThan(4);
    expect(new Set(floorFaces.map((face) => face.color)).size).toBe(2);
    expect(room.edges.length).toBeGreaterThanOrEqual(8);
    expect(room.gridLines.length).toBeLessThanOrEqual(24);
    expect(farWallWidth).toBeGreaterThan(1920 * 0.55);
    expect(farWallWidth).toBeLessThan(1920 * 0.85);
    expect(farWallHeight).toBeGreaterThan(1080 * 0.18);
    expect(farWallHeight).toBeLessThan(1080 * 0.55);
    expect(
      [
        ...room.faces.flatMap((face) => face.points),
        ...room.edges.flat(),
      ].every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)),
    ).toBe(true);
  });

  it("keeps training-hall projection finite while looking into a corner and floor", () => {
    const viewport = createViewportTransform({
      canvasWidth: 1280,
      canvasHeight: 720,
      horizontalFovDegrees: 103,
    });
    const room = createTrainingHallGeometry(
      viewport,
      FULL_TURN_UNITS / 8,
      -FULL_TURN_UNITS / 8,
      2,
    );

    expect(room.faces.length).toBeGreaterThan(0);
    expect(room.faces.flatMap((face) => face.points)).not.toContainEqual([
      Infinity,
      Infinity,
    ]);
    expect(room.edges.length).toBeGreaterThan(0);
  });

  it("renders targets and center crosshair via Canvas2D context without mutating state", () => {
    const renderer = createAimRenderer();
    const mockCtx = createMockContext();
    const mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: vi.fn(() => mockCtx),
    };

    const viewport = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1080,
    });

    renderer.initialize(mockCanvas as unknown as HTMLCanvasElement, viewport, {
      backgroundColor: "#0f1117",
      crosshair: { color: "#00ff88", dot: true },
      target: { bodyColor: "#7CFF6B", opacity: 0.8, borderWidth: 0 },
    });

    const buffer = createSnapshotBuffer(16);
    buffer.beginWrite(createTick(1), createAngleUnits(0), createPitchUnits(0));
    buffer.writeTarget(1, 0, 0, 50_000);
    buffer.writeTarget(2, 50_000, 30_000, 50_000);
    buffer.endWrite();
    const snapshot = buffer.swap();

    renderer.render(snapshot);

    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.globalAlpha).toBe(1);
    expect(snapshot.targetCount).toBe(2);
    expect(snapshot.tick).toBe(1);

    renderer.dispose();
  });

  it("projects a target correctly across the yaw wrap seam", () => {
    const renderer = createAimRenderer();
    const mockCtx = createMockContext();
    const mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: vi.fn(() => mockCtx),
    };
    const viewport = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1080,
      horizontalFovDegrees: 103,
    });
    renderer.initialize(mockCanvas as unknown as HTMLCanvasElement, viewport);

    const buffer = createSnapshotBuffer(8);
    buffer.beginWrite(
      createTick(1),
      createAngleUnits(FULL_TURN_UNITS - 10_000),
      createPitchUnits(0),
    );
    buffer.writeTarget(1, 5_000, 0, 50_000);
    buffer.endWrite();
    renderer.render(buffer.swap());

    const firstTargetArc = mockCtx.arc.mock.calls[0];
    expect(firstTargetArc).toBeDefined();
    const targetX = firstTargetArc?.[0] as number;
    expect(targetX).toBeGreaterThan(960);
    expect(targetX).toBeLessThan(980);
  });

  it("uses the viewport FOV to derive target pixel radius", () => {
    const renderRadius = (fov: number) => {
      const renderer = createAimRenderer();
      const mockCtx = createMockContext();
      const mockCanvas = {
        width: 1920,
        height: 1080,
        getContext: vi.fn(() => mockCtx),
      };
      renderer.initialize(
        mockCanvas as unknown as HTMLCanvasElement,
        createViewportTransform({
          canvasWidth: 1920,
          canvasHeight: 1080,
          horizontalFovDegrees: fov,
        }),
      );
      const buffer = createSnapshotBuffer(8);
      buffer.beginWrite(
        createTick(1),
        createAngleUnits(0),
        createPitchUnits(0),
      );
      buffer.writeTarget(1, 0, 0, 50_000);
      buffer.endWrite();
      renderer.render(buffer.swap());
      return mockCtx.arc.mock.calls[0]?.[2] as number;
    };

    expect(renderRadius(90)).toBeGreaterThan(renderRadius(103));
  });

  it("handles resize without re-initialization errors", () => {
    const renderer = createAimRenderer();
    const mockCanvas = {
      width: 1280,
      height: 720,
      getContext: vi.fn(() => createMockContext()),
    };

    const v1 = createViewportTransform({
      canvasWidth: 1280,
      canvasHeight: 720,
    });
    const v2 = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1080,
    });

    renderer.initialize(mockCanvas as unknown as HTMLCanvasElement, v1);
    expect(() => renderer.resize(v2)).not.toThrow();

    renderer.dispose();
  });
});
