import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets other devices (e.g. a phone on the same Wi-Fi) use the dev server
  // via this machine's LAN IP. Set DEV_ORIGINS in .env.local, comma-separated
  // (find your IP with `hostname -I`).
  allowedDevOrigins: process.env.DEV_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean),
  async headers() {
    return [
      {
        // Always fetch the latest service worker so updates roll out immediately.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
