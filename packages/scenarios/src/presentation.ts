import { PresentationScenarioMetadata } from "./types.js";

export function createPresentationMetadata(
  data: PresentationScenarioMetadata,
): PresentationScenarioMetadata {
  return Object.freeze({
    ...data,
    tags: Object.freeze([...data.tags]),
  });
}
