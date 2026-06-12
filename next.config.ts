import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile in the home
  // directory was confusing Next's auto-detection).
  turbopack: {
    root: path.join(__dirname),
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent this site from being framed (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Stop browsers from MIME-sniffing responses.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs (incl. any query params) to other origins.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No reason for this app to use these browser features.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
