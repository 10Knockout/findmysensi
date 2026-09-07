import {
  LeaderboardResponseV2Schema,
  PracticeRunSubmissionV2Schema,
  PracticeRunSubmissionResponseV2Schema,
} from "@findmysensi/protocol";
import type {
  ForgotPasswordRequest,
  HandshakeRequest,
  HandshakeResponse,
  LeaderboardResponse,
  LeaderboardResponseV2,
  LoginRequest,
  PracticeRunSubmissionResponseV2,
  PracticeRunSubmissionV2,
  ProfileSettings,
  RegisterRequest,
  ResetPasswordRequest,
  SessionResponse,
  SessionUser,
  TrainerSettings,
} from "@findmysensi/protocol";

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export const SESSION_CACHE_STORAGE_KEY = "fms_session_cache_v1";

export interface CachedSessionData {
  session: SessionResponse;
  cachedAt: number;
}

let memoryCachedSession: CachedSessionData | null = null;
let activeSessionPromise: Promise<SessionResponse | null> | null = null;

function isValidCachedSession(
  item: CachedSessionData,
  now: number,
  ttlMs: number,
): boolean {
  if (!item || !item.session || !item.session.user) return false;
  if (item.session.session?.expiresAt) {
    const expiresAt = new Date(item.session.session.expiresAt).getTime();
    if (!isNaN(expiresAt) && expiresAt <= now) {
      return false;
    }
  }
  if (ttlMs > 0 && now - item.cachedAt > ttlMs) {
    return false;
  }
  return true;
}

export function getStoredSession(
  ttlMs: number = 60_000,
): SessionResponse | null {
  const now = Date.now();
  if (
    memoryCachedSession &&
    isValidCachedSession(memoryCachedSession, now, ttlMs)
  ) {
    return memoryCachedSession.session;
  }
  memoryCachedSession = null;
  purgeLegacyPersistedSession();
  return null;
}

export function storeSession(session: SessionResponse | null): void {
  if (!session || !session.user) {
    clearStoredSession();
    return;
  }
  const data: CachedSessionData = {
    session,
    cachedAt: Date.now(),
  };
  memoryCachedSession = data;
  purgeLegacyPersistedSession();
}

export function clearStoredSession(): void {
  memoryCachedSession = null;
  purgeLegacyPersistedSession();
}

function purgeLegacyPersistedSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.removeItem(SESSION_CACHE_STORAGE_KEY);
  } catch {
    // Storage can be blocked by browser privacy settings. Auth remains
    // cookie-backed and the in-memory cache still works for this page load.
  }
}

export interface GetSessionOptions {
  forceRefresh?: boolean;
  ttlMs?: number;
}

export class BrowserApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  private async requestJson<T>(
    path: string,
    init?: RequestInit,
  ): Promise<ApiResult<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        return {
          ok: false,
          status: res.status,
          error:
            body?.message ?? body?.error ?? `Request failed (${res.status}).`,
        };
      }
      return { ok: true, data: (await res.json()) as T };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  }

  async getSession(
    options?: GetSessionOptions,
  ): Promise<SessionResponse | null> {
    const ttlMs = options?.ttlMs ?? 60_000;
    if (!options?.forceRefresh) {
      const cached = getStoredSession(ttlMs);
      if (cached) return cached;
    }

    if (activeSessionPromise) {
      return activeSessionPromise;
    }

    activeSessionPromise = (async () => {
      try {
        const result = await this.requestJson<SessionResponse | null>(
          "/api/auth/get-session",
          {
            method: "GET",
          },
        );

        if (result.ok) {
          const data = result.data;
          if (data && data.user) {
            storeSession(data);
            return data;
          } else {
            clearStoredSession();
            return null;
          }
        }

        if (result.status === 401 || result.status === 403) {
          clearStoredSession();
          return null;
        }

        // A short in-memory fallback smooths over transient 429/5xx/network
        // failures without persisting an authentication credential to disk.
        const fallback = getStoredSession(ttlMs);
        if (fallback) {
          return fallback;
        }

        return null;
      } finally {
        activeSessionPromise = null;
      }
    })();

    return activeSessionPromise;
  }

  async login(data: LoginRequest): Promise<{ ok: boolean; error?: string }> {
    const result = await this.requestJson<{ user?: SessionUser }>(
      "/api/auth/sign-in/email",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );

    if (result.ok && result.data?.user) {
      const sessionPayload: SessionResponse = {
        user: result.data.user,
        session: null,
      };
      storeSession(sessionPayload);
    }

    return { ok: result.ok, ...(result.error ? { error: result.error } : {}) };
  }

  async register(
    data: RegisterRequest,
  ): Promise<{ ok: boolean; error?: string }> {
    const result = await this.requestJson<unknown>("/api/v1/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { ok: result.ok, ...(result.error ? { error: result.error } : {}) };
  }

  async verifyEmailOtp(
    email: string,
    otp: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const result = await this.requestJson<unknown>(
      "/api/auth/email-otp/verify-email",
      {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      },
    );
    return { ok: result.ok, ...(result.error ? { error: result.error } : {}) };
  }

  async resendEmailOtp(
    email: string,
    type: "email-verification" | "forget-password" = "email-verification",
  ): Promise<{ ok: boolean; error?: string }> {
    const result = await this.requestJson<unknown>(
      "/api/auth/email-otp/send-verification-otp",
      {
        method: "POST",
        body: JSON.stringify({ email, type }),
      },
    );
    return { ok: result.ok, ...(result.error ? { error: result.error } : {}) };
  }

  async logout(): Promise<void> {
    clearStoredSession();
    await this.requestJson<unknown>("/api/auth/sign-out", { method: "POST" });
  }

  async forgotPassword(
    data: ForgotPasswordRequest,
  ): Promise<{ ok: boolean; error?: string }> {
    const result = await this.requestJson<unknown>(
      "/api/auth/request-password-reset",
      {
        method: "POST",
        body: JSON.stringify({
          ...data,
          redirectTo:
            typeof window === "undefined"
              ? "/reset-password"
              : `${window.location.origin}/reset-password`,
        }),
      },
    );
    return { ok: result.ok, ...(result.error ? { error: result.error } : {}) };
  }

  async resetPassword(
    data: ResetPasswordRequest,
  ): Promise<{ ok: boolean; error?: string }> {
    const result = await this.requestJson<unknown>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { ok: result.ok, ...(result.error ? { error: result.error } : {}) };
  }

  async getLeaderboard(
    modeId: string,
  ): Promise<ApiResult<LeaderboardResponse>> {
    return this.requestJson<LeaderboardResponse>(
      `/api/v1/leaderboards/${encodeURIComponent(modeId)}`,
      { method: "GET", cache: "no-store" },
    );
  }

  async getLeaderboardV2(
    modeId: string,
    scenarioVersion: number,
    scoringVersion: number,
  ): Promise<ApiResult<LeaderboardResponseV2>> {
    const query = new URLSearchParams({
      scenarioVersion: String(scenarioVersion),
      scoringVersion: String(scoringVersion),
    });
    const result = await this.requestJson<unknown>(
      `/api/v2/leaderboards/${encodeURIComponent(modeId)}?${query.toString()}`,
      { method: "GET", cache: "no-store" },
    );
    if (!result.ok) {
      return {
        ok: false,
        ...(result.error ? { error: result.error } : {}),
      };
    }

    const parsed = LeaderboardResponseV2Schema.safeParse(result.data);
    const expectedBoardId = `${modeId}:scenario-${scenarioVersion}:scoring-${scoringVersion}`;
    if (
      !parsed.success ||
      parsed.data.board.boardId !== expectedBoardId ||
      parsed.data.board.modeId !== modeId ||
      parsed.data.board.scenarioVersion !== scenarioVersion ||
      parsed.data.board.scoringVersion !== scoringVersion
    ) {
      return { ok: false, error: "The leaderboard response was invalid." };
    }
    return { ok: true, data: parsed.data };
  }

  async submitPracticeRunV2(
    run: PracticeRunSubmissionV2,
  ): Promise<ApiResult<PracticeRunSubmissionResponseV2>> {
    const parsedRun = PracticeRunSubmissionV2Schema.safeParse(run);
    if (!parsedRun.success) {
      return { ok: false, error: "The local run record was invalid." };
    }

    const result = await this.requestJson<unknown>("/api/v2/runs", {
      method: "POST",
      body: JSON.stringify(parsedRun.data),
      keepalive: true,
    });
    if (!result.ok) {
      return {
        ok: false,
        ...(result.error ? { error: result.error } : {}),
      };
    }

    const parsed = PracticeRunSubmissionResponseV2Schema.safeParse(result.data);
    const expectedBoardId = `${parsedRun.data.modeId}:scenario-${parsedRun.data.scenarioVersion}:scoring-${parsedRun.data.scoringVersion}`;
    if (
      !parsed.success ||
      parsed.data.runId !== parsedRun.data.runId ||
      parsed.data.leaderboard.board.boardId !== expectedBoardId ||
      parsed.data.leaderboard.board.modeId !== parsedRun.data.modeId ||
      parsed.data.leaderboard.board.scenarioVersion !==
        parsedRun.data.scenarioVersion ||
      parsed.data.leaderboard.board.scoringVersion !==
        parsedRun.data.scoringVersion
    ) {
      return { ok: false, error: "The run-sync response was invalid." };
    }
    return { ok: true, data: parsed.data };
  }

  async getTrainerSettings(): Promise<ApiResult<TrainerSettings>> {
    return this.requestJson<TrainerSettings>("/api/v1/me/settings", {
      method: "GET",
      cache: "no-store",
    });
  }

  async saveTrainerSettings(
    settings: TrainerSettings,
  ): Promise<ApiResult<TrainerSettings>> {
    return this.requestJson<TrainerSettings>("/api/v1/me/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  async getProfileSettings(): Promise<ApiResult<ProfileSettings>> {
    return this.requestJson<ProfileSettings>("/api/v1/me/profile", {
      method: "GET",
      cache: "no-store",
    });
  }

  async saveProfileSettings(
    profile: ProfileSettings,
  ): Promise<ApiResult<ProfileSettings>> {
    return this.requestJson<ProfileSettings>("/api/v1/me/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
  }

  async handshakeA(data: HandshakeRequest): Promise<HandshakeResponse | null> {
    const result = await this.requestJson<HandshakeResponse>(
      "/api/v1/handshake-a",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    return result.ok ? (result.data ?? null) : null;
  }
}
