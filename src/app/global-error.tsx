"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

// Last resort, when the root layout itself fails. It replaces the whole
// document, so it can't rely on globals.css; styles are inline.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#07080c",
          color: "#e7e8ee",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Something went wrong · Todo</title>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#9a9cab", fontSize: 14 }}>Todo couldn&apos;t load. Please try again.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 12,
              padding: "8px 16px",
              borderRadius: 12,
              border: "1px solid #2a2c38",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
