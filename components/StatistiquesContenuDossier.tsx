import type { ContenuDossierPublic } from "@/lib/api";

// 16/09/2026, demande Bourama : "l'analytique dans l'app, combien
// d'éléments, de liens, de fichiers, de dossiers" -- pas de composant
// client (aucun état, aucun événement) : les chiffres arrivent déjà
// calculés du parent, que ce soit un Server Component (page de partage)
// ou un Client Component (bibliothèque publique en navigation).
export function StatistiquesContenuDossier({ contenu }: { contenu: ContenuDossierPublic }) {
  const lignes = [
    { label: "Fichiers", valeur: contenu.nb_fichiers },
    { label: "Liens", valeur: contenu.nb_liens },
    { label: "Sous-dossiers", valeur: contenu.nb_sous_dossiers },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {lignes.map(({ label, valeur }) => (
        <div key={label} className="rounded-lg bg-dj-surface-haute px-2 py-2.5">
          <p className="text-base font-semibold text-dj-texte">{valeur}</p>
          <p className="text-[11px] text-dj-texte-muet">{label}</p>
        </div>
      ))}
    </div>
  );
}
