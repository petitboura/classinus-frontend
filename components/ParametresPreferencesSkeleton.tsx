import { Skeleton } from "./Skeleton";

// Skeleton de la page Préférences (ParametresPreferences.tsx). Il suit la forme réelle
// de la carte, bloc après bloc et dans le même ordre : thème (3 boutons), langue de
// l'interface (texte et liste), les trois réglages à interrupteur (relances,
// ouverture automatique du lecteur, je suis prof), langue de traduction des erreurs
// (pastilles), traduction automatique des erreurs (interrupteur).
//
// RÈGLE PERMANENTE (demande de Bourama, 28/11/2026) : dès qu'un réglage est ajouté,
// retiré ou déplacé dans ParametresPreferences.tsx, ce skeleton est mis à jour dans
// la même modification, pour qu'il ne saute jamais à l'arrivée du vrai contenu.
const SEPARATEUR = "flex flex-col gap-2 border-t border-dj-bordure pt-4";
const LIGNE_INTERRUPTEUR = "flex items-center justify-between gap-4 border-t border-dj-bordure pt-4";

function LigneInterrupteur({ lignesDeTexte = 1 }: { lignesDeTexte?: 1 | 2 }) {
  return (
    <div className={LIGNE_INTERRUPTEUR}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-3 w-full max-w-sm rounded" />
        {lignesDeTexte === 2 && <Skeleton className="h-3 w-2/3 max-w-xs rounded" />}
      </div>
      <Skeleton className="h-6 w-11 flex-shrink-0 rounded-full" />
    </div>
  );
}

export function ParametresPreferencesSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-14 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
      </div>

      <div className={SEPARATEUR}>
        <Skeleton className="h-4 w-44 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-5/6 rounded" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      <LigneInterrupteur />
      <LigneInterrupteur lignesDeTexte={2} />
      <LigneInterrupteur />

      <div className={SEPARATEUR}>
        <Skeleton className="h-4 w-56 rounded" />
        <Skeleton className="h-3 w-3/4 rounded" />
        <div className="flex flex-wrap items-center gap-1.5">
          {["w-16", "w-14", "w-20", "w-16", "w-12", "w-[4.5rem]"].map((largeur, i) => (
            <Skeleton key={i} className={`h-6 ${largeur} rounded-md`} />
          ))}
        </div>
      </div>

      <LigneInterrupteur />
    </div>
  );
}
