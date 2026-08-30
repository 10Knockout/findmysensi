export type ScenarioId = string & { readonly __brand: "ScenarioId" };

export function createScenarioId(id: string): ScenarioId {
  if (!id || typeof id !== "string") {
    throw new TypeError("ScenarioId must be a non-empty string");
  }
  return id as ScenarioId;
}

export interface TargetSpawnSpec {
  readonly id: number;
  readonly xAngleUnits: number;
  readonly yAngleUnits: number;
  readonly radiusAngleUnits: number;
  readonly lifetimeTicks?: number | undefined;
}

export interface SimulationScenarioSpec {
  readonly maxActiveTargets: number;
  readonly targetRadiusAngleUnits: number;
  readonly spawnAreaWidthUnits: number;
  readonly spawnAreaHeightUnits: number;
  readonly minTargetSeparationUnits: number;
  readonly gridRows?: number | undefined;
  readonly gridCols?: number | undefined;
}

export interface RankedSettings {
  readonly rankedEnabled: boolean;
  readonly strictInputHealth: boolean;
  readonly maxLagViolationTicks: number;
}

export interface RankedScenarioDefinition {
  readonly modeId: string;
  readonly scenarioVersion: number;
  readonly engineVersion: number;
  readonly scoringVersion: number;
  readonly durationTicks: number;
  readonly simulation: SimulationScenarioSpec;
  readonly rankedSettings: RankedSettings;
}

export interface PresentationScenarioMetadata {
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly category: "flick" | "tracking" | "switching" | "precision";
  readonly thumbnailUrl: string;
  readonly tags: readonly string[];
}

export interface ScenarioEntry {
  readonly definition: RankedScenarioDefinition;
  readonly presentation: PresentationScenarioMetadata;
}
