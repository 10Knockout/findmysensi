import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "FindMySensi — Precision Aim Trainer & Universal Sensitivity Matching",
  description:
    "Universal, deterministic aim trainer and sensitivity matching engine across modern competitive FPS games.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ backgroundColor: "#07090e", color: "#f8fafc" }}>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
          WebkitFontSmoothing: "antialiased",
          backgroundColor: "#07090e",
          color: "#f8fafc",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
