"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageCircle, Send, Trash2, User } from "lucide-react";
import {
  listerCommentairesCatalogue,
  creerCommentaireCatalogue,
  supprimerCommentaireCatalogue,
  type CommentaireCatalogue,
  type TypeElementCataloguePublic,
} from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/Skeleton";

const TAILLE_PAGE = 20;

/**
 * 18/09/2026, chantier "profil contributeur bibliotheque publique",
 * étape 10 : section commentaires réutilisable pour un élément du
 * catalogue public (fichier, dossier ou skill -- voir
 * TypeElementCataloguePublic). Repliée par défaut, mais le nombre total
 * de commentaires reste visible même repliée (décision Bourama). Au
 * dépli, chargement par page avec scroll infini -- même mécanique
 * (sentinelle + IntersectionObserver, rootMargin 200px) que la liste
 * principale de BibliothequePublique.tsx.
 *
 * Poster un commentaire exige un profil public actif (décision Bourama,
 * étape 5/7) : plutôt que de précharger le statut profil_public de la
 * personne connectée avant même qu'elle tente de commenter, on tente
 * l'envoi et on affiche le message clair renvoyé par le backend
 * (PROFIL_PUBLIC_REQUIS_POUR_COMMENTER, voir lib/erreurs.ts) avec un
 * lien direct vers Paramètres > Profil si ce cas précis se présente.
 */
export function SectionCommentairesCatalogue({
  typeElement,
  elementId,
}: {
  typeElement: TypeElementCataloguePublic;
  elementId: string;
}) {
  const [depliee, setDepliee] = useState(false);
  const [commentaires, setCommentaires] = useState<CommentaireCatalogue[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [chargementInitial, setChargementInitial] = useState(false);
  const [chargementPage, setChargementPage] = useState(false);
  const [plusDeResultats, setPlusDeResultats] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [nouveauContenu, setNouveauContenu] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const [profilPublicRequis, setProfilPublicRequis] = useState(false);

  const [monUserId, setMonUserId] = useState<string | null>(null);

  const sentinelleRef = useRef<HTMLDivElement>(null);
  const chargementEnCoursRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMonUserId(session?.user?.id ?? null);
    });
  }, []);

  // Le total (compteur visible même repliée) est chargé dès le montage,
  // indépendamment du dépli -- un seul petit appel (limite=1), jamais
  // toute la première page tant que la section reste fermée.
  useEffect(() => {
    let annule = false;
    listerCommentairesCatalogue(typeElement, elementId, 0, 1)
      .then((res) => {
        if (!annule) setTotal(res.total);
      })
      .catch(() => {
        // Silencieux : le compteur reste juste absent, pas bloquant.
      });
    return () => {
      annule = true;
    };
  }, [typeElement, elementId]);

  async function chargerPlus() {
    if (chargementEnCoursRef.current || !plusDeResultats) return;
    chargementEnCoursRef.current = true;
    setChargementPage(true);
    setErreur(null);
    try {
      const res = await listerCommentairesCatalogue(typeElement, elementId, commentaires.length, TAILLE_PAGE);
      setCommentaires((prev) => [...prev, ...res.commentaires]);
      setTotal(res.total);
      setPlusDeResultats(commentaires.length + res.commentaires.length < res.total);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      chargementEnCoursRef.current = false;
      setChargementPage(false);
      setChargementInitial(false);
    }
  }

  function deplier() {
    if (depliee) return;
    setDepliee(true);
    if (commentaires.length === 0) {
      setChargementInitial(true);
      chargerPlus();
    }
  }

  useEffect(() => {
    if (!depliee) return;
    const cible = sentinelleRef.current;
    if (!cible) return;
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees[0]?.isIntersecting) chargerPlus();
      },
      { rootMargin: "200px" },
    );
    observateur.observe(cible);
    return () => observateur.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depliee, commentaires.length, plusDeResultats]);

  async function envoyerCommentaire() {
    const contenu = nouveauContenu.trim();
    if (!contenu || envoiEnCours) return;
    setEnvoiEnCours(true);
    setErreurEnvoi(null);
    setProfilPublicRequis(false);
    try {
      const cree = await creerCommentaireCatalogue(typeElement, elementId, contenu);
      // Auteur rempli côté client (c'est la personne connectée) -- voir
      // docstring api/commentaires_catalogue_public.py::creer, le
      // backend renvoie volontairement ces champs vides.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCommentaires((prev) => [
        {
          ...cree,
          auteur_nom: user?.user_metadata?.nom_affiche || "Toi",
          auteur_avatar_url: user?.user_metadata?.avatar_url ?? null,
        },
        ...prev,
      ]);
      setTotal((t) => (t ?? 0) + 1);
      setNouveauContenu("");
    } catch (e) {
      if (e instanceof ErreurApi && e.code === "PROFIL_PUBLIC_REQUIS_POUR_COMMENTER") {
        setProfilPublicRequis(true);
      } else {
        setErreurEnvoi(messageErreur(e));
      }
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function supprimer(commentaireId: string) {
    const avant = commentaires;
    setCommentaires((prev) => prev.filter((c) => c.id !== commentaireId));
    setTotal((t) => (t !== null ? Math.max(0, t - 1) : t));
    try {
      await supprimerCommentaireCatalogue(commentaireId);
    } catch (e) {
      setCommentaires(avant);
      setTotal((t) => (t !== null ? t + 1 : t));
      setErreur(messageErreur(e));
    }
  }

  return (
    <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
      <button
        onClick={deplier}
        aria-expanded={depliee}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
          <MessageCircle size={16} className="flex-shrink-0 text-dj-accent-1" />
          Commentaires {total !== null && <span className="text-dj-texte-muet">({total})</span>}
        </span>
        <ChevronDown size={16} className={`flex-shrink-0 text-dj-texte-muet transition-transform ${depliee ? "rotate-180" : ""}`} />
      </button>

      {depliee && (
        <div className="animate-dj-fade-in-rapide flex flex-col gap-3 border-t border-dj-bordure px-5 pb-5 pt-4">
          {monUserId && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <textarea
                  value={nouveauContenu}
                  onChange={(e) => setNouveauContenu(e.target.value)}
                  rows={2}
                  placeholder="Ajouter un commentaire…"
                  className="w-full resize-y rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
                />
                <button
                  onClick={envoyerCommentaire}
                  disabled={envoiEnCours || !nouveauContenu.trim()}
                  aria-label="Envoyer le commentaire"
                  className="flex-shrink-0 rounded-lg bg-dj-accent-1 p-2 text-[#1a0f06] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
                >
                  <Send size={15} />
                </button>
              </div>
              {profilPublicRequis && (
                <p className="text-xs text-dj-texte-muet">
                  Active ton profil public pour pouvoir commenter --{" "}
                  <Link href="/parametres?vue=profil" className="text-dj-accent-1 underline-offset-2 hover:underline">
                    ouvrir Paramètres
                  </Link>
                  .
                </p>
              )}
              {erreurEnvoi && !profilPublicRequis && <p className="text-xs text-[var(--dj-erreur)]">{erreurEnvoi}</p>}
            </div>
          )}

          {chargementInitial ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-4/5 rounded-lg" />
            </div>
          ) : commentaires.length === 0 ? (
            <p className="py-2 text-center text-xs text-dj-texte-muet">Aucun commentaire pour l'instant.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {commentaires.map((c) => (
                <li key={c.id} className="flex items-start gap-2.5">
                  {c.auteur_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.auteur_avatar_url} alt="" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-dj-accent-1/20 text-dj-accent-1">
                      <User size={13} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-dj-texte">{c.auteur_nom || "Anonyme"}</span>
                      <span className="flex-shrink-0 text-[10px] text-dj-texte-muet">
                        {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-dj-texte">{c.contenu}</p>
                  </div>
                  {monUserId === c.utilisateur_id && (
                    <button
                      onClick={() => supprimer(c.id)}
                      aria-label="Supprimer ce commentaire"
                      className="flex-shrink-0 text-dj-texte-muet hover:text-[var(--dj-erreur)]"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {erreur && <p className="text-xs text-[var(--dj-erreur)]">{erreur}</p>}

          {/* Sentinelle du scroll infini, même principe que
              BibliothequePublique.tsx (voir docstring plus haut). */}
          {plusDeResultats && commentaires.length > 0 && (
            <div ref={sentinelleRef} aria-hidden>
              {chargementPage && <Skeleton className="h-10 w-full rounded-lg" />}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
