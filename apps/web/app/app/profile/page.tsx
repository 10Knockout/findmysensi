"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { ProfileSettings, SessionUser } from "@findmysensi/protocol";
import {
  ACHIEVEMENT_DEFINITIONS,
  AVATAR_OPTIONS,
  bestAccuracyFromHistory,
  frameForAccuracy,
  titleForAccuracy,
  type LifetimeStats,
} from "@findmysensi/trainer-runtime";
import { localPracticeHistory } from "../../../src/features/training/local-history.js";
import { localAchievements } from "../../../src/features/training/local-achievements.js";
import {
  getSelectedAvatarId,
  setSelectedAvatarId,
} from "../../../src/features/training/local-avatar.js";

const ZERO_LIFETIME: LifetimeStats = {
  totalSessions: 0,
  totalShots: 0,
  totalPracticeSeconds: 0,
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [avatarId, setAvatarId] = useState(AVATAR_OPTIONS[0]!.id);
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [lifetime, setLifetime] = useState<LifetimeStats>(ZERO_LIFETIME);
  const [unlocked, setUnlocked] = useState<ReadonlySet<string>>(new Set());
  const [remoteProfile, setRemoteProfile] = useState<ProfileSettings | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    const client = new BrowserApiClient();
    client
      .getSession()
      .then((session) => {
        if (!active) return;
        if (!session?.user) {
          router.replace("/login?next=/app/profile");
          return;
        }
        setUser(session.user);

        // Cross-device avatar sync: the account is the source of truth once
        // authenticated. A failed/empty fetch just means we stay on the
        // local-device selection -- never fabricated, never blocking.
        return client.getProfileSettings();
      })
      .then((res) => {
        if (!active || !res) return;
        if (res.ok && res.data) {
          setRemoteProfile(res.data);
          setAvatarId(res.data.avatarId);
          setSelectedAvatarId(res.data.avatarId);
        }
      })
      .catch(() => {
        if (active) setError("Could not load your session.");
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    // Local-only, per-device data from real practice history.
    const history = localPracticeHistory.getAll();
    const lifetimeStats = localPracticeHistory.getLifetimeStats();
    setBestAccuracy(bestAccuracyFromHistory(history));
    setLifetime(lifetimeStats);
    localAchievements.sync(history, lifetimeStats);
    setUnlocked(localAchievements.getUnlocked());
    setAvatarId(getSelectedAvatarId());
  }, []);

  const selectAvatar = (id: string) => {
    // Update the local device immediately -- instant feedback, and the
    // fallback of record if the account sync below can't complete.
    setSelectedAvatarId(id);
    setAvatarId(id);

    if (!user?.username) return; // No valid username yet: stay local-only.
    const client = new BrowserApiClient();
    const nextProfile: ProfileSettings = {
      username: user.username,
      avatarId: id,
      frameId: remoteProfile?.frameId ?? "frame-none",
    };
    client
      .saveProfileSettings(nextProfile)
      .then((res) => {
        if (res.ok && res.data) setRemoteProfile(res.data);
      })
      .catch(() => {
        // Best-effort cross-device sync; the local selection above already
        // took effect, so a failed sync here doesn't block the user.
      });
  };

  if (error) {
    return (
      <main className="app-shell">
        <div role="alert" className="app-alert" style={{ margin: 0 }}>
          {error}
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell">
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Checking your session…
        </p>
      </main>
    );
  }

  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === avatarId) ?? AVATAR_OPTIONS[0]!;
  const frame = frameForAccuracy(bestAccuracy);
  const title = titleForAccuracy(bestAccuracy);

  return (
    <main className="app-page">
      <div className="app-page-inner" style={{ maxWidth: 900 }}>
        <Link href="/app" className="app-link" style={{ fontSize: 13 }}>
          ← Trainer Home
        </Link>

        <header className="app-avatar-header">
          <div
            className="app-avatar-ring"
            style={{
              backgroundColor: `${avatar.colorHex}22`,
              border: `3px solid ${frame.colorHex}`,
              color: avatar.colorHex,
            }}
          >
            {avatar.glyph}
          </div>
          <div>
            <h1 className="app-section-title" style={{ marginBottom: 4 }}>
              {user.username ?? user.email}
            </h1>
            <p
              style={{
                fontFamily: "var(--font-turret-road), monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: frame.colorHex,
              }}
            >
              {title}
            </p>
          </div>
        </header>

        <section style={{ marginBottom: 40 }}>
          <p className="app-section-label">Avatar</p>
          <h2 className="app-section-title" style={{ fontSize: 22 }}>
            Choose Your Look
          </h2>
          <div className="app-avatar-grid">
            {AVATAR_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => selectAvatar(option.id)}
                aria-pressed={option.id === avatarId}
                className={`app-avatar-swatch${option.id === avatarId ? " app-avatar-swatch-active" : ""}`}
                style={{ color: option.colorHex }}
                title={option.label}
              >
                {option.glyph}
              </button>
            ))}
          </div>
        </section>

        <section className="app-stat-grid">
          <div className="app-stat-card">
            <b>Sessions</b>
            <strong>{lifetime.totalSessions}</strong>
          </div>
          <div className="app-stat-card">
            <b>Shots Fired</b>
            <strong>{lifetime.totalShots}</strong>
          </div>
          <div className="app-stat-card">
            <b>Practice Time</b>
            <strong>{Math.floor(lifetime.totalPracticeSeconds / 60)}m</strong>
          </div>
        </section>

        <section style={{ marginTop: 36 }}>
          <p className="app-section-label">Achievements</p>
          <h2 className="app-section-title" style={{ fontSize: 22 }}>
            {unlocked.size} / {ACHIEVEMENT_DEFINITIONS.length} Unlocked
          </h2>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))",
            }}
          >
            {ACHIEVEMENT_DEFINITIONS.map((achievement) => {
              const isUnlocked = unlocked.has(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={`app-achievement-card${isUnlocked ? " app-achievement-card-unlocked" : " app-achievement-card-locked"}`}
                >
                  <b>{achievement.name}</b>
                  <p>{achievement.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
