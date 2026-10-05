"use client";

import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { Archive, Code, FileSpreadsheet, FileText, MapPin, Play, Presentation, X } from "lucide-react";
import { libellePieceJointe } from "@/lib/texteColle";

// Ligne unique de pièces jointes, défilable à droite et à gauche, utilisée
// à l'identique avant l'envoi (barre de saisie) et après l'envoi (bulle du
// message). Deux modèles : un carré pour les images et les vidéos, une
// pilule pour tout le reste. Les pilules s'empilent par deux, pour que
// deux pilules occupent exactement la hauteur d'un carré et restent
// alignées avec lui sur la ligne.

export type GenrePiece = "image" | "video" | "audio" | "document" | "zip" | "texte" | "position";

export interface PieceApercu {
  id: string;
  /** Nom du fichier, ou libellé pour une pièce qui n'est pas un fichier. */
  nom: string;
  genre: GenrePiece;
  /** Source de la vignette (image, vidéo). Sans elle, l'image devient une pilule. */
  url?: string | null;
  /** Message d'échec d'upload : la pièce s'affiche en erreur, sans bloquer les autres. */
  erreur?: string;
  /** Texte collé : contenu complet et langage détecté, pour le libellé et l'infobulle. */
  contenu?: string;
  langage?: string | null;
}

// Tailles de référence : un carré fait --taille-piece de côté. Une pilule
// fait la moitié de cette taille moins l'espace entre deux pilules, soit
// 0.375rem (gap-1.5) : la classe de hauteur des pilules et le gap de leur
// colonne doivent rester sur cette même valeur.
const TAILLE_PIECE = { saisie: "4rem", envoye: "3.5rem" } as const;
const LONGUEUR_INFOBULLE_TEXTE = 160;

// Accent par format de document, pour reconnaître d'un coup d'oeil un PDF,
// un Word, un Excel ou un PowerPoint. Les autres restent neutres.
const ACCENTS_EXTENSION: Record<string, { Icone: typeof FileText; classe: string }> = {
  pdf: { Icone: FileText, classe: "text-red-400" },
  doc: { Icone: FileText, classe: "text-blue-400" },
  docx: { Icone: FileText, classe: "text-blue-400" },
  xls: { Icone: FileSpreadsheet, classe: "text-emerald-400" },
  xlsx: { Icone: FileSpreadsheet, classe: "text-emerald-400" },
  csv: { Icone: FileSpreadsheet, classe: "text-emerald-400" },
  ppt: { Icone: Presentation, classe: "text-orange-400" },
  pptx: { Icone: Presentation, classe: "text-orange-400" },
};

function iconePilule(piece: PieceApercu): { Icone: typeof FileText; classe: string } {
  if (piece.genre === "texte") return { Icone: piece.langage ? Code : FileText, classe: "text-dj-texte-muet" };
  if (piece.genre === "position") return { Icone: MapPin, classe: "text-dj-texte-muet" };
  if (piece.genre === "audio") return { Icone: Play, classe: "text-dj-texte-muet" };
  if (piece.genre === "zip") return { Icone: Archive, classe: "text-dj-texte-muet" };
  const ext = piece.nom.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return ACCENTS_EXTENSION[ext] ?? { Icone: FileText, classe: "text-dj-texte-muet" };
}

function estCarre(piece: PieceApercu): boolean {
  return !piece.erreur && !!piece.url && (piece.genre === "image" || piece.genre === "video");
}

type Colonne = { carre: PieceApercu } | { pilules: PieceApercu[] };

// Remplit les colonnes dans l'ordre d'ajout : un carré a sa propre colonne,
// les pilules se rangent par deux, une pilule seule reste en haut.
function grouperEnColonnes(pieces: PieceApercu[]): Colonne[] {
  const colonnes: Colonne[] = [];
  for (const piece of pieces) {
    if (estCarre(piece)) {
      colonnes.push({ carre: piece });
      continue;
    }
    const derniere = colonnes[colonnes.length - 1];
    if (derniere && "pilules" in derniere && derniere.pilules.length < 2) derniere.pilules.push(piece);
    else colonnes.push({ pilules: [piece] });
  }
  return colonnes;
}

export function LigneApercuPieces({
  pieces,
  taille = "saisie",
  onOuvrir,
  onRetirer,
  renduSurCarre,
}: {
  pieces: PieceApercu[];
  taille?: keyof typeof TAILLE_PIECE;
  onOuvrir: (piece: PieceApercu) => void;
  /** Absent après l'envoi : aucune croix n'est affichée. */
  onRetirer?: (id: string) => void;
  /** Actions supplémentaires posées dans un carré (par exemple l'extraction de formule). */
  renduSurCarre?: (piece: PieceApercu) => ReactNode;
}) {
  const refLigne = useRef<HTMLDivElement>(null);
  const [bords, setBords] = useState({ gauche: false, droite: false });
  const [sortants, setSortants] = useState<Set<string>>(new Set());
  // Une pièce ne joue son animation d'entrée qu'à sa première apparition,
  // pas à chaque fois qu'un regroupement la remonte dans une autre colonne.
  const dejaVues = useRef<Set<string>>(new Set());

  useEffect(() => {
    pieces.forEach((p) => dejaVues.current.add(p.id));
  }, [pieces]);

  function mesurerBords() {
    const el = refLigne.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setBords({ gauche: el.scrollLeft > 1, droite: el.scrollLeft < max - 1 });
  }

  useEffect(() => {
    const el = refLigne.current;
    if (!el) return;
    mesurerBords();
    const observateur = new ResizeObserver(mesurerBords);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [pieces.length]);

  // Souris sans défilement horizontal : la molette fait défiler la ligne
  // tant qu'il reste de la place dans ce sens, puis rend la main à la page.
  useEffect(() => {
    const el = refLigne.current;
    if (!el) return;
    function surMolette(e: WheelEvent) {
      if (!el || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const versLaDroite = e.deltaY > 0;
      if ((versLaDroite && el.scrollLeft >= max - 1) || (!versLaDroite && el.scrollLeft <= 0)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    el.addEventListener("wheel", surMolette, { passive: false });
    return () => el.removeEventListener("wheel", surMolette);
  }, []);

  // Sortie en fondu avant le retrait réel, jamais de disparition brute.
  function retirer(id: string) {
    if (!onRetirer) return;
    setSortants((prec) => new Set(prec).add(id));
    setTimeout(() => {
      onRetirer(id);
      setSortants((prec) => {
        const suite = new Set(prec);
        suite.delete(id);
        return suite;
      });
    }, 150);
  }

  function classeAnimation(id: string) {
    if (sortants.has(id)) return "scale-90 opacity-0 transition duration-150 ease-in";
    return dejaVues.current.has(id) ? "" : "animate-dj-fade-in-rapide";
  }

  const colonnes = grouperEnColonnes(pieces);
  const masque =
    bords.gauche && bords.droite
      ? "[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]"
      : bords.gauche
      ? "[mask-image:linear-gradient(to_right,transparent,black_16px)]"
      : bords.droite
      ? "[mask-image:linear-gradient(to_left,transparent,black_16px)]"
      : "";

  return (
    <div
      ref={refLigne}
      onScroll={mesurerBords}
      style={{ "--taille-piece": TAILLE_PIECE[taille] } as CSSProperties}
      className={`flex items-start gap-2 overflow-x-auto overscroll-x-contain py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${masque}`}
    >
      {colonnes.map((colonne) => {
        if ("carre" in colonne) {
          const { carre } = colonne;
          return (
            <div key={carre.id} className={`relative shrink-0 ${classeAnimation(carre.id)}`}>
              <button
                onClick={() => onOuvrir(carre)}
                aria-label={carre.genre === "video" ? `Lire ${carre.nom}` : `Agrandir ${carre.nom}`}
                className="relative block h-[var(--taille-piece)] w-[var(--taille-piece)] overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface-haute"
              >
                {carre.genre === "image" ? (
                  // Source dynamique (aperçu local ou fichier envoyé), pas un asset optimisable.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={carre.url ?? ""} alt={carre.nom} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <video
                      src={carre.url ?? undefined}
                      preload="metadata"
                      muted
                      playsInline
                      className="pointer-events-none h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                        <Play size={12} />
                      </span>
                    </span>
                  </>
                )}
              </button>
              {onRetirer && (
                <button
                  onClick={() => retirer(carre.id)}
                  aria-label="Retirer le fichier"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-dj-fond/85 text-dj-texte-muet hover:text-dj-texte"
                >
                  <X size={12} />
                </button>
              )}
              {renduSurCarre?.(carre)}
            </div>
          );
        }

        return (
          <div key={colonne.pilules[0].id} className="flex w-36 shrink-0 flex-col gap-1.5 sm:w-40">
            {colonne.pilules.map((piece) => {
              const { Icone, classe } = iconePilule(piece);
              const enErreur = !!piece.erreur;
              const libelle = enErreur
                ? `${piece.nom} : ${piece.erreur}`
                : piece.genre === "texte" && piece.contenu !== undefined
                ? libellePieceJointe(piece.langage ?? null, piece.contenu)
                : piece.nom;
              const infobulle = enErreur
                ? `${piece.nom}, ${piece.erreur}`
                : piece.genre === "texte" && piece.contenu
                ? piece.contenu.slice(0, LONGUEUR_INFOBULLE_TEXTE)
                : piece.nom;
              return (
                <div
                  key={piece.id}
                  title={infobulle}
                  className={`flex h-[calc((var(--taille-piece)-0.375rem)/2)] min-w-0 items-center gap-1.5 rounded-full border px-2.5 text-xs leading-none ${
                    enErreur
                      ? "border-red-400/40 bg-red-400/10 text-red-400"
                      : "border-dj-bordure bg-dj-surface-haute text-dj-texte-muet"
                  } ${classeAnimation(piece.id)}`}
                >
                  <button
                    onClick={() => !enErreur && onOuvrir(piece)}
                    aria-label={enErreur ? piece.nom : piece.genre === "position" ? libelle : `Ouvrir ${libelle}`}
                    disabled={enErreur || piece.genre === "position"}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left hover:text-dj-texte disabled:hover:text-inherit"
                  >
                    <Icone size={12} className={`shrink-0 ${enErreur ? "" : classe}`} />
                    <span className="min-w-0 truncate">{libelle}</span>
                  </button>
                  {onRetirer && (
                    <button
                      onClick={() => retirer(piece.id)}
                      aria-label="Retirer le fichier"
                      className="shrink-0 hover:text-dj-texte"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
