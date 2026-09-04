import type { AngleUnits, PitchUnits, PrngV1 } from "@findmysensi/aim-core";
import {
  createSwitchTrackMetricsTracker,
  type SwitchTrackMetrics,
  type SwitchTrackMetricsTracker,
} from "@findmysensi/analytics";
import type { Tick } from "@findmysensi/protocol";
import {
  SWITCH_TRACK_DEV_V0_DEFINITION,
  SwitchTrackScenarioEngine,
  type TargetSpawnSpec,
} from "@findmysensi/scenarios";
import {
  computeSwitchTrackDevScore,
  type SwitchTrackScoreResult,
} from "@findmysensi/scoring";
import type { ModeRuntimeAdapter } from "./adapter.js";

class SwitchTrackModeAdapter implements ModeRuntimeAdapter<SwitchTrackMetrics> {
  public readonly modeId = "switch-track";
  public readonly definition = SWITCH_TRACK_DEV_V0_DEFINITION;
  private readonly engine = new SwitchTrackScenarioEngine(
    SWITCH_TRACK_DEV_V0_DEFINITION,
  );
  private tracker: SwitchTrackMetricsTracker =
    createSwitchTrackMetricsTracker();
  private prng: PrngV1 | null = null;

  public initialize(prng: PrngV1): void {
    this.prng = prng;
    this.tracker = createSwitchTrackMetricsTracker();
    this.engine.initialize(prng);
  }

  public onSimulationTick(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
  ): void {
    if (!this.prng) return;
    const sample = this.engine.tick(tick, playerYaw, playerPitch, this.prng);
    this.tracker.recordSample(sample.errorUnits, sample.onTarget);
    if (sample.acquisitionTicks !== null) {
      this.tracker.recordAcquisition(sample.acquisitionTicks);
    }
    if (sample.switched) this.tracker.recordSwitch();
  }

  public onShot(
    _tick: Tick,
    _playerYaw: AngleUnits,
    _playerPitch: PitchUnits,
    _prng: PrngV1,
  ): void {}

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    return [this.engine.getTarget()];
  }

  public computeMetrics(_elapsedTicks: number): SwitchTrackMetrics {
    return this.tracker.computeMetrics();
  }

  public computeScore(metrics: SwitchTrackMetrics): SwitchTrackScoreResult {
    return computeSwitchTrackDevScore(metrics);
  }
}

export function createSwitchTrackModeAdapter(): ModeRuntimeAdapter<SwitchTrackMetrics> {
  return new SwitchTrackModeAdapter();
}
