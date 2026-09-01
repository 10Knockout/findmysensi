export function startRunIfPointerLocked(
  expectedTarget: HTMLCanvasElement,
  pointerLockElement: Element | null,
  start: () => void,
): boolean {
  if (pointerLockElement !== expectedTarget) {
    return false;
  }

  start();
  return true;
}
