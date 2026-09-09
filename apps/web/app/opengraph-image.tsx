import { ImageResponse } from "next/og";
import { SITE_NAME } from "../src/lib/site.js";

export const alt =
  "FindMySensi — free browser aim trainer and sensitivity matching engine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Root social card. Route segments can override it by adding their own
 * `opengraph-image` file (see `app/guides/opengraph-image.tsx`).
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#050505",
        color: "#f5f5f5",
        padding: "80px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 40,
          fontWeight: 800,
        }}
      >
        <span style={{ color: "#bdff2d", marginRight: 16 }}>F/</span>
        {SITE_NAME}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            gap: 20,
            fontSize: 82,
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          <span>Find your</span>
          <span style={{ color: "#bdff2d" }}>sensi.</span>
        </div>
        <div
          style={{
            fontSize: 34,
            color: "#a1a1aa",
            marginTop: 24,
            maxWidth: 900,
          }}
        >
          Free, open-source aim trainer. 12 deterministic drills, real
          sensitivity math, public leaderboards — in your browser.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          color: "#71717a",
          letterSpacing: 4,
        }}
      >
        FINDMYSENSI.COM
      </div>
    </div>,
    size,
  );
}
