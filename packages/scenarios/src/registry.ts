import { CanonicalWriter } from "@findmysensi/protocol";
import { RankedScenarioDefinition, ScenarioEntry } from "./types.js";

export class ScenarioRegistry {
  private readonly entries = new Map<string, ScenarioEntry>();

  private makeKey(modeId: string, version: number): string {
    return `${modeId.toLowerCase()}@v${version}`;
  }

  public register(entry: ScenarioEntry): void {
    const key = this.makeKey(
      entry.definition.modeId,
      entry.definition.scenarioVersion,
    );
    if (this.entries.has(key)) {
      throw new Error(`Scenario ${key} is already registered.`);
    }
    this.entries.set(key, Object.freeze(entry));
  }

  public get(modeId: string, version: number = 0): ScenarioEntry | undefined {
    return this.entries.get(this.makeKey(modeId, version));
  }

  public list(): readonly ScenarioEntry[] {
    return Object.freeze(Array.from(this.entries.values()));
  }

  public computeAuthoritativeIdentity(
    definition: RankedScenarioDefinition,
  ): Uint8Array {
    const writer = new CanonicalWriter(128);
    const encoder = new TextEncoder();

    // Domain tag
    writer.bytes(encoder.encode("FMS:SCENARIO:V1"));
    const modeBytes = encoder.encode(definition.modeId);
    writer.u8(modeBytes.length);
    writer.bytes(modeBytes);

    writer.u32(definition.scenarioVersion);
    writer.u32(definition.engineVersion);
    writer.u32(definition.scoringVersion);
    writer.u32(definition.durationTicks);
    writer.u32(definition.simulation.maxActiveTargets);
    writer.u32(definition.simulation.targetRadiusAngleUnits);
    writer.u32(definition.simulation.spawnAreaWidthUnits);
    writer.u32(definition.simulation.spawnAreaHeightUnits);
    writer.u32(definition.simulation.minTargetSeparationUnits);
    writer.u8(definition.rankedSettings.rankedEnabled ? 1 : 0);
    writer.u8(definition.rankedSettings.strictInputHealth ? 1 : 0);
    writer.u32(definition.rankedSettings.maxLagViolationTicks);

    return writer.finish();
  }
}

export const defaultScenarioRegistry = new ScenarioRegistry();
