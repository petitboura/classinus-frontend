> [English version](./ARCHITECTURE.md) · **Version française**

# Architecture du frontend

## Rôle

Ce dépôt contient l’interface de Classinus. Il ne contient pas le moteur API principal : les opérations métier et les fonctions serveur sont exposées par [classinus-backend](https://github.com/petitboura/classinus-backend).

Le projet Next.js sert l’application Web. Une configuration de build distincte produit une sortie statique destinée aux projets natifs Capacitor. L’application Windows s’appuie sur Electron et sur les mêmes composants d’interface.

## Vue d’ensemble

```mermaid
flowchart TD
    U[Utilisateur] --> W[Frontend Next.js]
    W -->|API HTTP et flux du chat| A[Backend FastAPI]
    W -->|Auth et services autorisés| S[Supabase]
    W --> C[Capacitor Android / iOS]
    W --> E[Electron Windows]
    A --> S
```

Le navigateur, les applications mobiles et l’application Windows partagent l’essentiel de l’interface. Les capacités propres à chaque plateforme passent par les couches natives correspondantes.

## Organisation du dépôt

| Chemin | Responsabilité |
|---|---|
| `app/` | routes Next.js, pages publiques, écrans connectés et layouts |
| `components/` | composants d’interface partagés |
| `components/chat/` | conversation, saisie, pièces jointes et rendu des réponses |
| `components/mobile/` | navigation et comportement propres aux interfaces mobiles |
| `lib/` | logique cliente, état partagé, accès API, configuration et utilitaires |
| `types/` | types TypeScript partagés |
| `public/` | logos, icônes, polices et ressources statiques |
| `android/`, `ios/` | projets natifs Capacitor |
| `electron/` | processus et intégration de l’application Windows |
| `packages/` | extensions Capacitor locales, notamment pour Electron |
| `tests/` | vérifications automatisées et garde-fous du frontend |

## Échanges avec les services

- `NEXT_PUBLIC_API_URL` définit l’adresse de l’API FastAPI.
- `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurent le client Supabase du navigateur.
- `NEXT_PUBLIC_APP_URL` sert notamment à construire les URLs absolues du site.
- Les clés privées des fournisseurs IA et les secrets du backend ne doivent jamais être ajoutés au frontend.

Les variables sont détaillées dans [.env.local.example](../.env.local.example) et dans le [guide de développement](DEVELOPPEMENT.md).

## Configuration de build

`next.config.mjs` distingue le build Web normal de l’export statique utilisé pour Capacitor. Sans `CAPACITOR_BUILD=true`, le comportement Web reste celui de Next.js. Le script `build:capacitor` active l’export, puis synchronise le résultat dans les projets natifs.

La configuration Capacitor se trouve dans `capacitor.config.ts`. La configuration Electron est dans `electron/` et les extensions propres au bureau dans `packages/`.

## Widgets MCP-UI dans le chat

`components/chat/WidgetMcpUi.tsx` affiche dans le fil les widgets reçus par l’événement SSE `ressources_ui` (voir la documentation du backend). Le contenu est traité comme du code tiers : le HTML s’exécute dans une `iframe` avec `sandbox="allow-scripts"` et sans `allow-same-origin`, sans navigation de la page, sans fenêtres surgissantes, sans permissions, et avec une taille bornée. Le protocole (MCP-UI et MCP Apps, JSON-RPC) et les réglages d’affichage (`NEXT_PUBLIC_MCP_UI_HAUTEUR_INITIALE`, `_HAUTEUR_MIN`, `_HAUTEUR_MAX`, `_DELAI_CHARGEMENT_MS`) sont dans `lib/mcpUi.ts`. Un widget peut demander d’ouvrir un lien http(s), de changer sa hauteur, ou d’appeler un outil de son propre serveur MCP (`tools/call` en MCP Apps, `tool` en MCP-UI). L’appel n’est jamais fait par le widget : `WidgetMcpUi.tsx` le relaie à `POST /api/widgets/appel-outil` (`appelerOutilDeWidget` dans `lib/api.ts`), et le backend n’accepte que les outils du serveur qui a affiché le widget. Une action qui modifie quelque chose ou qui coûte des crédits affiche la carte de confirmation du chat (Confirmer, Toujours autoriser, Annuler) ; les lectures s’exécutent sans confirmation. Tout le reste (`resources/read`, `ui/message`, `prompt`, `intent`) est refusé. Sans signe de vie dans le délai, le texte de repli s’affiche avec un bouton Réessayer.

Sur natif et PC, une adresse tierce (`text/uri-list`) se dégrade en carte « Ouvrir le widget », car la CSP Electron n’autorise que YouTube en `frame-src`. Test : `npm run test:widget-mcp-ui`.

## Règles de maintenance

1. Une évolution d’interface partagée doit rester compatible avec les environnements qui réutilisent le frontend.
2. Les appels métier et l’accès privilégié aux données restent côté backend.
3. Toute nouvelle capacité native doit être vérifiée sur la plateforme cible, pas seulement dans le navigateur.
4. Les détails propres à un composant doivent être documentés près du composant ou dans un guide spécialisé, pas dans le README racine.
