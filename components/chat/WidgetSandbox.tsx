"use client";

import { useEffect, useRef, useState } from "react";
import { AppWindow } from "lucide-react";
import { BlocExpansible } from "./BlocExpansible";
import { BoutonFilmerWidget, type EtatVideo } from "./BoutonFilmerWidget";
import { Skeleton } from "@/components/Skeleton";
import { useTheme } from "@/lib/useTheme";
import { useProcheEcran } from "@/lib/useProcheEcran";
import { HAUTEUR_INITIALE_WIDGET_PX, useHauteurWidget } from "@/lib/useHauteurWidget";
import { SCRIPT_HAUTEUR_WIDGET } from "@/lib/scriptHauteurWidget";
import {
  demarrerEnregistrement,
  enregistrementVideoPossible,
  ErreurVideo,
  telechargerVideo,
  type EnregistrementEnCours,
} from "@/lib/enregistrerVideo";

// Bloc ```html ou ```widget du markdown -- le modèle peut générer un
// mini-outil autonome (calculateur, formulaire, mini-jeu) en HTML/CSS/JS
// complet. Se déroule dans le fil au clic (voir BlocExpansible.tsx) --
// plus de panneau latéral ni d'ouverture automatique, retirés à la
// demande de Bourama (2026-07-20) : retour au comportement replié/
// déroulé dans le fil, avec un vrai plein écran (pas de division
// d'écran) pour voir le widget en grand.
//
// CORRECTIF (17/08, v2) -- paramètre `theme` ajouté : ce document tourne
// dans un <iframe srcDoc>, un DOCUMENT SÉPARÉ qui n'hérite d'AUCUNE
// variable CSS de la page parente (contrairement au reste de l'app). Les
// couleurs doivent donc être résolues et injectées en dur ICI, au moment
// de la génération du HTML -- impossible de leur faire suivre var(--dj-...)
// comme ailleurs.
export function construireDocumentWidget(code: string, theme: "clair" | "sombre"): string {
  const t = theme === "clair"
    ? { fond: "#FFFFFF", texte: "#1C1A16", champBg: "#F5F5F2", bordure: "rgba(28,26,22,0.14)", accent: "#B8860B", degrade: "linear-gradient(135deg,#E3B341 0%,#B8860B 55%,#6B5416 100%)" }
    : { fond: "#1A1714", texte: "#F5F0E6", champBg: "#221E18", bordure: "rgba(245,240,230,0.14)", accent: "#E3B341", degrade: "linear-gradient(135deg,#F0C766 0%,#D9A438 55%,#8A6A1F 100%)" };
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      html,body{margin:0;padding:12px;background:${t.fond};color:${t.texte};
        font-family:'Work Sans',system-ui,sans-serif;}
      *{box-sizing:border-box;}
      /* Style par défaut pour tout champ/bouton généré sans CSS propre --
         sans ça, un input/button hérite du blanc par défaut du
         navigateur, qui jure avec le reste de l'interface (repéré par
         Bourama sur un widget "solveur d'équations" avec des champs
         blancs au milieu d'une carte sombre). Le modèle peut toujours
         écraser ces règles avec son propre <style>, ceci n'est qu'un
         filet de sécurité. */
      input, select, textarea{
        background:${t.champBg};color:${t.texte};border:1px solid ${t.bordure};
        border-radius:8px;padding:6px 10px;font:inherit;font-size:14px;
      }
      input:focus, select:focus, textarea:focus{
        outline:none;border-color:${t.accent};
      }
      button{
        background:${t.degrade};
        color:#1A0D02;border:none;border-radius:8px;padding:7px 14px;
        font:inherit;font-size:14px;font-weight:600;cursor:pointer;
      }
      button:hover{filter:brightness(1.08);}
      button:active{filter:brightness(0.95);}
      table{border-collapse:collapse;}
      td,th{border:1px solid ${t.bordure};padding:4px 8px;}
      a{color:${t.accent};}
      #dj-erreur-widget{
        display:none;margin-bottom:10px;padding:8px 10px;border-radius:8px;
        background:rgba(220,60,50,0.15);border:1px solid rgba(220,60,50,0.4);
        color:${t.texte};font-size:12px;font-family:monospace;white-space:pre-wrap;
      }
    </style>
    </head><body>
    <div id="dj-erreur-widget"></div>
    ${code}
    <script>
      // Sans ça, un widget qui casse (script.src externe bloqué,
      // erreur de syntaxe, référence à une variable inexistante...)
      // échoue en silence : le clic ne fait rien, aucun indice pour
      // diagnostiquer. Trouvé sur plusieurs widgets réels (2026-07-20)
      // où "rien ne se passe" cachait des causes différentes à chaque
      // fois -- ce bandeau rend l'erreur visible directement.
      (function () {
        var conteneur = document.getElementById('dj-erreur-widget');
        function afficher(texte) {
          conteneur.textContent = 'Erreur dans le widget : ' + texte;
          conteneur.style.display = 'block';
        }
        window.onerror = function (message, source, ligne) {
          afficher(message + (ligne ? ' (ligne ' + ligne + ')' : ''));
        };
        window.addEventListener('unhandledrejection', function (e) {
          afficher(String(e.reason));
        });
      })();
    </script>
    <script id="dj-info-widget">
      // Réponse à la demande du bouton Filmer (voir WidgetSandbox plus bas) :
      // le parent ne peut pas regarder dans cet iframe isolé, il pose donc la
      // question par message. On dit (1) si le widget est interactif (bouton,
      // champ, écouteur de clic ou de clavier), (2) la durée d'un tour des
      // animations CSS quand on peut la lire. Rien d'autre n'est envoyé.
      (function () {
        var SELECTEUR = 'button, input, select, textarea, a[href], summary, [onclick], [role="button"], [contenteditable="true"]';
        function decrire() {
          var interactif = !!document.querySelector(SELECTEUR);
          if (!interactif) {
            var copie = document.documentElement.cloneNode(true);
            var propre = copie.querySelector('#dj-info-widget');
            if (propre) propre.remove();
            var html = copie.outerHTML;
            interactif =
              /addEventListener\\s*\\(\\s*['"](click|dblclick|pointer|mouse|touch|key|input|change|submit|wheel)/i.test(html) ||
              /\\son(click|input|change|key|mouse|pointer|touch|submit)[a-z]*\\s*=/i.test(html);
          }
          var cycle = null;
          try {
            var max = 0;
            var liste = document.getAnimations ? document.getAnimations() : [];
            for (var i = 0; i < liste.length; i++) {
              var eff = liste[i].effect;
              var t = eff && eff.getComputedTiming ? eff.getComputedTiming() : null;
              if (!t) continue;
              var d = typeof t.duration === 'number' ? t.duration : 0;
              if (t.iterations !== Infinity && isFinite(t.endTime) && t.endTime > d) d = t.endTime;
              if (d > max) max = d;
            }
            if (max > 0) cycle = max;
          } catch (e) {}
          return { interactif: interactif, cycleMs: cycle };
        }
        window.addEventListener('message', function (e) {
          if (!e.data || e.data.type !== 'dj-widget-demande-info') return;
          var r = decrire();
          parent.postMessage({ type: 'dj-widget-info', interactif: r.interactif, cycleMs: r.cycleMs }, '*');
        });
      })();
    </script>
    <script id="dj-hauteur-widget">${SCRIPT_HAUTEUR_WIDGET}</script>
    </body></html>`;
}

// Le parent ne peut pas lire l'iframe (document isolé, sans accès au parent),
// on lui pose donc la question par message. Sans réponse en 700 ms (widget
// cassé, script bloqué), on renvoie null et l'appelant traite le widget
// comme interactif : arrêt manuel, le choix le plus sûr.
function demanderInfosWidget(iframe: HTMLIFrameElement): Promise<{ interactif: boolean; cycleMs: number | null } | null> {
  return new Promise((resolve) => {
    const cible = iframe.contentWindow;
    if (!cible) {
      resolve(null);
      return;
    }
    let termine = false;
    const ecoute = (e: MessageEvent) => {
      if (e.source !== cible) return;
      const d = e.data as { type?: string; interactif?: unknown; cycleMs?: unknown } | null;
      if (!d || d.type !== "dj-widget-info") return;
      fin({ interactif: d.interactif !== false, cycleMs: typeof d.cycleMs === "number" ? d.cycleMs : null });
    };
    const delai = setTimeout(() => fin(null), 700);
    function fin(valeur: { interactif: boolean; cycleMs: number | null } | null) {
      if (termine) return;
      termine = true;
      window.removeEventListener("message", ecoute);
      clearTimeout(delai);
      resolve(valeur);
    }
    window.addEventListener("message", ecoute);
    cible.postMessage({ type: "dj-widget-demande-info" }, "*");
  });
}

// 23/09/2026, correctif Bourama ("le widget tremble tant que son propre
// code n'est pas fini") : contrairement à QCMInteractif.tsx/
// CarteMessage.tsx/GraphiqueDonnees.tsx/SchemaGeometrique.tsx, ce
// composant construisait et injectait un nouveau `srcDoc` dans l'iframe
// à CHAQUE rendu -- or changer `srcDoc` recharge entièrement le document
// de l'iframe, même sans démontage React. Tant que le bloc ```widget/
// ```html n'était pas fini de streamer, `code` grandissait caractère par
// caractère, donc l'iframe rechargeait à chaque caractère. Même principe
// que les autres blocs riches : on attend 500ms sans changement de
// `code` avant de considérer le widget comme prêt à afficher, avec un
// squelette entre-temps.
//
// Affichage direct (demande Bourama, 04/10/2026) : le widget est visible tout
// de suite dans le fil, à la largeur du texte comme un tableau, sans puce
// repliée ni carte autour (option direct de BlocExpansible).
export function WidgetSandbox({ code }: { code: string }) {
  const { resolu } = useTheme();
  const [codeStable, setCodeStable] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Le widget ne démarre que lorsqu'il approche de l'écran (voir
  // lib/useProcheEcran.ts) : dix widgets dans une longue conversation ne se
  // lancent pas tous d'un coup. En attendant, c'est le squelette qui est
  // observé, il a la même hauteur de départ que le widget.
  const [zoneSqueletteEl, setZoneSqueletteEl] = useState<HTMLDivElement | null>(null);
  const procheEcran = useProcheEcran(zoneSqueletteEl);

  // Vidéo (30/09/2026, demande Bourama) : le bouton Filmer n'existe que sur
  // ordinateur, dans les navigateurs capables de recadrer sur un élément.
  // Tout l'état est ici et non dans le bouton, voir BoutonFilmerWidget.tsx.
  const [videoPossible, setVideoPossible] = useState(false);
  const [etatVideo, setEtatVideo] = useState<EtatVideo>("repos");
  const [secondes, setSecondes] = useState(0);
  const enregistrementRef = useRef<EnregistrementEnCours | null>(null);
  const chronoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const arretAutoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retourRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hauteur du cadre : suit le contenu du widget (voir lib/useHauteurWidget.ts).
  // Elle reste figée pendant la préparation et l'enregistrement d'un film, car
  // la vidéo est recadrée sur le cadre et une taille qui bouge l'abîmerait.
  const hauteur = useHauteurWidget(
    iframeRef,
    codeStable === null ? "" : `${resolu}|${codeStable}`,
    etatVideo === "preparation" || etatVideo === "enregistrement",
  );

  useEffect(() => {
    setVideoPossible(enregistrementVideoPossible());
  }, []);

  function viderMinuteurs() {
    if (chronoRef.current) clearInterval(chronoRef.current);
    if (arretAutoRef.current) clearTimeout(arretAutoRef.current);
    chronoRef.current = null;
    arretAutoRef.current = null;
  }

  // Si le bloc disparaît en pleine prise de vue, on coupe proprement pour ne
  // pas laisser le navigateur afficher "partage en cours".
  useEffect(() => {
    return () => {
      viderMinuteurs();
      if (retourRef.current) clearTimeout(retourRef.current);
      enregistrementRef.current?.arreter();
    };
  }, []);

  function signaler(etat: EtatVideo) {
    setEtatVideo(etat);
    if (retourRef.current) clearTimeout(retourRef.current);
    retourRef.current = setTimeout(() => setEtatVideo("repos"), 2500);
  }

  async function basculerFilm() {
    if (etatVideo === "enregistrement") {
      enregistrementRef.current?.arreter();
      return;
    }
    if (etatVideo === "preparation") return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    setEtatVideo("preparation");
    const infos = await demanderInfosWidget(iframe);
    // Animation seule (ni bouton ni champ) : un tour puis arrêt automatique.
    // Durée du tour lue dans les animations CSS, sinon 10 s. Widget
    // interactif, ou réponse absente : arrêt à la main, avec un plafond de
    // 2 minutes pour éviter un enregistrement oublié.
    const auto = infos !== null && !infos.interactif;
    const dureeMs = auto ? Math.min(Math.max((infos?.cycleMs ?? 10000) + 300, 2000), 30000) : 120000;

    let enregistrement: EnregistrementEnCours;
    try {
      enregistrement = await demarrerEnregistrement(iframe);
    } catch (e) {
      if (e instanceof ErreurVideo && e.type === "refuse") {
        // La personne a annulé la fenêtre de permission : pas une erreur.
        setEtatVideo("repos");
        return;
      }
      console.error("[WidgetSandbox] enregistrement impossible :", e);
      signaler(e instanceof ErreurVideo && e.type === "surface" ? "surface" : "echec");
      return;
    }

    enregistrementRef.current = enregistrement;
    setSecondes(0);
    setEtatVideo("enregistrement");
    chronoRef.current = setInterval(() => setSecondes((n) => n + 1), 1000);
    arretAutoRef.current = setTimeout(() => enregistrement.arreter(), dureeMs);

    const resultat = await enregistrement.fini;
    viderMinuteurs();
    enregistrementRef.current = null;
    if (!resultat) {
      signaler("echec");
      return;
    }
    setEtatVideo("preparation");
    const reussi = await telechargerVideo(auto ? "animation" : "widget", resultat);
    signaler(reussi ? "ok" : "echec");
  }

  useEffect(() => {
    setCodeStable(null);
    if (!procheEcran) return;
    const delai = setTimeout(() => setCodeStable(code), 500);
    return () => clearTimeout(delai);
  }, [code, procheEcran]);

  return (
    <BlocExpansible
      titre="Widget interactif"
      icone={AppWindow}
      sousTitre="HTML"
      texteACopier={code}
      contenuEnIframe
      direct
      actionsSupplementaires={
        videoPossible
          ? (avecTexte) => (
              <BoutonFilmerWidget
                etat={etatVideo}
                secondes={secondes}
                avecTexte={avecTexte}
                desactive={codeStable === null}
                surClic={basculerFilm}
              />
            )
          : undefined
      }
      enfant={
        codeStable === null ? (
          <div
            ref={setZoneSqueletteEl}
            style={{ height: HAUTEUR_INITIALE_WIDGET_PX }}
            className="flex w-full flex-col gap-3 rounded-lg border border-dj-bordure p-4"
          >
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="min-h-0 flex-1 rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts allow-forms allow-modals"
            srcDoc={construireDocumentWidget(codeStable, resolu)}
            style={{ height: hauteur }}
            className="w-full rounded-lg border border-dj-bordure transition-[height] duration-200 ease-out motion-reduce:transition-none"
            title="Widget interactif"
          />
        )
      }
    />
  );
}
