# Frontend development

[English version] · [Français](DEVELOPPEMENT.fr.md)

## Prerequisites

- Node.js and npm.
- An accessible Classinus backend.
- A Supabase project authorized for the development environment.

To build native applications, also install the platform tools: Android Studio for Android and Xcode on macOS for iOS.

## Installation

```bash
npm install
```

Copy the configuration file:

```bash
cp .env.local.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

At minimum, configure `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL`.

Never put private keys or provider secrets in a `NEXT_PUBLIC_*` variable: these values are bundled into the code sent to the browser.

## Start the application

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The API must be started separately. See the [backend development guide](https://github.com/petitboura/classinus-backend/blob/main/docs/DEVELOPPEMENT.md).

## Build and checks

```bash
npm run build
npm start
```

The `prebuild` script automatically checks native components and theme colors before the Next.js build.

Available check commands:

```bash
npm run test:composants-natifs
npm run test:couleurs-theme
npm run test:connexions
npm run test:i18n
npm run audit:i18n
```

Other scripts target specific features. The complete list is in `package.json`.

## Native builds

```bash
npm run build:capacitor
npm run build:capacitor:test
```

These scripts create the static export and run Capacitor sync. The final Android/iOS compilation is then performed with the native development tools. The second command uses the test target configured in `next.config.mjs`.

## Troubleshooting pointers

- API unavailable: check `NEXT_PUBLIC_API_URL`, then the backend service.
- Authentication: check the Supabase URL and public key for the selected environment.
- Web/mobile mismatch: check the `CAPACITOR_BUILD` conditions in `next.config.mjs`.
- Web/Windows mismatch: check the local Capacitor extensions and Electron layer.
