import "server-only";

export class ServerApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getSession() {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/session`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return null; // production-fail-closed
    }
    return res.json();
  }
}
