export const COLORBLIND_MODE_STORAGE_KEY = "ruby-rule.highContrastColorblind";

type ColorblindModeListener = (enabled: boolean) => void;

const listeners = new Set<ColorblindModeListener>();

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isColorblindModeEnabled() {
  return storage()?.getItem(COLORBLIND_MODE_STORAGE_KEY) === "true";
}

export function setColorblindModeEnabled(enabled: boolean) {
  try {
    storage()?.setItem(COLORBLIND_MODE_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Local storage can be unavailable in private browsing or constrained embeds.
  }
  for (const listener of [...listeners]) listener(enabled);
  return enabled;
}

export function toggleColorblindMode() {
  return setColorblindModeEnabled(!isColorblindModeEnabled());
}

export function addColorblindModeListener(listener: ColorblindModeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
