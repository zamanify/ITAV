# ITAV

This project uses Expo Router with Supabase authentication.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   # edit .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

   Expo automatically opens the developer tools in a new browser window. If
   this interrupts your workflow you can disable it with:
   ```bash
   npx expo start --no-open
   ```
   or set the environment variable:
   ```bash
   EXPO_NO_BROWSER=1 npx expo start
   ```

The app can be opened in the Expo web browser or on a connected device using the QR code.

## Notes


This repository originated from a UI-focused prototype and still contains some
experimental code. If the Supabase authentication fails to initialize, ensure
your environment variables are set correctly and that `npm run lint` reports no
errors.
=======
- Good luck!


Solution to the big shitty issue:

rm -rf node_modules
rm package-lock.json
npm cache clean --force
npm install
npx expo start --clear  # or npm run dev


Simple as that!

Removed dependencies in package.json

"expo-camera": "~16.1.5",