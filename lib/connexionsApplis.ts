import { enregistrerJetonRender } from "@/lib/api";

// Textes des cartes de connexion, partagés entre l'écran Connexions et la carte proposée dans le
// chat (components/chat/CarteConnecteur.tsx) : une seule source, les deux cartes disent la même chose.

// Services qui se connectent par un jeton (ou une clé) personnel collé dans l'écran.
export type JetonService = { nom: string; champ: string; placeholder: string; lien: string; libelleLien: string; enregistrer: (jeton: string) => Promise<unknown> };

export const JETONS: Record<string, JetonService> = {
  render_mcp: {
    nom: "Render",
    champ: "Clé personnelle Render",
    placeholder: "Colle ta clé Render",
    lien: "https://dashboard.render.com/u/settings/api-keys",
    libelleLien: "les paramètres de ton compte Render",
    enregistrer: enregistrerJetonRender,
  },
};


export const DESCRIPTIONS: Record<string, string> = {
  github: "Accède à tes dépôts GitHub pour consulter du code et travailler sur tes projets, selon les autorisations accordées.",
  notion: "Permets à Classinus de retrouver et d’utiliser les pages et bases de données de ton espace Notion.",
  google_drive: "Relie Google Drive pour retrouver les fichiers que tu choisis de rendre accessibles à Classinus.",
  google_gmail_mcp: "Serveur MCP Gmail officiel : rechercher et lire des e-mails, consulter les fils et préparer des brouillons dans les limites des autorisations Google accordées.",
  google_docs_mcp: "Serveur MCP Google Docs officiel : retrouver et lire la structure des documents, puis modifier ceux auxquels ton compte autorise l’accès.",
  google_sheets_mcp: "Serveur MCP Google Sheets officiel : consulter les classeurs et valeurs, puis mettre à jour les cellules et formules autorisées.",
  google_slides_mcp: "Serveur MCP Google Slides officiel : lire la structure et la mise en page des présentations, puis modifier les présentations autorisées.",
  google_calendar_mcp: "Serveur MCP Google Calendar officiel : consulter les agendas et événements, créer ou supprimer les événements autorisés.",
  google_chat_mcp: "Serveur MCP Google Chat officiel : consulter les espaces, conversations et messages autorisés et envoyer des messages si l’application Chat est configurée.",
  google_classroom_mcp: "Serveur MCP Google Classroom : consulter les cours, listes d’élèves et travaux accessibles selon les scopes et l’accès de ton compte.",
  google_people_mcp: "Serveur MCP Google People : consulter les profils et contacts couverts par les autorisations Google accordées.",
  render_mcp: "Serveur MCP officiel Render : explorer les services, déploiements et journaux accessibles à ton compte. Tu colles ta clé personnelle Render, vérifiée puis conservée côté serveur pour ton compte. Les actions qui modifient un service ou déclenchent un déploiement demandent une confirmation.",
  higgsfield_mcp: "Autorise Classinus à utiliser les fonctionnalités Higgsfield disponibles via son serveur MCP, avec ton propre compte.",
  vercel_mcp: "Permets à Classinus d’interagir avec tes projets et déploiements Vercel selon les accès que tu accordes.",
  railway_mcp: "Permets à Classinus d’interagir avec tes projets et services Railway selon les autorisations de ton compte.",
  supabase_mcp: "Permets à Classinus d’interagir avec tes projets Supabase sans partager tes identifiants avec d’autres utilisateurs.",
};

// Texte de la carte et du panneau d'une application ; repli commun quand aucune description n'est définie.
export function descriptionConnexion(nom: string): string {
  return DESCRIPTIONS[nom] ?? "Relie ce service à Classinus pour utiliser les fonctionnalités autorisées depuis ton compte.";
}
