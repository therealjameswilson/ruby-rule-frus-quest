# Ruby Rule on iPhone

Ruby Rule uses Capacitor to package the existing Phaser/Vite game as a native iPhone app. The web build remains the source of truth: `npm run build:ios` builds `dist/`, copies it into the native project, and synchronizes the Capacitor plugins.

## Native Contract

- Bundle identifier: `com.jameswilson.rubyrulefrusquest`
- App target and scheme: `App`
- Minimum iOS version: 15.0
- Device family: iPhone
- Orientations: portrait, landscape left, and landscape right
- Web assets: bundled in the app; normal gameplay does not depend on a server
- Saves: existing local save system in the app's WebView storage
- Audio: existing Web Audio score and effects, unlocked by the first player gesture
- Touch feedback: native light impact feedback with browser vibration fallback
- Lifecycle: backgrounding autosaves and pauses; foregrounding requires one deliberate resume tap

The native icon and launch art are original, repository-local FRUS volume designs. Their editable sources are in `assets/ios/`; the opaque PNGs used by Xcode are in the asset catalog.

## Build and Run

Requirements:

- macOS with a current Xcode installation
- an Apple Developer account for a physical-device or TestFlight build
- the repository's Node/npm toolchain

From the repository root:

```bash
npm install
npm run build:ios
npm run ios:open
```

In Xcode:

1. Select the `App` project and `App` target.
2. Open **Signing & Capabilities** and choose the correct development team.
3. Confirm the bundle identifier is available to that team.
4. Select an iPhone simulator or connected iPhone.
5. Press **Run**.

`npm run ios:copy` is a shorter web-only refresh when dependencies and native configuration have not changed. Use `npm run build:ios` after plugin or Capacitor configuration changes.

## Release and TestFlight

1. Run `npm run build:ios` and complete the release checklist below.
2. In Xcode, increment `MARKETING_VERSION` for a public version and `CURRENT_PROJECT_VERSION` for every uploaded build.
3. Select **Any iOS Device (arm64)** as the destination.
4. Choose **Product > Archive**.
5. In Organizer, choose **Distribute App > App Store Connect > Upload**.
6. Complete the App Store Connect metadata, screenshots, age rating, and privacy answers before inviting TestFlight testers.

The project declares that it does not use non-exempt encryption. Revisit that declaration if networking, authentication, or cryptographic features are added later.

## Device QA Checklist

- Fresh install reaches the DANN-E warning, title, Compiler creation, and Office without a network connection.
- Touch D-pad and A/B/Start support simultaneous movement and actions.
- A/B button presses produce light haptic feedback on supported iPhones.
- Portrait and both landscape orientations preserve a sharp, centered 256x240 game image.
- The notch, Dynamic Island, and home indicator do not cover the canvas or controls.
- Backgrounding autosaves and pauses audio/gameplay.
- Returning shows `TAP TO RESUME`; that tap does not also trigger an in-game action.
- Music and effects resume after the deliberate tap.
- A full Office-to-publication playthrough persists across an app restart.
- No web install or browser fullscreen prompt appears inside the native app.

## Project Map

- `capacitor.config.ts`: native package and iOS WebView configuration
- `ios/App/App.xcodeproj`: generated native project and signing target
- `src/platform/nativeApp.ts`: platform detection and native lifecycle bridge
- `src/platform/haptics.ts`: native touch feedback with browser fallback
- `assets/ios/`: editable app icon and launch art
- `scripts/strip-png-alpha.swift`: deterministic opaque PNG conversion for App Store icon requirements
