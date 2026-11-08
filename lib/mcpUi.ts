// Widgets MCP-UI (chantier du 04/11/2026) : logique pure, sans React ni navigateur, pour
// pouvoir la tester seule (voir tests/verifier-widget-mcp-ui.mjs).
//
// Un outil MCP peut renvoyer une ressource `ui://` (HTML ou adresse) que le backend nous
// transmet dans l'événement SSE "ressources_ui" (core/ressources_ui.py). Ce fichier décrit
// ce qu'on reçoit et comment parler à l'iframe qui l'affiche. Deux dialectes existent et sont
// compris ici, sans protocole maison :
//   - MCP-UI (messages {type, payload, messageId}), spécification mcpui.dev ;
//   - MCP Apps (JSON-RPC 2.0 par postMessage, ui/initialize etc.), SEP-1865.
// Un widget est du code tiers : il ne pilote pas la conversation (ui/message, prompt, intent sont
// refusés). Depuis le 08/11/2026 il peut appeler les outils de SON PROPRE serveur MCP (tools/call
// en MCP Apps, `tool` en MCP-UI), mais jamais directement : l'appel est relayé par notre backend
// (api/widgets_outils.py), qui vérifie le serveur, demande la confirmation des actions qui
// modifient ou qui coûtent, et exécute avec le compte de la personne.

export type RessourceUi = {
  uri: string;
  mimeType: string;
  // "html" : `contenu` est le document, monté en srcDoc. "url" : `contenu` est une adresse http(s).
  genre: "html" | "url";
  contenu: string;
  // Résultat de l'outil, rejoué au widget d'une MCP App (notification tool-result).
  donnees?: { content: unknown[]; structuredContent?: unknown };
  // Nom (côté Classinus) de l'outil qui a affiché le widget : le backend en déduit le serveur
  // dont le widget a le droit d'appeler les outils. Absent des anciens widgets rejoués.
  outil_source?: string;
};

// Réglages d'affichage, tous ici (jamais en dur dans le composant). Surchargeables au build
// par des variables NEXT_PUBLIC_MCP_UI_*.
function entierEnv(valeur: string | undefined, defaut: number): number {
  const n = Number(valeur);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : defaut;
}

export const CONFIG_MCP_UI = {
  // Hauteur du skeleton, identique à celle du widget tant qu'il n'a pas annoncé la sienne :
  // rien ne saute quand le contenu arrive.
  hauteurInitialePx: entierEnv(process.env.NEXT_PUBLIC_MCP_UI_HAUTEUR_INITIALE, 320),
  hauteurMinPx: entierEnv(process.env.NEXT_PUBLIC_MCP_UI_HAUTEUR_MIN, 80),
  hauteurMaxPx: entierEnv(process.env.NEXT_PUBLIC_MCP_UI_HAUTEUR_MAX, 720),
  // Sans signe de vie de l'iframe dans ce délai, on bascule sur le texte de repli.
  delaiChargementMs: entierEnv(process.env.NEXT_PUBLIC_MCP_UI_DELAI_CHARGEMENT_MS, 15000),
} as const;

export const VERSION_PROTOCOLE_APPS = "2026-01-26";

export type ContexteWidget = {
  theme: "clair" | "sombre";
  locale: "fr" | "en";
  donnees?: RessourceUi["donnees"];
};

export type ActionWidget =
  | { type: "taille"; hauteur: number }
  | { type: "lien"; url: string }
  | { type: "repondre"; message: Record<string, unknown> }
  // Le widget demande d'appeler un outil de son serveur : à relayer, la réponse est asynchrone.
  | { type: "appel_outil"; dialecte: "apps" | "mcpui"; id: unknown; nom: string; arguments: Record<string, unknown> };

/** Résultat d'un outil rendu au widget, dans le dialecte dont il est venu. */
export type ResultatAppelOutil = { texte: string; estErreur: boolean };

export function adresseHttpValide(brut: unknown): string | null {
  if (typeof brut !== "string") return null;
  try {
    const url = new URL(brut.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function borner(hauteur: unknown): number | null {
  if (typeof hauteur !== "number" || !Number.isFinite(hauteur)) return null;
  return Math.min(CONFIG_MCP_UI.hauteurMaxPx, Math.max(CONFIG_MCP_UI.hauteurMinPx, Math.ceil(hauteur)));
}

const nomTheme = (t: ContexteWidget["theme"]) => (t === "clair" ? "light" : "dark");

function contexteHote(ctx: ContexteWidget) {
  return {
    theme: nomTheme(ctx.theme),
    displayMode: "inline",
    availableDisplayModes: ["inline"],
    locale: ctx.locale,
    containerDimensions: { maxHeight: CONFIG_MCP_UI.hauteurMaxPx },
  };
}

/** Notification à envoyer au widget quand le thème change (dialecte MCP Apps). */
export function notificationTheme(ctx: ContexteWidget): Record<string, unknown> {
  return { jsonrpc: "2.0", method: "ui/notifications/host-context-changed", params: contexteHote(ctx) };
}

const reponseOk = (id: unknown, result: unknown = {}) => ({ jsonrpc: "2.0", id, result });
const reponseErreur = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function traiterJsonRpc(d: Record<string, unknown>, ctx: ContexteWidget): ActionWidget[] {
  const methode = d.method;
  if (typeof methode !== "string") return [];
  const params = estObjet(d.params) ? d.params : {};
  const aUnId = "id" in d && d.id !== undefined && d.id !== null;

  if (aUnId) {
    if (methode === "ui/initialize") {
      const protocole = typeof params.protocolVersion === "string" ? params.protocolVersion : VERSION_PROTOCOLE_APPS;
      return [{
        type: "repondre",
        message: reponseOk(d.id, {
          protocolVersion: protocole,
          hostInfo: { name: "Classinus", version: "1.0.0" },
          hostCapabilities: { openLinks: {}, serverTools: {} },
          hostContext: contexteHote(ctx),
        }),
      }];
    }
    if (methode === "ui/open-link") {
      const url = adresseHttpValide(params.url);
      if (!url) return [{ type: "repondre", message: reponseErreur(d.id, -32602, "Invalid link") }];
      return [{ type: "lien", url }, { type: "repondre", message: reponseOk(d.id) }];
    }
    if (methode === "ping") return [{ type: "repondre", message: reponseOk(d.id) }];
    if (methode === "tools/call") {
      const nom = typeof params.name === "string" ? params.name.trim() : "";
      if (!nom) return [{ type: "repondre", message: reponseErreur(d.id, -32602, "Invalid tool name") }];
      const args = estObjet(params.arguments) ? params.arguments : {};
      return [{ type: "appel_outil", dialecte: "apps", id: d.id, nom, arguments: args }];
    }
    // resources/read, ui/message, ui/request-display-mode... : refusés.
    return [{ type: "repondre", message: reponseErreur(d.id, -32601, "Not supported by this host") }];
  }

  if (methode === "ui/notifications/initialized") {
    if (!ctx.donnees) return [];
    return [
      { type: "repondre", message: { jsonrpc: "2.0", method: "ui/notifications/tool-input", params: { arguments: {} } } },
      { type: "repondre", message: { jsonrpc: "2.0", method: "ui/notifications/tool-result", params: ctx.donnees } },
    ];
  }
  if (methode === "ui/notifications/size-changed") {
    const h = borner(params.height);
    return h === null ? [] : [{ type: "taille", hauteur: h }];
  }
  return [];
}

function traiterMcpUi(d: Record<string, unknown>, ctx: ContexteWidget): ActionWidget[] {
  const type = d.type;
  if (typeof type !== "string") return [];
  const charge = estObjet(d.payload) ? d.payload : {};
  const idMessage = typeof d.messageId === "string" ? d.messageId : null;
  const recu = (): ActionWidget[] => (idMessage ? [{ type: "repondre", message: { type: "ui-message-received", messageId: idMessage } }] : []);

  switch (type) {
    case "ui-lifecycle-iframe-ready":
      return [{ type: "repondre", message: { type: "ui-lifecycle-iframe-render-data", payload: { renderData: { theme: nomTheme(ctx.theme), locale: ctx.locale } } } }];
    case "ui-size-change": {
      const h = borner(charge.height);
      return h === null ? [] : [{ type: "taille", hauteur: h }];
    }
    case "link": {
      const url = adresseHttpValide(charge.url);
      return url ? [...recu(), { type: "lien", url }] : [];
    }
    case "notify":
      return recu();
    case "tool": {
      const nom = typeof charge.toolName === "string" ? charge.toolName.trim() : "";
      if (!idMessage || !nom) return [];
      const args = estObjet(charge.params) ? charge.params : {};
      return [...recu(), { type: "appel_outil", dialecte: "mcpui", id: idMessage, nom, arguments: args }];
    }
    case "prompt":
    case "intent":
      // Refusé, mais le widget est prévenu pour ne pas attendre indéfiniment.
      return idMessage
        ? [{ type: "repondre", message: { type: "ui-message-response", messageId: idMessage, payload: { error: "Not supported by this host" } } }]
        : [];
    default:
      return [];
  }
}

/** Message à renvoyer au widget quand l'appel d'outil relayé est terminé (ou refusé). */
export function reponseAppelOutil(action: Extract<ActionWidget, { type: "appel_outil" }>, resultat: ResultatAppelOutil): Record<string, unknown> {
  const contenu = [{ type: "text", text: resultat.texte }];
  if (action.dialecte === "apps") {
    return reponseOk(action.id, { content: contenu, ...(resultat.estErreur ? { isError: true } : {}) });
  }
  return {
    type: "ui-message-response",
    messageId: action.id,
    payload: resultat.estErreur ? { error: resultat.texte } : { response: { content: contenu } },
  };
}

/** Ce que l'hôte doit faire d'un message reçu de l'iframe. Ne lève jamais. */
export function traiterMessageWidget(donnees: unknown, ctx: ContexteWidget): ActionWidget[] {
  try {
    if (!estObjet(donnees)) return [];
    return donnees.jsonrpc === "2.0" ? traiterJsonRpc(donnees, ctx) : traiterMcpUi(donnees, ctx);
  } catch {
    return [];
  }
}

// La ligne de repli "[Ressource : ui://...]" du texte de l'outil est inutile à lire quand le
// widget s'affiche : elle est masquée dans ce cas, et gardée sinon (client sans widget).
const LIGNE_RESSOURCE = /^\s*\[Ressource : ui:\/\/[^\]\n]*\]\s*$/gm;

export function masquerLigneRessource(texte: string, ressources?: RessourceUi[]): string {
  if (!ressources || ressources.length === 0 || !texte) return texte;
  return texte.replace(LIGNE_RESSOURCE, "").replace(/\n{3,}/g, "\n\n").trim();
}
