export interface TrainerRuntime {
  protocol: typeof import("@findmysensi/protocol");
  aimCore: typeof import("@findmysensi/aim-core");
  inputBrowser: typeof import("@findmysensi/input-browser");
  renderCanvas: typeof import("@findmysensi/render-canvas");
}

let cachedRuntime: TrainerRuntime | null = null;

export async function loadTrainerRuntime(): Promise<TrainerRuntime> {
  if (cachedRuntime) {
    return cachedRuntime;
  }

  const [protocol, aimCore, inputBrowser, renderCanvas] = await Promise.all([
    import("@findmysensi/protocol"),
    import("@findmysensi/aim-core"),
    import("@findmysensi/input-browser"),
    import("@findmysensi/render-canvas"),
  ]);

  cachedRuntime = {
    protocol,
    aimCore,
    inputBrowser,
    renderCanvas,
  };

  return cachedRuntime;
}
