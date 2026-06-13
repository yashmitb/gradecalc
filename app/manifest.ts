import type { MetadataRoute } from "next";

/**
 * Web app manifest so GradeHQ can be installed to a phone/desktop home screen
 * and launch standalone (no browser chrome). Colors match the dark theme so
 * the splash/title bar blends with the app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GradeHQ — What do you need on the final?",
    short_name: "GradeHQ",
    description:
      "Figure out exactly what you need on the final to land the grade you want. Free, private, no sign-up.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
