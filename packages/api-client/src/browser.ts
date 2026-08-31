import type {
  ForgotPasswordRequest,
  HandshakeRequest,
  HandshakeResponse,
  LeaderboardResponse,
  LoginRequest,
  ProfileSettings,
  RegisterRequest,
  ResetPasswordRequest,
  SessionResponse,
  TrainerSettings,
} from "@findmysensi/protocol";

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
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
          error:
            body?.message ?? body?.error ?? `Request failed (${res.status}).`,
        };
      }
      return { ok: true, data: (await res.json()) as T };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  }

  async getSession(): Promise<SessionResponse | null> {
    const result = await this.requestJson<SessionResponse>(
      "/api/auth/get-session",
      {
        method: "GET",
      },
    );
    return result.ok ? (result.data ?? null) : null;
  }

  async login(data: LoginRequest): Promise<{ ok: boolean; error?: string }> {
    const result = await this.requestJson<unknown>("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify(data),
    });
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

  async getDevelopmentVerificationOtp(email: string): Promise<string | null> {
    const result = await this.requestJson<{ otp?: unknown }>(
      "/api/v1/dev/verification-otp",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
    return result.ok && typeof result.data?.otp === "string"
      ? result.data.otp
      : null;
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

  async logout(): Promise<void> {
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
