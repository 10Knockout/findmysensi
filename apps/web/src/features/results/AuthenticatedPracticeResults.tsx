"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { PracticeResults } from "./PracticeResults.js";
import { getPracticeResultsRoutes } from "./routes.js";

export function AuthenticatedPracticeResults({ mode }: { mode: string }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    const routes = getPracticeResultsRoutes(mode);

    new BrowserApiClient().getSession().then((session) => {
      if (!active) return;
      if (!session?.user) {
        router.replace(routes.login);
        return;
      }
      setAuthorized(true);
    });
    return () => {
      active = false;
    };
  }, [mode, router]);

  return authorized ? (
    <PracticeResults mode={mode} />
  ) : (
    <main className="min-h-screen bg-zinc-950 text-zinc-300 grid place-items-center">
      <p className="font-mono text-sm">Checking your session...</p>
    </main>
  );
}
