import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SessionResponse,
  HandshakeRequest,
  HandshakeResponse,
} from "@findmysensi/protocol";

export class BrowserApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  async getSession(): Promise<SessionResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/get-session`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        return null;
      }
      return (await res.json()) as SessionResponse;
    } catch {
      return null;
    }
  }

  async login(data: LoginRequest): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Invalid credentials" }));
        return { ok: false, error: err.message || "Invalid credentials" };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  }

  async register(
    data: RegisterRequest,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Registration failed" }));
        return { ok: false, error: err.message || "Registration failed" };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  }

  async getDevelopmentVerificationOtp(email: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/dev/verification-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { otp?: unknown };
      return typeof data.otp === "string" ? data.otp : null;
    } catch {
      return null;
    }
  }

  async verifyEmailOtp(
    email: string,
    otp: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(
        `${this.baseUrl}/api/auth/email-otp/verify-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, otp }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        return {
          ok: false,
          error: data?.message ?? "Invalid or expired code.",
        };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/auth/sign-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch {
      // Ignore logout failure
    }
  }

  async forgotPassword(
    data: ForgotPasswordRequest,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(
        `${this.baseUrl}/api/auth/request-password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...data,
            redirectTo:
              typeof window === "undefined"
                ? "/reset-password"
                : `${window.location.origin}/reset-password`,
          }),
        },
      );
      if (!res.ok) {
        return { ok: false, error: "Failed to send reset email." };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  }

  async resetPassword(
    data: ResetPasswordRequest,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        return { ok: false, error: "Failed to reset password." };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  }

  async handshakeA(data: HandshakeRequest): Promise<HandshakeResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/handshake-a`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      return (await res.json()) as HandshakeResponse;
    } catch {
      return null;
    }
  }
}
