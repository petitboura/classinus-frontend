"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ActionsResultatHiggsfield } from "@/components/higgsfield/ActionsResultatHiggsfield";
import { listerGenerationsHiggsfield, type GenerationHiggsfield } from "@/lib/higgsfieldApi";

const INTERVALLE_MS = 8000;
const AFFICHEES = 5;

function libelleEtat(g: GenerationHiggsfield) {
  if (g.etat === "en_cours") return "En cours côté serveur";
  if (g.etat === "terminee") return "Terminée, enregistrée dans ta bibliothèque";
  if (g.etat === "annulee") return "Annulée";
  if (g.etat === "bloquee") return "Bloquée par le filtre";
  return "Échec";
}

/**
 * Générations récentes de l'utilisateur. Le serveur les suit tout seul : on les retrouve ici
 * même après avoir fermé l'application. La liste se rafraîchit tant qu'une génération est en cours.
 */
export function GenerationsRecentesHiggsfield() {
  const [generations, setGenerations] = useState<GenerationHiggsfield[]>([]);
  // Une image pas encore partagée se débloque ici, sous sa ligne (même bloc que dans les fenêtres de génération).
  const [ouverteId, setOuverteId] = useState<string | null>(null);

  function retenirDebloque(requestId: string) {
    setGenerations((liste) => liste.map((g) => (g.request_id === requestId ? { ...g, telechargement_debloque: true } : g)));
  }

  useEffect(() => {
    let actif = true;
    let minuteur: ReturnType<typeof setTimeout> | null = null;

    const charger = async () => {
      let enCours = false;
      try {
        const liste = await listerGenerationsHiggsfield(AFFICHEES);
        if (!actif) return;
        setGenerations(liste);
        enCours = liste.some((g) => g.etat === "en_cours");
      } catch {
        // Liste facultative : en cas d'erreur réseau, on n'affiche rien et on réessaie plus tard.
        enCours = generations.some((g) => g.etat === "en_cours");
      }
      if (actif) minuteur = setTimeout(charger, enCours ? INTERVALLE_MS : INTERVALLE_MS * 4);
    };

    charger();
    return () => {
      actif = false;
      if (minuteur) clearTimeout(minuteur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (generations.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-[20px] border border-dj-bordure bg-dj-surface px-4 py-3.5" aria-label="Mes générations récentes">
      <h2 className="text-sm font-bold text-dj-texte">Mes générations récentes</h2>
      <ul className="flex flex-col gap-1.5">
        {generations.map((g) => {
          // Image pas encore partagée : « Voir » afficherait l'image à l'état brut, on propose le partage à la place.
          const aDebloquer = g.genre === "image" && g.telechargement_debloque === false;
          // Le bloc reste ouvert après le déblocage : il confirme le déblocage et propose « Télécharger ».
          const ouverte = ouverteId === g.request_id && g.genre === "image";
          return (
            <li key={g.request_id} className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2.5">
                {g.etat === "en_cours" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-dj-texte-muet" />
                ) : g.etat === "terminee" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-dj-texte-muet" />
                )}
                <span className="min-w-0 flex-1 truncate font-semibold text-dj-texte">{g.titre}</span>
                <span className="hidden shrink-0 text-xs text-dj-texte-muet sm:inline">{libelleEtat(g)}</span>
                {g.etat === "terminee" && g.url ? (
                  aDebloquer ? (
                    <button
                      type="button"
                      onClick={() => setOuverteId(ouverte ? null : g.request_id)}
                      aria-expanded={ouverte}
                      className="shrink-0 text-xs font-semibold text-dj-texte underline"
                    >
                      Partager
                    </button>
                  ) : (
                    <a href={g.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-dj-texte underline">
                      Voir
                    </a>
                  )
                ) : null}
              </div>
              {ouverte && g.url ? (
                <div className="animate-dj-fade-in-rapide pl-[26px]">
                  <ActionsResultatHiggsfield
                    genre="image"
                    requestId={g.request_id}
                    url={g.url}
                    titre={g.titre}
                    debloque={g.telechargement_debloque === true}
                    onDebloque={() => retenirDebloque(g.request_id)}
                    ton="neutre"
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
