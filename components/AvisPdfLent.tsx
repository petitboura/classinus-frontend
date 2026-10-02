"use client";

import { motion } from "framer-motion";
import { Download, RotateCw } from "lucide-react";

function formaterTaille(octets: number | null): string | null {
  if (!octets || octets <= 0) return null;
  const mo = octets / (1024 * 1024);
  return mo >= 1 ? `${Math.round(mo)} Mo` : `${Math.max(1, Math.round(octets / 1024))} Ko`;
}

// Avis affiché par-dessus l'aperçu quand un PDF met longtemps à s'ouvrir.
// Le chargement continue en arrière-plan : l'avis n'interrompt rien, il
// informe et laisse le choix de relancer ou de télécharger.
export function AvisPdfLent({
  tailleOctets,
  surReessayer,
  surTelecharger,
}: {
  tailleOctets: number | null;
  surReessayer: () => void;
  surTelecharger: () => void;
}) {
  const taille = formaterTaille(tailleOctets);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-x-3 bottom-3 z-10 flex flex-col items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute/95 p-3 text-center text-xs text-dj-texte-muet shadow-lg backdrop-blur"
      role="status"
    >
      <p>
        {taille ? `Ce PDF est volumineux (${taille}). ` : "Ce PDF est long à s'ouvrir. "}
        Le chargement continue, la première page s&apos;affichera dès qu&apos;elle est prête.
      </p>
      <div className="flex items-center gap-4">
        <button type="button" onClick={surReessayer} className="flex items-center gap-1 text-dj-accent-1-texte hover:underline">
          <RotateCw size={13} /> Réessayer
        </button>
        <button type="button" onClick={surTelecharger} className="flex items-center gap-1 text-dj-accent-1-texte hover:underline">
          <Download size={13} /> Télécharger
        </button>
      </div>
    </motion.div>
  );
}
