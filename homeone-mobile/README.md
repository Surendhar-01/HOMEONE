# HOMEONE Mobile

Expo SDK 57 / React Native application for HomeOne customers, service providers, and administrators.

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Set the following public values in `.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8081/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
```

Use the computer's LAN address when testing on a physical phone. `10.0.2.2` can be used by an Android emulator to reach the host machine. Never place a Supabase service-role key in this app.

## Backend connection

Start the NestJS API on port `8081` and make sure the phone/emulator can reach the configured URL. Authentication, OTP, profiles, provider verification, storage uploads, and admin data are real API operations; the UI reports unavailable/error states when the backend or Supabase configuration is missing.

## Build and install a standalone Android APK

```powershell
npm run android:apk
npm run android:install
```

The release APK is written to
`android/app/build/outputs/apk/release/app-release.apk`. It contains the
JavaScript bundle and all native modules, so it runs directly on an Android
phone without Expo Go or a Metro server. Enable USB debugging before running
the install command, or copy the APK to the phone and open it there.

The local APK is signed with the Android debug key and is intended for direct
device installation. For a shareable signed APK built in the cloud, run:

```powershell
npx eas-cli@latest build --platform android --profile apk
```

For Google Play, use the `production` profile, which creates an Android App
Bundle (`.aab`) instead of an APK.

`EXPO_PUBLIC_API_URL` is embedded at build time. The configured backend must be
reachable from the phone; restart the backend with LAN binding and keep the
phone and computer on the same network. Plain HTTP is enabled for the current
LAN-hosted API. Use HTTPS before public distribution.

## Development

```powershell
npx expo run:android
```

This installs HomeOne's own native debug app. Expo Go is not used. Metro is
still used only during development for fast refresh.

## Validate

```powershell
npx tsc --noEmit
npx expo-doctor
```

Before release, manually exercise registration and OTP, password recovery deep links, all three role logins, route protection, image/document uploads, location denial and success, provider status routing, logout, small-screen keyboard behavior, and reduced-motion accessibility on both Android and iOS.

## Structure

- `app/` — Expo Router screens and role route groups
- `src/components/` — reusable UI and form controls
- `src/services/` — typed REST and upload clients
- `src/store/` — secure session restoration and auth state
- `src/theme/`, `src/types/`, `src/utils/` — design tokens, contracts, and validation
