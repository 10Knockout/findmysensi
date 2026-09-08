import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SensitivityGamePicker } from "./SensitivityGamePicker.js";

describe("SensitivityGamePicker", () => {
  it("renders all working calibration target games", () => {
    const html = renderToStaticMarkup(
      createElement(SensitivityGamePicker, {
        legend: "Choose your game",
        selected: "valorant",
        onSelect: vi.fn(),
      }),
    );

    for (const name of ["Valorant", "CS2", "Apex", "Aimlabs"]) {
      expect(html).toContain(name);
    }
    expect(html).not.toContain("disabled=");
  });
});
