# Destiny AI — React Native Android Application

A dark, mobile-first AI companion built with Expo/React Native, TypeScript, and Supabase.

## Current stack

- React Native 0.79.5
- Expo 53
- React 19
- TypeScript 5.7+
- Supabase JS 2.57.4
- Android SDK 35
- Java 17
- Node 20+

## App capabilities

- Chat with Destiny AI through a Supabase Edge Function
- Chat modes: Chat, Code, Study, Write, and Creative
- Local conversation history
- Local memory, projects, and canvas data
- AI Studio for image/video/music generation through Edge Functions
- Supabase authentication and persistent sessions
- Dark, mobile-first interface

## Project structure

```text
.
├── App.tsx
├── index.js
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── .env.example
├── .github/workflows/android.yml
├── lib/
│   └── supabase.ts
├── android/
└── supabase/functions/
    ├── destiny-ai/
    ├── generate-image/
    ├── generate-video/
    └── generate-music/
```

## Environment configuration

Create a local `.env` from `.env.example` and provide the public Supabase client values:

```text
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Do **not** place provider API secrets in the mobile app. Secrets for AI providers should remain in Supabase Edge Function secrets.

The mobile app only needs the Supabase public client configuration to authenticate and call your Edge Functions.

## Local development

```bash
npm ci
npm run typecheck
npm start
```

For Android:

```bash
npm run android
```

React Native's Android tooling uses Android SDK 35 and JDK 17 for this project. citeturn0search5

## Production APK

```bash
cd android
./gradlew assembleRelease --stacktrace
```

The release APK is generated at:

```text
android/app/build/outputs/apk/release/app-release.apk
```

## Continuous integration

`.github/workflows/android.yml` now runs on pushes to `main` and upgrade branches, pull requests targeting `main`, and manual dispatches. It:

1. Installs Node 20 and Java 17.
2. Installs npm dependencies with `npm ci`.
3. Runs TypeScript type checking.
4. Runs Expo Android prebuild validation.
5. Builds the release APK with Gradle.
6. Uploads the release APK as a GitHub Actions artifact.

GitHub Actions supports automated build/test workflows and uploaded artifacts, making the Android build reproducible outside a local machine. citeturn0search0turn0search9

## Supabase

Required Edge Functions:

- `destiny-ai`
- `generate-image`
- `generate-video`
- `generate-music`

The Supabase client is initialized in `lib/supabase.ts` and reads the public Expo environment variables at build time.

## Android configuration

- Package ID: `com.destinyai`
- App name: `Destiny AI`
- Minimum SDK: 24
- Target/compile SDK: 35
- Orientation: portrait

## Upgrade branch

The current upgrade work is developed on:

```text
upgrade/destiny-ai-v2
```

The branch adds a safer environment configuration, a reproducible Android CI/release pipeline, and updated project documentation without exposing provider secrets in the mobile source.

## Release checklist

Before publishing a production build:

- Configure `.env` locally or the required GitHub/Expo environment variables.
- Configure all Supabase Edge Function secrets server-side.
- Run `npm run typecheck`.
- Run the Android release workflow.
- Test authentication, chat, history, Studio generation, and offline/local-state behavior on a physical Android device.
- Use a production Android signing key for Play Store distribution rather than the debug keystore.
