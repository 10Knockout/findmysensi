import { LeaderboardHub } from "../../../src/features/leaderboard/LeaderboardHub.js";
import { getLeaderboardHubModes } from "../../../src/features/leaderboard/server-modes.js";

export default function AuthenticatedLeaderboardsPage() {
  return <LeaderboardHub modes={getLeaderboardHubModes()} requireSession />;
}
