"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AppWindow } from "lucide-react";
import { BlocExpansible } from "./BlocExpansible";
import { BoutonFilmerWidget, type EtatVideo } from "./BoutonFilmerWidget";
import { Skeleton } from "@/components/Skeleton";
import { useTheme } from "@/lib/useTheme";
import { useProcheEcran } from "@/lib/useProcheEcran";
import { PALETTES, TYPE_MESSAGE_THEME_WIDGET, scriptThemeWidget, variablesCss, type ThemeIframe } from "@/lib/paletteIframe";
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
// Thème (17/08, v2, puis refait le 04/10/2026) : ce document tourne dans un
// <iframe srcDoc>, un DOCUMENT SÉPARÉ qui n'hérite d'AUCUNE variable CSS de la
// page parente. Les couleurs sont donc résolues ici (lib/paletteIframe.ts, la
// même palette que l'animation) et injectées dans le document sous forme de
// variables --dj-* et d'un objet THEME. Le modèle n'écrit jamais de couleur, de
// fond ni de police : il utilise ces variables, et un changement de thème est
// poussé dans le widget par message sans le recharger.
export function construireDocumentWidget(code: string, theme: ThemeIframe): string {
  const p = PALETTES[theme];
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      /* Le thème arrive sous forme de variables (--dj-fond, --dj-surface,
         --dj-texte, --dj-muet, --dj-bordure, --dj-accent, --dj-degrade,
         --dj-sur-accent, --dj-a à --dj-d) : le modèle n'écrit ni couleur ni
         fond ni police, et un changement de thème les met à jour sans
         recharger le widget (voir scriptThemeWidget). */
      :root{${variablesCss(p)}}
      html,body{margin:0;padding:0;background:transparent;color:var(--dj-texte);
        font-family:'Work Sans',system-ui,sans-serif;}
      *{box-sizing:border-box;}
      /* Jamais de barre de défilement visible sur le document du widget : il
         ne fait qu'un avec le chat, et un dépassement de 1 ou 2 px (arrondi,
         bordure, animation de hauteur) afficherait sinon une barre blanche à
         droite. Le défilement à la molette, au doigt et au clavier reste
         possible (utile en plein écran). !important : le CSS écrit par le
         modèle ne doit pas pouvoir la remettre. */
      html,body{scrollbar-width:none !important;-ms-overflow-style:none !important;}
      html::-webkit-scrollbar,body::-webkit-scrollbar{display:none !important;width:0 !important;height:0 !important;}
      /* Styles par défaut : un widget écrit sans aucun CSS doit déjà être
         correct dans les deux thèmes. Le modèle peut toujours les écraser avec
         son propre <style>, mais il n'a plus besoin d'écrire de couleur. */
      h1,h2,h3,h4,h5,h6{color:var(--dj-texte);margin:0 0 .5em;font-weight:600;line-height:1.25;}
      p{margin:0 0 .75em;line-height:1.5;}
      small,.dj-muet{color:var(--dj-muet);}
      hr{border:0;border-top:1px solid var(--dj-bordure);}
      pre,code{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.9em;}
      pre{background:var(--dj-surface);border:1px solid var(--dj-bordure);border-radius:8px;padding:10px 12px;overflow-x:auto;}
      .dj-carte{background:var(--dj-surface);border:1px solid var(--dj-bordure);border-radius:12px;padding:16px;}
      input, select, textarea{
        background:var(--dj-surface);color:var(--dj-texte);border:1px solid var(--dj-bordure);
        border-radius:8px;padding:6px 10px;font:inherit;font-size:14px;
      }
      input:focus, select:focus, textarea:focus{
        outline:none;border-color:var(--dj-accent);
      }
      /* Curseur, case à cocher, bouton radio, barre de progression : à la
         couleur d'accent, et un curseur sans cadre (sans ça il hérite du
         champ texte ci-dessus et apparaît comme une pilule blanche). */
      input[type=range]{padding:0;border:none;background:transparent;}
      input[type=range],input[type=checkbox],input[type=radio],progress{accent-color:var(--dj-accent);}
      button{
        background:var(--dj-degrade);
        color:var(--dj-sur-accent);border:none;border-radius:8px;padding:7px 14px;
        font:inherit;font-size:14px;font-weight:600;cursor:pointer;
      }
      button:hover{filter:brightness(1.08);}
      button:active{filter:brightness(0.95);}
      table{border-collapse:collapse;}
      td,th{border:1px solid var(--dj-bordure);padding:4px 8px;}
      a{color:var(--dj-accent);}
      #dj-erreur-widget{
        display:none;margin-bottom:10px;padding:8px 10px;border-radius:8px;
        background:rgba(220,60,50,0.15);border:1px solid rgba(220,60,50,0.4);
        color:var(--dj-texte);font-size:12px;font-family:monospace;white-space:pre-wrap;
      }
    </style>
    <script>${scriptThemeWidget(p)}</script>
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
// repliée ni carte autour (option direct de BlocExpansible). Il ne fait qu'un
// avec le chat : ni contour ni coins arrondis sur l'iframe, document au fond
// transparent et sans marge (on voit le fond du chat), et la hauteur suit le
// contenu sans plafond, donc pas de défilement dans le widget lui même.
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

  // Thème : le document est construit avec le thème du moment, puis tout
  // changement de thème est envoyé au widget par message, SANS recharger
  // l'iframe (un rechargement ferait perdre son état : partie en cours, valeurs
  // des curseurs). resoluRef garde le thème courant pour le srcDoc et pour
  // l'envoi au chargement (retour du plein écran, par exemple, où l'iframe est
  // recréée avec le srcDoc d'origine).
  const resoluRef = useRef<ThemeIframe>(resolu);
  resoluRef.current = resolu;
  const srcDoc = useMemo(
    () => (codeStable === null ? undefined : construireDocumentWidget(codeStable, resoluRef.current)),
    [codeStable],
  );
  const envoyerTheme = useCallback((cadre: HTMLIFrameElement | null) => {
    cadre?.contentWindow?.postMessage({ type: TYPE_MESSAGE_THEME_WIDGET, palette: PALETTES[resoluRef.current] }, "*");
  }, []);
  useEffect(() => {
    envoyerTheme(iframeRef.current);
  }, [resolu, envoyerTheme]);

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
    codeStable === null ? "" : codeStable,
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
            className="flex w-full flex-col gap-3"
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
            srcDoc={srcDoc}
            onLoad={(e) => envoyerTheme(e.currentTarget)}
            style={{ height: hauteur }}
            className="block w-full transition-[height] duration-200 ease-out motion-reduce:transition-none"
            title="Widget interactif"
          />
        )
      }
    />
  );
}
