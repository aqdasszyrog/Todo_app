import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets other devices (e.g. a phone on the same Wi-Fi) use the dev server
  // via this machine's LAN IP. Set DEV_ORIGINS in .env.local, comma-separated
  // (find your IP with `hostname -I`).
  allowedDevOrigins: process.env.DEV_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean),
};

export default nextConfig;
