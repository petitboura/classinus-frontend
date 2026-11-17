"use client";

// Page bambara : champ pour écrire une demande au lieu de parler. Il reste caché derrière le bouton
// clavier pour que la page garde seulement la bulle et le micro. Il apparaît et disparaît en glissant.

import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  placeholder: string;
  libelleEnvoyer: string;
  /** Une demande écrite est déjà en cours : l'envoi attend. */
  occupe: boolean;
  surEnvoi: (texte: string) => void;
};

export function ChampEcritureBambara({ placeholder, libelleEnvoyer, occupe, surEnvoi }: Props) {
  const [texte, setTexte] = useState("");
  const champRef = useRef<HTMLInputElement>(null);

  // À l'ouverture, le curseur est déjà dans le champ : on peut écrire tout de suite.
  useEffect(() => {
    champRef.current?.focus();
  }, []);

  const peutEnvoyer = texte.trim().length > 0 && !occupe;

  const envoyer = () => {
    if (!peutEnvoyer) return;
    surEnvoi(texte);
    setTexte("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: 14, height: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="w-full overflow-hidden px-4"
    >
      <div
        className="mx-auto flex w-full max-w-md items-center gap-2 rounded-full border py-1.5 pl-5 pr-1.5"
        style={{ borderColor: "var(--dj-bordure)", backgroundColor: "color-mix(in srgb, var(--dj-surface) 88%, var(--dj-fond))" }}
      >
        <input
          ref={champRef}
          type="text"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              envoyer();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          enterKeyHint="send"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base outline-none"
          style={{ color: "var(--dj-texte)" }}
        />
        <button
          type="button"
          onClick={envoyer}
          disabled={!peutEnvoyer}
          aria-label={libelleEnvoyer}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-opacity active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: "var(--dj-accent-1)", color: "#1A0D02" }}
        >
          <ArrowUp size={20} />
        </button>
      </div>
    </motion.div>
  );
}
