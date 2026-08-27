# Mobile Build & Deployment Guide

Terminal reference for running the LCP Android app in development and building
a production release. Run everything from `Frontend/` unless noted.

---

## Prerequisites (one-time setup)

- Node.js + npm, Android Studio (with Android SDK) installed.
- `adb` (Android Debug Bridge) — bundled with the SDK at:
  `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
  Add that folder to your PATH so you can just type `adb` instead of the full path.
- A JDK — Gradle needs one on `JAVA_HOME`. If you don't have `JAVA_HOME` set
  globally, `scripts/gradle-release.js` auto-falls-back to Android Studio's
  bundled JDK, so you don't strictly need to configure this yourself.
- Phone connected via USB with **Developer Options → USB debugging** enabled,
  and the "Allow USB debugging?" prompt accepted on the phone when you connect.

---

## 1. Development (live-reload on your phone)

The dev workflow runs an Angular dev server on your PC and points the native
app at it over your local Wi-Fi/LAN, so JS/HTML/CSS changes hot-reload on the
phone without rebuilding the native app.

### 1.1 Find your machine's LAN IP

```powershell
ipconfig
```

Look for the adapter you're actually on Wi-Fi with (not a WSL/Hyper-V virtual
adapter — those aren't reachable from your phone). Note the `IPv4 Address`.

If this IP is different from what's already in
`capacitor.config.dev.ts` / `src/environments/environment.development.ts`,
update it in **both** places (search for the old IP and replace it).

### 1.2 Start the dev server

```powershell
npm run start:dev
```

This serves the app on `http://0.0.0.0:4200`, reachable from your phone at
`http://<your-ip>:4200`.

### 1.3 Point the native app at the dev server

```powershell
npm run cap:config:dev
```

Copies `capacitor.config.dev.ts` (live-reload, points at your dev server) over
the active `capacitor.config.ts`. Capacitor's CLI always reads
`capacitor.config.ts` — there's no `--config` flag in this version to select a
different file directly, so this script does the swap for you.

### 1.4 Sync and open the native project

```powershell
npm run cap:sync:dev
npm run cap:android
```

This opens Android Studio. Select your device in the toolbar and click ▶ Run.
The app installs and loads from your dev server — edit code, save, and it
reloads on the phone automatically.

**Alternative** — skip Android Studio entirely and run straight from the CLI:

```powershell
npm run cap:run:dev
```

### 1.5 Inspect the WebView in Chrome DevTools

With the app running and the phone connected:

1. Open `chrome://inspect#devices` in desktop Chrome.
2. Your phone should appear with the running app's WebView listed underneath.
3. Click **inspect** — full DevTools (console, network, elements) for what's
   rendered on the phone.

---

## 2. Production build

Produces a build that's fully self-contained (bundled JS/CSS, no dev server
dependency) and points at the production API.

### 2.1 Android — build

```powershell
npm run build:android:apk        # signed .apk — for direct install/testing
npm run build:android:release    # signed .aab — for Play Store upload
```

Each of these automatically:
1. Switches `capacitor.config.ts` to the production variant (no dev server URL,
   WebView debugging off) via `cap:config:prod`.
2. Runs `ng build` (production config, using `environment.ts`).
3. Runs `npx cap sync android` to copy the built web assets into the native
   project.
4. Runs the Gradle release build, signed with the release keystore.

Output locations:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

**Afterward**, switch back to the dev config so your live-reload workflow
keeps working:

```powershell
npm run cap:config:dev
```

### 2.2 Install the production APK on a connected phone

```powershell
adb install -r "android\app\build\outputs\apk\release\app-release.apk"
```

If you get `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, it means a build signed with
a *different* key (e.g. a debug build) is already installed — Android blocks
updating across different signing keys. Uninstall first, then install:

```powershell
adb uninstall com.lcp.app
adb install -r "android\app\build\outputs\apk\release\app-release.apk"
```

⚠️ This wipes the app's local data/session on the phone (you'll need to log
in again).

### 2.3 Hand the APK to a tester

Simplest path: copy `app-release.apk` somewhere shareable (Drive, WeTransfer,
Slack) and send the link. The tester's phone will prompt to allow "install
from unknown sources" the first time they open it. If they previously had a
debug/dev build installed, they'll need to uninstall it first (same signing
key issue as above).

### 2.4 iOS — build

```powershell
npm run build:ios:release
```

Runs the same production pipeline (prod config, `ng build`, `cap sync ios`),
then opens the Xcode project.

**Important:** this only gets you to the point of opening Xcode. Actually
producing an `.ipa` (Archive → Distribute) requires **macOS with Xcode
installed** — Apple doesn't allow building/signing iOS apps on Windows. If you
don't have access to a Mac, a cloud CI service (Codemagic, GitHub Actions
macOS runners, Ionic Appflow) can do it instead.

---

## 3. Signing keystore (Android)

The release keystore lives at `android/keystore/lcp-release.jks`, with its
passwords in `android/keystore.properties` (both are gitignored — never
committed). `build.gradle` reads `keystore.properties` automatically; if that
file is missing, release builds fall back to being unsigned instead of
failing, so a fresh checkout without the keystore still builds (just not
installable until signed).

**Back up `lcp-release.jks` and the passwords in `keystore.properties`
somewhere safe (a password manager, not just this machine).** If this
keystore is ever lost, you can never publish an update to this app under the
same identity on Play Store again — there is no recovery process for that.

To bump the version for a new release build, edit
`android/app/build.gradle`:

```gradle
versionCode 2        // must strictly increase each release
versionName "1.1"     // human-readable, shown to users
```

---

## Troubleshooting

**`adb devices` shows the phone as `unauthorized`**
```powershell
adb kill-server
adb start-server
adb devices
```
If it's still `unauthorized`, on the phone go to **Developer Options → Revoke
USB debugging authorizations**, then unplug/replug the cable — a fresh "Allow
USB debugging?" prompt should appear.

**`adb devices` shows nothing at all**
Check the phone's USB notification is set to "File Transfer" (not
"Charging only"), and that USB debugging is enabled in Developer Options.

**Gradle: `JAVA_HOME is not set`**
`scripts/gradle-release.js` auto-detects Android Studio's bundled JDK, so this
shouldn't happen via the npm scripts above. If you're running `gradlew.bat`
directly yourself instead, set `JAVA_HOME` to Android Studio's `jbr` folder
(typically `C:\Program Files\Android\Android Studio\jbr`).
