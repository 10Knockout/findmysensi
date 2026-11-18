"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { PracticeResults } from "./PracticeResults.js";
import { getPracticeResultsRoutes } from "./routes.js";

export function AuthenticatedPracticeResults({
  mode,
  taskName,
  leaderboardEnabled,
}: {
  mode: string;
  taskName: string;
  leaderboardEnabled: boolean;
}) {
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
    <PracticeResults
      mode={mode}
      taskName={taskName}
      syncEnabled={leaderboardEnabled}
      leaderboardEnabled={leaderboardEnabled}
    />
  ) : (
    <main className="app-shell">
      <p className="app-help" role="status">
        Checking your session…
      </p>
    </main>
  );
}
