# Destiny AI - React Native Android Application

A professional AI companion mobile application built with React Native, TypeScript, and Supabase.

## Features

- 💬 **Chat Interface** - Conversation with Destiny AI via Supabase Edge Functions
- 🎨 **Studio** - Generate images, videos, and music with AI
- ⚙️ **Settings** - Customize appearance and AI mode
- 👤 **Profile** - User account and authentication
- 🌙 **Dark Mode** - Beautiful dark-themed UI
- 💾 **Conversation History** - Local storage with AsyncStorage
- 🔐 **Secure Auth** - Supabase authentication integration

## Tech Stack

- **React Native** 0.79.5
- **TypeScript** 5.7+
- **React** 19.0.0
- **Supabase** 2.57.4
- **Gradle** 8.13
- **Android SDK** 35
- **Java** 17

## Project Structure

```
.
├── App.tsx                 # Main React Native component
├── index.js               # Application entry point
├── app.json               # React Native configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript configuration
├── babel.config.js        # Babel transpiler config
├── metro.config.js        # Metro bundler config
├── lib/
│   └── supabase.ts       # Supabase client initialization
├── android/
│   ├── app/
│   │   ├── build.gradle   # App-level Gradle configuration
│   │   ├── proguard-rules.pro
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/destinyai/
│   │       │   ├── MainActivity.kt
│   │       │   └── MainApplication.kt
│   │       └── res/
│   │           ├── values/
│   │           ├── values-night/
│   │           └── mipmap/
│   ├── build.gradle
│   ├── settings.gradle
│   ├── gradle.properties
│   └── gradlew
├── .github/workflows/
│   └── android.yml       # CI/CD workflow
└── supabase/functions/   # Edge functions
    ├── destiny-ai/
    ├── generate-image/
    └── generate-music/
```

## Building

### Prerequisites

- Node.js 20+
- Java 17
- Android SDK 35
- Gradle 8.13

### Local Build

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Build and run on Android (separate terminal)
npm run android
```

### Production APK

```bash
cd android
./gradlew assembleRelease --stacktrace
```

APK output: `android/app/build/outputs/apk/release/app-release.apk`

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/android.yml`) automatically:

1. Checks out code
2. Sets up Java 17 and Node 20
3. Installs Android SDK
4. Installs npm dependencies
5. Verifies project structure
6. Generates Gradle wrapper
7. Creates debug keystore
8. Builds release APK
9. Uploads APK as artifact

**Triggers:** Push to `main` or manual `workflow_dispatch`

## Configuration

### Supabase

- **Project URL:** `https://vihbsfrwnslnmheowkhy.supabase.co`
- **Anon Key:** Configured in `lib/supabase.ts`
- **Edge Functions:** `destiny-ai`, `generate-image`, `generate-music`

### Android

- **Package ID:** `com.destinyai`
- **App Name:** Destiny AI
- **Min SDK:** 24
- **Target SDK:** 35
- **Compile SDK:** 35

## TypeScript

All source files use TypeScript for type safety:

```bash
npm run typecheck
```

## Troubleshooting

### Build Fails

1. Clean build: `cd android && ./gradlew clean`
2. Clear cache: `npm start -- --reset-cache`
3. Delete node_modules: `rm -rf node_modules && npm install`

### Keystore Issues

The workflow auto-generates `android/app/debug.keystore`. For custom keys:

```bash
keytool -genkeypair -v \
  -keystore android/app/my.keystore \
  -storepass password \
  -alias key-alias \
  -keypass password \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

## Release

1. Bump version in `package.json` and `android/app/build.gradle`
2. Push to `main`
3. GitHub Actions builds APK automatically
4. Download APK from Actions artifacts

## License

Proprietary - Destiny AI

## Support

For issues, open an issue in the repository.
