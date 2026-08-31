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
  ASPECT_OPTIONS,
  GRAPHICS_OPTIONS,
  INPUT_PROCESSING_OPTIONS,
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
  const [crosshairImport, setCrosshairImport] = useState("");
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
          setError("Saved crosshair code is invalid. Choose a preset and save again.");
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

  const importCrosshair = () => {
    setError(null);
    try {
      setCrosshair(decodeCrosshairShareCode(crosshairImport.trim()));
      setCrosshairImport("");
      setStatus("Crosshair code imported. Save settings to persist it.");
    } catch {
      setError("Invalid crosshair share code.");
    }
  };

  const copyCrosshair = async () => {
    try {
      await navigator.clipboard.writeText(encodeCrosshairShareCode(crosshair));
      setStatus("Crosshair code copied.");
    } catch {
      setError("Could not copy crosshair code.");
    }
  };

  if (error && (!profile || !trainer)) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-zinc-100">
        <div role="alert" className="max-w-lg rounded-xl border border-red-900 bg-red-950/30 p-5 text-red-200">
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

  const shareCode = encodeCrosshairShareCode(crosshair);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/app" className="text-sm font-semibold text-emerald-400 hover:underline">← Trainer Home</Link>
            <h1 className="mt-2 text-3xl font-black text-white">Settings</h1>
          </div>
          <button onClick={saveAll} disabled={saving} className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-zinc-950 disabled:opacity-50">
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </header>

        {error ? <div role="alert" className="mb-5 rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">{error}</div> : null}
        {status ? <div role="status" className="mb-5 rounded-lg border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">{status}</div> : null}

        <div className="space-y-6">
          <SettingsSection title="Profile" description="Your account identity. More avatar and frame rewards can be added later without allowing arbitrary uploads.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Username">
                <input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} className={inputClass} minLength={3} maxLength={24} />
              </Field>
              <Field label="Profile picture">
                <select value={profile.avatarId} onChange={(e) => setProfile({ ...profile, avatarId: e.target.value })} className={inputClass}>
                  {PROFILE_AVATARS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="Profile frame">
                <select value={profile.frameId} onChange={(e) => setProfile({ ...profile, frameId: e.target.value })} className={inputClass}>
                  {PROFILE_FRAMES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection title="Aim" description="FOV changes camera presentation. It does not silently rewrite physical sensitivity. Target geometry and scoring are not user-editable settings.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="FindMySensi sensitivity">
                <input value={trainer.fmsSensitivity ?? ""} onChange={(e) => updateTrainer("fmsSensitivity", e.target.value.trim() === "" ? null : e.target.value)} inputMode="decimal" className={inputClass} placeholder="Not set" />
              </Field>
              <Field label="DPI (optional)">
                <input value={trainer.nominalDpi ?? ""} onChange={(e) => updateTrainer("nominalDpi", e.target.value === "" ? null : Number(e.target.value))} type="number" min={1} max={100000} className={inputClass} placeholder="Unknown is OK" />
              </Field>
              <Field label="Training FOV">
                <input value={trainer.fovDegrees} onChange={(e) => updateTrainer("fovDegrees", Number(e.target.value))} type="number" min={40} max={140} step={0.1} className={inputClass} />
              </Field>
              <Field label="Target color">
                <input value={trainer.targetColor} onChange={(e) => updateTrainer("targetColor", e.target.value)} type="color" className="h-11 w-full rounded-lg border border-zinc-700 bg-black p-1" />
              </Field>
              <Field label={`Target opacity (${Math.round(trainer.targetOpacity * 100)}%)`}>
                <input value={trainer.targetOpacity} onChange={(e) => updateTrainer("targetOpacity", Number(e.target.value))} type="range" min={0.2} max={1} step={0.05} className="w-full accent-emerald-400" />
              </Field>
              <Field label="Target outline">
                <label className="flex h-11 items-center gap-3 rounded-lg border border-zinc-700 bg-black/50 px-3">
                  <input checked={trainer.targetOutline} onChange={(e) => updateTrainer("targetOutline", e.target.checked)} type="checkbox" className="accent-emerald-400" />
                  <span className="text-sm text-zinc-300">Enabled</span>
                </label>
              </Field>
            </div>
            <p className="mt-4 text-xs text-zinc-500">Target shape is always circular. Size, hitbox, movement, spawn rules and points-per-hit are scenario rules and cannot be changed here.</p>
          </SettingsSection>

          <SettingsSection title="Crosshair" description="Crosshair is presentation-only and can be shared with a versioned code.">
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-black">
                <CrosshairPreview config={crosshair} />
              </div>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Preset">
                    <select onChange={(e) => {
                      const preset = CROSSHAIR_PRESETS.find((item) => item.id === e.target.value);
                      if (preset) setCrosshair(preset.config);
                    }} className={inputClass} defaultValue={CROSSHAIR_PRESETS[0]!.id}>
                      {CROSSHAIR_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Color">
                    <input type="color" value={crosshair.color} onChange={(e) => setCrosshair({ ...crosshair, color: e.target.value })} className="h-11 w-full rounded-lg border border-zinc-700 bg-black p-1" />
                  </Field>
                  <Field label={`Size (${crosshair.size})`}>
                    <input type="range" min={1} max={25} value={crosshair.size} onChange={(e) => setCrosshair({ ...crosshair, size: Number(e.target.value) })} className="w-full accent-emerald-400" />
                  </Field>
                  <Field label={`Thickness (${crosshair.thickness})`}>
                    <input type="range" min={1} max={10} value={crosshair.thickness} onChange={(e) => setCrosshair({ ...crosshair, thickness: Number(e.target.value) })} className="w-full accent-emerald-400" />
                  </Field>
                  <Field label={`Gap (${crosshair.gap})`}>
                    <input type="range" min={0} max={20} value={crosshair.gap} onChange={(e) => setCrosshair({ ...crosshair, gap: Number(e.target.value) })} className="w-full accent-emerald-400" />
                  </Field>
                  <div className="flex items-end gap-5 pb-2 text-sm text-zinc-300">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={crosshair.dot} onChange={(e) => setCrosshair({ ...crosshair, dot: e.target.checked })} /> Dot</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={crosshair.outline} onChange={(e) => setCrosshair({ ...crosshair, outline: e.target.checked })} /> Outline</label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input readOnly value={shareCode} className={`${inputClass} font-mono text-xs`} />
                  <button type="button" onClick={copyCrosshair} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold hover:bg-zinc-800">Copy</button>
                </div>
                <div className="flex gap-2">
                  <input value={crosshairImport} onChange={(e) => setCrosshairImport(e.target.value)} placeholder="Paste FMS crosshair code" className={`${inputClass} font-mono text-xs`} />
                  <button type="button" onClick={importCrosshair} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold hover:bg-zinc-800">Import</button>
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Video" description="Rendering choices never change authoritative target geometry, scoring or sensitivity.">
            <div className="grid gap-4 md:grid-cols-3">
              <SelectField label="Graphics" value={trainer.graphicsPreset} options={GRAPHICS_OPTIONS} onChange={(value) => updateTrainer("graphicsPreset", value as TrainerSettings["graphicsPreset"])} />
              <SelectField label="Resolution" value={trainer.resolution} options={RESOLUTION_OPTIONS} onChange={(value) => updateTrainer("resolution", value as TrainerSettings["resolution"])} />
              <SelectField label="Aspect ratio" value={trainer.aspectRatio} options={ASPECT_OPTIONS} onChange={(value) => updateTrainer("aspectRatio", value as TrainerSettings["aspectRatio"])} />
              <SelectField label="Scaling" value={trainer.scalingMode} options={SCALING_OPTIONS} onChange={(value) => updateTrainer("scalingMode", value as TrainerSettings["scalingMode"])} />
              {trainer.resolution === "custom" ? (
                <>
                  <Field label="Custom width"><input type="number" min={640} max={7680} value={trainer.customResolutionWidth ?? ""} onChange={(e) => updateTrainer("customResolutionWidth", e.target.value === "" ? null : Number(e.target.value))} className={inputClass} /></Field>
                  <Field label="Custom height"><input type="number" min={480} max={4320} value={trainer.customResolutionHeight ?? ""} onChange={(e) => updateTrainer("customResolutionHeight", e.target.value === "" ? null : Number(e.target.value))} className={inputClass} /></Field>
                </>
              ) : null}
            </div>
          </SettingsSection>

          <SettingsSection title="Input" description="This changes FindMySensi input processing strategy only. It does not change your mouse hardware polling rate.">
            <SelectField label="Input processing" value={trainer.inputProcessing} options={INPUT_PROCESSING_OPTIONS} onChange={(value) => updateTrainer("inputProcessing", value as TrainerSettings["inputProcessing"])} />
            <p className="mt-3 text-xs text-zinc-500">The gameplay input pipeline is designed to preserve very fast movement and click ordering; we do not impose a human reaction-time floor such as 100 ms.</p>
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}

const inputClass = "h-11 w-full rounded-lg border border-zinc-700 bg-black/50 px-3 text-sm text-white outline-none focus:border-emerald-400";

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-zinc-500">{description}</p>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</span>{children}</label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </Field>
  );
}

function CrosshairPreview({ config }: { config: CrosshairConfig }) {
  const bar = (style: React.CSSProperties) => (
    <span className="absolute" style={{ backgroundColor: config.color, ...style }} />
  );
  return (
    <div className="relative" style={{ opacity: config.opacity }}>
      {config.dot ? <span className="absolute rounded-full" style={{ width: config.dotSize * 2, height: config.dotSize * 2, backgroundColor: config.color, transform: "translate(-50%, -50%)" }} /> : null}
      {config.style === "cross" || config.style === "classic" ? (
        <>
          {bar({ width: config.thickness * 2, height: config.size * 2, left: -config.thickness, bottom: config.gap })}
          {bar({ width: config.thickness * 2, height: config.size * 2, left: -config.thickness, top: config.gap })}
          {bar({ width: config.size * 2, height: config.thickness * 2, right: config.gap, top: -config.thickness })}
          {bar({ width: config.size * 2, height: config.thickness * 2, left: config.gap, top: -config.thickness })}
        </>
      ) : null}
      {config.style === "circle" ? <span className="absolute rounded-full" style={{ width: config.size * 4, height: config.size * 4, border: `${config.thickness * 2}px solid ${config.color}`, transform: "translate(-50%, -50%)" }} /> : null}
    </div>
  );
}
