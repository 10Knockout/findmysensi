export interface CalibrationState {
  readonly round: number;
  readonly maxRounds: number;
  readonly lowSens: number;
  readonly highSens: number;
  readonly currentA: number;
  readonly currentB: number;
  readonly isComplete: boolean;
  readonly recommendedSens?: number;
}

export function initializeCalibration(
  minSens: number,
  maxSens: number,
  rounds: number = 7,
): CalibrationState {
  if (minSens >= maxSens || minSens <= 0) {
    throw new RangeError(
      "Invalid calibration bounds: minSens must be positive and less than maxSens.",
    );
  }

  const range = maxSens - minSens;
  const sensA = minSens + range * 0.25;
  const sensB = minSens + range * 0.75;

  // Randomize initial presentation order to avoid bias
  const swap = Math.random() < 0.5;

  return {
    round: 1,
    maxRounds: rounds,
    lowSens: minSens,
    highSens: maxSens,
    currentA: swap ? sensB : sensA,
    currentB: swap ? sensA : sensB,
    isComplete: false,
  };
}

export function submitCalibrationChoice(
  state: CalibrationState,
  chosenOption: "A" | "B",
): CalibrationState {
  if (state.isComplete) {
    return state;
  }

  const chosenSens = chosenOption === "A" ? state.currentA : state.currentB;
  const otherSens = chosenOption === "A" ? state.currentB : state.currentA;

  let newLow = state.lowSens;
  let newHigh = state.highSens;

  if (chosenSens < otherSens) {
    newHigh = (newLow + newHigh) / 2 + (newHigh - newLow) * 0.15;
    newHigh = Math.min(state.highSens, newHigh);
  } else {
    newLow = (newLow + newHigh) / 2 - (newHigh - newLow) * 0.15;
    newLow = Math.max(state.lowSens, newLow);
  }

  const nextRound = state.round + 1;
  const isComplete = nextRound > state.maxRounds;

  if (isComplete) {
    const recommendedSens = (newLow + newHigh) / 2;
    return {
      ...state,
      round: nextRound,
      lowSens: newLow,
      highSens: newHigh,
      isComplete: true,
      recommendedSens,
    };
  }

  const range = newHigh - newLow;
  const nextA = newLow + range * 0.3;
  const nextB = newLow + range * 0.7;
  const swap = Math.random() < 0.5;

  return {
    round: nextRound,
    maxRounds: state.maxRounds,
    lowSens: newLow,
    highSens: newHigh,
    currentA: swap ? nextB : nextA,
    currentB: swap ? nextA : nextB,
    isComplete: false,
  };
}
