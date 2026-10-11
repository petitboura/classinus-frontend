"use client";

// Bouton Envoyer du crayon du canal PC (11/10/2026, demande Bourama). Il apparaît à côté du
// dessin seulement quand l'étudiant a tracé quelque chose, et disparaît une fois les traits
// envoyés (ou estompés, ou effacés). Monté dans la fenêtre de superposition seulement.
// Un clic envoie à Classinus ce qui est entouré, avec la question écrite dans le champ du
// canal s'il y en a une (voir lib/envoiCrayon.ts).

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { definirBrouillonCanal, lireBrouillonCanal } from "@/lib/brouillonCanal";
import { COUCHE_AGENT_CONTROLES } from "@/lib/couchesAgent";
import { marquerTraitsEnvoyes, useCrayonEcran } from "@/lib/crayonEcran";
import { envoyerCeQuiEstEntoure } from "@/lib/envoiCrayon";
import { zonesDesTraits } from "@/lib/zonesCrayon";

const LIBELLE_ENVOYER = "Envoyer";
const INFOBULLE_ENVOYER = "Envoyer à Classinus ce que tu as entouré";

// Place laissée entre le dessin et le bouton, et marge gardée avec le bord de l'écran.
const ECART_SOUS_LE_DESSIN_PX = 12;
const MARGE_ECRAN_PX = 8;
const LARGEUR_BOUTON_PX = 120;
const HAUTEUR_BOUTON_PX = 40;

function limiter(valeur: number, min: number, max: number): number {
  return Math.min(Math.max(valeur, min), Math.max(min, max));
}

export function BoutonEnvoyerCrayon() {
  const { traits, visibles, envoyes } = useCrayonEcran();
  const [enCours, setEnCours] = useState(false);

  const afficher = traits.length > 0 && visibles && !envoyes;

  // Sous le coin bas droit du dessin entier, ramené dans l'écran.
  let position = { left: MARGE_ECRAN_PX, top: MARGE_ECRAN_PX };
  if (afficher && typeof window !== "undefined") {
    const zones = zonesDesTraits(traits, 0);
    const droite = Math.max(...zones.map((z) => z.droite));
    const bas = Math.max(...zones.map((z) => z.bas));
    position = {
      left: limiter(droite - LARGEUR_BOUTON_PX, MARGE_ECRAN_PX, window.innerWidth - LARGEUR_BOUTON_PX - MARGE_ECRAN_PX),
      top: limiter(bas + ECART_SOUS_LE_DESSIN_PX, MARGE_ECRAN_PX, window.innerHeight - HAUTEUR_BOUTON_PX - MARGE_ECRAN_PX),
    };
  }

  async function envoyer() {
    if (enCours) return;
    setEnCours(true);
    try {
      const question = lireBrouillonCanal().trim();
      const parti = await envoyerCeQuiEstEntoure(question);
      if (parti) {
        marquerTraitsEnvoyes();
        if (question) definirBrouillonCanal("");
      }
    } finally {
      setEnCours(false);
    }
  }

  return (
    <AnimatePresence>
      {afficher && (
        <motion.button
          key="envoyer-crayon"
          type="button"
          data-agent-superposition="true"
          onClick={envoyer}
          disabled={enCours}
          aria-label={INFOBULLE_ENVOYER}
          title={INFOBULLE_ENVOYER}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          className="flex items-center justify-center gap-2 rounded-full border border-dj-accent-1 bg-dj-accent-1 px-4 text-sm font-medium text-[#1A0D02] shadow-lg"
          style={{
            position: "fixed",
            left: position.left,
            top: position.top,
            width: LARGEUR_BOUTON_PX,
            height: HAUTEUR_BOUTON_PX,
            zIndex: COUCHE_AGENT_CONTROLES,
            cursor: enCours ? "progress" : "pointer",
          }}
        >
          {enCours ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {LIBELLE_ENVOYER}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
