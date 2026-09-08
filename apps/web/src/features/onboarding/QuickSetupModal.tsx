"use client";

import React, { useMemo, useState } from "react";
import { BrowserApiClient } from "@findmysensi/api-client";
import {
  TrainerSettingsSchema,
  type TrainerSettings,
} from "@findmysensi/protocol";
import {
  DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE,
  SENSITIVITY_PROFILES,
  applyBrowserInputCalibration,
  convertSensitivity,
  type VerifiedSensitivityProfileId,
} from "@findmysensi/sensitivity";

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: TrainerSettings;
  onSaved: (updated: TrainerSettings) => void;
}

const SOURCE_GAMES = [
  "valorant",
  "cs2",
  "apex",
  "aimlab-default",
] as const satisfies readonly VerifiedSensitivityProfileId[];

const SOURCE_DEFAULTS: Record<VerifiedSensitivityProfileId, string> = {
  valorant: "0.125",
  cs2: "0.397727",
  apex: "0.397727",
  "aimlab-default": "0.175",
};

export function QuickSetupModal({
  isOpen,
  onClose,
  currentSettings,
  onSaved,
}: QuickSetupModalProps) {
  const [sourceGame, setSourceGame] =
    useState<VerifiedSensitivityProfileId>("valorant");
  const [sourceSensitivity, setSourceSensitivity] = useState("0.125");
  const [dpi, setDpi] = useState("800");
  const [fov, setFov] = useState(String(currentSettings.fovDegrees));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversion = useMemo(() => {
    const sensitivity = Number(sourceSensitivity);
    const parsedDpi = Number(dpi);
    if (
      !Number.isFinite(sensitivity) ||
      sensitivity <= 0 ||
      !Number.isInteger(parsedDpi) ||
      parsedDpi < 100 ||
      parsedDpi > 100_000
    ) {
      return null;
    }

    try {
      return convertSensitivity({
        sourceGame,
        targetGame: "aimlab-default",
        sourceSensitivity: sensitivity,
        sourceDpi: parsedDpi,
        targetDpi: parsedDpi,
      });
    } catch {
      return null;
    }
  }, [dpi, sourceGame, sourceSensitivity]);

  const canonicalSensitivity = conversion
    ? Number(conversion.formattedTargetSensitivity)
    : null;
  const calibratedSensitivity =
    canonicalSensitivity !== null && Number.isFinite(canonicalSensitivity)
      ? applyBrowserInputCalibration(canonicalSensitivity)
      : null;
  const calibratedSensitivityText =
    calibratedSensitivity !== null
      ? Number(calibratedSensitivity.toFixed(6)).toString()
      : null;

  if (!isOpen) return null;

  const handleGameSelect = (gameId: VerifiedSensitivityProfileId) => {
    setSourceGame(gameId);
    setSourceSensitivity(SOURCE_DEFAULTS[gameId]);
  };

  const handleSave = async () => {
    const parsedDpi = Number(dpi);
    const parsedFov = Number(fov);
    if (
      !conversion ||
      !calibratedSensitivityText ||
      !Number.isInteger(parsedDpi) ||
      parsedDpi < 100 ||
      parsedDpi > 100_000 ||
      !Number.isFinite(parsedFov) ||
      parsedFov < 40 ||
      parsedFov > 140
    ) {
      setError("Enter valid sensitivity, DPI, and FOV values.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated: TrainerSettings = {
        ...currentSettings,
        fmsSensitivity: calibratedSensitivityText,
        nominalDpi: parsedDpi,
        fovDegrees: parsedFov,
      };

      const client = new BrowserApiClient();
      const res = await client.saveTrainerSettings(updated);
      if (!res.ok) {
        throw new Error(res.error ?? "Failed to save sensitivity");
      }

      onSaved(TrainerSettingsSchema.parse(res.data ?? updated));
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to save sensitivity",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-overlay" style={{ position: "fixed" }}>
      <div className="app-card app-card-wide">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "grid",
              width: 40,
              height: 40,
              placeItems: "center",
              border: "1px solid rgba(189,255,45,0.4)",
              background: "rgba(189,255,45,0.08)",
              color: "var(--fms-acid)",
            }}
          >
            <svg
              aria-hidden="true"
              width={20}
              height={20}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
              <path strokeWidth="2" d="M12 3v4m0 10v4m-9-9h4m10 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="app-heading" style={{ fontSize: 20 }}>
              Match Your Sensitivity
            </h2>
            <p className="app-help" style={{ marginTop: 2 }}>
              Convert once into one Aim Sensitivity used by every game.
            </p>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="app-alert"
            style={{ marginTop: 16, marginBottom: 0 }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ marginTop: 22 }}>
          <fieldset className="app-field" style={{ border: 0, padding: 0 }}>
            <legend className="settings-label">Convert from</legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))",
                gap: 8,
              }}
            >
              {SOURCE_GAMES.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={sourceGame === id}
                  onClick={() => handleGameSelect(id)}
                  className={`settings-chip${sourceGame === id ? " settings-chip-active" : ""}`}
                  style={{ textAlign: "center" }}
                >
                  {id === "aimlab-default"
                    ? "Aimlabs Default"
                    : SENSITIVITY_PROFILES[id].name}
                </button>
              ))}
            </div>
          </fieldset>

          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
              marginBottom: 18,
            }}
          >
            <div>
              <label
                htmlFor="setup-source-sensitivity"
                className="settings-label"
              >
                {SENSITIVITY_PROFILES[sourceGame].name} Sensitivity
              </label>
              <input
                id="setup-source-sensitivity"
                type="number"
                min="0.001"
                max="100"
                step="0.001"
                inputMode="decimal"
                value={sourceSensitivity}
                onChange={(event) => setSourceSensitivity(event.target.value)}
                className="app-input"
                style={{ fontFamily: "monospace" }}
              />
            </div>

            <div>
              <label htmlFor="setup-dpi" className="settings-label">
                Mouse DPI
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[400, 800, 1600, 2400].map((presetDpi) => (
                  <button
                    key={presetDpi}
                    type="button"
                    aria-pressed={dpi === String(presetDpi)}
                    onClick={() => setDpi(String(presetDpi))}
                    className={`settings-chip${dpi === String(presetDpi) ? " settings-chip-active" : ""}`}
                    style={{ flex: 1, textAlign: "center" }}
                  >
                    {presetDpi}
                  </button>
                ))}
              </div>
              <input
                id="setup-dpi"
                type="number"
                min="100"
                max="100000"
                step="50"
                value={dpi}
                onChange={(event) => setDpi(event.target.value)}
                className="app-input"
                style={{ marginTop: 8, fontFamily: "monospace" }}
              />
            </div>

            <div>
              <label htmlFor="setup-fov" className="settings-label">
                Horizontal FOV
              </label>
              <input
                id="setup-fov"
                type="number"
                min="40"
                max="140"
                step="1"
                value={fov}
                onChange={(event) => setFov(event.target.value)}
                className="app-input"
                style={{ fontFamily: "monospace" }}
              />
              <p className="app-help" style={{ marginTop: 6 }}>
                FOV changes view only. It never changes mouse rotation.
              </p>
            </div>
          </div>

          <div
            role="status"
            aria-live="polite"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
              padding: 14,
              border: "1px solid var(--fms-line-dark)",
            }}
          >
            <div>
              <span className="settings-label">Your Aim Sensitivity</span>
              <span
                data-testid="converted-fms-sensitivity"
                style={{
                  fontFamily: "monospace",
                  fontWeight: 800,
                  color: "var(--fms-acid)",
                  fontSize: 24,
                }}
              >
                {calibratedSensitivityText ?? "--"}
              </span>
            </div>
            <div>
              <span className="settings-label">Turn Distance</span>
              <span style={{ fontFamily: "monospace", fontWeight: 800 }}>
                {conversion
                  ? `${conversion.formattedCmPer360} cm / 360°`
                  : "--"}
              </span>
            </div>
          </div>
          <p className="app-help" style={{ marginTop: 10 }}>
            Example: Valorant 0.125 becomes FindMySensi 0.245 at the same DPI.
            That is the 0.175 cm/360 match ×{" "}
            {DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE} browser input calibration,
            so the on-screen turn matches your game.
          </p>
        </div>

        <div
          style={{
            marginTop: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="app-link"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !conversion}
            className="app-button"
            style={{ width: "auto", padding: "0 26px" }}
          >
            {saving ? "Saving…" : "Save Sensitivity"}
          </button>
        </div>
      </div>
    </div>
  );
}
