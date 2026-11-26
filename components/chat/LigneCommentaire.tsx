"use client";

// Une note de l'IA entre deux outils (25/11/2026, demande Bourama) : une ligne de la timeline des
// outils avec un petit point à la place de l'icône, pour la distinguer d'une ligne d'outil. Même
// colonne icône/ligne connectrice que LigneOutil, donc la ligne reste continue quand une note est
// entre deux outils. Jamais un outil : le texte vient de l'IA, dans la langue de la conversation,
// et n'est donc jamais traduit par l'interface.
export function LigneCommentaire({ texte, estDerniere }: { texte: string; estDerniere: boolean }) {
  return (
    <div className="flex animate-dj-fade-in-rapide gap-2.5">
      <div className="flex w-4 flex-col items-center">
        <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-dj-texte-muet" aria-hidden />
        </div>
        {!estDerniere && <div className="mt-1 min-h-[6px] w-[2px] flex-1 origin-top animate-dj-ligne-trace bg-dj-bordure" />}
      </div>
      <div className={`min-w-0 flex-1 ${estDerniere ? "" : "pb-3"}`}>
        <p className="text-[13px] leading-snug text-dj-texte-muet">{texte}</p>
      </div>
    </div>
  );
}
