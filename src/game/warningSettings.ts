export const SKIP_WARNING_STORAGE_KEY = "ruby-rule.skipWarning";

function getLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getSkipWarningPreference() {
  return getLocalStorage()?.getItem(SKIP_WARNING_STORAGE_KEY) === "true";
}

export function setSkipWarningPreference(skipWarning: boolean) {
  getLocalStorage()?.setItem(SKIP_WARNING_STORAGE_KEY, skipWarning ? "true" : "false");
}
