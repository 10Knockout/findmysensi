import type { Metadata } from "next";
import React from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-50 min-h-screen m-0 p-0">
        {children}
      </body>
    </html>
  );
}
