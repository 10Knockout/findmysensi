"use client";

import React, { useEffect, useRef, useState } from "react";
import { createFixedTickRunner, FixedTickRunner } from "./fixed-tick-runner.js";
import { loadTrainerRuntime, TrainerRuntime } from "./load-runtime.js";

interface TrainerBootstrapProps {
  mode: string;
}

export function TrainerBootstrap({ mode }: TrainerBootstrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let runner: FixedTickRunner | null = null;
    let cleanupInput: (() => void) | null = null;
    let animationFrameId: number | null = null;

    async function init() {
      try {
        const runtime: TrainerRuntime = await loadTrainerRuntime();
        if (disposed || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const width = canvas.parentElement?.clientWidth || 1280;
        const height = canvas.parentElement?.clientHeight || 720;
        const dpr =
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const viewport = runtime.renderCanvas.createViewportTransform({
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          dpr,
          scaleMode: "fit",
        });

        const renderer = runtime.renderCanvas.createAimRenderer();
        renderer.initialize(canvas, viewport);

        const ringBuffer = runtime.inputBrowser.createInputRingBuffer(4096);
        const batchTarget =
          runtime.inputBrowser.createRawInputBatchTarget(4096);
        const snapshotBuffer = runtime.aimCore.createSnapshotBuffer(64);

        cleanupInput = runtime.inputBrowser.attachInputListener(
          canvas,
          ringBuffer,
          "pointermove",
        );

        let simulationState = runtime.aimCore.createInitialSimulationState(
          0,
          0,
        );

        const clock = {
          timeToTick: (timeMs: number) =>
            runtime.protocol.createTick(Math.floor(timeMs / (1000 / 128))),
        };

        runner = createFixedTickRunner({
          tickRateHz: 128,
          maxCatchUpTicksPerFrame: 8,
          onTick: () => {
            // Drain input
            ringBuffer.drainInto(batchTarget);
            if (batchTarget.count > 0) {
              const segments = runtime.inputBrowser.reduceRawEvents(
                batchTarget,
                clock,
              );
              for (const seg of segments) {
                simulationState = runtime.aimCore.stepSimulation(
                  simulationState,
                  seg.events,
                );
              }
            }

            // Write snapshot for renderer
            snapshotBuffer.beginWrite(
              simulationState.tick,
              simulationState.yaw,
              simulationState.pitch,
            );
            // Default center test target for potato view
            snapshotBuffer.writeTarget(1, 0, 0, 25000);
            snapshotBuffer.endWrite();
            snapshotBuffer.swap();
          },
          onRender: () => {
            renderer.render(snapshotBuffer.getLatest());
          },
        });

        runner.start();

        const loop = (now: number) => {
          if (!disposed && runner) {
            runner.onAnimationFrame(now);
            animationFrameId = requestAnimationFrame(loop);
          }
        };
        animationFrameId = requestAnimationFrame(loop);

        setLoading(false);
      } catch (err) {
        if (!disposed) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize trainer runtime",
          );
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      disposed = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (runner) {
        runner.stop("manual_abort");
      }
      if (cleanupInput) {
        cleanupInput();
      }
    };
  }, [mode]);

  const handleRequestLock = async () => {
    if (!canvasRef.current) return;
    try {
      const runtime = await loadTrainerRuntime();
      const pointerLock = runtime.inputBrowser.createPointerLockController();
      const res = await pointerLock.requestLock(canvasRef.current, {
        unadjustedMovement: true,
      });
      setLocked(res.rawGranted || pointerLock.isLocked());
    } catch {
      // Fallback
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        backgroundColor: "#07090e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {loading && (
        <div
          style={{
            color: "#00ff88",
            fontFamily: "monospace",
            fontSize: "1.2rem",
          }}
        >
          Initializing Trainer Runtime [{mode}]...
        </div>
      )}

      {error && (
        <div
          style={{
            color: "#ff4444",
            fontFamily: "monospace",
            fontSize: "1.1rem",
          }}
        >
          Error: {error}
        </div>
      )}

      <canvas
        ref={canvasRef}
        onClick={handleRequestLock}
        style={{
          display: loading ? "none" : "block",
          cursor: locked ? "none" : "crosshair",
        }}
      />

      {!loading && !locked && (
        <div
          onClick={handleRequestLock}
          style={{
            position: "absolute",
            bottom: "30px",
            backgroundColor: "rgba(15, 17, 23, 0.85)",
            border: "1px solid rgba(0, 255, 136, 0.3)",
            padding: "12px 24px",
            borderRadius: "8px",
            color: "#e2e8f0",
            fontFamily: "sans-serif",
            fontSize: "0.95rem",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          Click to Capture Mouse (Raw Input Mode)
        </div>
      )}
    </div>
  );
}
