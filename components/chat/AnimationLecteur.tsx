"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard } from "lucide-react";
import { BlocExpansible } from "./BlocExpansible";
import { Skeleton } from "@/components/Skeleton";
import { useTheme } from "@/lib/useTheme";
import { useProcheEcran } from "@/lib/useProcheEcran";
import type { ThemeIframe } from "@/lib/paletteIframe";
import { textesAnimation } from "@/lib/textesAnimation";
import { construireDocumentAnimation } from "./animation/construireDocumentAnimation";

// Bloc ```animation du markdown (29/09/2026, demande Bourama) : une
// animation qui se regarde comme une vidéo (lecture, pause, barre de
// progression, barre d'espace), en 2D ou en 3D, pour n'importe quel
// sujet et sans structure imposée : un seul mouvement continu ou
// plusieurs parties, avec ou sans titres et légende. Le lecteur est
// fourni par l'application (voir animation/), le modèle n'écrit que le
// contenu. Le widget interactif existant (WidgetSandbox.tsx) reste
// disponible et n'est pas modifié.
//
// Affichage direct dans le fil, sans puce repliée ni carte autour, à la
// largeur du texte comme un tableau (voir l'option direct de
// BlocExpansible), avec un vrai plein écran (BlocExpansible force l'iframe
// à remplir tout l'espace en plein écran, voir contenuEnIframe).
//
// Elle ne fait qu'un avec le chat : ni contour ni coins arrondis sur l'iframe,
// document au fond transparent et sans marge (on voit le fond du chat).
//
// L'animation ne démarre que lorsqu'elle approche de l'écran (voir
// lib/useProcheEcran.ts), pour qu'une longue conversation avec plusieurs
// animations ne les lance pas toutes d'un coup.
//
// Même attente que WidgetSandbox : changer `srcDoc` recharge tout
// l'iframe, or `code` grandit à chaque caractère tant que le message est
// en streaming. On attend donc 500ms sans changement avant d'afficher.
const HAUTEUR_FIL = "h-[28rem]";

// Même forme que le lecteur final (zone d'image, légende, barre de
// lecture, titres) pour éviter un saut visuel à l'arrivée.
function SqueletteAnimation({ surMontage }: { surMontage: (el: HTMLDivElement | null) => void }) {
  return (
    <div ref={surMontage} className={`flex ${HAUTEUR_FIL} w-full flex-col gap-2`}>
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
  const [zoneSqueletteEl, setZoneSqueletteEl] = useState<HTMLDivElement | null>(null);
  const procheEcran = useProcheEcran(zoneSqueletteEl);

  useEffect(() => {
    setCodeStable(null);
    if (!procheEcran) return;
    const delai = setTimeout(() => setCodeStable(code), 500);
    return () => clearTimeout(delai);
  }, [code, procheEcran]);

  // Changement de thème : la scène est construite une fois avec les couleurs du
  // thème (les couleurs C sont lues par le code du modèle à la création), elle
  // doit donc être recréée. Pour que l'utilisateur ne perde pas sa place, on
  // demande d'abord à l'animation où elle en est (temps, lecture ou pause), puis
  // on la recharge avec le nouveau thème en lui redonnant cet état.
  const [themeDoc, setThemeDoc] = useState<ThemeIframe>(resolu);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const repriseRef = useRef<{ t: number; joue: boolean } | null>(null);

  useEffect(() => {
    repriseRef.current = null;
  }, [code]);

  useEffect(() => {
    if (resolu === themeDoc) return;
    const cadre = iframeRef.current;
    if (!cadre?.contentWindow) {
      setThemeDoc(resolu);
      return;
    }
    let fini = false;
    function terminer(reprise: { t: number; joue: boolean } | null) {
      if (fini) return;
      fini = true;
      window.removeEventListener("message", surMessage);
      clearTimeout(delai);
      repriseRef.current = reprise;
      setThemeDoc(resolu);
    }
    function surMessage(e: MessageEvent) {
      if (e.source !== cadre?.contentWindow) return;
      const d = e.data as { type?: unknown; t?: unknown; joue?: unknown } | null;
      if (!d || d.type !== "dj-anim-etat" || typeof d.t !== "number" || !Number.isFinite(d.t)) return;
      terminer({ t: d.t, joue: d.joue === true });
    }
    window.addEventListener("message", surMessage);
    // Pas de réponse (animation pas encore démarrée) : on recharge sans reprise.
    const delai = setTimeout(() => terminer(null), 250);
    cadre.contentWindow.postMessage({ type: "dj-anim-demande-etat" }, "*");
    return () => {
      fini = true;
      window.removeEventListener("message", surMessage);
      clearTimeout(delai);
    };
  }, [resolu, themeDoc]);

  const document_ = useMemo(
    () => (codeStable === null ? null : construireDocumentAnimation(codeStable, themeDoc, textes, repriseRef.current)),
    [codeStable, themeDoc, textes],
  );

  return (
    <BlocExpansible
      titre={textes.titre}
      icone={Clapperboard}
      sousTitre={textes.sousTitre}
      texteACopier={code}
      contenuEnIframe
      direct
      enfant={
        document_ === null ? (
          <SqueletteAnimation surMontage={setZoneSqueletteEl} />
        ) : (
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts"
            srcDoc={document_}
            className={`block ${HAUTEUR_FIL} w-full`}
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
