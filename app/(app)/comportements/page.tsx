import { SectionPage } from "@/components/SectionPage";
import { MesComportements } from "@/components/MesComportements";
import { groupePersonnaliser } from "@/lib/sectionsPersonnaliser";

// Agent unique de Classinus (voir components/chat/ChatFlottant.tsx) --
// même constante que partout ailleurs dans l'app.
const AGENT_ID = "clovis";

// 19/09/2026, demande Bourama : Mes skills fonctionne maintenant comme
// Bureau/Bibliothèque/Concentration -- le groupe vient de
// lib/sectionsPersonnaliser.tsx. sansOnglets : l'onglet "Public" que
// MesComportements affichait en interne devient sa propre page
// (/skills-publics), donc plus besoin de la barre d'onglets ici (voir
// MesComportements.tsx -- gardée SANS ce prop pour la fenêtre flottante
// du chat, qui continue d'afficher les deux dans un seul popup).
export default function PageComportements() {
  return (
    <SectionPage title="Mes skills" groupe={groupePersonnaliser()}>
      <MesComportements agentId={AGENT_ID} sansOnglets />
    </SectionPage>
  );
}
