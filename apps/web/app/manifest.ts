import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESCRIPTION } from "../src/lib/site.js";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Aim Trainer & Sensitivity Converter`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    categories: ["games", "utilities", "productivity"],
    // `app/icon.svg` is served at `/icon.svg` by Next's metadata file handling.
    // Add `app/apple-icon.png` (180x180) and a raster `app/icon.png` (512x512)
    // before launch for iOS home-screen and Android install icons.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
