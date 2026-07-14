import { App, type AppState } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

export type RubyRulePlatform = "web" | "ios" | "android";

export interface NativeAppRuntime {
  isNativePlatform(): boolean;
  getPlatform(): string;
}

export interface NativeAppState {
  native: boolean;
  platform: RubyRulePlatform;
  offlineBundle: boolean;
}

export interface NativeAppLifecycleSource {
  addListener(
    eventName: "appStateChange",
    listener: (state: AppState) => void
  ): Promise<PluginListenerHandle>;
}

export function readNativeAppState(runtime: NativeAppRuntime = Capacitor): NativeAppState {
  const native = runtime.isNativePlatform();
  const detectedPlatform = runtime.getPlatform();
  const platform: RubyRulePlatform =
    detectedPlatform === "ios" || detectedPlatform === "android"
      ? detectedPlatform
      : "web";

  return {
    native,
    platform,
    offlineBundle: native
  };
}

export function installNativeAppShell(
  documentTarget: Document = document,
  runtime: NativeAppRuntime = Capacitor
) {
  const state = readNativeAppState(runtime);
  documentTarget.documentElement.dataset.rubyRulePlatform = state.platform;
  documentTarget.documentElement.classList.toggle("native-app", state.native);
  documentTarget.documentElement.classList.toggle("native-ios", state.native && state.platform === "ios");

  if (state.native) {
    const preventNativeBrowserChrome = (event: Event) => event.preventDefault();
    documentTarget.addEventListener("contextmenu", preventNativeBrowserChrome);
    documentTarget.addEventListener("dragstart", preventNativeBrowserChrome);
  }

  return state;
}

export async function observeNativeAppState(
  listener: (isActive: boolean) => void,
  runtime: NativeAppRuntime = Capacitor,
  source: NativeAppLifecycleSource = App
): Promise<() => Promise<void>> {
  if (!runtime.isNativePlatform()) return async () => undefined;
  const handle = await source.addListener("appStateChange", ({ isActive }) => listener(isActive));
  return () => handle.remove();
}
