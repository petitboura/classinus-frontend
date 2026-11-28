"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "../Skeleton";
import { colorierCode, langageDeCode } from "./FichierCode";

// Code source affiché dans le lecteur à côté du chat (VoletLecteur.tsx), avec la
// même coloration que le fichier de code déroulé dans le fil (FichierCode.tsx).
//
// Un fichier tout juste généré peut ne pas encore être disponible au premier essai
// (même cas que ContenuTexte dans VisionneuseBibliotheque.tsx) : 3 tentatives
// espacées de 800 ms avant d'afficher l'erreur.
const TENTATIVES_MAX = 3;
const DELAI_ENTRE_TENTATIVES_MS = 800;

export function ContenuCode({
  href,
  extension,
  onTexteCharge,
}: {
  href: string;
  extension: string | null | undefined;
  /** Donne le texte au lecteur dès qu'il est chargé, pour son bouton Copier. */
  onTexteCharge?: (texte: string) => void;
}) {
  const [texte, setTexte] = useState<string | null>(null);
  const [enErreur, setEnErreur] = useState(false);

  useEffect(() => {
    let annule = false;
    function charger(tentative: number) {
      fetch(href)
        .then((r) => (r.ok ? r.text() : Promise.reject()))
        .then((t) => {
          if (annule) return;
          setTexte(t);
          onTexteCharge?.(t);
        })
        .catch(() => {
          if (annule) return;
          if (tentative < TENTATIVES_MAX) setTimeout(() => !annule && charger(tentative + 1), DELAI_ENTRE_TENTATIVES_MS);
          else setEnErreur(true);
        });
    }
    charger(1);
    return () => {
      annule = true;
    };
    // onTexteCharge vient d'un setState du lecteur : stable, et ne doit pas relancer le chargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  const html = useMemo(
    () => (texte === null ? "" : colorierCode(texte, langageDeCode(extension) || "plaintext")),
    [texte, extension]
  );

  if (enErreur) {
    return <p className="p-6 text-sm text-dj-texte-muet">Impossible de charger ce fichier.</p>;
  }
  if (texte === null) {
    return (
      <div className="flex flex-col gap-2 p-4" aria-hidden>
        <Skeleton className="h-3.5 w-3/4 rounded" />
        <Skeleton className="h-3.5 w-full rounded" style={{ animationDelay: "100ms" }} />
        <Skeleton className="h-3.5 w-5/6 rounded" style={{ animationDelay: "200ms" }} />
        <Skeleton className="h-3.5 w-2/3 rounded" style={{ animationDelay: "300ms" }} />
        <Skeleton className="h-3.5 w-4/5 rounded" style={{ animationDelay: "400ms" }} />
      </div>
    );
  }
  return (
    <div className="p-3">
      <pre className="overflow-x-auto whitespace-pre rounded-lg bg-[var(--dj-fond)] px-4 py-3 font-code text-[13px] leading-relaxed">
        <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
