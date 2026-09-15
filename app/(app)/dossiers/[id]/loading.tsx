import { Skeleton } from "@/components/Skeleton";

// Skeleton de la route (10/09/2026, Lot E "Clovis ouvert") : forme
// fidèle à page.tsx (titre du dossier + sous-dossiers + liste de
// fichiers).
//
// 15/09/2026, demande Bourama : ajout d'un bloc pour la section
// sous-dossiers (2 lignes), désormais possible entre le titre et la
// liste de fichiers, même forme que le bloc fichiers ci-dessous.
export default function ChargementDossierCataloguePublic() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-24 pt-6 md:pt-8">
      <Skeleton className="h-6 w-1/2 rounded" />
      <div className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-5" aria-hidden>
        <Skeleton className="h-5 w-1/3 rounded" />
        <Skeleton className="mt-2 h-3 w-2/3 rounded" style={{ animationDelay: "80ms" }} />
      </div>
      <div className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface divide-y divide-dj-bordure" aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-2.5 px-5 py-3">
            <Skeleton className="h-4 w-4 rounded" style={{ animationDelay: `${i * 60}ms` }} />
            <Skeleton className="h-3 w-1/3 rounded" style={{ animationDelay: `${i * 60 + 30}ms` }} />
          </div>
        ))}
      </div>
      <div className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface divide-y divide-dj-bordure" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5 px-5 py-3">
            <Skeleton className="h-4 w-4 rounded" style={{ animationDelay: `${i * 60 + 150}ms` }} />
            <Skeleton className="h-3 w-1/2 rounded" style={{ animationDelay: `${i * 60 + 180}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
