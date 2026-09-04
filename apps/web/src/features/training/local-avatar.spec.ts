import { afterEach, describe, expect, it, vi } from "vitest";
import { AVATAR_OPTIONS } from "@findmysensi/trainer-runtime";
import { getSelectedAvatarId, setSelectedAvatarId } from "./local-avatar.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("local avatar selection", () => {
  it("defaults to the first preset avatar when nothing is stored", () => {
    expect(getSelectedAvatarId()).toBe(AVATAR_OPTIONS[0]!.id);
  });

  it("persists and returns a valid selection", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    });

    const targetId = AVATAR_OPTIONS[2]!.id;
    setSelectedAvatarId(targetId);
    expect(getSelectedAvatarId()).toBe(targetId);
  });

  it("ignores an unknown avatar id rather than persisting garbage", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    });

    setSelectedAvatarId("not-a-real-avatar-id");
    expect(getSelectedAvatarId()).toBe(AVATAR_OPTIONS[0]!.id);
  });
});
