import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  createMoveEvent,
  createShotEvent,
  createInvalidateEvent,
  CanonicalInputEvent,
} from "../src/input/types.js";
import { stepSimulation } from "../src/state/step.js";
import {
  createInitialSimulationState,
  SimulationState,
} from "../src/state/types.js";

describe("Deterministic Simulation & Causal Input Ordering", () => {
  it("proves same-tick order matters: MOVE(+20) -> SHOT -> MOVE(-11) preserves exact shot angle", () => {
    const initialState = createInitialSimulationState(1000, 0);

    // Event sequence on tick 5:
    // 1. Move yaw +20 (order 0)
    // 2. Shot (order 1) -> must capture yaw=1020
    // 3. Move yaw -11 (order 2) -> final yaw=1009
    const events: CanonicalInputEvent[] = [
      createMoveEvent(5, 0, 20, 0),
      createShotEvent(5, 1),
      createMoveEvent(5, 2, -11, 0),
    ];

    const finalState = stepSimulation(initialState, events);

    expect(finalState.yaw).toBe(1009);
    expect(finalState.tick).toBe(5);
    expect(finalState.shots.length).toBe(1);

    const shot = finalState.shots[0];
    expect(shot?.yaw).toBe(1020);
    expect(shot?.tick).toBe(5);
    expect(shot?.order).toBe(1);

    // Contrast with collapsed move (+9) then shot:
    const collapsedEvents: CanonicalInputEvent[] = [
      createMoveEvent(5, 0, 9, 0),
      createShotEvent(5, 1),
    ];
    const collapsedState = stepSimulation(initialState, collapsedEvents);
    expect(collapsedState.shots[0]?.yaw).toBe(1009); // Different shot location!
    expect(collapsedState.shots[0]?.yaw).not.toBe(shot?.yaw);
  });

  it("handles out-of-order event delivery by sorting canonically by (tick, order)", () => {
    const initialState = createInitialSimulationState(0, 0);

    // Unordered array: order 2, order 0, order 1
    const unorderedEvents: CanonicalInputEvent[] = [
      createMoveEvent(1, 2, -5, 0),
      createMoveEvent(1, 0, 100, 0),
      createShotEvent(1, 1),
    ];

    const state = stepSimulation(initialState, unorderedEvents);
    expect(state.yaw).toBe(95);
    expect(state.shots[0]?.yaw).toBe(100);
  });

  it("marks state invalid and halts when an invalidate event occurs", () => {
    const initialState = createInitialSimulationState(0, 0);

    const events: CanonicalInputEvent[] = [
      createMoveEvent(1, 0, 50, 0),
      createInvalidateEvent(2, 0, "pointer_lock_lost"),
      createMoveEvent(3, 0, 100, 0), // Must not be applied
    ];

    const state = stepSimulation(initialState, events);
    expect(state.valid).toBe(false);
    expect(state.invalidationReason).toBe("pointer_lock_lost");
    expect(state.yaw).toBe(50); // Halted before tick 3 move
  });

  describe("Property Invariant: Chunk-Partition Invariance", () => {
    it("stepping in arbitrary chunk batches yields identical final state to full-stream step", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              tick: fc.integer({ min: 1, max: 20 }),
              order: fc.integer({ min: 0, max: 5 }),
              isShot: fc.boolean(),
              dx: fc.integer({ min: -5000, max: 5000 }),
              dy: fc.integer({ min: -2000, max: 2000 }),
            }),
            { minLength: 1, maxLength: 50 },
          ),
          fc.array(fc.integer({ min: 1, max: 10 }), {
            minLength: 1,
            maxLength: 10,
          }),
          (rawEvents, chunkSizes) => {
            // Deduplicate (tick, order) collisions to form a valid sorted stream
            const seen = new Set<string>();
            const events: CanonicalInputEvent[] = [];

            // Sort raw events by tick then order
            const sortedRaw = [...rawEvents].sort((a, b) =>
              a.tick !== b.tick ? a.tick - b.tick : a.order - b.order,
            );

            for (const item of sortedRaw) {
              const key = `${item.tick}:${item.order}`;
              if (!seen.has(key)) {
                seen.add(key);
                if (item.isShot) {
                  events.push(createShotEvent(item.tick, item.order));
                } else {
                  events.push(
                    createMoveEvent(item.tick, item.order, item.dx, item.dy),
                  );
                }
              }
            }

            if (events.length === 0) return;

            const initial = createInitialSimulationState(5000, 0);

            // 1. Single-batch execution
            const directFinalState = stepSimulation(initial, events);

            // 2. Chunk-by-chunk execution
            let partitionedState: SimulationState = initial;
            let offset = 0;
            let chunkIdx = 0;

            while (offset < events.length) {
              const size = chunkSizes[chunkIdx % chunkSizes.length] ?? 5;
              const chunk = events.slice(offset, offset + size);
              partitionedState = stepSimulation(partitionedState, chunk);
              offset += size;
              chunkIdx++;
            }

            // Both methods must produce the exact bit-level identical SimulationState
            expect(partitionedState.yaw).toBe(directFinalState.yaw);
            expect(partitionedState.pitch).toBe(directFinalState.pitch);
            expect(partitionedState.tick).toBe(directFinalState.tick);
            expect(partitionedState.valid).toBe(directFinalState.valid);
            expect(partitionedState.shots).toEqual(directFinalState.shots);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
