"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAimRenderer,
  createViewportTransform,
} from "@findmysensi/render-canvas";
import {
  attachInputListener,
  createPointerLockController,
  detectInputCapabilities,
} from "@findmysensi/input-browser";
import {
  PracticeRunController,
  PracticeRunState,
} from "../features/training/PracticeRunController.js";

interface TrainerBootstrapProps {
  mode: string;
}

const MAX_PAUSE_MS = 10 * 60 * 1000;

export function TrainerBootstrap({ mode }: TrainerBootstrapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<PracticeRunController | null>(null);
  const pauseDeadlineRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<PracticeRunState>("ready");
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [pauseSecondsLeft, setPauseSecondsLeft] = useState(MAX_PAUSE_MS / 1000);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    let animationFrameId: number | null = null;
    const renderer = createAimRenderer();

    const handleResize = () => {
      const width = container.clientWidth || 1280;
      const height = container.clientHeight || 720;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      renderer.initialize(
        canvas,
        createViewportTransform({
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          dpr,
          scaleMode: "fit",
        }),
      );
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const controller = new PracticeRunController(
      {
        onStateChange: (newState) => {
          setGameState(newState);
          if (newState === "paused") {
            pauseDeadlineRef.current = Date.now() + MAX_PAUSE_MS;
            setPauseSecondsLeft(MAX_PAUSE_MS / 1000);
          } else if (newState === "playing") {
            pauseDeadlineRef.current = null;
          }
          if (newState === "completed") {
            window.setTimeout(
              () => router.push(`/app/train/${mode}/results`),
              600,
            );
          }
        },
        onTickProgress: (currentTick, totalTicks) => {
          setRemainingSeconds(
            Math.max(0, Math.ceil((totalTicks - currentTick) / 128)),
          );
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
        onComplete: () => {},
      },
      renderer,
      60 * 128,
    );

    controllerRef.current = controller;
    const preferredInputSource = detectInputCapabilities().preferredSource;
    const detachInput = attachInputListener(
      window,
      controller.getRingBuffer(),
      preferredInputSource,
    );

    const loop = (now: number) => {
      controller.onAnimationFrame(now);
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);

    const onPointerLockChange = () => {
      if (!document.pointerLockElement && controller.getState() === "playing") {
        controller.pause();
      }
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);

    return () => {
      resizeObserver.disconnect();
      detachInput();
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      controller.abort();
    };
  }, [mode, router]);

  useEffect(() => {
    if (gameState !== "paused") return;
    const update = () => {
      const deadline = pauseDeadlineRef.current;
      if (deadline === null) return;
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setPauseSecondsLeft(remaining);
      if (remaining === 0) router.replace("/app");
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [gameState, router]);

  const startCountdownAndLock = async () => {
    if (!canvasRef.current) return;
    setLockError(null);
    const locked = await acquirePointerLock(canvasRef.current);
    if (!locked) {
      setLockError(
        "Mouse lock was not granted. Click again and allow Pointer Lock in your browser.",
      );
      return;
    }

    setCountdown(3);
    const interval = window.setInterval(() => {
      setCountdown((previous) => {
        if (previous === null || previous <= 1) {
          window.clearInterval(interval);
          controllerRef.current?.start();
          return null;
        }
        return previous - 1;
      });
    }, 1000);
  };

  const handleResume = async () => {
    if (!canvasRef.current) return;
    setLockError(null);
    const locked = await acquirePointerLock(canvasRef.current);
    if (!locked) {
      setLockError("Mouse lock was not granted. The run remains paused.");
      return;
    }
    controllerRef.current?.resume();
  };

  const openSettings = () => {
    window.open("/app/settings", "fms-settings", "noopener,noreferrer");
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-full select-none items-center justify-center overflow-hidden bg-zinc-950 font-sans touch-none"
    >
      <canvas
        ref={canvasRef}
        id="simulation-canvas"
        className="block cursor-crosshair focus:outline-none"
        tabIndex={0}
        aria-label="FindMySensi Gridshot simulation"
      />

      {gameState === "playing" ? (
        <div className="pointer-events-none absolute left-0 right-0 top-6 z-10 flex items-start justify-between px-8 font-mono">
          <HudGroup
            items={[
              ["TIME", `${remainingSeconds}s`],
              ["SCORE", score.toLocaleString()],
            ]}
          />
          <HudGroup
            items={[
              ["ACCURACY", `${accuracy}%`],
              ["HITS / MISS", `${hits} / ${misses}`],
            ]}
          />
        </div>
      ) : null}

      {countdown !== null ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center">
            <span className="block font-mono text-8xl font-black text-emerald-400">
              {countdown}
            </span>
            <p className="mt-4 font-mono text-sm uppercase tracking-widest text-zinc-400">
              GET READY
            </p>
          </div>
        </div>
      ) : null}

      {gameState === "ready" && countdown === null ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
          <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
            <div>
              <span className="rounded border border-emerald-500/30 bg-emerald-950 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                GRIDSHOT
              </span>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                Gridshot
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Click start to capture the mouse and begin the 60-second run.
              </p>
            </div>
            <button
              onClick={startCountdownAndLock}
              className="w-full rounded-xl bg-emerald-400 py-4 text-lg font-black text-zinc-950 hover:bg-emerald-300"
            >
              START GRIDSHOT
            </button>
            {lockError ? (
              <p role="alert" className="text-sm text-red-300">
                {lockError}
              </p>
            ) : null}
            <p className="font-mono text-[11px] text-zinc-500">
              Esc releases mouse capture and pauses the run.
            </p>
          </div>
        </div>
      ) : null}

      {gameState === "paused" && countdown === null ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
          <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-400">
                PAUSED
              </span>
              <h2 className="mt-1 text-2xl font-bold text-white">
                Gridshot paused
              </h2>
              <p className="mt-2 text-xs text-zinc-500">
                Pause time does not advance simulation time. This run closes
                after 10 minutes paused.
              </p>
              <p className="mt-2 font-mono text-sm text-zinc-300">
                {formatPauseTime(pauseSecondsLeft)} remaining
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleResume}
                className="w-full rounded-lg bg-emerald-400 py-3 font-bold text-zinc-950 hover:bg-emerald-300"
              >
                Resume
              </button>
              <button
                onClick={openSettings}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-3 font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Settings
              </button>
              <button
                onClick={startCountdownAndLock}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-3 font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Restart
              </button>
              <button
                onClick={() => router.push("/app")}
                className="w-full rounded-lg border border-zinc-800 py-3 font-semibold text-zinc-400 hover:bg-zinc-800"
              >
                Exit to Home
              </button>
              {lockError ? (
                <p role="alert" className="text-sm text-red-300">
                  {lockError}
                </p>
              ) : null}
            </div>
            <p className="text-[11px] text-zinc-500">
              Settings opens separately so this paused run stays in memory.
              Saved presentation/input settings are applied by the trainer
              integration as they become supported.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HudGroup({ items }: { items: [string, string][] }) {
  return (
    <div className="flex items-center gap-6 rounded-lg border border-zinc-800/80 bg-black/60 px-4 py-2.5">
      {items.map(([label, value], index) => (
        <React.Fragment key={label}>
          {index > 0 ? <div className="h-8 w-px bg-zinc-800" /> : null}
          <div>
            <span className="block text-[10px] text-zinc-500">{label}</span>
            <span className="text-xl font-bold text-white">{value}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function formatPauseTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

async function acquirePointerLock(canvas: HTMLCanvasElement): Promise<boolean> {
  const controller = createPointerLockController();
  try {
    await controller.requestLock(canvas, { unadjustedMovement: true });
  } catch {
    return false;
  }

  if (document.pointerLockElement === canvas) return true;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (locked: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      document.removeEventListener("pointerlockchange", onChange);
      document.removeEventListener("pointerlockerror", onError);
      resolve(locked);
    };
    const onChange = () => finish(document.pointerLockElement === canvas);
    const onError = () => finish(false);
    const timeout = window.setTimeout(() => finish(false), 1000);
    document.addEventListener("pointerlockchange", onChange);
    document.addEventListener("pointerlockerror", onError);
  });
}
