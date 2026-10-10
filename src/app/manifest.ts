import type { MetadataRoute } from "next";

// Makes the app installable (home screen on phones, app window on desktop).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Todo",
    short_name: "Todo",
    description: "Simple todo app with Next.js and Supabase",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07080c",
    theme_color: "#07080c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
