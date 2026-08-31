"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { TrainerBootstrap } from "./TrainerBootstrap.js";

export function AuthenticatedTrainer({ mode }: { mode: string }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    new BrowserApiClient().getSession().then((session) => {
      if (!active) return;
      if (!session?.user) {
        router.replace(`/login?next=/app/train/${mode}`);
        return;
      }
      setAuthorized(true);
    });
    return () => {
      active = false;
    };
  }, [mode, router]);

  return authorized ? (
    <TrainerBootstrap mode={mode} />
  ) : (
    <main className="min-h-screen bg-zinc-950 text-zinc-300 grid place-items-center">
      <p className="font-mono text-sm">Checking your session...</p>
    </main>
  );
}
