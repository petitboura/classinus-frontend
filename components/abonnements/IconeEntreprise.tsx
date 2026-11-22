import { Building2 } from "lucide-react";

// Logos des entreprises qui font les modèles (19/11/2026, demande de Bourama) : Anthropic, OpenAI,
// Google, xAI, Meta, DeepSeek, Z.ai, Alibaba et NVIDIA. Ce n'est pas le logo de l'IA elle-même
// (Claude, GPT, Gemini...), qui reste celui de components/chat/IconeFournisseur.tsx.
// SVG du paquet open source @lobehub/icons-static-svg (licence MIT), copiés dans
// public/logos-entreprises/. La clé est le "distributeur" que renvoie le serveur.
// Les logos de Google, Meta, DeepSeek, Alibaba et NVIDIA sont en couleur. Ceux d'Anthropic, d'OpenAI,
// de xAI et de Z.ai sont d'une seule couleur : elle est posée comme masque et prend la couleur du
// texte, pour rester visible en thème clair comme en thème sombre.
// Pour ajouter une entreprise : déposer son SVG dans ce dossier, puis l'ajouter ici.
const FICHIER_PAR_DISTRIBUTEUR: Record<string, string> = {
  claude: "anthropic",
  gpt: "openai",
  gemini: "google",
  grok: "xai",
  meta: "meta",
  deepseek: "deepseek",
  zai: "zai",
  alibaba: "alibaba",
  nvidia: "nvidia",
};
const FICHIERS_MONOCHROMES = new Set(["anthropic", "openai", "xai", "zai"]);

export function IconeEntreprise({ distributeur, taille = 24 }: { distributeur: string; taille?: number }) {
  const fichier = FICHIER_PAR_DISTRIBUTEUR[distributeur];
  const dimension = { width: taille, height: taille };

  if (!fichier) return <Building2 size={taille} className="shrink-0 text-dj-texte-muet" aria-hidden />;

  if (FICHIERS_MONOCHROMES.has(fichier)) {
    const url = `url(/logos-entreprises/${fichier}.svg)`;
    return (
      <span
        aria-hidden
        style={{
          ...dimension,
          backgroundColor: "currentColor",
          WebkitMaskImage: url,
          maskImage: url,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
        className="inline-block shrink-0"
      />
    );
  }

  return (
    <img
      src={`/logos-entreprises/${fichier}.svg`}
      alt=""
      draggable={false}
      style={dimension}
      className="shrink-0"
    />
  );
}
