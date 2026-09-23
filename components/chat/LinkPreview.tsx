"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { Skeleton } from "../Skeleton";
import { creerMemoireElements } from "@/lib/memoireElementsRiches";
import { API_URL } from "@/lib/api";
import { traiterLienSortant } from "@/lib/liensSortants";

// Aperçu de lien dans le chat -- demande de Bourama (2026-07-20) : "n'importe
// quel lien génère un aperçu... comme dans n'importe quelle plateforme"
// (comparaison explicite avec la miniature YouTube). Utilisé par le
// composant `a` custom de BulleMessage.tsx pour tout lien qui n'est ni un
// fichier téléchargeable (FichierChip) ni un média direct (LecteurMedia).
//
// Deux chemins :
//   - YouTube : l'oEmbed public (https://www.youtube.com/oembed) renvoie
//     déjà les en-têtes CORS nécessaires pour un fetch() direct côté
//     client -- pas besoin de passer par notre route serveur pour ce cas.
//   - Générique : passe par GET {API_URL}/api/apercu-lien (backend
//     FastAPI, voir api/apercu_lien.py côté clovis-backend) qui récupère
//     les balises Open Graph côté serveur (CORS bloquerait un fetch
//     direct pour la quasi-totalité des sites).
//
// 17/09/2026, CORRECTIF Bourama ("beaucoup d'aperçus ne marchent plus du
// tout") : cet appel visait jusqu'ici `/api/apercu-lien` en RELATIF (même
// origine que le frontend Next.js) -- une route qui n'a en fait jamais
// existé dans ce dépôt (copiée depuis djiguigne-frontend le 08/08 sans
// son fichier de route). Tout lien non-YouTube échouait donc
// silencieusement. Pointe désormais vers le backend FastAPI (comme tout
// le reste du dynamique de l'app), qui répond {} sans erreur HTTP quand
// aucune métadonnée n'est trouvée -- traité ci-dessous comme un échec.
//
// Repli : si aucune métadonnée n'est trouvée (site qui bloque, erreur
// réseau, timeout...), on retombe sur un lien texte classique -- jamais de
// carte vide ou cassée. Pendant le chargement, un squelette discret plutôt
// qu'un vide brutal (cohérent avec la demande de fluidité de Bourama).
function idYoutube(href: string): string | null {
  const motifs = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const motif of motifs) {
    const trouve = href.match(motif);
    if (trouve) return trouve[1];
  }
  return null;
}

type Apercu = { titre: string | null; image: string | null; description: string | null; siteName: string };

// Lecteur YouTube embarqué (31/07, demande Bourama : "ça se lit
// directement, tel quel" -- plus de sortie vers youtube.com). YouTube
// autorise explicitement l'intégration via son iframe officiel
// (contrairement à la quasi-totalité des autres sites, bloqués par
// X-Frame-Options -- voir la discussion sur les liens externes en
// général). autoplay=1 : la vignette servait déjà de "aperçu", inutile de
// forcer un second clic une fois qu'on a choisi de lancer la lecture.
function LecteurYoutubeInline({ idVideo, onFermer }: { idVideo: string; onFermer: () => void }) {
  return (
    <span className="relative block aspect-video w-full overflow-hidden bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${idVideo}?autoplay=1`}
        title="Lecteur YouTube"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
      <button
        onClick={onFermer}
        aria-label="Fermer la vidéo"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90"
      >
        <X size={15} />
      </button>
    </span>
  );
}

// Mémoire (23/09/2026) : un aperçu déjà chargé réapparaît tout de suite s'il
// se remonte, sans nouvel appel réseau ni écran de chargement.
const memoireApercus = creerMemoireElements<{ apercu: Apercu | null; echec: boolean }>();

export function LinkPreview({ href, texteLien, compact }: { href: string; texteLien: string; compact?: boolean }) {
  const [apercu, setApercu] = useState<Apercu | null>(() => memoireApercus.lire(href)?.apercu ?? null);
  const [echec, setEchec] = useState(() => memoireApercus.lire(href)?.echec ?? false);
  const [charge, setCharge] = useState(() => memoireApercus.lire(href) !== undefined);
  const [enLecture, setEnLecture] = useState(false);
  const idVideo = idYoutube(href);

  useEffect(() => {
    let annule = false;

    // Déjà chargé auparavant : rien à redemander.
    if (memoireApercus.lire(href)) return;

    if (idVideo) {
      fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(href)}&format=json`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          const resultat = {
            titre: data.title || null,
            image: `https://img.youtube.com/vi/${idVideo}/hqdefault.jpg`,
            description: data.author_name ? `YouTube · ${data.author_name}` : "YouTube",
            siteName: "YouTube",
          };
          memoireApercus.ecrire(href, { apercu: resultat, echec: false });
          if (annule) return;
          setApercu(resultat);
        })
        .catch(() => !annule && setEchec(true))
        .finally(() => !annule && setCharge(true));
      return () => {
        annule = true;
      };
    }

    fetch(`${API_URL}/api/apercu-lien?url=${encodeURIComponent(href)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const vide = !data?.titre && !data?.image;
        memoireApercus.ecrire(href, { apercu: vide ? null : data, echec: vide });
        if (annule) return;
        // Le backend renvoie {} (200, pas d'erreur HTTP) quand aucune
        // métadonnée n'est trouvée -- distinct d'une erreur réseau, mais
        // même repli côté affichage : lien texte brut, jamais de carte vide.
        if (vide) {
          setEchec(true);
        } else {
          setApercu(data);
        }
      })
      .catch(() => !annule && setEchec(true))
      .finally(() => !annule && setCharge(true));

    return () => {
      annule = true;
    };
  }, [href, idVideo]);

  // Repli : lien texte classique, tant que rien n'est chargé ou si l'aperçu
  // a échoué -- jamais de carte vide affichée.
  if (echec || (charge && !apercu)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-dj-texte-muet underline hover:text-dj-texte">
        {texteLien}
      </a>
    );
  }

  if (!charge) {
    if (compact) {
      return (
        <span className="my-2 flex h-20 w-full max-w-sm items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface px-3">
          <Skeleton as="span" className="h-14 w-14 shrink-0 rounded-lg" />
          <span className="flex-1 space-y-2">
            <Skeleton as="span" className="block h-3 w-3/4 rounded" />
            <Skeleton as="span" className="block h-3 w-1/2 rounded" style={{ animationDelay: "150ms" }} />
          </span>
        </span>
      );
    }
    return idVideo ? (
      <span className="my-2 block w-full max-w-md overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface">
        <Skeleton as="span" className="block aspect-video w-full" />
        <span className="block space-y-2 p-3">
          <Skeleton as="span" className="block h-3.5 w-3/4 rounded" />
          <Skeleton as="span" className="block h-3 w-1/3 rounded" style={{ animationDelay: "150ms" }} />
        </span>
      </span>
    ) : (
      <span className="my-2 flex h-24 w-full max-w-md items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface px-3">
        <Skeleton as="span" className="h-20 w-20 shrink-0 rounded-lg" />
        <span className="flex-1 space-y-2">
          <Skeleton as="span" className="block h-3.5 w-3/4 rounded" />
          <Skeleton as="span" className="block h-3 w-1/2 rounded" style={{ animationDelay: "150ms" }} />
        </span>
      </span>
    );
  }

  if (compact) {
    // Vidéo en lecture (31/07) : remplace la miniature par le lecteur
    // embarqué, garde le titre en dessous, bouton fermer dans
    // LecteurYoutubeInline pour revenir à la miniature.
    if (idVideo && enLecture) {
      return (
        <span className="my-2 block w-full max-w-sm animate-dj-fade-in overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface">
          <LecteurYoutubeInline idVideo={idVideo} onFermer={() => setEnLecture(false)} />
          <span className="block truncate p-2 text-sm text-dj-texte">{apercu!.titre || texteLien}</span>
        </span>
      );
    }
    return (
      <button
        onClick={() => (idVideo ? setEnLecture(true) : traiterLienSortant(href, { titre: apercu?.titre || texteLien }))}
        className="my-2 flex w-full max-w-sm animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-2 text-left transition-colors hover:border-dj-bordure-forte"
      >
        {apercu!.image && (
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-dj-surface-haute">
            {/* eslint-disable-next-line @next/next/no-img-element -- aperçu externe (og:image / miniature YouTube), pas un asset local */}
            <img src={apercu!.image} alt="" className="h-full w-full object-cover" />
            {idVideo && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                <Play size={16} className="fill-white text-white" />
              </span>
            )}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-dj-texte">{apercu!.titre || texteLien}</span>
          <span className="block truncate text-[11px] text-dj-texte-muet">{apercu!.siteName}</span>
        </span>
        {!idVideo && <ExternalLink size={13} className="shrink-0 text-dj-texte-muet" />}
      </button>
    );
  }

  // Format vidéo pour YouTube (miniature 16:9 pleine largeur, comme sur
  // les autres plateformes) -- la carte compacte 56x56px d'avant "faisait
  // petit" pour une vignette vidéo (retour de Bourama en test réel).
  // Les liens génériques restent en carte horizontale, juste agrandie.
  // Réservé aux messages assistant (compact absent/false) -- Bourama veut
  // garder l'ancien format côté utilisateur.
  if (idVideo) {
    // Vidéo en lecture (31/07, demande Bourama : "ça se lit directement
    // tel quel") : remplace la miniature par le lecteur embarqué en
    // pleine largeur, directement dans le fil de la conversation.
    if (enLecture) {
      return (
        <span className="my-2 block w-full max-w-md animate-dj-fade-in overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface">
          <LecteurYoutubeInline idVideo={idVideo} onFermer={() => setEnLecture(false)} />
          <span className="block p-3">
            <span className="block truncate text-sm text-dj-texte">{apercu!.titre || texteLien}</span>
            <span className="block truncate text-[12px] text-dj-texte-muet">{apercu!.description}</span>
          </span>
        </span>
      );
    }
    return (
      <button
        onClick={() => setEnLecture(true)}
        className="my-2 block w-full max-w-md animate-dj-fade-in overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface text-left transition-colors hover:border-dj-bordure-forte"
      >
        {apercu!.image && (
          <span className="relative block aspect-video w-full overflow-hidden bg-dj-surface-haute">
            {/* eslint-disable-next-line @next/next/no-img-element -- miniature YouTube externe, pas un asset local */}
            <img src={apercu!.image} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60">
                <Play size={20} className="fill-white text-white" />
              </span>
            </span>
          </span>
        )}
        <span className="block p-3">
          <span className="block truncate text-sm text-dj-texte">{apercu!.titre || texteLien}</span>
          <span className="block truncate text-[12px] text-dj-texte-muet">{apercu!.description}</span>
        </span>
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 flex w-full max-w-md animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-2.5 no-underline transition-colors hover:border-dj-bordure-forte"
    >
      {apercu!.image && (
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-dj-surface-haute">
          {/* eslint-disable-next-line @next/next/no-img-element -- aperçu externe (og:image), pas un asset local */}
          <img src={apercu!.image} alt="" className="h-full w-full object-cover" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-dj-texte">{apercu!.titre || texteLien}</span>
        <span className="block truncate text-[12px] text-dj-texte-muet">{apercu!.siteName}</span>
      </span>
      <ExternalLink size={14} className="shrink-0 text-dj-texte-muet" />
    </a>
  );
}
