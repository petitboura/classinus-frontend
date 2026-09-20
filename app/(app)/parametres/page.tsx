import { SectionPage } from "@/components/SectionPage";
import { ParametresAccueil } from "@/components/ParametresAccueil";

// 19/09/2026, demande Bourama : cette page n'a plus l'ancien composant
// EspaceParametres.tsx (état `vue` interne, supprimé) -- ne garde que la
// carte profil et les 3 actions (Export/Déconnexion/Suppression), les 7
// autres écrans sont de vraies pages filles (voir lib/sectionsParametres.tsx).
// Plus besoin de Suspense ici : ?vue=profil n'existe plus (remplacé par
// un lien direct vers /parametres/profil), seule /parametres/aide lit
// encore un paramètre d'URL.
export default function PageParametres() {
  return (
    <SectionPage title="Paramètres">
      <ParametresAccueil />
    </SectionPage>
  );
}
