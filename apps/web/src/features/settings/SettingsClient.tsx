"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import {
  ProfileSettingsSchema,
  TrainerSettingsSchema,
  type ProfileSettings,
  type TrainerSettings,
} from "@findmysensi/protocol";
import {
  CROSSHAIR_PRESETS,
  decodeCrosshairShareCode,
  encodeCrosshairShareCode,
  type CrosshairConfig,
} from "@findmysensi/crosshair";
import {
  fmsToGameSensitivity,
  sensitivityToCmPer360,
} from "@findmysensi/sensitivity";
import { InteractiveCrosshairEditor } from "../crosshair/InteractiveCrosshairEditor.js";
import {
  ASPECT_OPTIONS,
  GRAPHICS_OPTIONS,
  PROFILE_AVATARS,
  PROFILE_FRAMES,
  RESOLUTION_OPTIONS,
  SCALING_OPTIONS,
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

  const aimlabsSensitivity = Number(trainer?.fmsSensitivity ?? "1");

  const handleAimlabsSensitivityChange = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    updateTrainer("fmsSensitivity", String(value));
  };

  let calcCmPer360 = "N/A";
  let calcEdpi = "N/A";
  let valorantEquivalent = "N/A";
  try {
    const effDpi = trainer?.nominalDpi ?? 800;
    if (aimlabsSensitivity > 0 && effDpi > 0) {
      calcCmPer360 = `${sensitivityToCmPer360("aimlab-default", aimlabsSensitivity, effDpi).toFixed(1)} cm / 360°`;
      calcEdpi = `${(aimlabsSensitivity * effDpi).toFixed(0)}`;
      valorantEquivalent = fmsToGameSensitivity(
        "valorant",
        trainer?.fmsSensitivity ?? "1",
      ).toFixed(3);
    }
  } catch {
    // ignore
  }

  const saveAll = async () => {
    if (!profile || !trainer) return;
    setSaving(true);
    setError(null);
    setStatus(null);

    const parsedProfile = ProfileSettingsSchema.safeParse(profile);
    const parsedTrainer = TrainerSettingsSchema.safeParse({
      ...trainer,
      crosshairCode: encodeCrosshairShareCode(crosshair),
    });
    if (!parsedProfile.success || !parsedTrainer.success) {
      setError("One or more settings are invalid.");
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
    setTrainer(settingsResult.data);
    setStatus("Settings saved.");
    setSaving(false);
  };

  if (error && (!profile || !trainer)) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-zinc-100">
        <div
          role="alert"
          className="max-w-lg rounded-xl border border-red-900 bg-red-950/30 p-5 text-red-200"
        >
          {error}
        </div>
      </main>
    );
  }

  if (!profile || !trainer) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-300">
        <p className="font-mono text-sm">Loading settings…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/app"
              className="text-sm font-semibold text-emerald-400 hover:underline"
            >
              ← Trainer Home
            </Link>
            <h1 className="mt-2 text-3xl font-black text-white">Settings</h1>
          </div>
          <button
            onClick={saveAll}
            disabled={saving}
            className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-zinc-950 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </header>

        {error ? (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-200"
          >
            {error}
          </div>
        ) : null}
        {status ? (
          <div
            role="status"
            className="mb-5 rounded-lg border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200"
          >
            {status}
          </div>
        ) : null}

        <div className="space-y-6">
          <SettingsSection
            title="Profile"
            description="Your account identity. More avatar and frame rewards can be added later without allowing arbitrary uploads."
          >
            <div className="grid gap-4 md:grid-cols-3">
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
            </div>
          </SettingsSection>

          <SettingsSection
            title="Aim & Sensitivity"
            description="Gridshot uses the Aimlabs sensitivity scale directly. FOV adjusts camera angle without altering physical sensitivity."
          >
            <div className="space-y-6">
              {/* Aimlabs-native Mouse Sensitivity */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sensitivity Scale">
                    <div className={`${inputClass} text-cyan-300`}>
                      Aimlabs (native)
                    </div>
                  </Field>
                  <Field label="Mouse DPI">
                    <input
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

                {/* Aimlabs Sensitivity Slider */}
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">
                      Aimlabs Sensitivity
                    </span>
                    <input
                      type="number"
                      min={0.005}
                      max={10.0}
                      step={0.005}
                      value={aimlabsSensitivity}
                      onChange={(e) =>
                        handleAimlabsSensitivityChange(Number(e.target.value))
                      }
                      className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-right font-mono text-sm text-cyan-400 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min={0.005}
                    max={2}
                    step={0.005}
                    value={Math.min(aimlabsSensitivity, 2)}
                    onChange={(e) =>
                      handleAimlabsSensitivityChange(Number(e.target.value))
                    }
                    className="w-full accent-cyan-400"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                    The value is applied directly with no game-profile
                    conversion. At the same DPI, Valorant{" "}
                    <span className="font-mono text-zinc-300">0.125</span> is
                    Aimlabs{" "}
                    <span className="font-mono text-zinc-300">0.175</span>.
                  </p>
                </div>

                {/* Physical Turn Metrics */}
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-zinc-800 bg-black/50 p-3 text-center">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      Turn Distance
                    </span>
                    <span className="font-mono text-sm font-bold text-cyan-300">
                      {calcCmPer360}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      eDPI
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      {calcEdpi}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      Valorant Equivalent
                    </span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {valorantEquivalent}
                    </span>
                    <span className="mt-0.5 block text-[9px] text-zinc-600">
                      same DPI / cm per 360
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                  <p className="text-center text-[10px] leading-relaxed text-zinc-500">
                    Use the same numeric value as Aimlabs Default. Confirm
                    physical parity with repeated 180° or 360° sweeps before
                    changing the value by feel.
                  </p>
                </div>
              </div>

              {/* Training FOV Slider with Game Presets */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">
                    Training Field of View (FOV)
                  </span>
                  <span className="rounded-md border border-cyan-500/40 bg-cyan-950/40 px-3 py-1 font-mono text-sm font-bold text-cyan-300">
                    {trainer.fovDegrees}°
                  </span>
                </div>
                <div className="mt-3">
                  <input
                    type="range"
                    min={80}
                    max={120}
                    step={1}
                    value={trainer.fovDegrees}
                    onChange={(e) =>
                      updateTrainer("fovDegrees", Number(e.target.value))
                    }
                    className="w-full accent-cyan-400"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
                    <span>80°</span>
                    <span>103° (Valorant)</span>
                    <span>120°</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateTrainer("fovDegrees", 103)}
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                      trainer.fovDegrees === 103
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    Valorant (103°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTrainer("fovDegrees", 106)}
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                      trainer.fovDegrees === 106
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    CS2 / Source (106°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTrainer("fovDegrees", 90)}
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                      trainer.fovDegrees === 90
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    Apex / Source (90°)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTrainer("fovDegrees", 120)}
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                      trainer.fovDegrees === 120
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    COD / Warzone (120°)
                  </button>
                </div>
              </div>

              {/* Targets Appearance */}
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Target color">
                  <input
                    value={trainer.targetColor}
                    onChange={(e) =>
                      updateTrainer("targetColor", e.target.value)
                    }
                    type="color"
                    className="h-11 w-full rounded-lg border border-zinc-700 bg-black p-1"
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
                    className="w-full accent-emerald-400"
                  />
                </Field>
                <Field label="Target outline">
                  <label className="flex h-11 items-center gap-3 rounded-lg border border-zinc-700 bg-black/50 px-3">
                    <input
                      checked={trainer.targetOutline}
                      onChange={(e) =>
                        updateTrainer("targetOutline", e.target.checked)
                      }
                      type="checkbox"
                      className="accent-emerald-400"
                    />
                    <span className="text-sm text-zinc-300">Enabled</span>
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

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-700 bg-black/50 px-3 text-sm text-white outline-none focus:border-emerald-400";

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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-zinc-500">{description}</p>
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
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
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
