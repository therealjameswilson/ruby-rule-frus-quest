import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jameswilson.rubyrulefrusquest",
  appName: "Ruby Rule: The FRUS Quest",
  webDir: "dist",
  backgroundColor: "#0f0f0f",
  zoomEnabled: false,
  loggingBehavior: "debug",
  initialFocus: true,
  ios: {
    path: "ios",
    scheme: "App",
    backgroundColor: "#0f0f0f",
    zoomEnabled: false,
    contentInset: "never",
    scrollEnabled: false,
    allowsLinkPreview: false,
    preferredContentMode: "mobile",
    handleApplicationNotifications: false,
    webContentsDebuggingEnabled: false,
    initialFocus: true,
    buildOptions: {
      signingStyle: "automatic",
      exportMethod: "app-store-connect"
    }
  }
};

export default config;
