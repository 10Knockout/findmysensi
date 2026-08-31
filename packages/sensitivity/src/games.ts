import { GameAdapter, SupportedGameId } from "./types.js";

export const GAME_ADAPTERS: Record<SupportedGameId, GameAdapter> = {
  cs2: {
    id: "cs2",
    name: "Counter-Strike 2 / Source Engine",
    defaultYawDegrees: 0.022,
    defaultDpi: 800,
    minSensitivity: 0.01,
    maxSensitivity: 30.0,
    defaultFovDegrees: 90,
  },
  valorant: {
    id: "valorant",
    name: "Valorant",
    defaultYawDegrees: 0.07,
    defaultDpi: 800,
    minSensitivity: 0.01,
    maxSensitivity: 10.0,
    defaultFovDegrees: 103,
  },
  apex: {
    id: "apex",
    name: "Apex Legends",
    defaultYawDegrees: 0.022,
    defaultDpi: 800,
    minSensitivity: 0.01,
    maxSensitivity: 30.0,
    defaultFovDegrees: 90,
  },
  overwatch2: {
    id: "overwatch2",
    name: "Overwatch 2",
    defaultYawDegrees: 0.0066,
    defaultDpi: 800,
    minSensitivity: 0.01,
    maxSensitivity: 100.0,
    defaultFovDegrees: 103,
  },
  fortnite: {
    id: "fortnite",
    name: "Fortnite",
    defaultYawDegrees: 0.005555,
    defaultDpi: 800,
    minSensitivity: 0.01,
    maxSensitivity: 100.0,
    defaultFovDegrees: 80,
  },
  r6siege: {
    id: "r6siege",
    name: "Rainbow Six Siege",
    defaultYawDegrees: 0.00572,
    defaultDpi: 800,
    minSensitivity: 1,
    maxSensitivity: 100,
    defaultFovDegrees: 90,
  },
  quake: {
    id: "quake",
    name: "Quake / Source / GoldSrc",
    defaultYawDegrees: 0.022,
    defaultDpi: 800,
    minSensitivity: 0.01,
    maxSensitivity: 30.0,
    defaultFovDegrees: 90,
  },
  unreal: {
    id: "unreal",
    name: "Unreal Engine Universal",
    defaultYawDegrees: 0.022,
    defaultDpi: 800,
    minSensitivity: 0.001,
    maxSensitivity: 50.0,
    defaultFovDegrees: 90,
  },
};

export function getGameAdapter(gameId: SupportedGameId): GameAdapter {
  const adapter = GAME_ADAPTERS[gameId];
  if (!adapter) {
    throw new Error(`Unsupported game identifier: ${gameId}`);
  }
  return adapter;
}
