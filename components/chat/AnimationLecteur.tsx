"use client";

import { useEffect, useMemo, useState } from "react";
import { Clapperboard } from "lucide-react";
import { BlocExpansible } from "./BlocExpansible";
import { Skeleton } from "@/components/Skeleton";
import { useTheme } from "@/lib/useTheme";
import { textesAnimation } from "@/lib/textesAnimation";
import { construireDocumentAnimation } from "./animation/construireDocumentAnimation";

// Bloc ```animation du markdown (29/09/2026, demande Bourama) : une leçon
// animée qui se regarde comme une vidéo (lecture, pause, barre de
// progression, chapitres cliquables, barre d'espace), en 2D ou en 3D. Le
// lecteur est fourni par l'application (voir animation/), le modèle
// n'écrit que le contenu des chapitres. Le widget interactif existant
// (WidgetSandbox.tsx) reste disponible et n'est pas modifié.
//
// Même déroulement que les autres aperçus : chip replié, déroulé dans le
// fil, vrai plein écran (BlocExpansible force l'iframe à remplir tout
// l'espace en plein écran, voir contenuEnIframe).
//
// Même attente que WidgetSandbox : changer `srcDoc` recharge tout
// l'iframe, or `code` grandit à chaque caractère tant que le message est
// en streaming. On attend donc 500ms sans changement avant d'afficher.
const HAUTEUR_FIL = "h-[28rem]";

// Même forme que le lecteur final (zone d'image, légende, barre de
// lecture, chapitres) pour éviter un saut visuel à l'arrivée.
function SqueletteAnimation() {
  return (
    <div className={`flex ${HAUTEUR_FIL} w-full flex-col gap-2 rounded-lg border border-dj-bordure p-2.5`}>
      <Skeleton className="min-h-0 flex-1 rounded-xl" />
      <Skeleton className="h-3.5 w-3/4 rounded" />
      <div className="flex items-center gap-2">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <Skeleton className="h-1.5 flex-1 rounded-full" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function AnimationLecteur({ code }: { code: string }) {
  const { resolu } = useTheme();
  const textes = textesAnimation();
  const [codeStable, setCodeStable] = useState<string | null>(null);

  useEffect(() => {
    setCodeStable(null);
    const delai = setTimeout(() => setCodeStable(code), 500);
    return () => clearTimeout(delai);
  }, [code]);

  const document_ = useMemo(
    () => (codeStable === null ? null : construireDocumentAnimation(codeStable, resolu, textes)),
    [codeStable, resolu, textes],
  );

  return (
    <BlocExpansible
      titre={textes.titre}
      icone={Clapperboard}
      sousTitre={textes.sousTitre}
      texteACopier={code}
      contenuEnIframe
      chargement={document_ === null}
      enfant={
        document_ === null ? (
          <SqueletteAnimation />
        ) : (
          <iframe
            sandbox="allow-scripts"
            srcDoc={document_}
            className={`${HAUTEUR_FIL} w-full rounded-lg border border-dj-bordure`}
            title={textes.iframeTitre}
            // Un tap ou un clic sur "ouvrir" vient d'avoir lieu : la barre
            // d'espace doit tout de suite agir sur l'animation, sans clic
            // supplémentaire dans le cadre.
            onLoad={(e) => e.currentTarget.focus()}
          />
        )
      }
    />
  );
}
