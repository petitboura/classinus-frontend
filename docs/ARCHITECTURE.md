# Frontend architecture

[English version] · [Français](ARCHITECTURE.fr.md)

[English version] · [Français](ARCHITECTURE.fr.md)

## Purpose

This repository contains the Classinus interface. It does not contain the main API engine: business operations and server-side functions are provided by [classinus-backend](https://github.com/petitboura/classinus-backend).

The Next.js project serves the web app. A separate build configuration produces a static export for the Capacitor native projects. The Windows app uses Electron and the same interface components.

## Overview

```mermaid
flowchart TD
    U[User] --> W[Next.js frontend]
    W -->|HTTP API and chat stream| A[FastAPI backend]
    W -->|Auth and permitted services| S[Supabase]
    W --> C[Capacitor Android / iOS]
    W --> E[Electron Windows]
    A --> S
```

The browser, mobile apps, and Windows app share most of the interface. Platform-specific capabilities are handled by the corresponding native layers.

## Repository structure

| Path | Responsibility |
|---|---|
| `app/` | Next.js routes, public pages, authenticated screens, and layouts |
| `components/` | Shared interface components |
| `components/chat/` | Conversation, input, attachments, and response rendering |
| `components/mobile/` | Navigation and behavior specific to mobile interfaces |
| `lib/` | Client-side logic, shared state, API access, configuration, and utilities |
| `types/` | Shared TypeScript types |
| `public/` | Logos, icons, fonts, and static assets |
| `android/`, `ios/` | Capacitor native projects |
| `electron/` | Windows desktop integration and main process |
| `packages/` | Local Capacitor extensions, including Electron plugins |
| `tests/` | Automated checks and frontend safeguards |

## Service communication

- `NEXT_PUBLIC_API_URL` defines the FastAPI address.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configure the browser Supabase client.
- `NEXT_PUBLIC_APP_URL` is used to build absolute site URLs.
- Private AI provider keys and backend secrets must never be added to the frontend.

The variables are listed in [.env.local.example](../.env.local.example) and the [development guide](DEVELOPPEMENT.md).

## Build configuration

`next.config.mjs` distinguishes the normal web build from the static export used by Capacitor. Without `CAPACITOR_BUILD=true`, Next.js keeps its standard web behavior. The `build:capacitor` script enables the export and then syncs the output into the native projects.

Capacitor is configured in `capacitor.config.ts`. Electron is configured in `electron/`, with desktop-specific extensions in `packages/`.

## MCP-UI widgets in the chat

`components/chat/WidgetMcpUi.tsx` displays the widgets received through the `ressources_ui` SSE event (see the backend documentation). The content is treated as third-party code: HTML runs in an `iframe` with `sandbox="allow-scripts"` and without `allow-same-origin`, with no page navigation, no popups, no permissions and a bounded size. The protocol (MCP-UI and MCP Apps, JSON-RPC) and the display settings (`NEXT_PUBLIC_MCP_UI_HAUTEUR_INITIALE`, `_HAUTEUR_MIN`, `_HAUTEUR_MAX`, `_DELAI_CHARGEMENT_MS`) live in `lib/mcpUi.ts`. A widget can ask to open an http(s) link, to change its height, or to call a tool of its own MCP server (`tools/call` in MCP Apps, `tool` in MCP-UI). The call is never made by the widget: `WidgetMcpUi.tsx` relays it to `POST /api/widgets/appel-outil` (`appelerOutilDeWidget` in `lib/api.ts`), and the backend only accepts tools of the server that displayed the widget. An action that changes something or costs credits shows the chat's confirmation card (Confirm, Always allow, Cancel); reads run without confirmation. Everything else (`resources/read`, `ui/message`, `prompt`, `intent`) is refused. If it shows no sign of life within the delay, the fallback text appears with a Retry button.

On native and desktop, a third-party address (`text/uri-list`) degrades to an "Open the widget" card, because the Electron CSP only allows YouTube in `frame-src`. Test: `npm run test:widget-mcp-ui`.

## Maintenance principles

1. Shared interface changes must remain compatible with every environment that reuses the frontend.
2. Business operations and privileged data access stay in the backend.
3. Every new native capability must be tested on its target platform, not only in a browser.
4. Component-level details belong near the component or in a specialized guide, not in the root README.
