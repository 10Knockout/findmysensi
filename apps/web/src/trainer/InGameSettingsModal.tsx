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
import { sensitivityToCmPer360 } from "@findmysensi/sensitivity";
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

type SettingsTab = "sensitivity" | "crosshair" | "targets" | "video";

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

    if (currentSettings.crosshairCode) {
      try {
        setCrosshair(decodeCrosshairShareCode(currentSettings.crosshairCode));
      } catch {
        setCrosshair(CROSSHAIR_PRESETS[0]!.config);
      }
    }
  }, [currentSettings]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof TrainerSettings>(
    key: K,
    val: TrainerSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const fmsSensitivity = Number(settings.fmsSensitivity ?? "1");

  const handleFindMySensiSensitivityChange = (rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) return;
    updateSetting("fmsSensitivity", String(value));
  };

  const handleDpiChange = (rawValue: string) => {
    const newDpi = Number(rawValue);
    if (!Number.isInteger(newDpi) || newDpi < 100 || newDpi > 100_000) {
      return;
    }
    setDpi(newDpi);
    updateSetting("nominalDpi", newDpi);
  };

  // Calculate physical metrics (cm/360, eDPI)
  let cmPer360 = "N/A";
  try {
    if (fmsSensitivity > 0 && dpi > 0) {
      const cm = sensitivityToCmPer360("aimlab-default", fmsSensitivity, dpi);
      cmPer360 = `${cm.toFixed(1)} cm / 360°`;
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
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <div className="settings-tabs">
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
          </div>

          <button onClick={onClose} className="settings-close">
            &lt; BACK
          </button>
        </div>

        <div className="settings-body">
          {/* SENSITIVITY TAB */}
          {activeTab === "sensitivity" ? (
            <div>
              <div className="settings-panel">
                <h3>Aim Sensitivity</h3>
                <p>
                  One Aimlabs Default sensitivity controls every training game.
                </p>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gap: 16,
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
                  }}
                >
                  <div>
                    <label
                      htmlFor="in-game-mouse-dpi"
                      className="settings-label"
                    >
                      Mouse DPI (reference only)
                    </label>
                    <input
                      id="in-game-mouse-dpi"
                      type="number"
                      min={100}
                      max={32000}
                      step={50}
                      value={dpi}
                      onChange={(event) => handleDpiChange(event.target.value)}
                      className="app-input"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <label
                      htmlFor="in-game-fms-sensitivity"
                      className="settings-label"
                      style={{ margin: 0 }}
                    >
                      Aim Sensitivity (Aimlabs Default)
                    </label>
                    <input
                      id="in-game-fms-sensitivity"
                      type="number"
                      min={0.005}
                      max={10.0}
                      step={0.005}
                      value={fmsSensitivity}
                      onChange={(event) =>
                        handleFindMySensiSensitivityChange(event.target.value)
                      }
                      className="app-input"
                      style={{
                        width: 96,
                        padding: "6px 10px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        color: "var(--fms-acid)",
                      }}
                    />
                  </div>
                  <input
                    aria-label="Aim sensitivity slider"
                    type="range"
                    min={0.005}
                    max={2}
                    step={0.005}
                    value={Math.min(fmsSensitivity, 2)}
                    onChange={(event) =>
                      handleFindMySensiSensitivityChange(event.target.value)
                    }
                    className="accent-acid"
                    style={{ width: "100%" }}
                  />
                  <p
                    style={{
                      marginTop: 8,
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      lineHeight: 1.6,
                    }}
                  >
                    Saved once and used by this game and every other trainer
                    game. Use Converter for Valorant, CS2, or Apex values.
                  </p>
                </div>

                <div
                  style={{
                    marginTop: 20,
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 12,
                    padding: 12,
                    border: "1px solid var(--fms-line-dark)",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <span className="settings-label">Turn Distance</span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        color: "var(--fms-acid)",
                      }}
                    >
                      {cmPer360}
                    </span>
                  </div>
                </div>

                <p
                  style={{
                    marginTop: 16,
                    padding: 12,
                    border: "1px solid var(--fms-line-dark)",
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 10,
                    lineHeight: 1.6,
                    textAlign: "center",
                  }}
                >
                  Use same numeric value as Aimlabs Default. Confirm physical
                  parity with repeated 180° or 360° sweeps before changing the
                  value by feel.
                </p>
              </div>

              <div className="settings-panel">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3>Field of View (FOV)</h3>
                    <p>Adjust camera horizontal FOV between 80° and 120°.</p>
                  </div>
                  <span
                    style={{
                      padding: "6px 12px",
                      border: "1px solid rgba(189,255,45,0.4)",
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: "var(--fms-acid)",
                    }}
                  >
                    {settings.fovDegrees}°
                  </span>
                </div>

                <div style={{ marginTop: 16 }}>
                  <input
                    type="range"
                    min={80}
                    max={120}
                    step={1}
                    value={settings.fovDegrees}
                    onChange={(e) =>
                      updateSetting("fovDegrees", Number(e.target.value))
                    }
                    className="accent-acid"
                    style={{ width: "100%" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 4,
                      fontFamily: "monospace",
                      fontSize: 10,
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    <span>80°</span>
                    <span>103° (Valorant standard)</span>
                    <span>120°</span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => updateSetting("fovDegrees", 103)}
                    className={`settings-chip${settings.fovDegrees === 103 ? " settings-chip-active" : ""}`}
                  >
                    Valorant (103°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting("fovDegrees", 106)}
                    className={`settings-chip${settings.fovDegrees === 106 ? " settings-chip-active" : ""}`}
                  >
                    CS2 / Source (106°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting("fovDegrees", 90)}
                    className={`settings-chip${settings.fovDegrees === 90 ? " settings-chip-active" : ""}`}
                  >
                    Apex / Source (90°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting("fovDegrees", 120)}
                    className={`settings-chip${settings.fovDegrees === 120 ? " settings-chip-active" : ""}`}
                  >
                    COD / Warzone (120°)
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* CROSSHAIR TAB */}
          {activeTab === "crosshair" ? (
            <div className="settings-panel">
              <InteractiveCrosshairEditor
                crosshair={crosshair}
                onChange={setCrosshair}
              />
            </div>
          ) : null}

          {/* TARGETS TAB */}
          {activeTab === "targets" ? (
            <div className="settings-panel">
              <h3>Target Appearance & Color</h3>
              <p>Customize the look of training targets.</p>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  maxHeight: 190,
                  aspectRatio: "16/9",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--fms-line-dark)",
                  background: "var(--fms-black)",
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: settings.targetColor,
                    opacity: settings.targetOpacity,
                    border: settings.targetOutline
                      ? "3px solid #ffffff"
                      : "none",
                  }}
                />
              </div>

              <div style={{ marginTop: 20 }}>
                <label className="settings-label">Target Color</label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {TARGET_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => updateSetting("targetColor", swatch.hex)}
                      style={{
                        width: 28,
                        height: 28,
                        backgroundColor: swatch.hex,
                        border:
                          settings.targetColor.toLowerCase() ===
                          swatch.hex.toLowerCase()
                            ? "2px solid white"
                            : "1px solid var(--fms-line-dark)",
                        cursor: "pointer",
                      }}
                      title={swatch.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={settings.targetColor}
                    onChange={(e) =>
                      updateSetting("targetColor", e.target.value)
                    }
                    style={{
                      width: 48,
                      height: 28,
                      border: "1px solid var(--fms-line-dark)",
                      background: "black",
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      textTransform: "uppercase",
                    }}
                  >
                    {settings.targetColor}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  <span>Opacity</span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      color: "var(--fms-acid)",
                    }}
                  >
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
                  className="accent-acid"
                  style={{ width: "100%" }}
                />
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  border: "1px solid var(--fms-line-dark)",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 620 }}>
                  White Outline Border
                </span>
                <input
                  type="checkbox"
                  checked={settings.targetOutline}
                  onChange={(e) =>
                    updateSetting("targetOutline", e.target.checked)
                  }
                  className="accent-acid"
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
              </div>
            </div>
          ) : null}

          {/* GRAPHICS / VIDEO TAB */}
          {activeTab === "video" ? (
            <div className="settings-panel">
              <h3>Display & Resolution Settings</h3>
              <p>Configure aspect ratio scaling and monitor display options.</p>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
                }}
              >
                <div>
                  <label className="settings-label">
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
                    className="app-input"
                  >
                    <option value="fill">
                      Fill (Native Fullscreen - No Bars)
                    </option>
                    <option value="fit">
                      16:9 Letterbox (Fit with Black Bars)
                    </option>
                    <option value="stretch">Stretch to Screen</option>
                  </select>
                  <p
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    Use Fill on 1440p monitors to avoid black gaps entirely.
                  </p>
                </div>

                <div>
                  <label className="settings-label">Display Resolution</label>
                  <select
                    value={settings.resolution}
                    onChange={(e) =>
                      updateSetting(
                        "resolution",
                        e.target.value as TrainerSettings["resolution"],
                      )
                    }
                    className="app-input"
                  >
                    <option value="native">
                      Native (Detected automatically)
                    </option>
                    <option value="2560x1440">2560x1440 (1440p QHD)</option>
                    <option value="1920x1080">1920x1080 (1080p FHD)</option>
                    <option value="1280x720">1280x720 (720p HD)</option>
                  </select>
                </div>

                <div>
                  <label className="settings-label">
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
                    className="app-input"
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
          ) : null}
        </div>

        <div className="settings-footer">
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
            className="app-button app-button-ghost"
            style={{ width: "auto", padding: "0 18px" }}
          >
            DEFAULT
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {saveStatus ? (
              <span style={{ fontSize: 12, color: "var(--fms-acid)" }}>
                {saveStatus}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="app-button"
              style={{ width: "auto", padding: "0 26px" }}
            >
              {saving ? "SAVING..." : "SAVE & APPLY"}
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
      className={`settings-tab${active ? " settings-tab-active" : ""}`}
    >
      {label}
    </button>
  );
}
