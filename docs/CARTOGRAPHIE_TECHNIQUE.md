# Frontend technical code map

[English version] · [Français](CARTOGRAPHIE_TECHNIQUE.fr.md)

This document is a map of the codebase. It helps you find the right file without turning the documentation into a development diary.

## Find the right place quickly

| What you want to change | Start here |
|---|---|
| A page or URL | **app/** |
| Global navigation | **components/AppShell.tsx**, **components/AppSidebar.tsx** |
| Chat, input, and messages | **components/chat/** |
| Shared state and client-side logic | **lib/** |
| Library, notes, and behaviors | **app/(app)/** and related components |
| External connections | **components/connexions/**, **lib/connexionsApplis.ts** |
| Android and iOS | **components/mobile/**, **android/**, **ios/** |
| Windows app | **electron/**, **packages/*-electron/** |
| Colors and theme | **app/globals.css**, **lib/useTheme.ts** |
| Regression tests | **tests/** |

## 1. Overall structure

| Directory | Role |
|---|---|
| **app/** | Next.js routes, pages, and layouts |
| **components/** | Visible interface and interactions |
| **lib/** | Client-side logic, service access, and shared state |
| **public/** | Logos, icons, fonts, and static assets |
| **android/**, **ios/** | Capacitor native projects |
| **electron/** | Windows application integration |
| **packages/** | Local Capacitor extensions, especially for Electron |
| **tests/** | Automated checks |

The frontend uses the Classinus API for business operations. It must not contain AI provider secrets.

## 2. Routes and screens

The **app/** directory uses the Next.js App Router.

| Area | Location |
|---|---|
| Authenticated app | **app/(app)/** |
| Sign-in and registration | **app/connexion/**, **app/inscription/** |
| Public discovery pages | **app/decouvrir/** |
| Public space | **app/mon-espace/** |
| OAuth return and consent | **app/oauth/** |
| Downloads | **app/telecharger/** |
| Legal pages | **app/cgu/**, **app/confidentialite/**, **app/copyright/** |
| Desktop agent overlay | **app/agent-superposition/** |

Routes are also centralized in **lib/routes*.ts** files. Before creating a URL, check whether a route or navigation helper already exists.

## 3. Components

The **components/** directory groups visible interface elements by feature.

| Directory or component | Responsibility |
|---|---|
| **chat/** | conversation, input, messages, attachments, and rendering |
| **mobile/** | mobile navigation and controls |
| **voix/** | live voice interface |
| **connexions/** | service connection cards and screens |
| **bureau/** | Workspace section components |
| **higgsfield/** | Higgsfield feature interface |
| **icons/** and **icones/** | icon components |
| **AppShell.tsx**, **AppSidebar.tsx** | overall structure and navigation |
| **InteractionGlobale.tsx** | providers and interactions that persist across pages |
| **Logo.tsx**, **ThemeToggle.tsx** | brand identity and theme switching |

Most pages under **app/(app)/** delegate their interface to a component. Find the component rendered by the page before changing a global layout.

## 4. Client-side logic

The **lib/** directory contains logic reused across screens.

| Area | Reference files |
|---|---|
| API calls | **api.ts**, **reponseApi.ts** |
| Authentication | **supabase.ts**, **authFallback.ts** |
| Chat | **contexteChat.tsx**, **repriseFluxChat.ts** |
| Navigation | **routesApp.ts** and other **routes*.ts** files |
| Theme | **useTheme.ts**, **couleursIcones.ts** |
| Real-time communication | **canalTempsReel.ts**, **canalAgentApplicatif.ts** |
| Voice | **geminiLive.ts**, **contexteVoixDirecte.tsx** |
| Timers | **minuteurs.ts**, **contexteMinuteurs.tsx** |
| Updates | **miseAJourOta.ts**, **miseAJourPcElectron.ts** |
| Translations | **lib/i18n/** |

Shared contexts and hooks coordinate state across components. Avoid recreating local state that is already available through a shared context or hook.

## 5. Platforms

**Web.** The website uses the standard Next.js build. Configuration: **next.config.mjs**.

**Android and iOS.** Capacitor reuses the frontend interface in the **android/** and **ios/** native projects. Configuration is in **capacitor.config.ts**. Mobile-specific elements live in **components/mobile/** and native extensions in **packages/**.

**Windows.** Electron is configured in **electron/**. Desktop-specific Capacitor extensions are in **packages/capacitor-*-electron/**. PC features such as the relay, overlay, updates, and native access are split between these packages and the corresponding modules in **lib/**.

## 6. Visual identity

- Global styles: **app/globals.css**.
- Shared theme and colors: **lib/useTheme.ts** and utilities in **lib/**.
- Logo: **components/Logo.tsx** and assets in **public/**.
- Markdown in chat messages: the style of every element (quotes, headings 4 to 6, nested lists, task lists, horizontal rule, footnotes, collapsible blocks, keys, highlighted text) lives in **app/globals.css**, under the `.dj-markdown` container shared by the chat, the live channel, and skill previews. Elements that need code (task-list checkboxes, in-message links such as footnote references) are in **components/chat/composantsMarkdownRiches.tsx**. The HTML allow-list is in **components/chat/BulleMessage.tsx** (`SCHEMA_SANITIZE`); an HTML tag must be added there before it can be styled. Clicking a footnote reference scrolls only the message area, through **lib/defilerDansConteneur.ts**; never use `scrollIntoView` for this, because it also scrolls the fixed page and shifts the input bar. The document itself is locked while the app shell is mounted (`.dj-coque-appli` in **components/AppShell.tsx**, rules in **app/globals.css**): `html` is `overflow: hidden`, `body` is `position: relative; height: 100dvh; overflow: clip`, so nothing can scroll the page by code. Only inner areas such as `main` scroll. Pages outside the shell keep normal scrolling.

Reuse the existing visual conventions. After a visual change, check both light and dark themes and the relevant screen sizes.

## 7. Tests

Tests are in **tests/** and their commands are declared in **package.json**. Automatic checks run before a build, including **test:composants-natifs** and **test:couleurs-theme**.

Other scripts cover the chat, connections, internationalization, the PC channel, updates, the relay, and native interactions. Run the tests related to your change before validating it.

## Related guides

- [Architecture](ARCHITECTURE.md)
- [Development and commands](DEVELOPPEMENT.md)
- [Platforms and builds](PLATEFORMES.md)
- [Windows app publishing and updates](appli-pc-mise-a-jour-et-publication.md)
- [Store submission tracking](soumission-stores.md)
