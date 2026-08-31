"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createAimRenderer } from "@findmysensi/render-canvas";
import { createViewportTransform } from "@findmysensi/render-canvas";
import {
  attachInputListener,
  createPointerLockController,
} from "@findmysensi/input-browser";
import {
  PracticeRunController,
  PracticeRunState,
} from "../features/training/PracticeRunController.js";

interface TrainerBootstrapProps {
  mode: string;
}

export function TrainerBootstrap({ mode }: TrainerBootstrapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<PracticeRunController | null>(null);

  const [gameState, setGameState] = useState<PracticeRunState>("ready");
  const [_locked, setLocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    let animationFrameId: number | null = null;

    // Handle resizing & DPR dynamically
    const handleResize = () => {
      const width = container.clientWidth || 1280;
      const height = container.clientHeight || 720;
      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const viewport = createViewportTransform({
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        dpr,
        scaleMode: "fit",
      });

      renderer.initialize(canvas, viewport);
    };

    const renderer = createAimRenderer();
    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    const controller = new PracticeRunController(
      {
        onStateChange: (newState) => {
          setGameState(newState);
          if (newState === "completed") {
            setTimeout(() => {
              router.push(`/train/${mode}/results`);
            }, 600);
          }
        },
        onTickProgress: (currentTick, totalTicks) => {
          const remaining = Math.max(
            0,
            Math.ceil((totalTicks - currentTick) / 128),
          );
          setRemainingSeconds(remaining);
        },
        onScoreUpdate: (newScore, newHits, newMisses) => {
          setScore(newScore);
          setHits(newHits);
          setMisses(newMisses);
          const totalShots = newHits + newMisses;
          setAccuracy(
            totalShots > 0 ? Math.round((newHits / totalShots) * 100) : 100,
          );
        },
        onComplete: () => {
          // Handled via onStateChange
        },
      },
      renderer,
      60 * 128, // 60 seconds at 128 Hz
    );

    controllerRef.current = controller;

    // Attach input listener to window / canvas
    const detachInput = attachInputListener(
      window,
      controller.getRingBuffer(),
      "pointermove",
    );

    // Animation frame loop
    const loop = (now: number) => {
      controller.onAnimationFrame(now);
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);

    // Pointer Lock change listener
    const onPointerLockChange = () => {
      const isCurrentlyLocked = Boolean(document.pointerLockElement);
      setLocked(isCurrentlyLocked);
      if (!isCurrentlyLocked && controller.getState() === "playing") {
        controller.pause();
      }
    };

    document.addEventListener("pointerlockchange", onPointerLockChange);

    return () => {
      resizeObserver.disconnect();
      detachInput();
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      controller.abort();
    };
  }, [mode, router]);

  const startCountdownAndLock = async () => {
    if (!canvasRef.current) return;

    try {
      const pointerLock = createPointerLockController();
      await pointerLock.requestLock(canvasRef.current, {
        unadjustedMovement: true,
      });
    } catch {
      // Fallback
    }

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setCountdown(null);
          controllerRef.current?.start();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResume = async () => {
    if (!canvasRef.current) return;
    try {
      const pointerLock = createPointerLockController();
      await pointerLock.requestLock(canvasRef.current, {
        unadjustedMovement: true,
      });
    } catch {
      // Fallback
    }
    controllerRef.current?.resume();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-zinc-950 overflow-hidden select-none touch-none flex items-center justify-center font-sans"
    >
      {/* Simulation Canvas */}
      <canvas
        ref={canvasRef}
        id="simulation-canvas"
        className="block cursor-crosshair focus:outline-none"
        tabIndex={0}
        aria-label="FindMySensi Aim Simulation Canvas"
      />

      {/* In-Game HUD */}
      {gameState === "playing" && (
        <div className="absolute top-6 left-0 right-0 px-8 flex justify-between items-start pointer-events-none z-10 font-mono">
          <div className="bg-black/60 backdrop-blur-md border border-zinc-800/80 px-4 py-2.5 rounded-lg flex items-center gap-6">
            <div>
              <span className="text-[10px] text-zinc-500 block">TIME</span>
              <span className="text-xl font-bold text-white tracking-tight">
                {remainingSeconds}s
              </span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div>
              <span className="text-[10px] text-zinc-500 block">SCORE</span>
              <span className="text-xl font-bold text-emerald-400">
                {score.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-black/60 backdrop-blur-md border border-zinc-800/80 px-4 py-2.5 rounded-lg flex items-center gap-6">
            <div>
              <span className="text-[10px] text-zinc-500 block">ACCURACY</span>
              <span className="text-xl font-bold text-cyan-400">
                {accuracy}%
              </span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div>
              <span className="text-[10px] text-zinc-500 block">
                HITS / MISS
              </span>
              <span className="text-xl font-bold text-zinc-200">
                {hits} <span className="text-zinc-600">/</span>{" "}
                <span className="text-red-400">{misses}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center">
            <span className="text-8xl font-black text-emerald-400 font-mono animate-ping block">
              {countdown}
            </span>
            <p className="text-sm font-mono text-zinc-400 mt-4 tracking-widest uppercase">
              GET READY • LOCKING SENSOR
            </p>
          </div>
        </div>
      )}

      {/* Ready / Start Overlay */}
      {gameState === "ready" && countdown === null && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-20 p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
            <div>
              <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold tracking-wider uppercase">
                SCENARIO: {mode.toUpperCase()}
              </span>
              <h1 className="text-3xl font-black text-white tracking-tight mt-3">
                Grid Practice
              </h1>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                Click start to capture the pointer and begin the 60-second
                deterministic aiming scenario.
              </p>
            </div>

            <div className="bg-black/50 border border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-400 font-mono space-y-2 text-left">
              <div className="flex justify-between">
                <span>Targets:</span>
                <span className="text-zinc-200">3 Non-overlapping</span>
              </div>
              <div className="flex justify-between">
                <span>Cadence:</span>
                <span className="text-zinc-200">128 Hz Fixed Kernel</span>
              </div>
              <div className="flex justify-between">
                <span>Controls:</span>
                <span className="text-zinc-200">
                  Left Click (Shoot) • Esc (Pause)
                </span>
              </div>
            </div>

            <button
              onClick={startCountdownAndLock}
              className="w-full py-4 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-black text-lg rounded-xl transition-all shadow-lg shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              START PRACTICE (CLICK TO LOCK)
            </button>

            <p className="text-[11px] text-zinc-500 font-mono">
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">
                Esc
              </kbd>{" "}
              at any time during practice to release mouse capture.
            </p>
          </div>
        </div>
      )}

      {/* Paused Overlay */}
      {gameState === "paused" && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-20 p-6">
          <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                SIMULATION PAUSED
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">
                Pointer Lock Released
              </h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleResume}
                className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-lg transition-colors"
              >
                Resume Session
              </button>
              <button
                onClick={() => router.push("/app")}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg transition-colors"
              >
                Exit to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
