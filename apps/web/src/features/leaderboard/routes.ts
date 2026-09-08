export interface ModeLeaderboardRoutes {
  readonly play: string;
  readonly results: string;
  readonly hub: string;
}

export function getModeLeaderboardRoutes(mode: string): ModeLeaderboardRoutes {
  const encodedMode = encodeURIComponent(mode);
  return {
    play: `/app/train/${encodedMode}`,
    results: `/app/train/${encodedMode}/results`,
    hub: "/app",
  };
}
