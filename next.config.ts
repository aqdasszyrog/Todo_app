import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi use the dev server via the laptop's LAN IP.
  // Update this if your IP changes (check with `hostname -I`).
  allowedDevOrigins: ["10.56.154.228"],
};

export default nextConfig;
