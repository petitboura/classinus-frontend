import { SectionPageBureau } from "@/components/SectionPageBureau";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_BUREAU } from "@/lib/routesBureau";

// 19/09/2026, demande Bourama : ancien onglet "Entrer un code" de Bureau,
// devenu une vraie page. sansEnTete : le titre et le bouton "i" sont
// portés par cette page, pas répétés dans la carte.
export default function PageBureauEntrerCode() {
  const cle = ROUTES_BUREAU.entrerCode;
  return (
    <SectionPageBureau title={titreSection(cle)}>
      {contenuSection(cle)}
    </SectionPageBureau>
  );
}
