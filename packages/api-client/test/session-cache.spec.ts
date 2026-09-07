import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  BrowserApiClient,
  SESSION_CACHE_STORAGE_KEY,
  getStoredSession,
  storeSession,
  clearStoredSession,
} from "../src/browser.js";
import type { SessionResponse } from "@findmysensi/protocol";

describe("BrowserApiClient Session Caching", () => {
  const mockSession: SessionResponse = {
    user: {
      id: "user-123",
      email: "gamer@example.com",
      name: "ProGamer",
      username: "progamer",
      emailVerified: true,
    },
    session: {
      id: "sess-abc",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    },
  };

  beforeEach(() => {
    clearStoredSession();
    vi.restoreAllMocks();
    if (typeof window !== "undefined") {
      window.localStorage?.clear();
    }
  });

  afterEach(() => {
    clearStoredSession();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("stores and retrieves a session only from memory", () => {
    storeSession(mockSession);

    const retrieved = getStoredSession();
    expect(retrieved).toEqual(mockSession);

    if (typeof window !== "undefined" && window.localStorage)
      expect(window.localStorage.getItem(SESSION_CACHE_STORAGE_KEY)).toBeNull();
  });

  it("purges a legacy localStorage session instead of restoring it", () => {
    const values = new Map<string, string>([
      [SESSION_CACHE_STORAGE_KEY, JSON.stringify({ session: mockSession })],
    ]);
    const localStorage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
      clear: vi.fn(() => values.clear()),
    };
    vi.stubGlobal("window", { localStorage });

    clearStoredSession();

    expect(localStorage.removeItem).toHaveBeenCalledWith(
      SESSION_CACHE_STORAGE_KEY,
    );
    expect(values.has(SESSION_CACHE_STORAGE_KEY)).toBe(false);
  });

  it("clears stored session on clearStoredSession", () => {
    storeSession(mockSession);
    expect(getStoredSession()).toEqual(mockSession);

    clearStoredSession();
    expect(getStoredSession()).toBeNull();

    if (typeof window !== "undefined" && window.localStorage) {
      expect(window.localStorage.getItem(SESSION_CACHE_STORAGE_KEY)).toBeNull();
    }
  });

  it("returns null if session expiresAt is in the past", () => {
    const expiredSession: SessionResponse = {
      ...mockSession,
      session: {
        id: "expired",
        userId: "user-123",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    };

    storeSession(expiredSession);
    expect(getStoredSession()).toBeNull();
  });

  it("getSession returns cached session without making network request", async () => {
    storeSession(mockSession);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const client = new BrowserApiClient();

    const session = await client.getSession();
    expect(session).toEqual(mockSession);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("getSession fetches from network if forceRefresh is true", async () => {
    storeSession(mockSession);

    const updatedSession: SessionResponse = {
      ...mockSession,
      user: {
        ...mockSession.user!,
        name: "UpdatedName",
      },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(updatedSession), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new BrowserApiClient();
    const session = await client.getSession({ forceRefresh: true });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(session?.user?.name).toBe("UpdatedName");
    expect(getStoredSession()?.user?.name).toBe("UpdatedName");
  });

  it("deduplicates concurrent in-flight getSession calls", async () => {
    let resolveNetwork: (val: Response) => void;
    const networkPromise = new Promise<Response>((resolve) => {
      resolveNetwork = resolve;
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(networkPromise);

    const client = new BrowserApiClient();

    // Call getSession concurrently multiple times
    const promise1 = client.getSession({ forceRefresh: true });
    const promise2 = client.getSession({ forceRefresh: true });
    const promise3 = client.getSession({ forceRefresh: true });

    resolveNetwork!(
      new Response(JSON.stringify(mockSession), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const [res1, res2, res3] = await Promise.all([
      promise1,
      promise2,
      promise3,
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res1).toEqual(mockSession);
    expect(res2).toEqual(mockSession);
    expect(res3).toEqual(mockSession);
  });

  it("falls back to cached session when network returns 429 rate limit or 500 error", async () => {
    storeSession(mockSession);

    // Network returns 429 Too Many Requests
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new BrowserApiClient();
    const session = await client.getSession({ forceRefresh: true });

    // Should gracefully return cached session instead of logging user out
    expect(session).toEqual(mockSession);
  });

  it("clears cache when server explicitly returns 200 null (session revoked)", async () => {
    storeSession(mockSession);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new BrowserApiClient();
    const session = await client.getSession({ forceRefresh: true });

    expect(session).toBeNull();
    expect(getStoredSession()).toBeNull();
  });

  it("login caches only public user data and never copies the token", async () => {
    const loginResponse = {
      redirect: false,
      token: "new-token-456",
      user: mockSession.user,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(loginResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new BrowserApiClient();
    const result = await client.login({
      email: "gamer@example.com",
      password: "SecretPassword1!",
    });

    expect(result.ok).toBe(true);
    const cached = getStoredSession();
    expect(cached?.user?.email).toBe("gamer@example.com");
    expect(cached?.session).toBeNull();
    expect(JSON.stringify(cached)).not.toContain("new-token-456");
  });

  it("clears a cached session when the server returns 401", async () => {
    storeSession(mockSession);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const session = await new BrowserApiClient().getSession({
      forceRefresh: true,
    });

    expect(session).toBeNull();
    expect(getStoredSession()).toBeNull();
  });

  it("logout clears the session cache", async () => {
    storeSession(mockSession);
    expect(getStoredSession()).toEqual(mockSession);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new BrowserApiClient();
    await client.logout();

    expect(getStoredSession()).toBeNull();
  });
});
