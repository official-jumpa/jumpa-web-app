import type { MetadataRoute } from "next";

/**
 * The web app manifest. Next serves this at `/manifest.webmanifest` and links
 * it from every page, which is what makes the app installable at all —
 * Chromium will not fire `beforeinstallprompt` without one.
 *
 * `start_url` is `/home` rather than `/`: an installed icon should open the
 * wallet, and `/` redirects a signed-in visitor there anyway.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jumpa — Chat, Don't Tap",
    short_name: "Jumpa",
    description:
      "Send, swap, save, and spend across currencies and chains all in one conversation.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#8f12ff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
