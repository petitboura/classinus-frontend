"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CanvasLayer,
  CurrentZoom,
  Page,
  Pages,
  Root,
  TextLayer,
  ZoomIn,
  ZoomOut,
  usePdf,
  usePdfJump,
} from "@anaralabs/lector";
import "pdfjs-dist/web/pdf_viewer.css";
import { Download, RotateCw, ZoomIn as IconZoomIn, ZoomOut as IconZoomOut } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Skeleton } from "./Skeleton";
import { AvisPdfLent } from "./AvisPdfLent";
import { telecharger } from "@/lib/telecharger";

// 10/09, remplacement du lecteur PDF -- l'ancien (react-pdf/pdfjs custom,
// avec bascule orientation/mode page-par-page codée à la main) posait trop
// de bugs à maintenir. Bourama a choisi @anaralabs/lector (dernière
// version encore compatible React 18 : 3.7.1 -- 3.7.2 est passée à React
// 19 sans changer de version majeure, vérifié patch par patch avant
// d'installer). Comportement voulu, volontairement simplifié par rapport
// à l'ancien : scroll continu vertical + pincer-zoomer natif (lector gère
// ça lui-même en interne, voir son état isPinching), pas de bascule
// orientation/mode page-par-page.
//
// Le worker PDF servi depuis /public/pdf-worker a été mis à jour pour
// matcher la version de pdfjs-dist qu'installe lector (4.10.x) -- un
// mismatch API/Worker plante au chargement.
import { GlobalWorkerOptions } from "pdfjs-dist";
GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";

// Chargement d'un gros PDF (29/09/2026, demande Bourama) : plutôt que
// d'afficher une erreur au bout de 20 secondes alors que le fichier est
// valide, le chargement continue (pdf.js lit le fichier par morceaux et
// affiche la première page dès qu'elle est prête, le reste arrive en
// continu). Au bout de DELAI_AVIS_MS un avis informe l'utilisateur, avec
// Réessayer et Télécharger, sans rien interrompre. L'erreur définitive
// n'arrive qu'après DELAI_ERREUR_MS, seul garde-fou pour un fichier réellement
// bloqué (lector n'expose aucun callback d'erreur de chargement, vérifié
// dans son code source : un échec de getDocument() est seulement loggé).
const DELAI_AVIS_MS = 15000;

// Taille des tranches demandées au serveur quand pdf.js lit un PDF par morceaux
// (voir VisionneurPdfCharge). Le défaut de pdf.js est 64 Ko, trop petit pour un
// gros livre dont chaque page oblige à lire un endroit différent du fichier.
const TAILLE_TRANCHE_PDF_OCTETS = 4 * 1024 * 1024;
const DELAI_ERREUR_MS = 120000;

// Composant interne : une fois le document chargé (donc à l'intérieur du
// PDFStore fourni par <Root>), saute à la page demandée au montage.
function SautInitial({ page }: { page: number }) {
  const { jumpToPage } = usePdfJump();
  const fait = useRef(false);
  useEffect(() => {
    if (fait.current || page <= 1) return;
    fait.current = true;
    // page ici est 1-indexée (comme l'ancienne API) ; jumpToPage attend
    // un index 0-indexé chez lector (comme pdf.js) -- d'où le -1.
    jumpToPage(page - 1, { behavior: "auto" });
  }, [page, jumpToPage]);
  return null;
}

// 10/10/2026, demande Bourama : un gros livre PDF ne doit jamais être préparé
// en entier. La bibliothèque lector a été corrigée (voir patches/, patch-package) :
// à l'ouverture elle ne lit que la page 1 et suppose que les autres ont la même
// taille. Ce composant charge chaque page seulement quand le défilement l'amène à
// l'écran (lector n'affiche que les pages visibles et deux de chaque côté), puis
// corrige sa vraie taille. Le squelette garde la place pendant le chargement.
function PageALaDemande({ pageNumber = 1 }: { pageNumber?: number }) {
  const pdf = usePdf((s) => s.pdfDocumentProxy);
  const proxies = usePdf((s) => s.pageProxies);
  const viewports = usePdf((s) => s.viewports);
  const virtualizer = usePdf((s) => s.virtualizer);
  const [pret, setPret] = useState(Boolean(proxies[pageNumber - 1]));

  useEffect(() => {
    if (proxies[pageNumber - 1]) {
      setPret(true);
      return;
    }
    let annule = false;
    pdf
      .getPage(pageNumber)
      .then((page) => {
        // Rangée même si l'utilisateur a déjà défilé plus loin : la page reste prête
        // s'il revient.
        if (!proxies[pageNumber - 1]) {
          proxies[pageNumber - 1] = page;
          const reel = page.getViewport({ scale: 1, rotation: page.rotate || 0 });
          const estime = viewports[pageNumber - 1];
          viewports[pageNumber - 1] = reel;
          if (!estime || estime.width !== reel.width || estime.height !== reel.height) {
            virtualizer?.measure();
          }
        }
        if (!annule) setPret(true);
      })
      .catch(() => {
        // Page illisible : le squelette reste, sans interrompre les autres pages.
      });
    return () => {
      annule = true;
    };
  }, [pdf, proxies, viewports, virtualizer, pageNumber]);

  if (!pret) {
    const estime = viewports[pageNumber - 1];
    return (
      <Skeleton
        className="rounded-sm"
        style={{ width: estime?.width ?? 600, height: estime?.height ?? 800 }}
      />
    );
  }

  return (
    <Page pageNumber={pageNumber}>
      <CanvasLayer />
      <TextLayer />
    </Page>
  );
}

export function VisionneurPdf({ url, page = 1 }: { url: string; page?: number }) {
  const [erreur, setErreur] = useState(false);
  const [pretAVerifier, setPretAVerifier] = useState(false);
  const [tailleOctets, setTailleOctets] = useState<number | null>(null);
  // Incrémenté par Réessayer : relance la vérification et remonte le lecteur.
  const [essai, setEssai] = useState(0);

  // Pré-vérification réseau : les échecs les plus courants (URL 404,
  // fichier supprimé côté Supabase, CORS) sont détectés tout de suite au
  // lieu d'attendre le timeout complet ci-dessous.
  //
  // 12/09/2026, Bourama (signalé cassé dans l'appli Android) : cette
  // requête HEAD échoue à tort dans l'appli native alors que le PDF est
  // en réalité valide, ce qui affichait l'erreur avant même d'essayer de
  // l'afficher. Dans l'appli, on saute donc cette pré-vérification et on
  // laisse VisionneurPdfCharge faire le vrai essai ; le timeout plus bas
  // (DELAI_ERREUR_MS) reste le seul garde-fou pour un fichier réellement
  // cassé, comme avant l'ajout de cette pré-vérification.
  //
  // 23/09/2026, correctif Bourama ("les PDF ne marchent plus") : depuis
  // que BulleMessage.tsx ne remonte plus ce composant à chaque chunk de
  // streaming (voir composantsMarkdown), cette pré-vérification ne
  // s'exécute plus qu'UNE seule fois, au moment réel où le bloc apparaît.
  // Pour un PDF tout juste généré, le fichier peut ne pas être encore
  // pleinement disponible côté stockage à ce moment précis (course avec
  // Supabase) -- avant ce correctif, l'ancien remontage répété masquait
  // ce cas en réessayant sans le vouloir à chaque chunk suivant ; un seul
  // essai le transforme en erreur permanente. Ajout de 3 tentatives
  // espacées de 800ms avant d'abandonner et d'afficher l'erreur.
  useEffect(() => {
    let annule = false;
    setErreur(false);
    setPretAVerifier(false);

    const TENTATIVES_MAX = 3;
    const DELAI_ENTRE_TENTATIVES_MS = 800;

    function verifier(tentative: number) {
      fetch(url, { method: "HEAD" })
        .then((reponse) => {
          if (annule) return;
          if (reponse.ok) {
            const longueur = Number(reponse.headers.get("content-length"));
            setTailleOctets(Number.isFinite(longueur) && longueur > 0 ? longueur : null);
            setPretAVerifier(true);
          } else if (tentative < TENTATIVES_MAX) {
            setTimeout(() => !annule && verifier(tentative + 1), DELAI_ENTRE_TENTATIVES_MS);
          } else {
            setErreur(true);
          }
        })
        .catch(() => {
          if (annule) return;
          if (tentative < TENTATIVES_MAX) {
            setTimeout(() => !annule && verifier(tentative + 1), DELAI_ENTRE_TENTATIVES_MS);
          } else {
            setErreur(true);
          }
        });
    }

    // Fichier local du navigateur (blob:, data:) : c'est ce que reçoit le
    // lecteur pour un PDF choisi mais pas encore envoyé, et pour la bulle
    // qui vient d'être envoyée. Une requête HEAD est refusée sur ces
    // adresses par le navigateur (seul GET est permis), elle échouait donc
    // à chaque fois et affichait l'erreur alors que le fichier est valide.
    // Rien à vérifier par le réseau : le fichier est déjà sur la machine.
    if (!/^https?:/i.test(url)) {
      setPretAVerifier(true);
      return () => {
        annule = true;
      };
    }

    import("@capacitor/core").then(({ Capacitor }) => {
      if (annule) return;
      if (Capacitor.isNativePlatform()) {
        setPretAVerifier(true);
        return;
      }
      verifier(1);
    });

    return () => {
      annule = true;
    };
  }, [url, essai]);

  if (erreur) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center text-dj-texte-muet">
        <p>Impossible d&apos;afficher ce PDF ici.</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setEssai((n) => n + 1)}
            className="flex items-center gap-1 text-dj-accent-1-texte hover:underline"
          >
            <RotateCw size={14} /> Réessayer
          </button>
          <button
            type="button"
            onClick={() => telecharger(url, "document.pdf")}
            className="flex items-center gap-1 text-dj-accent-1-texte hover:underline"
          >
            <Download size={14} /> Télécharger
          </button>
        </div>
      </div>
    );
  }

  if (!pretAVerifier) {
    return (
      <div className="flex h-full justify-center p-4" aria-hidden>
        <Skeleton className="rounded-lg" style={{ width: "min(100%, 640px)", aspectRatio: "1 / 1.414" }} />
      </div>
    );
  }

  return (
    <VisionneurPdfCharge
      key={essai}
      url={url}
      page={page}
      tailleOctets={tailleOctets}
      onErreur={() => setErreur(true)}
      surReessayer={() => setEssai((n) => n + 1)}
    />
  );
}

function VisionneurPdfCharge({
  url,
  page,
  tailleOctets,
  onErreur,
  surReessayer,
}: {
  url: string;
  page: number;
  tailleOctets: number | null;
  onErreur: () => void;
  surReessayer: () => void;
}) {
  const delaiErreurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delaiAvisRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lent, setLent] = useState(false);

  // 10/10/2026, demande Bourama (ouvrir un gros livre PDF bloquait le
  // navigateur puis le PC) : le lecteur demande d'un coup les infos de TOUTES
  // les pages, et pdf.js lit alors le fichier par tranches de 64 Ko. Pour un
  // livre de plusieurs centaines de pages, cela donnait plus de 150 demandes en
  // 45 secondes (vu dans les journaux du serveur, une demande de relais chacune).
  // Des tranches de 4 Mo ramènent ce nombre à quelques dizaines au plus. Seules
  // les adresses réseau sont concernées (un fichier local blob: ou data: reste
  // lu tel quel). L'objet est mémorisé : lector recharge le document dès que
  // sa valeur change, un nouvel objet à chaque rendu relancerait tout.
  const source = useMemo(() => (/^https?:/i.test(url) ? { url, rangeChunkSize: TAILLE_TRANCHE_PDF_OCTETS } : url), [url]);

  useEffect(() => {
    delaiAvisRef.current = setTimeout(() => setLent(true), DELAI_AVIS_MS);
    delaiErreurRef.current = setTimeout(onErreur, DELAI_ERREUR_MS);
    return () => {
      if (delaiAvisRef.current) clearTimeout(delaiAvisRef.current);
      if (delaiErreurRef.current) clearTimeout(delaiErreurRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CORRECTIF 2026-09-10 (plantage "Cannot read properties of null
  // (reading 'subscribe')" -- voir GardeApercu.tsx) : ZoomOut/CurrentZoom/
  // ZoomIn lisent l'état du lecteur via le contexte que <Root> fournit à
  // SES enfants -- ils doivent donc être DEDANS <Root>, pas juste dans le
  // même <div> que lui. Rendus en dehors comme avant, leur contexte vaut
  // null et ils plantent au tout premier rendu (donc pour absolument tout
  // PDF, Bibliothèque comme chat). <Root> devient ici le conteneur flex
  // englobant (au lieu de n'entourer que la zone de pages), la barre de
  // zoom passe dans ses children, en dessous de <Pages>.
  return (
    <div className="relative h-full">
    <Root
      source={source}
      className="flex h-full flex-col overflow-hidden"
      loader={
        <div className="flex h-full justify-center p-4" aria-hidden>
          <Skeleton className="rounded-lg" style={{ width: "min(100%, 640px)", aspectRatio: "1 / 1.414" }} />
        </div>
      }
      isZoomFitWidth
      zoomOptions={{ minZoom: 0.5, maxZoom: 4 }}
      onDocumentLoad={() => {
        // le chargement a réussi : on annule l'avis et le garde-fou.
        if (delaiAvisRef.current) clearTimeout(delaiAvisRef.current);
        if (delaiErreurRef.current) clearTimeout(delaiErreurRef.current);
        setLent(false);
      }}
    >
      <SautInitial page={page} />
      <Pages className="flex-1 overflow-auto p-3">
        <PageALaDemande />
      </Pages>

      <div className="flex items-center justify-center gap-2 border-t border-dj-bordure px-3 py-2 text-xs text-dj-texte-muet">
        <ZoomOut
          className="flex items-center gap-1 rounded-full border border-dj-bordure p-1.5 transition-colors hover:text-dj-texte"
          aria-label="Zoom arrière"
        >
          <IconZoomOut size={14} />
        </ZoomOut>
        <span className="flex items-center gap-0.5">
          <CurrentZoom className="w-10 rounded-md border border-dj-bordure bg-transparent px-1 py-0.5 text-center text-dj-texte" />
          %
        </span>
        <ZoomIn
          className="flex items-center gap-1 rounded-full border border-dj-bordure p-1.5 transition-colors hover:text-dj-texte"
          aria-label="Zoom avant"
        >
          <IconZoomIn size={14} />
        </ZoomIn>
      </div>
    </Root>
    <AnimatePresence>
      {lent && (
        <AvisPdfLent tailleOctets={tailleOctets} surReessayer={surReessayer} surTelecharger={() => telecharger(url, "document.pdf")} />
      )}
    </AnimatePresence>
    </div>
  );
}
