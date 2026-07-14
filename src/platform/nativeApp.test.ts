import { describe, expect, it, vi } from "vitest";
import {
  observeNativeAppState,
  readNativeAppState,
  type NativeAppLifecycleSource,
  type NativeAppRuntime
} from "./nativeApp";

function runtime(native: boolean, platform: string): NativeAppRuntime {
  return {
    isNativePlatform: () => native,
    getPlatform: () => platform
  };
}

describe("native app runtime detection", () => {
  it("identifies the bundled iOS runtime", () => {
    expect(readNativeAppState(runtime(true, "ios"))).toEqual({
      native: true,
      platform: "ios",
      offlineBundle: true
    });
  });

  it("keeps the browser build in web mode", () => {
    expect(readNativeAppState(runtime(false, "web"))).toEqual({
      native: false,
      platform: "web",
      offlineBundle: false
    });
  });

  it("falls back to web for unknown platform labels", () => {
    expect(readNativeAppState(runtime(false, "desktop"))).toEqual({
      native: false,
      platform: "web",
      offlineBundle: false
    });
  });

  it("forwards native foreground and background changes", async () => {
    let appStateListener: ((state: { isActive: boolean }) => void) | undefined;
    const remove = vi.fn(async () => undefined);
    const source: NativeAppLifecycleSource = {
      addListener: vi.fn(async (_eventName, listener) => {
        appStateListener = listener;
        return { remove };
      })
    };
    const listener = vi.fn();

    const stop = await observeNativeAppState(listener, runtime(true, "ios"), source);
    appStateListener?.({ isActive: false });
    appStateListener?.({ isActive: true });

    expect(listener.mock.calls).toEqual([[false], [true]]);
    await stop();
    expect(remove).toHaveBeenCalledOnce();
  });

  it("does not subscribe in a browser", async () => {
    const addListener = vi.fn();
    const source = { addListener } as unknown as NativeAppLifecycleSource;
    const stop = await observeNativeAppState(vi.fn(), runtime(false, "web"), source);

    expect(addListener).not.toHaveBeenCalled();
    await expect(stop()).resolves.toBeUndefined();
  });
});
