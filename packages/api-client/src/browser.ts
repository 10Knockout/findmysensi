export class BrowserApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl; // usually empty string for relative paths
  }

  async getSession() {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/session`, {
      credentials: "omit",
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  }
}
