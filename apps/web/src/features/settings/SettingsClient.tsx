"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import {
  ProfileSettingsSchema,
  TrainerSettingsSchema,
  describeTrainerSettingsError,
  normalizeHexColor,
  type ProfileSettings,
  type TrainerSettings,
} from "@findmysensi/protocol";
import {
  CROSSHAIR_PRESETS,
  decodeCrosshairShareCode,
  encodeCrosshairShareCode,
  type CrosshairConfig,
} from "@findmysensi/crosshair";
import { sensitivityToCmPer360 } from "@findmysensi/sensitivity";
import { InteractiveCrosshairEditor } from "../crosshair/InteractiveCrosshairEditor.js";
import {
  ASPECT_OPTIONS,
  GRAPHICS_OPTIONS,
  PROFILE_AVATARS,
  PROFILE_FRAMES,
  PROFILE_TAGS,
  RESOLUTION_OPTIONS,
  SCALING_OPTIONS,
  WEAPON_HAND_OPTIONS,
} from "./options.js";

export function SettingsClient() {
  const router = useRouter();
  const client = useMemo(() => new BrowserApiClient(), []);
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [trainer, setTrainer] = useState<TrainerSettings | null>(null);
  const [crosshair, setCrosshair] = useState<CrosshairConfig>(
    CROSSHAIR_PRESETS[0]!.config,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const session = await client.getSession();
      if (!active) return;
      if (!session?.user) {
        router.replace("/login?next=/app/settings");
        return;
      }

      const [profileResult, settingsResult] = await Promise.all([
        client.getProfileSettings(),
        client.getTrainerSettings(),
      ]);
      if (!active) return;

      if (!profileResult.ok || !profileResult.data) {
        setError(profileResult.error ?? "Could not load profile settings.");
        return;
      }
      if (!settingsResult.ok || !settingsResult.data) {
        setError(settingsResult.error ?? "Could not load trainer settings.");
        return;
      }

      setProfile(ProfileSettingsSchema.parse(profileResult.data));
      const parsedSettings = TrainerSettingsSchema.parse(settingsResult.data);
      setTrainer(parsedSettings);
      if (parsedSettings.crosshairCode) {
        try {
          setCrosshair(decodeCrosshairShareCode(parsedSettings.crosshairCode));
        } catch {
          setError(
            "Saved crosshair code is invalid. Choose a preset and save again.",
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [client, router]);

  const updateTrainer = <K extends keyof TrainerSettings>(
    key: K,
    value: TrainerSettings[K],
  ) => {
    setTrainer((current) => (current ? { ...current, [key]: value } : current));
  };

  const fmsSensitivity = Number(trainer?.fmsSensitivity ?? "1");

  const handleFindMySensiSensitivityChange = (rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) return;
    updateTrainer("fmsSensitivity", String(value));
  };

  let calcCmPer360 = "N/A";
  try {
    const effDpi = trainer?.nominalDpi ?? 800;
    if (fmsSensitivity > 0 && effDpi > 0) {
      calcCmPer360 = `${sensitivityToCmPer360("aimlab-default", fmsSensitivity, effDpi).toFixed(1)} cm / 360°`;
    }
  } catch {
    // ignore
  }

  const saveAll = async () => {
    if (!profile || !trainer) return;
    setSaving(true);
    setError(null);
    setStatus(null);

    let crosshairCode: string;
    try {
      crosshairCode = encodeCrosshairShareCode(crosshair);
    } catch {
      setError("Crosshair is invalid. Choose a preset and try again.");
      setSaving(false);
      return;
    }

    const parsedProfile = ProfileSettingsSchema.safeParse(profile);
    const parsedTrainer = TrainerSettingsSchema.safeParse({
      ...trainer,
      crosshairCode,
    });
    if (!parsedProfile.success) {
      setError("One or more profile settings are invalid.");
      setSaving(false);
      return;
    }
    if (!parsedTrainer.success) {
      setError(describeTrainerSettingsError(parsedTrainer.error));
      setSaving(false);
      return;
    }

    const profileResult = await client.saveProfileSettings(parsedProfile.data);
    if (!profileResult.ok || !profileResult.data) {
      setError(profileResult.error ?? "Could not save profile settings.");
      setSaving(false);
      return;
    }

    const settingsResult = await client.saveTrainerSettings(parsedTrainer.data);
    if (!settingsResult.ok || !settingsResult.data) {
      setError(settingsResult.error ?? "Could not save trainer settings.");
      setSaving(false);
      return;
    }

    setProfile(profileResult.data);
    setTrainer(TrainerSettingsSchema.parse(settingsResult.data));
    setStatus("Settings saved.");
    setSaving(false);
  };

  if (error && (!profile || !trainer)) {
    return (
      <main className="app-shell">
        <div role="alert" className="app-alert" style={{ margin: 0 }}>
          {error}
        </div>
      </main>
    );
  }

  if (!profile || !trainer) {
    return (
      <main className="app-shell">
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Loading settings…
        </p>
      </main>
    );
  }

  return (
    <main className="app-page">
      <div className="app-page-inner">
        <header className="app-page-header">
          <div>
            <Link href="/app" className="app-link" style={{ fontSize: 13 }}>
              ← Trainer Home
            </Link>
            <h1
              className="app-section-title"
              style={{ marginTop: 8, marginBottom: 0 }}
            >
              Settings
            </h1>
          </div>
          <button
            onClick={saveAll}
            disabled={saving}
            className="app-button"
            style={{ width: "auto", padding: "0 26px" }}
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </header>

        {error ? (
          <div role="alert" className="app-alert">
            {error}
          </div>
        ) : null}
        {status ? (
          <div
            role="status"
            className="app-alert"
            style={{
              borderColor: "rgba(189,255,45,0.35)",
              borderLeftColor: "var(--fms-acid)",
              background: "rgba(189,255,45,0.07)",
            }}
          >
            {status}
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SettingsSection
            title="Profile"
            description="Choose your public name, picture, frame, and gamer tag. Cover photos are reserved for a later release."
          >
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Username">
                <input
                  value={profile.username}
                  onChange={(e) =>
                    setProfile({ ...profile, username: e.target.value })
                  }
                  className={inputClass}
                  minLength={3}
                  maxLength={24}
                />
              </Field>
              <Field label="Profile picture">
                <select
                  value={profile.avatarId}
                  onChange={(e) =>
                    setProfile({ ...profile, avatarId: e.target.value })
                  }
                  className={inputClass}
                >
                  {PROFILE_AVATARS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Profile frame">
                <select
                  value={profile.frameId}
                  onChange={(e) =>
                    setProfile({ ...profile, frameId: e.target.value })
                  }
                  className={inputClass}
                >
                  {PROFILE_FRAMES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Gamer tag">
                <select
                  value={profile.tagId}
                  onChange={(e) =>
                    setProfile({ ...profile, tagId: e.target.value })
                  }
                  className={inputClass}
                >
                  {PROFILE_TAGS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Aim & Sensitivity"
            description="One Aim Sensitivity controls every training game. It uses the Aimlabs Default numeric scale."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="settings-panel" style={{ margin: 0 }}>
                <div
                  style={{
                    display: "grid",
                    gap: 16,
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
                  }}
                >
                  <Field label="Mouse DPI (reference only)">
                    <input
                      aria-label="Mouse DPI"
                      value={trainer.nominalDpi ?? ""}
                      onChange={(e) =>
                        updateTrainer(
                          "nominalDpi",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      type="number"
                      min={100}
                      max={100000}
                      className={inputClass}
                      placeholder="e.g. 800"
                    />
                  </Field>
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
                      htmlFor="fms-sensitivity-number"
                      className="settings-label"
                      style={{ margin: 0 }}
                    >
                      Aim Sensitivity (Aimlabs Default)
                    </label>
                    <input
                      id="fms-sensitivity-number"
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
                    Saved once and applied to Gridshot and every other training
                    game. FOV and game mode never change mouse rotation.
                  </p>
                  <Link
                    href="/tools/converter"
                    className="app-link"
                    style={{ display: "inline-block", marginTop: 10 }}
                  >
                    Convert your game sensitivity
                  </Link>
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
                      {calcCmPer360}
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
                  In Aimlabs, use this same number only with the Aimlabs Default
                  profile. Its Valorant profile expects your original Valorant
                  sensitivity instead.
                </p>
              </div>

              <div className="settings-panel" style={{ margin: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span className="settings-label" style={{ margin: 0 }}>
                    Training Field of View (FOV)
                  </span>
                  <span
                    style={{
                      padding: "6px 12px",
                      border: "1px solid rgba(189,255,45,0.4)",
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: "var(--fms-acid)",
                    }}
                  >
                    {trainer.fovDegrees}°
                  </span>
                </div>
                <div style={{ marginTop: 14 }}>
                  <input
                    type="range"
                    min={80}
                    max={120}
                    step={1}
                    value={trainer.fovDegrees}
                    onChange={(e) =>
                      updateTrainer("fovDegrees", Number(e.target.value))
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
                    <span>103° (Valorant)</span>
                    <span>120°</span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => updateTrainer("fovDegrees", 103)}
                    className={`settings-chip${trainer.fovDegrees === 103 ? " settings-chip-active" : ""}`}
                  >
                    Valorant (103°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTrainer("fovDegrees", 106)}
                    className={`settings-chip${trainer.fovDegrees === 106 ? " settings-chip-active" : ""}`}
                  >
                    CS2 / Source (106°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTrainer("fovDegrees", 90)}
                    className={`settings-chip${trainer.fovDegrees === 90 ? " settings-chip-active" : ""}`}
                  >
                    Apex / Source (90°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTrainer("fovDegrees", 120)}
                    className={`settings-chip${trainer.fovDegrees === 120 ? " settings-chip-active" : ""}`}
                  >
                    COD / Warzone (120°)
                  </button>
                </div>
              </div>

              {/* Targets Appearance */}
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Target color">
                  <input
                    value={normalizeHexColor(trainer.targetColor)}
                    onChange={(e) =>
                      updateTrainer(
                        "targetColor",
                        normalizeHexColor(e.target.value),
                      )
                    }
                    type="color"
                    style={{
                      height: 44,
                      width: "100%",
                      border: "1px solid var(--fms-line-dark)",
                      background: "black",
                      padding: 4,
                    }}
                  />
                </Field>
                <Field
                  label={`Target opacity (${Math.round(trainer.targetOpacity * 100)}%)`}
                >
                  <input
                    value={trainer.targetOpacity}
                    onChange={(e) =>
                      updateTrainer("targetOpacity", Number(e.target.value))
                    }
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    className="accent-acid"
                    style={{ width: "100%" }}
                  />
                </Field>
                <Field label="Target outline">
                  <label
                    style={{
                      display: "flex",
                      height: 44,
                      alignItems: "center",
                      gap: 12,
                      border: "1px solid var(--fms-line-dark)",
                      background: "rgba(255,255,255,0.04)",
                      padding: "0 12px",
                    }}
                  >
                    <input
                      checked={trainer.targetOutline}
                      onChange={(e) =>
                        updateTrainer("targetOutline", e.target.checked)
                      }
                      type="checkbox"
                      className="accent-acid"
                    />
                    <span
                      style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}
                    >
                      Enabled
                    </span>
                  </label>
                </Field>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Crosshair"
            description="Crosshair is presentation-only and can be customized or shared with a versioned code."
          >
            <InteractiveCrosshairEditor
              crosshair={crosshair}
              onChange={setCrosshair}
            />
          </SettingsSection>

          <SettingsSection
            title="Video"
            description="Rendering choices never change authoritative target geometry, scoring or sensitivity."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <SelectField
                label="Graphics"
                value={trainer.graphicsPreset}
                options={GRAPHICS_OPTIONS}
                onChange={(value) =>
                  updateTrainer(
                    "graphicsPreset",
                    value as TrainerSettings["graphicsPreset"],
                  )
                }
              />
              <SelectField
                label="Weapon hand"
                value={trainer.weaponHand}
                options={WEAPON_HAND_OPTIONS}
                onChange={(value) =>
                  updateTrainer(
                    "weaponHand",
                    value as TrainerSettings["weaponHand"],
                  )
                }
              />
              <SelectField
                label="Resolution"
                value={trainer.resolution}
                options={RESOLUTION_OPTIONS}
                onChange={(value) =>
                  updateTrainer(
                    "resolution",
                    value as TrainerSettings["resolution"],
                  )
                }
              />
              <SelectField
                label="Aspect ratio"
                value={trainer.aspectRatio}
                options={ASPECT_OPTIONS}
                onChange={(value) =>
                  updateTrainer(
                    "aspectRatio",
                    value as TrainerSettings["aspectRatio"],
                  )
                }
              />
              <SelectField
                label="Scaling"
                value={trainer.scalingMode}
                options={SCALING_OPTIONS}
                onChange={(value) =>
                  updateTrainer(
                    "scalingMode",
                    value as TrainerSettings["scalingMode"],
                  )
                }
              />
              {trainer.resolution === "custom" ? (
                <>
                  <Field label="Custom width">
                    <input
                      type="number"
                      min={640}
                      max={7680}
                      value={trainer.customResolutionWidth ?? ""}
                      onChange={(e) =>
                        updateTrainer(
                          "customResolutionWidth",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Custom height">
                    <input
                      type="number"
                      min={480}
                      max={4320}
                      value={trainer.customResolutionHeight ?? ""}
                      onChange={(e) =>
                        updateTrainer(
                          "customResolutionHeight",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </>
              ) : null}
            </div>
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}

const inputClass = "app-input";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-panel" style={{ margin: 0 }}>
      <h2>{title}</h2>
      <p style={{ marginBottom: 20 }}>{description}</p>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="app-field" style={{ display: "block" }}>
      <span className="settings-label">{label}</span>
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}
