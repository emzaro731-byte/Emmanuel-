# Destiny AI — Android AI Companion

Destiny AI is a React Native + Expo mobile AI companion backed by Supabase Edge Functions. The app combines conversational AI, creative generation tools, local conversation history, memory, projects, and a polished dark mobile interface.

## ✨ Highlights

- 💬 Multi-mode AI chat: Chat, Code, Study, Write, and Creative
- 🧠 Optional local memory and conversation history
- 🎨 Studio actions for image, video, and music generation
- 📁 Local projects and canvas storage
- 📋 Copy assistant responses to the clipboard
- 🔐 Supabase authentication/session persistence
- ⚡ Offline-friendly local history with AsyncStorage
- 💳 Secure payment-record flow prepared for Moniepoint checkout/bank transfer
- 📱 Android release pipeline with GitHub Actions

## 🧱 Stack

- Expo SDK 53
- React Native 0.79.5
- React 19
- TypeScript 5.7+
- Supabase JS 2.57.4
- Android SDK 35
- Java 17
- Gradle 8.13

## 📂 Important Files

```text
App.tsx                         Main application UI and chat logic
lib/supabase.ts                Supabase client configuration
app.json                       Expo/Android configuration
package.json                   Scripts and dependencies
.eas.json / eas.json           EAS build profiles
.github/workflows/android.yml  Release APK CI
supabase/                      Edge Functions and backend configuration
supabase/payments_schema.sql   Payment records and RLS
supabase/functions/create-payment/index.ts  Secure payment creation endpoint
android/                       Native Android project
```

## 🚀 Run locally

```bash
npm ci
npm start
```

For a local Android development build:

```bash
npm run android
```

For a release APK:

```bash
npm run build:android
```

## 🧪 Verification

Run the TypeScript check before shipping:

```bash
npm run typecheck
```

GitHub Actions also runs the TypeScript check and Expo configuration check before building the release APK.

## 🔐 Supabase configuration

The app uses the Supabase project configured in `lib/supabase.ts`. Environment variables can override the built-in public client configuration:

```text
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Use `.env.example` as the template. Do not commit private service-role keys or other server secrets to the repository. The mobile client must only use a publishable/anon key with proper Supabase Row Level Security policies.

## 💳 Payment setup

The repository now includes a secure `create-payment` Supabase Edge Function and a `destiny_payments` table. The Edge Function authenticates the signed-in user and creates a pending payment reference server-side.

Set these values as **Supabase Edge Function secrets**, not Expo/mobile environment variables:

```text
MONIEPOINT_CHECKOUT_URL=your_secure_moniepoint_checkout_url
MONIEPOINT_ACCOUNT_NAME=your_business_account_name
MONIEPOINT_ACCOUNT_NUMBER=your_business_account_number
MONIEPOINT_BANK_NAME=Moniepoint MFB
```

Run `supabase/payments_schema.sql` in the Supabase SQL Editor before using the function.

The current Moniepoint public site confirms that businesses can create secure online checkout pages supporting cards, bank transfers and USSD. The exact merchant/API credentials and checkout integration should be obtained from Moniepoint rather than guessed or embedded in the mobile app.

## 📦 APK builds

Pushes to `main` and manual workflow runs execute `.github/workflows/android.yml`. The workflow:

1. Installs Node 20 and Java 17
2. Installs Android SDK 35
3. Runs `npm ci`
4. Runs TypeScript validation
5. Validates Expo configuration
6. Regenerates the native Android project with Expo Prebuild
7. Builds `app-release.apk`
8. Uploads the APK as a GitHub Actions artifact for 14 days

## 📱 Android identity

- App: Destiny AI
- Package: `com.destinyai`
- Version: `1.3.0`
- Version code: `13`
- Minimum Android SDK: 24
- Target/compile SDK: 35

## 🛡️ Security notes

The repository no longer tracks a `.env` file. `.env.example` is provided for local configuration, and `.gitignore` prevents future environment files and generated Android build output from being committed accidentally.

Never place Supabase service-role keys, AI provider secret keys, payment secrets, or other privileged credentials in the mobile app. Keep those credentials inside Supabase Edge Functions or another trusted server environment.

## 📄 License

Proprietary — Destiny AI.
