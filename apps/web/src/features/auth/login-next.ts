const LOGIN_FALLBACK = "/app";
const LOGIN_BASE_URL = "https://findmysensi.invalid";

export function resolveSafeLoginDestination(search: string): string {
  const candidate = new URLSearchParams(search).get("next");
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return LOGIN_FALLBACK;
  }

  try {
    const resolved = new URL(candidate, LOGIN_BASE_URL);
    if (resolved.origin !== LOGIN_BASE_URL) return LOGIN_FALLBACK;
    if (
      resolved.pathname !== "/app" &&
      !resolved.pathname.startsWith("/app/")
    ) {
      return LOGIN_FALLBACK;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return LOGIN_FALLBACK;
  }
}
