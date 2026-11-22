import { IconeEntreprise } from "@/components/abonnements/IconeEntreprise";
import { IconeFournisseur } from "@/components/chat/IconeFournisseur";
import type { Traduire } from "@/components/abonnements/TableauComparaison";
import type { EntrepriseModeles } from "@/lib/listeAttente";

// Bloc « Modèles disponibles » sous le tableau de comparaison (21/11/2026, demande de Bourama) : une carte par
// entreprise, avec son logo (components/abonnements/IconeEntreprise.tsx) puis ses modèles du plus puissant au
// moins puissant, chacun précédé du logo de l'IA (components/chat/IconeFournisseur.tsx, par exemple Claude pour
// Anthropic, Qwen pour Alibaba). Le badge (ex. « Max ») est celui que renvoie le serveur, dans la langue choisie.
// Tout vient du serveur : aucune entreprise ni aucun modèle n'est écrit ici. Une colonne sur téléphone, deux sur
// tablette, trois sur grand écran, sans défilement horizontal.
// Identifiant de la carte d'une entreprise : la pastille de LogosEntreprises.tsx fait défiler la page jusqu'à elle.
export function idCarteEntreprise(distributeur: string) {
  return `modeles-${distributeur}`;
}

export function BlocModeles({
  entreprises,
  t,
  locale,
  miseEnAvant,
}: {
  entreprises: EntrepriseModeles[];
  t: Traduire;
  locale: string;
  miseEnAvant: string | null;
}) {
  if (entreprises.length === 0) return null;
  const titre = t("attente_modeles_titre");
  return (
    <section aria-label={titre} className="flex flex-col gap-4">
      {titre && <h2 className="text-lg font-bold text-dj-texte sm:text-xl">{titre}</h2>}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entreprises.map((e) => (
          <li
            key={e.distributeur}
            id={idCarteEntreprise(e.distributeur)}
            className={`flex min-w-0 scroll-mt-24 flex-col gap-3 rounded-2xl border p-4 transition-all duration-300 motion-reduce:transition-none ${
              miseEnAvant === e.distributeur
                ? "scale-[1.02] border-dj-texte bg-dj-surface-haute shadow-lg motion-reduce:scale-100"
                : "border-dj-bordure"
            }`}
          >
            <div className="flex items-center gap-2.5 border-b border-dj-bordure pb-3 text-base font-bold text-dj-texte">
              <IconeEntreprise distributeur={e.distributeur} taille={24} />
              <span className="min-w-0 truncate">{e.nom}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {e.modeles.map((m) => {
                const badge = m.badge?.[locale] ?? m.badge?.fr ?? "";
                return (
                  <li key={m.label} className="flex min-w-0 items-center gap-2.5 text-sm text-dj-texte sm:text-base">
                    <IconeFournisseur distributeur={e.distributeur} taille={18} />
                    <span className="min-w-0 truncate">{m.label}</span>
                    {badge && (
                      <span className="ml-auto shrink-0 rounded-full border border-dj-bordure-forte px-2 py-0.5 text-xs font-semibold text-dj-texte-muet">
                        {badge}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
