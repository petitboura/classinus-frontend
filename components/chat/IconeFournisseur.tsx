import { Sparkles } from "lucide-react";

// Icônes des fournisseurs de modèles (14/10/2026, demande Bourama), SVG du paquet
// open source @lobehub/icons-static-svg (licence MIT), copiés dans
// public/icones-fournisseurs/ sous le nom de la clé "distributeur" que renvoie le
// backend (claude, gpt, gemini, deepseek, grok). Pour ajouter un fournisseur : déposer son
// SVG dans ce dossier, puis l'ajouter ici.
//
// Les icônes Claude, Gemini et DeepSeek sont en couleur. Celles de GPT et de Grok sont d'une seule
// couleur : elle est posée comme masque et prend la couleur du texte, pour rester
// visible en thème clair comme en thème sombre.
const ICONES_COULEUR = new Set(["claude", "gemini", "deepseek"]);
const ICONES_MONOCHROME = new Set(["gpt", "grok"]);

export function IconeFournisseur({ distributeur, taille = 16 }: { distributeur: string | null; taille?: number }) {
  const dimension = { width: taille, height: taille };

  if (distributeur && ICONES_COULEUR.has(distributeur)) {
    return (
      <img
        src={`/icones-fournisseurs/${distributeur}.svg`}
        alt=""
        draggable={false}
        style={dimension}
        className="flex-shrink-0"
      />
    );
  }

  if (distributeur && ICONES_MONOCHROME.has(distributeur)) {
    const url = `url(/icones-fournisseurs/${distributeur}.svg)`;
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
