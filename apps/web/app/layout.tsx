import type { Metadata } from "next";
import React from "react";
import { Turret_Road } from "next/font/google";
import "./globals.css";

const turretRoad = Turret_Road({
  variable: "--font-turret-road",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

export const metadata: Metadata = {
  title: "FindMySensi — Aim Trainer",
  description:
    "Universal, deterministic aim trainer and sensitivity matching engine across modern competitive FPS games.",
};

// Per-request CSP nonces require dynamic rendering so Next can attach the
// middleware-generated nonce to framework and inline scripts.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={turretRoad.variable}>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-50 min-h-screen m-0 p-0">
        {children}
      </body>
    </html>
  );
}
