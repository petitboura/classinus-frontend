import { Sparkles } from "lucide-react";

// Icônes des fournisseurs de modèles (14/10/2026, demande Bourama), SVG du paquet
// open source @lobehub/icons-static-svg (licence MIT), copiés dans
// public/icones-fournisseurs/ sous le nom de la clé "distributeur" que renvoie le
// backend (claude, gpt, gemini, deepseek, grok, meta, zai, alibaba, nvidia). Pour ajouter un fournisseur : déposer son
// SVG dans ce dossier, puis l'ajouter ici.
//
// Les icônes Claude, Gemini, DeepSeek, Meta, Alibaba et NVIDIA sont en couleur. Celles de GPT, de Grok et de Z.ai sont d'une seule
// couleur : elle est posée comme masque et prend la couleur du texte, pour rester
// visible en thème clair comme en thème sombre.
//
// 15/11/2026, demande de Bourama : le fournisseur "alibaba" affiche le logo de Qwen (qwen.svg,
// même paquet), pas celui d'Alibaba. La clé reste "alibaba" côté backend et base de données,
// seul le fichier d'icône change, voir FICHIER_ICONE.
const ICONES_COULEUR = new Set(["claude", "gemini", "deepseek", "meta", "alibaba", "nvidia"]);
const ICONES_MONOCHROME = new Set(["gpt", "grok", "zai"]);

// Fournisseur dont le fichier d'icône n'a pas le même nom que la clé "distributeur".
const FICHIER_ICONE: Record<string, string> = { alibaba: "qwen" };

// uneCouleur (21/11/2026, demande de Bourama, tableau des abonnements) : même les icônes en couleur
// s'affichent alors en une seule couleur, celle du texte, comme les icônes d'une seule couleur.
export function IconeFournisseur({
  distributeur,
  taille = 16,
  uneCouleur = false,
}: {
  distributeur: string | null;
  taille?: number;
  uneCouleur?: boolean;
}) {
  const dimension = { width: taille, height: taille };
  const fichier = distributeur ? FICHIER_ICONE[distributeur] ?? distributeur : null;

  if (distributeur && ICONES_COULEUR.has(distributeur) && !uneCouleur) {
    return (
      <img
        src={`/icones-fournisseurs/${fichier}.svg`}
        alt=""
        draggable={false}
        style={dimension}
        className="flex-shrink-0"
      />
    );
  }

  if (distributeur && (ICONES_MONOCHROME.has(distributeur) || (uneCouleur && ICONES_COULEUR.has(distributeur)))) {
    const url = `url(/icones-fournisseurs/${fichier}.svg)`;
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
        className="inline-block flex-shrink-0"
      />
    );
  }

  // Repli : mode Auto ou fournisseur sans icône.
  return <Sparkles size={taille} className="flex-shrink-0" aria-hidden />;
}
