import { IconeEntreprise } from "@/components/abonnements/IconeEntreprise";
import type { EntrepriseModeles } from "@/lib/listeAttente";
import type { Traduire } from "@/components/abonnements/TableauComparaison";

// Rangée des entreprises qui font les modèles, sous le titre de la page des abonnements (21/11/2026, demande de
// Bourama) : un petit logo et le nom de chaque entreprise. La liste vient du serveur (même source que le
// sélecteur du chat), jamais écrite ici. Sur téléphone elle passe à la ligne, sans défilement horizontal.
// Chaque pastille est un bouton : il fait défiler la page jusqu'à la carte de l'entreprise dans le bloc des
// modèles disponibles (components/abonnements/BlocModeles.tsx), qui se met en évidence un court instant.
export function LogosEntreprises({
  entreprises,
  t,
  onChoisir,
}: {
  entreprises: EntrepriseModeles[];
  t: Traduire;
  onChoisir: (distributeur: string) => void;
}) {
  if (entreprises.length === 0) return null;
  const titre = t("attente_entreprises_titre");
  return (
    <section aria-label={titre} className="flex flex-col gap-3">
      {titre && <p className="text-sm font-medium text-dj-texte-muet sm:text-base">{titre}</p>}
      <ul className="flex flex-wrap gap-2">
        {entreprises.map((e) => (
          <li key={e.distributeur}>
            <button
              type="button"
              onClick={() => onChoisir(e.distributeur)}
              aria-label={t("attente_entreprises_aller", { nom: e.nom }) || e.nom}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dj-bordure px-3 py-1.5 text-sm font-medium text-dj-texte transition-all duration-200 hover:border-dj-bordure-forte hover:bg-dj-surface-haute active:scale-95 sm:text-base"
            >
              <IconeEntreprise distributeur={e.distributeur} taille={20} />
              {e.nom}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
