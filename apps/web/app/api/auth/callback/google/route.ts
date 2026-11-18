import { SITE_URL } from "../../../../../src/lib/site.js";

const MAX_CALLBACK_QUERY = 8192;
const REPLY_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

export async function GET(request: Request): Promise<Response> {
  const siteOrigin = new URL(SITE_URL).origin;
  const errorURL = new URL("/login?oauth=failed", siteOrigin);
  const fail = () =>
    new Response(null, {
      status: 303,
      headers: { ...REPLY_HEADERS, Location: errorURL.href },
    });

  const search = new URL(request.url).search;
  const cookie = request.headers.get("cookie");
  const apiOrigin = process.env.API_URL?.trim();
  if (!apiOrigin || !cookie || !search || search.length > MAX_CALLBACK_QUERY)
    return fail();

  try {
    const result = await fetch(
      new URL("/api/v1/auth/google/callback", apiOrigin),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: siteOrigin,
        },
        body: JSON.stringify({ search }),
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const location = result.headers.get("location");
    if (result.status < 300 || result.status >= 400 || !location) return fail();
    const target = new URL(location, siteOrigin);
    const isApp =
      target.pathname === "/app" || target.pathname.startsWith("/app/");
    if (
      target.origin !== siteOrigin ||
      target.username ||
      target.password ||
      (!isApp && target.href !== errorURL.href)
    )
      return fail();

    const headers = new Headers({ ...REPLY_HEADERS, Location: target.href });
    for (const cookie of result.headers.getSetCookie())
      headers.append("Set-Cookie", cookie);
    return new Response(null, { status: 303, headers });
  } catch {
    return fail();
  }
}
