export interface PracticeResultsRoutes {
  readonly playAgain: string;
  readonly hub: string;
  readonly login: string;
  readonly leaderboard: string;
}

export function getPracticeResultsRoutes(mode: string): PracticeResultsRoutes {
  const encodedMode = encodeURIComponent(mode);
  const resultsPath = `/app/train/${encodedMode}/results`;

  return {
    playAgain: `/app/train/${encodedMode}`,
    hub: "/app",
    login: `/login?next=${encodeURIComponent(resultsPath)}`,
    leaderboard: `/app/train/${encodedMode}/leaderboard`,
  };
}
