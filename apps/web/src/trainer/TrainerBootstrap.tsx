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
import {
  resolveBrowserInputGain,
  sensitivityToCmPer360,
} from "@findmysensi/sensitivity";
import type {
  RuntimeMetrics,
  RuntimeScoreResult,
} from "@findmysensi/trainer-runtime";
import { BackLink } from "../components/BackLink.js";
import {
  PracticeRunController,
  PracticeRunState,
  type SensitivityInputVerificationSnapshot,
} from "../features/training/PracticeRunController.js";
import { InGameSettingsModal } from "./InGameSettingsModal.js";
import { trainerModeManifest } from "./mode-manifest.js";
import { startRunIfPointerLocked } from "./pointer-lock-guard.js";
import {
  TrainerRuntimeConfig,
  resolveTrainerRuntimeConfig,
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

/**
 * Wall-clock health of the browser -> listener -> rAF path. Movement can look
 * "blocked" for three very different reasons: the browser stops delivering
 * mousemove, the frame loop stalls, or the simulation clamps the value. These
 * counters separate those cases; they are sampled once per second so a freeze
 * shows up as a gap spike rather than an averaged-away blip.
 */
export interface InputHealthTelemetry {
  readonly eventsPerSecond: number;
  readonly maxEventGapMs: number;
  readonly maxFrameMs: number;
  readonly peakDx: number;
  readonly peakDy: number;
  readonly pointerLockDrops: number;
}

/**
 * A gap this long between accepted movement events is not normal jitter. A
 * 1000 Hz mouse delivers roughly every 1 ms and even a 30 fps coalescing
 * browser delivers every ~33 ms, so 40 ms means something upstream stopped.
 */
const INPUT_STALL_THRESHOLD_MS = 40;
const MAX_RECORDED_STALLS = 24;

/**
 * Whether the `?inputDebug=1` overlay and its stall logging can be turned on at
 * all. Development always qualifies. A production build only qualifies when it
 * is compiled with NEXT_PUBLIC_ENABLE_INPUT_DIAGNOSTICS=1, which the browser
 * E2E job sets so it can read real movement counters out of a production
 * bundle. Deployments leave it unset, so the overlay and its console output
 * stay out of anything a player receives.
 */
const INPUT_DIAGNOSTICS_AVAILABLE =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENABLE_INPUT_DIAGNOSTICS === "1";

/**
 * One observed freeze, captured at the moment input resumed. `source` says
 * which layer went quiet: "event" means the browser stopped delivering
 * mousemove, "frame" means the render loop itself stopped running.
 */
export interface InputStallRecord {
  readonly source: "event" | "frame";
  readonly atSeconds: number;
  readonly gapMs: number;
  readonly eventsPerSecondBefore: number;
  readonly peakDx: number;
  readonly peakDy: number;
  readonly viewYawDegrees: number;
  readonly viewPitchDegrees: number;
  readonly pointerLocked: boolean;
}

const EMPTY_INPUT_HEALTH: InputHealthTelemetry = {
  eventsPerSecond: 0,
  maxEventGapMs: 0,
  maxFrameMs: 0,
  peakDx: 0,
  peakDy: 0,
  pointerLockDrops: 0,
};

const EMPTY_VERIFICATION_SNAPSHOT: SensitivityInputVerificationSnapshot = {
  degreesPerInputUnit: 0,
  domInputUnitsX: 0,
  domInputUnitsY: 0,
  bufferedInputUnitsX: 0,
  bufferedInputUnitsY: 0,
  displayInputUnitsX: 0,
  displayInputUnitsY: 0,
  simulationInputUnitsX: 0,
  simulationInputUnitsY: 0,
  totalInputUnitsX: 0,
  totalInputUnitsY: 0,
  movementEventCount: 0,
  expectedYawDegrees: 0,
  expectedPitchDegrees: 0,
  actualEngineYawDegrees: 0,
  actualEnginePitchDegrees: 0,
  viewYawDegrees: 0,
  viewPitchDegrees: 0,
  yawResidualFixedPointUnits: 0,
  pitchResidualFixedPointUnits: 0,
};

const UNKNOWN_BROWSER_DETAILS = {
  platform: "unknown",
  userAgent: "unknown",
} as const;

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
  const runtimeConfigRef = useRef<TrainerRuntimeConfig | null>(null);
  const savedCrosshairRef = useRef<SavedCrosshairConfig>(
    CROSSHAIR_PRESETS[0]!.config,
  );
  const handleResizeRef = useRef<(() => void) | null>(null);
  const pauseDeadlineRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  // Mirrors of state the run-start snapshot needs. The snapshot callback is
  // created once, inside the setup effect, so reading the state variables
  // directly would capture whatever they held before the countdown and
  // pointer-lock handshake -- exactly the values that must not be recorded.
  const rawSettingsRef = useRef<TrainerSettings | null>(null);
  const pointerLockResultRef = useRef<PointerLockResult | null>(null);

  const [rawSettings, setRawSettings] = useState<TrainerSettings | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [initialConfigLoaded, setInitialConfigLoaded] = useState(false);
  const [runtimeConfig, setRuntimeConfig] =
    useState<TrainerRuntimeConfig | null>(null);
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
  const [inputHealth, setInputHealth] =
    useState<InputHealthTelemetry>(EMPTY_INPUT_HEALTH);
  const [inputStalls, setInputStalls] = useState<readonly InputStallRecord[]>(
    [],
  );
  const inputStallsRef = useRef<InputStallRecord[]>([]);
  const inputHealthRef = useRef({
    windowStartMs: 0,
    lastEventMs: 0,
    lastFrameMs: 0,
    events: 0,
    maxEventGapMs: 0,
    maxFrameMs: 0,
    peakDx: 0,
    peakDy: 0,
    pointerLockDrops: 0,
    lastEventsPerSecond: 0,
  });
  const [browserDetails, setBrowserDetails] = useState<
    Readonly<{ platform: string; userAgent: string }>
  >(UNKNOWN_BROWSER_DETAILS);

  // Keep the snapshot mirrors current. Cheap, and it means the run record
  // describes the run that was actually played rather than the state the
  // setup effect happened to close over.
  useEffect(() => {
    rawSettingsRef.current = rawSettings;
  }, [rawSettings]);

  useEffect(() => {
    pointerLockResultRef.current = pointerLockResult;
  }, [pointerLockResult]);

  useEffect(() => {
    const onFsChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!INPUT_DIAGNOSTICS_AVAILABLE) return;
    setBrowserDetails({
      platform: navigator.platform || "unknown",
      userAgent: navigator.userAgent || "unknown",
    });
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

      const health = inputHealthRef.current;
      const now = performance.now();
      const elapsedMs = now - health.windowStartMs;
      if (elapsedMs >= 1000) {
        health.lastEventsPerSecond = Math.round(
          (health.events * 1000) / elapsedMs,
        );
        setInputHealth({
          eventsPerSecond: health.lastEventsPerSecond,
          maxEventGapMs: Math.round(health.maxEventGapMs),
          maxFrameMs: Math.round(health.maxFrameMs),
          peakDx: health.peakDx,
          peakDy: health.peakDy,
          pointerLockDrops: health.pointerLockDrops,
        });
        health.windowStartMs = now;
        health.events = 0;
        health.maxEventGapMs = 0;
        health.maxFrameMs = 0;
        health.peakDx = 0;
        health.peakDy = 0;
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

  /**
   * Windowed Pointer Lock on Windows/Chromium does not reliably confine the
   * real OS cursor: on a multi-monitor desktop it can travel to, and get
   * physically pinned at, an actual monitor edge. Once pinned, every
   * movementX/Y the OS reports is 0 (both the previous and current cursor
   * position are the same clamped point), so the browser stops firing
   * mousemove entirely -- input looks "blocked" until the player reverses
   * far enough to leave the clamped edge. Fullscreen puts the browser in
   * exclusive control of one monitor, which is the standard, browser-vendor
   * -documented mitigation for this class of bug. Best-effort: a user or
   * browser that denies fullscreen still gets Pointer Lock, just without
   * this protection.
   */
  const ensureFullscreenBeforeLock = async (): Promise<void> => {
    if (document.fullscreenElement) return;
    try {
      await containerRef.current?.requestFullscreen();
    } catch {
      // ignore -- Pointer Lock is still attempted without fullscreen.
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
          const resolved = resolveTrainerRuntimeConfig(settings);
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
        const resolved = resolveTrainerRuntimeConfig(settings);
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
          graphicsPreset: activeCfg.graphicsPreset,
          weaponHand: activeCfg.weaponHand,
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
          graphicsPreset: activeCfg.graphicsPreset,
          weaponHand: activeCfg.weaponHand,
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
        // Evaluated when the run actually starts, so it reflects the
        // configuration and pointer-lock outcome the player really played
        // under rather than whatever was true at setup time.
        captureSettingsSnapshot: () => {
          const settings = rawSettingsRef.current;
          if (!settings) return null;
          const activeCfg = runtimeConfigRef.current ?? runtimeConfig;
          const lock = pointerLockResultRef.current;
          const rect = canvas.getBoundingClientRect();

          return {
            fmsSensitivity: activeCfg.inputGain.fmsSensitivity,
            nominalDpi: settings.nominalDpi,
            cmPer360: resolveCmPer360(
              activeCfg.inputGain.fmsSensitivity,
              settings.nominalDpi,
            ),
            fovDegrees: activeCfg.fovDegrees,
            resolution: activeCfg.resolution,
            backingWidth: canvas.width,
            backingHeight: canvas.height,
            cssWidth: Math.round(rect.width),
            cssHeight: Math.round(rect.height),
            devicePixelRatio: window.devicePixelRatio || 1,
            scalingMode: activeCfg.scalingMode,
            fullscreen: Boolean(document.fullscreenElement),
            graphicsPreset: activeCfg.graphicsPreset,
            crosshairCode: activeCfg.crosshairCode,
            rawPointerInputAccepted: Boolean(lock?.rawGranted),
            platform: coarsePlatform(),
            browser: coarseBrowser(),
            // Null until frame timing is actually measured. Never labelled a
            // refresh rate: a browser cannot read the monitor's, and a
            // rAF-derived number presented as hardware truth would be a
            // fabrication.
            medianRenderFps: null,
            p95FrameTimeMs: null,
            // Zero by definition: the snapshot is taken as the run begins,
            // before any input has been buffered. The run's real input health
            // lands on the summary at finalize.
            inputOverflowEvents: 0,
            inputHighWaterMark: 0,
          };
        },
      },
      adapter,
    );

    controllerRef.current = controller;

    const recordStall = (source: "event" | "frame", gapMs: number) => {
      const health = inputHealthRef.current;
      const view = controller.getSensitivityInputVerificationSnapshot();
      const record: InputStallRecord = {
        source,
        atSeconds: Number((performance.now() / 1000).toFixed(2)),
        gapMs: Math.round(gapMs),
        eventsPerSecondBefore: health.lastEventsPerSecond,
        peakDx: health.peakDx,
        peakDy: health.peakDy,
        viewYawDegrees: Number(view.viewYawDegrees.toFixed(2)),
        viewPitchDegrees: Number(view.viewPitchDegrees.toFixed(2)),
        pointerLocked: document.pointerLockElement === canvas,
      };
      const list = inputStallsRef.current;
      list.push(record);
      if (list.length > MAX_RECORDED_STALLS) list.shift();
      setInputStalls([...list]);
      console.warn("[input-stall]", JSON.stringify(record));
    };

    const diagnosticsEnabled =
      INPUT_DIAGNOSTICS_AVAILABLE &&
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
              onMovementObserved: ({ dx, dy }: { dx: number; dy: number }) => {
                controller.recordDomMovement(dx, dy);
              },
            }
          : {}),
        // Always on, not just under diagnostics: this is what makes the
        // camera track the mouse every rendered frame instead of only every
        // 1/128s simulation tick (see recordDisplayMovement's doc comment).
        onMovementAccepted: ({ dx, dy }: { dx: number; dy: number }) => {
          controller.recordDisplayMovement(dx, dy);
          if (!diagnosticsEnabled) return;

          controller.recordBufferedMovement(dx, dy);
          // Wall-clock arrival time, not event.timeStamp: a browser that
          // stops delivering events still backdates them on resume, so
          // only real elapsed time exposes a delivery stall.
          const health = inputHealthRef.current;
          const now = performance.now();
          if (health.lastEventMs > 0) {
            const gap = now - health.lastEventMs;
            if (gap > health.maxEventGapMs) health.maxEventGapMs = gap;
            if (gap >= INPUT_STALL_THRESHOLD_MS) {
              recordStall("event", gap);
            }
          }
          health.lastEventMs = now;
          health.events++;
          if (Math.abs(dx) > Math.abs(health.peakDx)) health.peakDx = dx;
          if (Math.abs(dy) > Math.abs(health.peakDy)) health.peakDy = dy;
        },
      },
    );

    const loop = (now: number) => {
      if (diagnosticsEnabled) {
        const health = inputHealthRef.current;
        if (health.lastFrameMs > 0) {
          const frameMs = now - health.lastFrameMs;
          if (frameMs > health.maxFrameMs) health.maxFrameMs = frameMs;
          if (
            frameMs >= INPUT_STALL_THRESHOLD_MS &&
            controller.getState() === "playing"
          ) {
            recordStall("frame", frameMs);
          }
        }
        health.lastFrameMs = now;
      }
      controller.onAnimationFrame(now);
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);

    const onPointerLockChange = () => {
      if (document.pointerLockElement === canvas) return;

      inputHealthRef.current.pointerLockDrops++;

      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setCountdown(null);
        setLockError(
          "Mouse lock was released before the run started. Click Start again.",
        );
      }

      if (controller.getState() === "playing") {
        controller.notePointerLockLost();
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
          <div style={{ marginTop: 18, textAlign: "center" }}>
            <BackLink href="/app" label="Back to trainer home" />
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
    await ensureFullscreenBeforeLock();
    const acquisition = await acquirePointerLock(canvas);
    pointerLockResultRef.current = acquisition;
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
    let remaining = 3;
    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownIntervalRef.current !== null) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        setCountdown(null);
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
        return;
      }

      setCountdown(remaining);
    }, 1000);
  };

  const handleResume = async () => {
    if (!canvasRef.current) return;
    setLockError(null);
    await ensureFullscreenBeforeLock();
    const acquisition = await acquirePointerLock(canvasRef.current);
    pointerLockResultRef.current = acquisition;
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
    const resolved = resolveTrainerRuntimeConfig(newSettings);
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
          <HudGroup items={getRuntimeHudItems(runtimeMetrics)} />
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
                {modeDescription} Click start to capture the mouse and begin the{" "}
                {modeDurationSeconds}-second run.
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
            <BackLink href="/app" label="Back to trainer home" />
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
              <h2
                className="app-heading"
                style={{ fontSize: 24, marginTop: 8 }}
              >
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
          inputHealth={inputHealth}
          inputStalls={inputStalls}
          sensitivity={runtimeConfig.inputGain.fmsSensitivity}
          pointerLockResult={pointerLockResult}
          pointerLockActive={Boolean(
            canvasRef.current &&
            document.pointerLockElement === canvasRef.current,
          )}
          inputSource={POINTER_LOCK_MOVEMENT_SOURCE}
          browserDetails={browserDetails}
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
  config: TrainerRuntimeConfig,
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
  // Every shipped metric family is handled above; this keeps the HUD total
  // rather than blanking mid-run if a new family lands without a branch.
  return [
    ["ACCURACY", "--"],
    ["HITS / MISS", "--"],
  ];
}

/**
 * Canonical physical turn distance for the run's sensitivity, which is the
 * only figure comparable across different DPI and different games. Null when
 * DPI is unknown, because guessing one would make every downstream
 * sensitivity comparison quietly wrong.
 */
function resolveCmPer360(
  fmsSensitivity: string,
  nominalDpi: number | null,
): number | null {
  if (!nominalDpi) return null;
  try {
    return sensitivityToCmPer360("aimlab-default", fmsSensitivity, nominalDpi);
  } catch {
    return null;
  }
}

/**
 * Coarse platform and browser labels: enough to spot "this only happens on
 * Safari" in aggregate, deliberately too blunt to identify anyone.
 */
function coarsePlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  return "unknown";
}

function coarseBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  // Order matters: Edge and Opera both also claim to be Chrome.
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "unknown";
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
  inputHealth,
  inputStalls,
  sensitivity,
  pointerLockResult,
  pointerLockActive,
  inputSource,
  browserDetails,
}: {
  snapshot: SensitivityInputVerificationSnapshot;
  inputHealth: InputHealthTelemetry;
  inputStalls: readonly InputStallRecord[];
  sensitivity: string;
  pointerLockResult: PointerLockResult | null;
  pointerLockActive: boolean;
  inputSource: string;
  browserDetails: Readonly<{ platform: string; userAgent: string }>;
}) {
  const rows: readonly (readonly [string, string])[] = [
    ["FMS / Aimlabs Default", sensitivity],
    ["Degrees / input unit", snapshot.degreesPerInputUnit.toFixed(8)],
    ["Input source", `${inputSource} (Pointer Lock contract)`],
    ["Movement events", snapshot.movementEventCount.toLocaleString()],
    [
      "DOM movement X / Y",
      `${snapshot.domInputUnitsX} / ${snapshot.domInputUnitsY}`,
    ],
    [
      "Ring buffered X / Y",
      `${snapshot.bufferedInputUnitsX} / ${snapshot.bufferedInputUnitsY}`,
    ],
    [
      "Display consumed X / Y",
      `${snapshot.displayInputUnitsX} / ${snapshot.displayInputUnitsY}`,
    ],
    [
      "Simulation consumed X / Y",
      `${snapshot.simulationInputUnitsX} / ${snapshot.simulationInputUnitsY}`,
    ],
    ["Expected yaw", `${snapshot.expectedYawDegrees.toFixed(6)}°`],
    ["Engine yaw", `${snapshot.actualEngineYawDegrees.toFixed(6)}°`],
    ["Expected pitch", `${snapshot.expectedPitchDegrees.toFixed(6)}°`],
    ["Engine pitch", `${snapshot.actualEnginePitchDegrees.toFixed(6)}°`],
    ["View yaw", `${snapshot.viewYawDegrees.toFixed(6)}°`],
    ["View pitch", `${snapshot.viewPitchDegrees.toFixed(6)}°`],
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
    ["Pointer lock drops", inputHealth.pointerLockDrops.toString()],
    ["Events / sec", inputHealth.eventsPerSecond.toLocaleString()],
    ["Max event gap", `${inputHealth.maxEventGapMs} ms`],
    ["Max frame time", `${inputHealth.maxFrameMs} ms`],
    ["Peak dx / dy", `${inputHealth.peakDx} / ${inputHealth.peakDy} counts`],
    ["Stalls recorded", inputStalls.length.toString()],
    ["Platform", browserDetails.platform],
    ["Browser", browserDetails.userAgent],
  ];

  return (
    <aside
      data-testid="input-verification-overlay"
      className="pointer-events-none absolute bottom-4 left-4 z-50 w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-cyan-500/50 bg-zinc-950/95 p-4 font-mono text-[10px] text-zinc-300 shadow-2xl"
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <strong className="text-xs uppercase tracking-wider text-cyan-300">
          Sensitivity verification · diagnostics
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
      {inputStalls.length > 0 ? (
        <div className="mt-2 border-t border-zinc-800 pt-2">
          <strong className="text-[10px] uppercase tracking-wider text-amber-300">
            Input stalls (newest last)
          </strong>
          <div className="mt-1 max-h-40 overflow-y-auto">
            {inputStalls.slice(-8).map((stall, index) => (
              <div
                key={`${stall.atSeconds}-${stall.source}-${index}`}
                className="text-[10px] text-zinc-300"
              >
                <span
                  className={
                    stall.source === "event" ? "text-rose-300" : "text-sky-300"
                  }
                >
                  {stall.source}
                </span>{" "}
                {stall.gapMs}ms @{stall.atSeconds}s · rate{" "}
                {stall.eventsPerSecondBefore}/s · peak {stall.peakDx}/
                {stall.peakDy} · view {stall.viewYawDegrees}°/
                {stall.viewPitchDegrees}° · lock{" "}
                {stall.pointerLocked ? "on" : "OFF"}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-2 text-zinc-500">
        Raw support is recorded only after the Pointer Lock promise accepts the
        unadjustedMovement request. Compare this number only with Aimlabs
        Default; an Aimlabs game profile expects that game&apos;s original
        sensitivity.
      </p>
    </aside>
  );
}
