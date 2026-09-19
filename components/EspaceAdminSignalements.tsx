"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X as IconRejeter } from "lucide-react";
import { listerSignalements, traiterSignalement, type Signalement } from "@/lib/api";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { Skeleton } from "./Skeleton";
import { clesRequetes } from "@/lib/clesRequetes";

// Traitement des signalements (bibliothèque publique). 22/08, chantier
// "rendre la bibliothèque plus sérieuse". Réservé aux admins
// (_est_admin côté backend, voir api/signalements.py), aucune
// vérification client-side du rôle ici volontairement (pas de
// mécanisme de rôle exposé côté Classinus, voir lib/api.ts) : le 403
// renvoyé par l'API est la seule porte, affiché tel quel si
// l'utilisateur courant n'est pas admin.
export function EspaceAdminSignalements() {
  const queryClient = useQueryClient();
  const [accesRefuse, setAccesRefuse] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enTraitement, setEnTraitement] = useState<string | null>(null);

  const { data: liste } = useQuery({
    queryKey: clesRequetes.adminSignalements,
    queryFn: async () => {
      try {
        return await listerSignalements("en_attente");
      } catch (e) {
        if (e instanceof ErreurApi && e.statusCode === 403) setAccesRefuse(true);
        else setErreur(messageErreur(e));
        return [] as Signalement[];
      }
    },
  });

  // Chargement initial porté par le useQuery plus haut. charger() garde
  // ce nom pour ne pas toucher ses éventuels points d'appel ailleurs.
  function charger() {
    queryClient.invalidateQueries({ queryKey: clesRequetes.adminSignalements });
  }

  async function traiter(id: string, action: "retire" | "rejete") {
    setEnTraitement(id);
    try {
      await traiterSignalement(id, action);
      queryClient.setQueryData<Signalement[]>(clesRequetes.adminSignalements, (l) =>
        (l ?? []).filter((s) => s.id !== id)
      );
    } catch (e) {
      window.alert(messageErreur(e));
    } finally {
      setEnTraitement(null);
    }
  }

  if (accesRefuse) {
    return <p className="text-sm text-dj-texte-muet">Réservé aux administrateurs.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

      {liste === undefined && (
        <div className="flex flex-col gap-3" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-40 rounded" style={{ animationDelay: `${i * 100}ms` }} />
                <Skeleton
                  className="h-4 w-28 flex-shrink-0 rounded-full border border-dj-bordure"
                  style={{ animationDelay: `${i * 100 + 40}ms` }}
                />
              </div>
              <Skeleton className="h-3.5 w-full rounded" style={{ animationDelay: `${i * 100 + 80}ms` }} />
              <Skeleton className="h-3 w-48 rounded" style={{ animationDelay: `${i * 100 + 120}ms` }} />
              <div className="flex justify-end gap-2 pt-1">
                <Skeleton
                  className="h-6 w-16 rounded-cgpt-bouton"
                  style={{ animationDelay: `${i * 100 + 160}ms` }}
                />
                <Skeleton
                  className="h-6 w-32 rounded-cgpt-bouton"
                  style={{ animationDelay: `${i * 100 + 200}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {liste?.length === 0 && <p className="text-sm text-dj-texte-muet">Aucun signalement en attente.</p>}
      {liste && liste.length > 0 && (
        <div className="flex flex-col gap-3">
          {liste.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-dj-texte">{s.lien_document}</p>
                <span className="flex-shrink-0 rounded-full border border-dj-bordure px-2 py-0.5 text-[11px] text-dj-texte-muet">
                  Bibliothèque publique
                </span>
              </div>
              <p className="text-sm text-dj-texte-muet">{s.motif}</p>
              <p className="text-xs text-dj-texte-muet">
                Signalé par {s.plaignant_nom} ({s.plaignant_email})
                {s.plaignant_organisation ? ` — ${s.plaignant_organisation}` : ""}
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => traiter(s.id, "rejete")}
                  disabled={enTraitement === s.id}
                  className="flex items-center gap-1 rounded-cgpt-bouton border border-dj-bordure px-3 py-1.5 text-xs text-dj-texte-muet transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
                >
                  <IconRejeter size={13} /> Rejeter
                </button>
                <button
                  onClick={() => traiter(s.id, "retire")}
                  disabled={enTraitement === s.id}
                  className="flex items-center gap-1 rounded-cgpt-bouton bg-[var(--dj-erreur)] px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-50"
                >
                  <Check size={13} /> Retirer le contenu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
