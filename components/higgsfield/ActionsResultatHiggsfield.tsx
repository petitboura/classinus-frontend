"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Download, ExternalLink, Image as IconeImage, Images, Link2, Loader2, Lock, Share2 } from "lucide-react";
import { messageErreur } from "@/lib/erreurs";
import { recupererFichierHiggsfield, signalerPartageTermineHiggsfield } from "@/lib/higgsfieldApi";
import { lienParrainage } from "@/lib/parrainage";
import {
  copierLien,
  ErreurPartageImage,
  partagerContenu,
  peutPartagerFichier,
  preparerImagePourPartage,
  type ModePartage,
} from "@/lib/partagerImage";
import { telechargerContenuLocal } from "@/lib/telecharger";
import { useMonParrainage } from "@/lib/useMonParrainage";
import { Skeleton } from "@/components/Skeleton";

// Boutons d'un résultat Higgsfield. Une VIDÉO garde ses deux liens (Ouvrir, Télécharger), jamais verrouillée.
// Une IMAGE passe par le partage avant d'être téléchargée (chantier parrainage, 09/11/2026) :
//   1. « Télécharger » est verrouillé (cadenas) et « Ouvrir » est caché, car il afficherait l'image à l'état brut.
//   2. « Partager » ouvre le choix : le lien, l'image, ou les deux (la personne décide), plus « Copier le lien ».
//   3. Quand le partage est terminé, l'appli le signale au serveur : il débloque le téléchargement.
// Le lien partagé est le lien de parrainage de la personne : chaque ami qui s'inscrit lui rapporte des images.
// Le chiffre exact (images gagnées par ami) se règle dans la base : il n'est écrit nulle part dans les textes.

type Ton = "vert" | "neutre";

const STYLES: Record<
  Ton,
  { principal: string; secondaire: string; verrouille: string; panneau: string; titre: string; muet: string; puce: string; erreur: string }
> = {
  vert: {
    principal: "bg-emerald-700 text-white hover:bg-emerald-800",
    secondaire: "border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100",
    verrouille: "border border-emerald-200 bg-white/60 text-emerald-800/60",
    panneau: "border-emerald-200 bg-white",
    titre: "text-emerald-900",
    muet: "text-emerald-800/80",
    puce: "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100",
    erreur: "text-red-700",
  },
  neutre: {
    principal: "bg-dj-texte text-dj-fond hover:bg-dj-texte/90",
    secondaire: "border border-dj-bordure bg-dj-fond text-dj-texte hover:bg-dj-surface-haute",
    verrouille: "border border-dj-bordure bg-dj-surface text-dj-texte-muet",
    panneau: "border-dj-bordure bg-dj-fond",
    titre: "text-dj-texte",
    muet: "text-dj-texte-muet",
    puce: "border-dj-bordure bg-dj-surface text-dj-texte hover:bg-dj-surface-haute",
    erreur: "text-red-600",
  },
};

type Props = {
  genre: "image" | "video";
  /** Numéro de la génération côté serveur. Sans lui, le partage ne peut pas débloquer le téléchargement. */
  requestId: string | null;
  url: string;
  titre: string;
  /** Vrai quand le serveur autorise le téléchargement (vidéo, ou image déjà partagée). */
  debloque: boolean;
  /** Appelé quand le serveur confirme le déblocage, pour que l'écran parent le retienne. */
  onDebloque: () => void;
  ton?: Ton;
  /** Élément affiché sur la même ligne que les boutons (par exemple « Enregistré dans ta bibliothèque »). */
  aCote?: ReactNode;
};

type Message = { genre: "info" | "erreur"; texte: string };
type EtatPreparation = "inactive" | "en_cours" | "pret" | "indisponible";

export function ActionsResultatHiggsfield(props: Props) {
  if (props.genre === "video") return <ActionsVideo {...props} />;
  return <ActionsImage {...props} />;
}

// Vidéo : comportement d'avant, deux liens directs, jamais verrouillée (et aucune lecture du parrainage).
function ActionsVideo({ url, ton = "vert", aCote }: Props) {
  const s = STYLES[ton];
  return (
    <div className="flex flex-wrap gap-2">
      <a href={url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${s.principal}`}>
        <ExternalLink className="h-3.5 w-3.5" /> Ouvrir
      </a>
      <a href={url} download className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${s.secondaire}`}>
        <Download className="h-3.5 w-3.5" /> Télécharger
      </a>
      {aCote}
    </div>
  );
}

function ActionsImage({ requestId, url, titre, debloque, onDebloque, ton = "vert", aCote }: Props) {
  const s = STYLES[ton];
  const { resume, charge, enErreur, rafraichir } = useMonParrainage();
  const lien = resume ? lienParrainage(resume.code) : null;

  const [choixOuvert, setChoixOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [telechargement, setTelechargement] = useState(false);
  const [lienCopie, setLienCopie] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [preparation, setPreparation] = useState<EtatPreparation>("inactive");
  const preparationRef = useRef<Promise<File> | null>(null);
  const monteRef = useRef(true);
  const minuteurCopieRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    monteRef.current = true;
    return () => {
      monteRef.current = false;
      if (minuteurCopieRef.current) clearTimeout(minuteurCopieRef.current);
    };
  }, []);

  // Une autre image : tout repart de zéro.
  useEffect(() => {
    preparationRef.current = null;
    setPreparation("inactive");
    setChoixOuvert(false);
    setMessage(null);
  }, [url]);

  // L'image est préparée dès que le choix s'ouvre : le téléchargement doit être fini avant le tap final,
  // sinon certains navigateurs refusent d'ouvrir la fenêtre de partage (voir lib/partagerImage.ts).
  const preparerImage = useCallback(() => {
    if (preparationRef.current) return;
    const promesse = preparerImagePourPartage(url, titre);
    preparationRef.current = promesse;
    setPreparation("en_cours");
    promesse
      .then((fichier) => {
        if (monteRef.current) setPreparation(peutPartagerFichier(fichier) ? "pret" : "indisponible");
      })
      .catch(() => {
        if (monteRef.current) setPreparation("indisponible");
      });
  }, [url, titre]);

  function ouvrirChoix() {
    setMessage(null);
    setChoixOuvert(true);
    preparerImage();
  }

  async function terminerPartage() {
    if (!requestId) return;
    try {
      await signalerPartageTermineHiggsfield(requestId);
      if (!monteRef.current) return;
      onDebloque();
      setChoixOuvert(false);
      setMessage({ genre: "info", texte: "Merci ! Ton image est débloquée, tu peux la télécharger." });
    } catch (e) {
      if (monteRef.current) setMessage({ genre: "erreur", texte: messageErreur(e) });
    }
  }

  async function partager(mode: ModePartage) {
    if (!lien || enCours) return;
    setMessage(null);
    setEnCours(true);
    try {
      const fichier = mode === "lien" ? null : await (preparationRef.current ?? Promise.reject(new ErreurPartageImage("image_indisponible")));
      const resultat = await partagerContenu({ mode, lien, titre, fichier });
      if (resultat === "annule") return;
      await terminerPartage();
    } catch (e) {
      if (!monteRef.current) return;
      if (e instanceof ErreurPartageImage) {
        setMessage({
          genre: "erreur",
          texte:
            e.raison === "image_indisponible"
              ? "Impossible de préparer l'image ici, partage le lien à la place."
              : "Ton appareil ne peut pas envoyer l'image, partage le lien à la place.",
        });
      } else {
        setMessage({ genre: "erreur", texte: messageErreur(e) });
      }
    } finally {
      if (monteRef.current) setEnCours(false);
    }
  }

  async function copier() {
    if (!lien || enCours) return;
    setMessage(null);
    setEnCours(true);
    try {
      const resultat = await copierLien(lien);
      if (resultat === "annule") return;
      setLienCopie(true);
      if (minuteurCopieRef.current) clearTimeout(minuteurCopieRef.current);
      minuteurCopieRef.current = setTimeout(() => setLienCopie(false), 2000);
      await terminerPartage();
    } finally {
      if (monteRef.current) setEnCours(false);
    }
  }

  async function telecharger() {
    if (!debloque) {
      // Le cadenas explique ce qu'il faut faire : on ouvre directement le choix de partage.
      ouvrirChoix();
      setMessage({ genre: "info", texte: "Partage ton image pour la télécharger." });
      return;
    }
    if (!requestId || telechargement) return;
    setMessage(null);
    setTelechargement(true);
    try {
      const { blob, nom } = await recupererFichierHiggsfield(requestId);
      await telechargerContenuLocal(nom, blob, blob.type || "image/png");
    } catch (e) {
      if (monteRef.current) setMessage({ genre: "erreur", texte: messageErreur(e) });
    } finally {
      if (monteRef.current) setTelechargement(false);
    }
  }

  const choixVisible = choixOuvert && !debloque;
  const puceImageDesactivee = preparation === "indisponible" || preparation === "inactive";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {debloque ? (
          <>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex animate-dj-fade-in-rapide items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${s.principal}`}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ouvrir
            </a>
            <button
              type="button"
              onClick={telecharger}
              disabled={telechargement}
              className={`inline-flex animate-dj-fade-in-rapide items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${s.secondaire}`}
            >
              {telechargement ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Télécharger
            </button>
          </>
        ) : (
          <>
            {charge ? (
              <Skeleton className="h-8 w-28 rounded-full" />
            ) : (
              <button
                type="button"
                onClick={ouvrirChoix}
                disabled={!lien || !requestId}
                aria-expanded={choixVisible}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${s.principal}`}
              >
                <Share2 className="h-3.5 w-3.5" /> Partager
              </button>
            )}
            <button
              type="button"
              onClick={telecharger}
              aria-disabled
              title="Partage ton image pour la télécharger"
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${s.verrouille}`}
            >
              <Lock className="h-3.5 w-3.5" /> Télécharger
            </button>
          </>
        )}
        {aCote}
      </div>

      {enErreur && !debloque && (
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-xs ${s.erreur}`}>Impossible de lire ton lien de parrainage, réessaie dans un instant.</p>
          <button type="button" onClick={rafraichir} className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${s.secondaire}`}>
            Réessayer
          </button>
        </div>
      )}

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${choixVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        aria-hidden={!choixVisible}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`flex flex-col gap-2.5 rounded-xl border p-3 ${s.panneau}`}>
            <p className={`text-xs font-bold ${s.titre}`}>Que veux-tu partager ?</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => partager("lien")}
                disabled={enCours || !lien}
                tabIndex={choixVisible ? 0 : -1}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${s.puce}`}
              >
                <Link2 className="h-3.5 w-3.5" /> Le lien
              </button>
              <button
                type="button"
                onClick={() => partager("image")}
                disabled={enCours || !lien || puceImageDesactivee}
                tabIndex={choixVisible ? 0 : -1}
                title={preparation === "indisponible" ? "L'image ne peut pas être envoyée depuis cet appareil" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${s.puce}`}
              >
                {preparation === "en_cours" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <IconeImage className="h-3.5 w-3.5" />} L&apos;image
              </button>
              <button
                type="button"
                onClick={() => partager("les-deux")}
                disabled={enCours || !lien || puceImageDesactivee}
                tabIndex={choixVisible ? 0 : -1}
                title={preparation === "indisponible" ? "L'image ne peut pas être envoyée depuis cet appareil" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${s.puce}`}
              >
                {preparation === "en_cours" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Images className="h-3.5 w-3.5" />} Les deux
              </button>
              <button
                type="button"
                onClick={copier}
                disabled={enCours || !lien}
                tabIndex={choixVisible ? 0 : -1}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${s.secondaire}`}
              >
                {lienCopie ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {lienCopie ? "Lien copié" : "Copier le lien"}
              </button>
            </div>
            <p className={`text-[11px] leading-relaxed ${s.muet}`}>Chaque ami qui s&apos;inscrit avec ton lien te rapporte des images gratuites.</p>
          </div>
        </div>
      </div>

      {message && (
        <p role="status" aria-live="polite" className={`animate-dj-fade-in-rapide text-xs font-semibold ${message.genre === "erreur" ? s.erreur : s.titre}`}>
          {message.texte}
        </p>
      )}
    </div>
  );
}
