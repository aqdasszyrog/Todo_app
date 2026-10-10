import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Todo",
  description: "Simple todo app with Next.js and Supabase",
  applicationName: "Todo",
  // iOS ignores the manifest icons and needs these to run full-screen once
  // added to the home screen.
  appleWebApp: { capable: true, title: "Todo", statusBarStyle: "black" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#07080c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col overflow-x-hidden">
        {/* Soft gradient glows behind every page */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="animate-drift absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-[70%] rounded-full bg-violet-600/25 blur-[120px]" />
          <div className="animate-drift absolute top-20 right-[-8rem] h-[22rem] w-[22rem] rounded-full bg-fuchsia-500/15 blur-[120px] [animation-delay:-6s]" />
          <div className="animate-drift absolute bottom-[-10rem] left-[-6rem] h-[24rem] w-[24rem] rounded-full bg-indigo-500/15 blur-[120px] [animation-delay:-12s]" />
          <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        </div>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
