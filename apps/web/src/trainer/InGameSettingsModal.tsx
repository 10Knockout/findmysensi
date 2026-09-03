"use client";

import React, { useState, useEffect } from "react";
import {
  DEFAULT_TRAINING_FOV_DEGREES,
  type TrainerSettings,
} from "@findmysensi/protocol";
import {
  CROSSHAIR_PRESETS,
  decodeCrosshairShareCode,
  encodeCrosshairShareCode,
  type CrosshairConfig,
} from "@findmysensi/crosshair";
import {
  GAME_ADAPTERS,
  SupportedGameId,
  gameSensitivityToFms,
  fmsToGameSensitivity,
  sensitivityToCmPer360,
} from "@findmysensi/sensitivity";
import { InteractiveCrosshairEditor } from "../features/crosshair/InteractiveCrosshairEditor";

interface InGameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: TrainerSettings;
  onSaveAndApply: (
    newSettings: TrainerSettings,
    newCrosshair: CrosshairConfig,
  ) => Promise<void>;
}

type SettingsTab = "sensitivity" | "crosshair" | "targets" | "video" | "input";

const TARGET_SWATCHES = [
  { name: "Emerald", hex: "#7CFF6B" },
  { name: "Cyan", hex: "#00F0FF" },
  { name: "Yellow", hex: "#FFFF00" },
  { name: "Red", hex: "#FF3366" },
  { name: "White", hex: "#FFFFFF" },
];

export function InGameSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSaveAndApply,
}: InGameSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("sensitivity");
  const [settings, setSettings] = useState<TrainerSettings>(currentSettings);
  const [selectedGame, setSelectedGame] = useState<SupportedGameId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("findmysensi:selected_game");
      if (saved && saved in GAME_ADAPTERS) return saved as SupportedGameId;
    }
    return "valorant";
  });
  const [gameSens, setGameSens] = useState<number>(0.35);
  const [dpi, setDpi] = useState<number>(currentSettings.nominalDpi ?? 800);
  const [crosshair, setCrosshair] = useState<CrosshairConfig>(
    CROSSHAIR_PRESETS[0]!.config,
  );
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Initialize sensitivity & crosshair from incoming settings
  useEffect(() => {
    setSettings(currentSettings);
    if (currentSettings.nominalDpi) {
      setDpi(currentSettings.nominalDpi);
    }

    if (currentSettings.fmsSensitivity) {
      try {
        const sensVal = fmsToGameSensitivity(
          selectedGame,
          currentSettings.fmsSensitivity,
        );
        setGameSens(sensVal);
      } catch {
        setGameSens(0.35);
      }
    }

    if (currentSettings.crosshairCode) {
      try {
        setCrosshair(decodeCrosshairShareCode(currentSettings.crosshairCode));
      } catch {
        setCrosshair(CROSSHAIR_PRESETS[0]!.config);
      }
    }
  }, [currentSettings, selectedGame]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof TrainerSettings>(
    key: K,
    val: TrainerSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleGameChange = (newGame: SupportedGameId) => {
    setSelectedGame(newGame);
    if (typeof window !== "undefined") {
      localStorage.setItem("findmysensi:selected_game", newGame);
    }
    // Convert current FMS sensitivity to the new game's sensitivity
    if (settings.fmsSensitivity) {
      try {
        const converted = fmsToGameSensitivity(
          newGame,
          settings.fmsSensitivity,
        );
        setGameSens(converted);
      } catch {
        setGameSens(0.35);
      }
    }
  };

  const handleGameSensChange = (sens: number) => {
    setGameSens(sens);
    try {
      const fmsGain = gameSensitivityToFms(selectedGame, sens);
      updateSetting("fmsSensitivity", fmsGain);
    } catch {
      // ignore
    }
  };

  const handleDpiChange = (newDpi: number) => {
    setDpi(newDpi);
    updateSetting("nominalDpi", newDpi);
  };

  // Calculate physical metrics (cm/360, eDPI)
  let cmPer360 = "N/A";
  let edpi = "N/A";
  try {
    if (gameSens > 0 && dpi > 0) {
      const cm = sensitivityToCmPer360(selectedGame, gameSens, dpi);
      cmPer360 = `${cm.toFixed(1)} cm / 360°`;
      edpi = `${(gameSens * dpi).toFixed(0)}`;
    }
  } catch {
    // ignore
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const crosshairCode = encodeCrosshairShareCode(crosshair);
      const toSave: TrainerSettings = {
        ...settings,
        nominalDpi: dpi,
        crosshairCode,
      };

      await onSaveAndApply(toSave, crosshair);
      setSaveStatus("Applied successfully!");
      window.setTimeout(() => {
        setSaveStatus(null);
        onClose();
      }, 400);
    } catch {
      setSaveStatus("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-lg">
      <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-cyan-500/30 bg-zinc-950 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        {/* Modal Top Header with Aimlabs-style Cyan Tab Navigation */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            <TabButton
              active={activeTab === "sensitivity"}
              onClick={() => setActiveTab("sensitivity")}
              label="SENSITIVITY"
            />
            <TabButton
              active={activeTab === "crosshair"}
              onClick={() => setActiveTab("crosshair")}
              label="CROSSHAIR"
            />
            <TabButton
              active={activeTab === "targets"}
              onClick={() => setActiveTab("targets")}
              label="TARGETS"
            />
            <TabButton
              active={activeTab === "video"}
              onClick={() => setActiveTab("video")}
              label="GRAPHICS / VIDEO"
            />
            <TabButton
              active={activeTab === "input"}
              onClick={() => setActiveTab("input")}
              label="INPUT"
            />
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <span>&lt; BACK</span>
          </button>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* SENSITIVITY TAB */}
          {activeTab === "sensitivity" ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">
                  Game Profile & Mouse Sensitivity
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Select your primary game and enter your in-game sensitivity.
                  FindMySensi will dynamically scale your physical mouse movements to
                  match 1:1.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Game Profile
                    </label>
                    <select
                      value={selectedGame}
                      onChange={(e) =>
                        handleGameChange(e.target.value as SupportedGameId)
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {Object.values(GAME_ADAPTERS).map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Mouse DPI
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={32000}
                      step={50}
                      value={dpi}
                      onChange={(e) => handleDpiChange(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Game Sensitivity Slider */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">
                      In-Game Sensitivity ({GAME_ADAPTERS[selectedGame]?.name ?? "Game"})
                    </span>
                    <input
                      type="number"
                      min={0.01}
                      max={10.0}
                      step={0.005}
                      value={gameSens}
                      onChange={(e) =>
                        handleGameSensChange(parseFloat(e.target.value) || 0.1)
                      }
                      className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-right font-mono text-sm text-cyan-400 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={selectedGame === "valorant" ? 2.0 : 6.0}
                    step={0.005}
                    value={gameSens}
                    onChange={(e) =>
                      handleGameSensChange(parseFloat(e.target.value))
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Real-Time Turn Metrics Banner */}
                <div className="mt-5 grid grid-cols-3 gap-3 rounded-lg border border-zinc-800 bg-black/50 p-3 text-center">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      Turn Distance
                    </span>
                    <span className="font-mono text-sm font-bold text-cyan-300">
                      {cmPer360}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      eDPI
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      {edpi}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      FMS Browser Gain
                    </span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {settings.fmsSensitivity ?? "1.0"}
                    </span>
                  </div>
                </div>

                {/* Cross-Game Parity (GamingSmart / mouse-sensitivity.com Parity) */}
                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                    <span className="uppercase tracking-wider">Cross-Game Equivalent Sensitivities</span>
                    <span className="font-mono text-xs text-cyan-400">{cmPer360}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { id: "valorant", label: "Valorant" },
                      { id: "aimlab", label: "Aim Lab" },
                      { id: "cs2", label: "CS2 / Apex" },
                      { id: "pubg", label: "PUBG" },
                    ].map((g) => {
                      const sens = fmsToGameSensitivity(
                        g.id as SupportedGameId,
                        settings.fmsSensitivity ?? "0.1631",
                      );
                      const isCurrent = selectedGame === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleGameChange(g.id as SupportedGameId)}
                          className={`flex flex-col items-center rounded-lg border p-2 transition ${
                            isCurrent
                              ? "border-cyan-500 bg-cyan-950/40 text-cyan-300"
                              : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-white"
                          }`}
                        >
                          <span className="text-[10px] font-medium uppercase text-zinc-400">{g.label}</span>
                          <span className="font-mono text-sm font-bold">{sens}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-center text-[10px] text-zinc-500">
                    Click any game to switch profile. All game sensitivities above produce identical {cmPer360} turn distance.
                  </p>
                </div>
              </div>

              {/* Field of View Slider & Game Presets */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold tracking-wide text-white uppercase">
                      Field of View (FOV)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Adjust camera horizontal FOV between 80° and 120°.
                    </p>
                  </div>
                  <span className="rounded-md border border-cyan-500/40 bg-cyan-950/40 px-3 py-1 font-mono text-sm font-bold text-cyan-300">
                    {settings.fovDegrees}°
                  </span>
                </div>

                <div className="mt-4">
                  <input
                    type="range"
                    min={80}
                    max={120}
                    step={1}
                    value={settings.fovDegrees}
                    onChange={(e) =>
                      updateSetting("fovDegrees", Number(e.target.value))
                    }
                    className="w-full accent-cyan-400"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
                    <span>80°</span>
                    <span>103° (Valorant standard)</span>
                    <span>120°</span>
                  </div>
                </div>

                {/* Quick Game FOV Presets */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateSetting("fovDegrees", 103)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      settings.fovDegrees === 103
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    Valorant (103°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting("fovDegrees", 106)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      settings.fovDegrees === 106
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    CS2 / Source (106°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting("fovDegrees", 90)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      settings.fovDegrees === 90
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    Apex / Source (90°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting("fovDegrees", 120)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      settings.fovDegrees === 120
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    COD / Warzone (120°)
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* CROSSHAIR TAB */}
          {activeTab === "crosshair" ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5">
              <InteractiveCrosshairEditor
                crosshair={crosshair}
                onChange={setCrosshair}
              />
            </div>
          ) : null}

          {/* TARGETS TAB */}
          {activeTab === "targets" ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">
                  Target Appearance & Color
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Customize the look of Gridshot targets.
                </p>

                {/* Target Preview Box */}
                <div className="mt-4 flex aspect-video max-h-48 w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 shadow-inner">
                  <div
                    className="h-20 w-20 rounded-full transition-all"
                    style={{
                      backgroundColor: settings.targetColor,
                      opacity: settings.targetOpacity,
                      border: settings.targetOutline
                        ? "3px solid #ffffff"
                        : "none",
                    }}
                  />
                </div>

                <div className="mt-5 space-y-4">
                  {/* Target Color Swatches */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                      Target Color
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {TARGET_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.hex}
                          type="button"
                          onClick={() =>
                            updateSetting("targetColor", swatch.hex)
                          }
                          className={`h-7 w-7 rounded-lg border transition-all ${
                            settings.targetColor.toLowerCase() ===
                            swatch.hex.toLowerCase()
                              ? "border-white scale-110 shadow-lg"
                              : "border-zinc-700 hover:scale-105"
                          }`}
                          style={{ backgroundColor: swatch.hex }}
                          title={swatch.name}
                        />
                      ))}
                      <input
                        type="color"
                        value={settings.targetColor}
                        onChange={(e) =>
                          updateSetting("targetColor", e.target.value)
                        }
                        className="h-7 w-12 cursor-pointer rounded-lg border border-zinc-700 bg-black p-0.5"
                      />
                      <span className="font-mono text-xs text-zinc-400 uppercase">
                        {settings.targetColor}
                      </span>
                    </div>
                  </div>

                  {/* Target Opacity Slider */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-zinc-400">
                      <span>Opacity</span>
                      <span className="font-mono text-cyan-400">
                        {Math.round(settings.targetOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={1.0}
                      step={0.05}
                      value={settings.targetOpacity}
                      onChange={(e) =>
                        updateSetting("targetOpacity", Number(e.target.value))
                      }
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Target Outline Toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <span className="text-xs font-semibold text-zinc-300">
                      White Outline Border
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.targetOutline}
                      onChange={(e) =>
                        updateSetting("targetOutline", e.target.checked)
                      }
                      className="h-4 w-4 accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* GRAPHICS / VIDEO TAB */}
          {activeTab === "video" ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">
                  Display & Resolution Settings
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Configure aspect ratio scaling and monitor display options.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Aspect Ratio & Scaling Method
                    </label>
                    <select
                      value={settings.scalingMode}
                      onChange={(e) =>
                        updateSetting(
                          "scalingMode",
                          e.target.value as TrainerSettings["scalingMode"],
                        )
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="fill">
                        Fill (Native Fullscreen - No Bars)
                      </option>
                      <option value="fit">
                        16:9 Letterbox (Fit with Black Bars)
                      </option>
                      <option value="stretch">Stretch to Screen</option>
                    </select>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Use Fill on 1440p monitors to avoid black gaps entirely.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Display Resolution
                    </label>
                    <select
                      value={settings.resolution}
                      onChange={(e) =>
                        updateSetting(
                          "resolution",
                          e.target.value as TrainerSettings["resolution"],
                        )
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="native">
                        Native (Detected:{" "}
                        {typeof window !== "undefined"
                          ? `${window.screen.width}x${window.screen.height}`
                          : "Auto"}
                        )
                      </option>
                      <option value="2560x1440">2560x1440 (1440p QHD)</option>
                      <option value="1920x1080">1920x1080 (1080p FHD)</option>
                      <option value="1280x720">1280x720 (720p HD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Graphics Quality Preset
                    </label>
                    <select
                      value={settings.graphicsPreset}
                      onChange={(e) =>
                        updateSetting(
                          "graphicsPreset",
                          e.target.value as TrainerSettings["graphicsPreset"],
                        )
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="automatic">Automatic (Optimal)</option>
                      <option value="potato">Potato (Maximum FPS)</option>
                      <option value="low">Low</option>
                      <option value="balanced">Balanced</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* INPUT TAB */}
          {activeTab === "input" ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">
                  Input Polling & Processing Policy
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Select your mouse polling rate buffer.
                </p>

                <div className="mt-4 max-w-sm">
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Input Polling Rate
                  </label>
                  <select
                    value={settings.inputProcessing}
                    onChange={(e) =>
                      updateSetting(
                        "inputProcessing",
                        e.target.value as TrainerSettings["inputProcessing"],
                      )
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="automatic">Automatic (Adaptive)</option>
                    <option value="1000">1000 Hz Standard</option>
                    <option value="2000">2000 Hz High Speed</option>
                    <option value="4000">4000 Hz Ultra</option>
                    <option value="8000">8000 Hz Extreme</option>
                    <option value="maximum">Maximum Capacity</option>
                  </select>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-6 py-4 rounded-b-2xl">
          <button
            type="button"
            onClick={() => {
              setSettings({
                ...settings,
                fovDegrees: DEFAULT_TRAINING_FOV_DEGREES,
                targetColor: "#7CFF6B",
                targetOpacity: 1,
                targetOutline: false,
                scalingMode: "fill",
                resolution: "native",
              });
              setCrosshair(CROSSHAIR_PRESETS[0]!.config);
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700 uppercase"
          >
            DEFAULT
          </button>

          <div className="flex items-center gap-3">
            {saveStatus ? (
              <span className="text-xs font-medium text-cyan-300">
                {saveStatus}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-2 text-xs font-black uppercase tracking-wider text-black hover:bg-cyan-300 disabled:opacity-50"
            >
              <span>{saving ? "SAVING..." : "SAVE & APPLY"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-2 text-xs font-black tracking-wider transition-all uppercase ${
        active
          ? "text-cyan-400 border-b-2 border-cyan-400"
          : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}
