"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { ProfileSettings, SessionUser } from "@findmysensi/protocol";
import {
  ACHIEVEMENT_DEFINITIONS,
  AVATAR_OPTIONS,
  GAMER_TAG_OPTIONS,
  PROFILE_FRAME_OPTIONS,
  bestAccuracyFromHistory,
  gamerTagLabel,
  titleForAccuracy,
  type LifetimeStats,
} from "@findmysensi/trainer-runtime";
import { PlayerAvatar } from "../../../src/features/profile/PlayerAvatar.js";
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
  const [frameId, setFrameId] = useState("frame-none");
  const [tagId, setTagId] = useState("tag-none");
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [lifetime, setLifetime] = useState<LifetimeStats>(ZERO_LIFETIME);
  const [unlocked, setUnlocked] = useState<ReadonlySet<string>>(new Set());
  const [remoteProfile, setRemoteProfile] = useState<ProfileSettings | null>(
    null,
  );
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

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
          const nextAvatarId = AVATAR_OPTIONS.some(
            (option) => option.id === res.data!.avatarId,
          )
            ? res.data.avatarId
            : AVATAR_OPTIONS[0]!.id;
          const nextFrameId = PROFILE_FRAME_OPTIONS.some(
            (option) => option.id === res.data!.frameId,
          )
            ? res.data.frameId
            : "frame-none";
          const nextTagId = GAMER_TAG_OPTIONS.some(
            (option) => option.id === res.data!.tagId,
          )
            ? res.data.tagId
            : "tag-none";
          setAvatarId(nextAvatarId);
          setFrameId(nextFrameId);
          setTagId(nextTagId);
          setSelectedAvatarId(nextAvatarId);
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
    setProfileStatus(null);
  };

  const saveProfile = async () => {
    if (!user?.username) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileStatus(null);
    const client = new BrowserApiClient();
    const nextProfile: ProfileSettings = {
      username: user.username,
      avatarId,
      frameId,
      tagId,
    };
    const result = await client.saveProfileSettings(nextProfile);
    if (!result.ok || !result.data) {
      setProfileError(result.error ?? "Could not save profile choices.");
      setSavingProfile(false);
      return;
    }
    setRemoteProfile(result.data);
    setProfileStatus("Profile choices saved.");
    setSavingProfile(false);
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

  const title = titleForAccuracy(bestAccuracy);
  const selectedTag = gamerTagLabel(tagId);
  const profileChanged =
    !remoteProfile ||
    remoteProfile.avatarId !== avatarId ||
    remoteProfile.frameId !== frameId ||
    remoteProfile.tagId !== tagId;

  return (
    <main className="app-page">
      <div className="app-page-inner" style={{ maxWidth: 900 }}>
        <Link href="/app" className="app-link" style={{ fontSize: 13 }}>
          ← Trainer Home
        </Link>

        <header className="app-avatar-header">
          <PlayerAvatar
            avatarId={avatarId}
            frameId={frameId}
            label={user.username ?? user.email}
            size={88}
            priority
          />
          <div>
            <h1 className="app-section-title" style={{ marginBottom: 4 }}>
              {user.username ?? user.email}
            </h1>
            <p className="app-profile-rank">{title}</p>
            {selectedTag ? (
              <p className="app-profile-tag">{selectedTag}</p>
            ) : null}
          </div>
        </header>

        {profileError ? (
          <div role="alert" className="app-alert">
            {profileError}
          </div>
        ) : null}
        {profileStatus ? (
          <div role="status" className="app-profile-status">
            {profileStatus}
          </div>
        ) : null}

        <section style={{ marginBottom: 40 }}>
          <p className="app-section-label">Avatar</p>
          <h2 className="app-section-title app-profile-subheading">
            Choose Your Picture
          </h2>
          <div className="app-avatar-grid">
            {AVATAR_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => selectAvatar(option.id)}
                aria-pressed={option.id === avatarId}
                className={`app-avatar-swatch${option.id === avatarId ? " app-avatar-swatch-active" : ""}`}
                title={option.label}
              >
                <PlayerAvatar
                  avatarId={option.id}
                  label={option.label}
                  size={56}
                />
              </button>
            ))}
          </div>
        </section>

        <section className="app-profile-section">
          <p className="app-section-label">Frame</p>
          <h2 className="app-section-title app-profile-subheading">
            Choose Your Frame
          </h2>
          <div className="app-avatar-grid">
            {PROFILE_FRAME_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setFrameId(option.id);
                  setProfileStatus(null);
                }}
                aria-pressed={option.id === frameId}
                className={`app-avatar-swatch${option.id === frameId ? " app-avatar-swatch-active" : ""}`}
                title={option.label}
              >
                <PlayerAvatar
                  avatarId={avatarId}
                  frameId={option.id}
                  label={option.label}
                  size={56}
                />
              </button>
            ))}
          </div>
        </section>

        <section className="app-profile-section">
          <p className="app-section-label">Gamer tag</p>
          <h2 className="app-section-title app-profile-subheading">
            Choose Your Tag
          </h2>
          <div className="app-tag-grid">
            {GAMER_TAG_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setTagId(option.id);
                  setProfileStatus(null);
                }}
                aria-pressed={option.id === tagId}
                className={`app-tag-option${option.id === tagId ? " app-tag-option-active" : ""}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section
          className="app-profile-cover-locked"
          aria-label="Cover photo locked"
        >
          <div>
            <p className="app-section-label">Cover photo</p>
            <h2 className="app-section-title app-profile-subheading">Locked</h2>
          </div>
          <p>Cover photos will arrive in a later release.</p>
        </section>

        <button
          type="button"
          className="app-button app-profile-save"
          disabled={!profileChanged || savingProfile}
          onClick={() => void saveProfile()}
        >
          {savingProfile
            ? "Saving…"
            : profileChanged
              ? "Save profile"
              : "Profile saved"}
        </button>

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
