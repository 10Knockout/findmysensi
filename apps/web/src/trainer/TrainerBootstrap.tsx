"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import {
  CROSSHAIR_PRESETS,
  decodeCrosshairShareCode,
  type CrosshairConfig as SavedCrosshairConfig,
} from "@findmysensi/crosshair";
import {
  attachInputListener,
  createPointerLockController,
  POINTER_LOCK_MOVEMENT_SOURCE,
  type PointerLockResult,
} from "@findmysensi/input-browser";
import { TrainerSettings, TrainerSettingsSchema } from "@findmysensi/protocol";
import {
  createAimRenderer,
  createViewportTransform,
} from "@findmysensi/render-canvas";
import { resolveBrowserInputGain } from "@findmysensi/sensitivity";
import type {
  RuntimeMetrics,
  RuntimeScoreResult,
} from "@findmysensi/trainer-runtime";
import {
  PracticeRunController,
  PracticeRunState,
  type SensitivityInputVerificationSnapshot,
} from "../features/training/PracticeRunController.js";
import { InGameSettingsModal } from "./InGameSettingsModal.js";
import { trainerModeManifest } from "./mode-manifest.js";
import { startRunIfPointerLocked } from "./pointer-lock-guard.js";
import {
  GridshotRuntimeConfig,
  resolveGridshotRuntimeConfig,
} from "./runtime-config.js";

interface TrainerBootstrapProps {
  mode: string;
  durationTicks?: number;
  sensitivityOverride?: string;
  settingsOverride?: TrainerSettings;
  runLabel?: string;
  onRunComplete?: (result: RuntimeScoreResult) => void;
  lockedConfiguration?: boolean;
}

const MAX_PAUSE_MS = 10 * 60 * 1000;

const EMPTY_VERIFICATION_SNAPSHOT: SensitivityInputVerificationSnapshot = {
  totalInputUnitsX: 0,
  totalInputUnitsY: 0,
  movementEventCount: 0,
  expectedYawDegrees: 0,
  expectedPitchDegrees: 0,
  actualEngineYawDegrees: 0,
  actualEnginePitchDegrees: 0,
  yawResidualFixedPointUnits: 0,
  pitchResidualFixedPointUnits: 0,
};

export function TrainerBootstrap({
  mode,
  durationTicks,
  sensitivityOverride,
  settingsOverride,
  runLabel,
  onRunComplete,
  lockedConfiguration = false,
}: TrainerBootstrapProps) {
  const router = useRouter();
  const modeEntry = trainerModeManifest.get(mode);
  const modeTitle =
    modeEntry?.scenarioEntry.presentation.title.replace(/ \(Dev v0\)$/, "") ??
    mode;
  const modeDescription = modeEntry?.scenarioEntry.presentation.description;
  const modeDurationTicks =
    durationTicks ??
    modeEntry?.scenarioEntry.definition.durationTicks ??
    60 * 128;
  const modeDurationSeconds = Math.round(modeDurationTicks / 128);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<PracticeRunController | null>(null);
  const rendererRef = useRef<ReturnType<typeof createAimRenderer> | null>(null);
  const runtimeConfigRef = useRef<GridshotRuntimeConfig | null>(null);
  const savedCrosshairRef = useRef<SavedCrosshairConfig>(
    CROSSHAIR_PRESETS[0]!.config,
  );
  const handleResizeRef = useRef<(() => void) | null>(null);
  const pauseDeadlineRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const [rawSettings, setRawSettings] = useState<TrainerSettings | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [initialConfigLoaded, setInitialConfigLoaded] = useState(false);
  const [runtimeConfig, setRuntimeConfig] =
    useState<GridshotRuntimeConfig | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsAttempt, setSettingsAttempt] = useState(0);
  const [gameState, setGameState] = useState<PracticeRunState>("ready");
  const [remainingSeconds, setRemainingSeconds] = useState(modeDurationSeconds);
  const [score, setScore] = useState(0);
  const [runtimeMetrics, setRuntimeMetrics] = useState<RuntimeMetrics | null>(
    null,
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [pauseSecondsLeft, setPauseSecondsLeft] = useState(MAX_PAUSE_MS / 1000);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputDebugEnabled, setInputDebugEnabled] = useState(false);
  const [pointerLockResult, setPointerLockResult] =
    useState<PointerLockResult | null>(null);
  const [verificationSnapshot, setVerificationSnapshot] =
    useState<SensitivityInputVerificationSnapshot>(EMPTY_VERIFICATION_SNAPSHOT);

  useEffect(() => {
    const onFsChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    setInputDebugEnabled(
      new URLSearchParams(window.location.search).get("inputDebug") === "1",
    );
  }, []);

  useEffect(() => {
    if (!inputDebugEnabled) return;
    const interval = window.setInterval(() => {
      const controller = controllerRef.current;
      if (controller) {
        setVerificationSnapshot(
          controller.getSensitivityInputVerificationSnapshot(),
        );
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [inputDebugEnabled]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let active = true;
    const client = new BrowserApiClient();

    void (async () => {
      setSettingsError(null);
      setRuntimeConfig(null);

      if (settingsOverride) {
        try {
          const settings = TrainerSettingsSchema.parse(settingsOverride);
          const resolved = resolveGridshotRuntimeConfig(settings);
          savedCrosshairRef.current = resolveSavedCrosshair(
            resolved.crosshairCode,
          );
          setRawSettings(settings);
          setRuntimeConfig(resolved);
          runtimeConfigRef.current = resolved;
          setInitialConfigLoaded(true);
        } catch {
          setSettingsError("Trainer settings are invalid.");
        }
        return;
      }

      const session = await client.getSession();
      if (!active) return;
      if (!session?.user) {
        router.replace(
          `/login?next=${encodeURIComponent(`/app/train/${mode}`)}`,
        );
        return;
      }

      const result = await client.getTrainerSettings();
      if (!active) return;
      if (!result.ok || !result.data) {
        setSettingsError(
          result.error ?? "Trainer settings could not be loaded. Try again.",
        );
        return;
      }

      try {
        const settings = TrainerSettingsSchema.parse(result.data);
        setRawSettings(settings);
        const resolved = resolveGridshotRuntimeConfig(settings);
        const crosshair = resolveSavedCrosshair(resolved.crosshairCode);
        savedCrosshairRef.current = crosshair;
        setRuntimeConfig(resolved);
        runtimeConfigRef.current = resolved;
        setInitialConfigLoaded(true);
      } catch {
        setSettingsError(
          `Saved trainer settings are invalid. Open Settings and save valid values before starting ${modeTitle}.`,
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [mode, modeTitle, router, settingsAttempt, settingsOverride]);

  useEffect(() => {
    if (
      !initialConfigLoaded ||
      !modeEntry?.createAdapter ||
      !runtimeConfigRef.current ||
      !canvasRef.current ||
      !containerRef.current
    )
      return;

    const runtimeConfig = runtimeConfigRef.current;
    const inputGain = sensitivityOverride
      ? resolveBrowserInputGain(sensitivityOverride)
      : runtimeConfig.inputGain;
    const adapter = modeEntry.createAdapter();
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const renderer = createAimRenderer();
    rendererRef.current = renderer;
    let animationFrameId: number | null = null;
    let rendererInitialized = false;

    const handleResize = () => {
      const activeCfg = runtimeConfigRef.current ?? runtimeConfig;
      const cssWidth = container.clientWidth || 1280;
      const cssHeight = container.clientHeight || 720;
      const dpr = window.devicePixelRatio || 1;
      const backing = resolveBackingResolution(
        activeCfg,
        cssWidth,
        cssHeight,
        dpr,
      );

      canvas.width = backing.width;
      canvas.height = backing.height;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      const viewport = createViewportTransform({
        canvasWidth: backing.width,
        canvasHeight: backing.height,
        dpr: activeCfg.resolution === "native" ? dpr : 1,
        scaleMode: activeCfg.scalingMode,
        horizontalFovDegrees: activeCfg.fovDegrees,
      });

      if (!rendererInitialized) {
        renderer.initialize(canvas, viewport, {
          crosshair: savedCrosshairRef.current,
          target: {
            bodyColor: activeCfg.targetColor,
            opacity: activeCfg.targetOpacity,
            borderWidth: activeCfg.targetOutline ? 2 : 0,
            borderColor: "#ffffff",
          },
        });
        rendererInitialized = true;
      } else {
        renderer.resize(viewport);
        renderer.initialize(canvas, viewport, {
          crosshair: savedCrosshairRef.current,
          target: {
            bodyColor: activeCfg.targetColor,
            opacity: activeCfg.targetOpacity,
            borderWidth: activeCfg.targetOutline ? 2 : 0,
            borderColor: "#ffffff",
          },
        });
      }
    };

    handleResizeRef.current = handleResize;

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    setRemainingSeconds(modeDurationSeconds);
    setGameState("ready");
    setScore(0);
    setRuntimeMetrics(null);

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
            if (onRunComplete) {
              void document.exitPointerLock?.();
            } else {
              window.setTimeout(
                () => router.push(`/app/train/${mode}/results`),
                600,
              );
            }
          }
        },
        onTickProgress: (currentTick, totalTicks) => {
          setRemainingSeconds(
            Math.max(0, Math.ceil((totalTicks - currentTick) / 128)),
          );
        },
        onScoreUpdate: (newScore, newMetrics) => {
          setScore(newScore);
          setRuntimeMetrics(newMetrics);
        },
        onComplete: (result) => onRunComplete?.(result),
      },
      renderer,
      {
        durationTicks: modeDurationTicks,
        inputGain,
        inputBufferCapacity: runtimeConfig.inputBufferCapacity,
      },
      adapter,
    );

    controllerRef.current = controller;
    const diagnosticsEnabled =
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("inputDebug") === "1";
    const detachInput = attachInputListener(
      window,
      controller.getRingBuffer(),
      POINTER_LOCK_MOVEMENT_SOURCE,
      {
        shouldCaptureGameplayInput: () =>
          controller.getState() === "playing" &&
          document.pointerLockElement === canvas,
        ...(diagnosticsEnabled
          ? {
              onMovementAccepted: ({ dx, dy }: { dx: number; dy: number }) => {
                controller.recordBrowserInputEvent(dx, dy);
              },
            }
          : {}),
      },
    );

    const loop = (now: number) => {
      controller.onAnimationFrame(now);
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);

    const onPointerLockChange = () => {
      if (document.pointerLockElement) return;

      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setCountdown(null);
        setLockError(
          "Mouse lock was released before the run started. Click Start again.",
        );
      }

      if (controller.getState() === "playing") {
        controller.pause();
      }
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);

    return () => {
      resizeObserver.disconnect();
      detachInput();
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      controller.abort();
      renderer.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
      if (rendererRef.current === renderer) rendererRef.current = null;
      if (handleResizeRef.current === handleResize)
        handleResizeRef.current = null;
    };
  }, [
    mode,
    modeDurationSeconds,
    modeDurationTicks,
    modeEntry,
    router,
    initialConfigLoaded,
    sensitivityOverride,
    onRunComplete,
  ]);

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

  if (!modeEntry?.enabled || !modeEntry.createAdapter) {
    return (
      <main className="app-shell">
        <div className="app-card" style={{ textAlign: "center" }}>
          <h1 className="app-heading">Mode not available yet</h1>
          <p className="app-subtext">
            This training mode is not enabled in the current release.
          </p>
          <button
            onClick={() => router.replace("/app")}
            className="app-button"
            style={{ marginTop: 22 }}
          >
            Back to Trainer Home
          </button>
        </div>
      </main>
    );
  }

  if (settingsError) {
    return (
      <main className="app-shell">
        <div role="alert" className="app-card">
          <h1 className="app-heading" style={{ fontSize: 22 }}>
            {modeTitle} cannot start
          </h1>
          <p className="app-alert" style={{ marginTop: 14 }}>
            {settingsError}
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setSettingsAttempt((value) => value + 1)}
              className="app-button"
              style={{ flex: 1 }}
            >
              Retry
            </button>
            <button
              onClick={() => router.replace("/app/settings")}
              className="app-button app-button-ghost"
              style={{ flex: 1 }}
            >
              Settings
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!runtimeConfig) {
    return (
      <main className="app-shell">
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Loading {modeTitle} settings…
        </p>
      </main>
    );
  }

  const startCountdownAndLock = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setLockError(null);
    const acquisition = await acquirePointerLock(canvas);
    setPointerLockResult(acquisition);
    if (!acquisition.locked) {
      setLockError(
        "Mouse lock was not granted. Click again and allow Pointer Lock in your browser.",
      );
      return;
    }
    if (!acquisition.rawGranted) {
      setLockError(
        "Raw mouse input could not be confirmed in this browser; training will continue on adjusted input.",
      );
    }

    setCountdown(3);
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((previous) => {
        if (previous === null) {
          if (countdownIntervalRef.current !== null) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return null;
        }

        if (previous <= 1) {
          if (countdownIntervalRef.current !== null) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          const started = startRunIfPointerLocked(
            canvas,
            document.pointerLockElement,
            () => controllerRef.current?.start(),
          );
          if (!started) {
            setLockError(
              "Mouse lock was released before the run started. Click Start again.",
            );
          }
          return null;
        }
        return previous - 1;
      });
    }, 1000);
  };

  const handleResume = async () => {
    if (!canvasRef.current) return;
    setLockError(null);
    const acquisition = await acquirePointerLock(canvasRef.current);
    setPointerLockResult(acquisition);
    if (!acquisition.locked) {
      setLockError("Mouse lock was not granted. The run remains paused.");
      return;
    }
    if (!acquisition.rawGranted) {
      setLockError(
        "Raw mouse input could not be confirmed in this browser; training will continue on adjusted input.",
      );
    }
    controllerRef.current?.resume();
  };

  const openSettings = () => {
    setIsSettingsModalOpen(true);
  };

  const handleSaveAndApply = async (
    newSettings: TrainerSettings,
    newCrosshair: SavedCrosshairConfig,
  ) => {
    const client = new BrowserApiClient();
    const saveRes = await client.saveTrainerSettings(newSettings);
    if (!saveRes.ok) {
      throw new Error(saveRes.error ?? "Failed to save settings");
    }

    setRawSettings(newSettings);
    const resolved = resolveGridshotRuntimeConfig(newSettings);
    setRuntimeConfig(resolved);
    runtimeConfigRef.current = resolved;
    savedCrosshairRef.current = newCrosshair;

    if (controllerRef.current) {
      controllerRef.current.setInputGain(resolved.inputGain);
    }

    if (handleResizeRef.current) {
      handleResizeRef.current();
    }
  };

  const restartWithLatestSettings = () => {
    window.location.assign(`/app/train/${mode}`);
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
        aria-label={`FindMySensi ${modeTitle} simulation`}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />

      {gameState === "playing" ? (
        <div className="pointer-events-none absolute left-0 right-0 top-6 z-10 flex items-start justify-between px-8 font-mono">
          <HudGroup
            items={[
              ["TIME", `${remainingSeconds}s`],
              ["SCORE", score.toLocaleString()],
            ]}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="pointer-events-auto app-chip"
              style={{ minHeight: "auto", padding: "6px 12px" }}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? "EXIT FULLSCREEN" : "⛶ FULLSCREEN"}
            </button>
            <HudGroup items={getRuntimeHudItems(runtimeMetrics)} />
          </div>
        </div>
      ) : null}

      {countdown !== null ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center">
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-turret-road), monospace",
                fontSize: 96,
                fontWeight: 800,
                color: "var(--fms-acid)",
              }}
            >
              {countdown}
            </span>
            <p
              style={{
                marginTop: 16,
                fontFamily: "var(--font-turret-road), monospace",
                fontSize: 13,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              GET READY
            </p>
          </div>
        </div>
      ) : null}

      {gameState === "ready" && countdown === null ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
          <div className="app-card" style={{ textAlign: "center" }}>
            <div>
              <span className="trainer-badge">{modeTitle}</span>
              <h1 className="app-heading" style={{ marginTop: 14 }}>
                {modeTitle}
              </h1>
              <p className="app-subtext">
                {runLabel ? `${runLabel}. ` : null}
                {modeDescription} Click start to capture the mouse and begin
                the {modeDurationSeconds}-second run.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                onClick={startCountdownAndLock}
                className="app-button"
                style={{ flex: 1 }}
              >
                START {modeTitle.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="app-button app-button-ghost"
                style={{ flex: "none", width: "auto", padding: "0 18px" }}
                title="Toggle Fullscreen"
              >
                {isFullscreen ? "EXIT FS" : "⛶ FULLSCREEN"}
              </button>
            </div>
            {lockError ? (
              <p role="alert" className="app-alert" style={{ marginTop: 20 }}>
                {lockError}
              </p>
            ) : null}
            <p className="app-help" style={{ marginTop: 20 }}>
              Esc releases mouse capture and pauses the run. Raw input is used
              when supported; ordinary Pointer Lock remains available.
            </p>
          </div>
        </div>
      ) : null}

      {gameState === "paused" && countdown === null ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
          <div className="app-card" style={{ textAlign: "center" }}>
            <div>
              <span
                className="app-kicker"
                style={{ color: "#f5a524", marginBottom: 0 }}
              >
                PAUSED
              </span>
              <h2 className="app-heading" style={{ fontSize: 24, marginTop: 8 }}>
                {modeTitle} paused
              </h2>
              <p className="app-help">
                Pause time does not advance simulation time. This run closes
                after 10 minutes paused.
              </p>
              <p
                style={{
                  marginTop: 8,
                  fontFamily: "monospace",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {formatPauseTime(pauseSecondsLeft)} remaining
              </p>
            </div>
            <div
              style={{
                marginTop: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <button onClick={handleResume} className="app-button">
                Resume
              </button>
              {!lockedConfiguration ? (
                <button
                  onClick={openSettings}
                  className="app-button app-button-ghost"
                >
                  Settings
                </button>
              ) : null}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="app-button app-button-ghost"
              >
                {isFullscreen ? "Exit Fullscreen" : "Toggle Fullscreen"}
              </button>
              {!lockedConfiguration ? (
                <button
                  onClick={restartWithLatestSettings}
                  className="app-button app-button-ghost"
                >
                  Restart
                </button>
              ) : null}
              <button
                onClick={() => router.push("/app")}
                className="app-button app-button-ghost"
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
              Resume keeps this run's settings frozen. Restart reloads your
              latest saved settings.
            </p>
          </div>
        </div>
      ) : null}

      {!lockedConfiguration && rawSettings && isSettingsModalOpen ? (
        <InGameSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentSettings={rawSettings}
          onSaveAndApply={handleSaveAndApply}
        />
      ) : null}

      {!lockedConfiguration && inputDebugEnabled && runtimeConfig ? (
        <InputVerificationOverlay
          snapshot={verificationSnapshot}
          sensitivity={runtimeConfig.inputGain.fmsSensitivity}
          pointerLockResult={pointerLockResult}
          pointerLockActive={Boolean(
            canvasRef.current &&
            document.pointerLockElement === canvasRef.current,
          )}
          inputSource={POINTER_LOCK_MOVEMENT_SOURCE}
        />
      ) : null}
    </div>
  );
}

function resolveSavedCrosshair(code: string | null): SavedCrosshairConfig {
  if (code === null) return CROSSHAIR_PRESETS[0]!.config;
  return decodeCrosshairShareCode(code);
}

function resolveBackingResolution(
  config: GridshotRuntimeConfig,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): { width: number; height: number } {
  if (config.resolution === "native") {
    return {
      width: Math.max(1, Math.floor(cssWidth * dpr)),
      height: Math.max(1, Math.floor(cssHeight * dpr)),
    };
  }

  if (config.resolution === "custom") {
    if (
      config.customResolutionWidth === null ||
      config.customResolutionHeight === null
    ) {
      throw new Error("Custom resolution requires both width and height.");
    }
    return {
      width: config.customResolutionWidth,
      height: config.customResolutionHeight,
    };
  }

  const [width, height] = config.resolution.split("x").map(Number);
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    !width ||
    !height
  ) {
    throw new Error("Saved resolution is invalid.");
  }
  return { width, height };
}

function HudGroup({ items }: { items: [string, string][] }) {
  return (
    <div className="trainer-hud">
      {items.map(([label, value]) => (
        <div key={label}>
          <b>{label}</b>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function getRuntimeHudItems(
  metrics: RuntimeMetrics | null,
): [string, string][] {
  if (!metrics)
    return [
      ["ACCURACY", "100%"],
      ["HITS / MISS", "0 / 0"],
    ];
  if ("hits" in metrics) {
    return [
      ["ACCURACY", `${metrics.accuracyPercentage}%`],
      ["HITS / MISS", `${metrics.hits} / ${metrics.misses}`],
    ];
  }
  if ("switchesCompleted" in metrics) {
    return [
      ["SWITCHES", String(metrics.switchesCompleted)],
      ["ON TARGET", `${metrics.onTargetPercentage}%`],
    ];
  }
  if ("onTargetTicks" in metrics) {
    return [
      ["ON TARGET", `${metrics.onTargetPercentage}%`],
      ["AVG ERROR", metrics.averageErrorUnits.toLocaleString()],
    ];
  }
  return [
    ["PERFECT", `${metrics.perfectPercentage}%`],
    [
      "P / E / L / M",
      `${metrics.perfect} / ${metrics.early} / ${metrics.late} / ${metrics.miss}`,
    ],
  ];
}

function formatPauseTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

interface PointerLockAcquisition extends PointerLockResult {
  readonly locked: boolean;
}

async function acquirePointerLock(
  canvas: HTMLCanvasElement,
): Promise<PointerLockAcquisition> {
  const controller = createPointerLockController();
  let result: PointerLockResult;
  try {
    result = await controller.requestLock(canvas, {
      unadjustedMovement: true,
      fallbackToAdjustedMovement: true,
    });
  } catch {
    return { locked: false, rawRequested: true, rawGranted: false };
  }

  if (document.pointerLockElement === canvas) {
    return { ...result, locked: true };
  }

  const locked = await new Promise<boolean>((resolve) => {
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
  return { ...result, locked };
}

function InputVerificationOverlay({
  snapshot,
  sensitivity,
  pointerLockResult,
  pointerLockActive,
  inputSource,
}: {
  snapshot: SensitivityInputVerificationSnapshot;
  sensitivity: string;
  pointerLockResult: PointerLockResult | null;
  pointerLockActive: boolean;
  inputSource: string;
}) {
  const rows: readonly (readonly [string, string])[] = [
    ["FMS / Aimlabs Default", sensitivity],
    ["Input source", `${inputSource} (Pointer Lock contract)`],
    ["Movement events", snapshot.movementEventCount.toLocaleString()],
    [
      "Input units X / Y",
      `${snapshot.totalInputUnitsX} / ${snapshot.totalInputUnitsY}`,
    ],
    ["Expected yaw", `${snapshot.expectedYawDegrees.toFixed(6)}°`],
    ["Engine yaw", `${snapshot.actualEngineYawDegrees.toFixed(6)}°`],
    ["Expected pitch", `${snapshot.expectedPitchDegrees.toFixed(6)}°`],
    ["Engine pitch", `${snapshot.actualEnginePitchDegrees.toFixed(6)}°`],
    ["Raw requested", pointerLockResult?.rawRequested ? "yes" : "not yet"],
    [
      "Raw option accepted",
      pointerLockResult
        ? pointerLockResult.rawGranted
          ? "yes"
          : "no"
        : "not yet",
    ],
    ["Pointer lock active", pointerLockActive ? "yes" : "no"],
    ["Platform", navigator.platform || "unknown"],
    ["Browser", navigator.userAgent],
  ];

  return (
    <aside
      data-testid="input-verification-overlay"
      className="pointer-events-none absolute bottom-4 left-4 z-50 w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-cyan-500/50 bg-zinc-950/95 p-4 font-mono text-[10px] text-zinc-300 shadow-2xl"
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <strong className="text-xs uppercase tracking-wider text-cyan-300">
          Sensitivity verification · development
        </strong>
        <span className="text-zinc-500">?inputDebug=1</span>
      </div>
      <div className="grid grid-cols-[8.5rem_1fr] gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <span className="text-zinc-500">{label}</span>
            <span className="truncate text-right text-zinc-200" title={value}>
              {value}
            </span>
          </React.Fragment>
        ))}
      </div>
      <p className="mt-2 text-zinc-500">
        Raw support is recorded only after the Pointer Lock promise accepts the
        unadjustedMovement request. Compare the same physical sweep in Aimlabs
        before claiming device-level 1:1 parity.
      </p>
    </aside>
  );
}
