import { Suspense, type ReactNode } from "react";
import { ROUTES_BUREAU } from "./routesBureau";
import { ROUTES_BIBLIOTHEQUE } from "./routesBibliotheque";
import { ROUTES_CONCENTRATION } from "./routesConcentration";
import { ROUTES_PERSONNALISER } from "./routesPersonnaliser";
import { trouverSection } from "./groupesRail";
import type { CleSection } from "./cleSections";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { MesCodes } from "@/components/MesCodes";
import { EspaceEntrerCode } from "@/components/EspaceEntrerCode";
import { AuditComplet } from "@/components/AuditComplet";
import { AuditCorrections } from "@/components/AuditCorrections";
import { ProgrammeAvecCatalogue } from "@/components/ProgrammeAvecCatalogue";
import { EspaceEtablissements } from "@/components/EspaceEtablissements";
import { ListeCorrectionsProf } from "@/components/ListeCorrectionsProf";
import { EditeurCode } from "@/components/bureau/EditeurCode";
import { ConfigurationBureau } from "@/components/bureau/ConfigurationBureau";
import { EspaceBibliotheque } from "@/components/EspaceBibliotheque";
import { BibliothequePublique } from "@/components/BibliothequePublique";
import { EspaceDossiers } from "@/components/EspaceDossiers";
import { EspaceControleSession } from "@/components/EspaceControleSession";
import { EspaceTempsEcran } from "@/components/EspaceTempsEcran";
import { MesComportements } from "@/components/MesComportements";
import { SkillsPublics } from "@/components/SkillsPublics";
import { MaMemoire } from "@/components/MaMemoire";

// Source unique du CONTENU de chaque sous-section (Bureau, Bibliothèque,
// Concentration, Personnaliser Classinus). La vraie page
// (app/(app)/.../page.tsx) ET la fenêtre flottante du chat
// (components/chat/FenetresSections.tsx) affichent exactement ce qui est
// décrit ici : changer une section change les deux d'un coup, plus aucune
// copie à garder à jour à la main.
//
// Garde-fou : CleSection est calculée à partir des adresses des routes
// (lib/routes*.ts) et CONTENU_SECTIONS est un Record complet sur ce type.
// Ajouter une sous-section sans décrire son contenu ici fait échouer la
// vérification de types, donc impossible de l'oublier côté fenêtre.

const AGENT_ID = "clovis";

const CONTENU_SECTIONS: Record<CleSection, () => ReactNode> = {
  [ROUTES_BUREAU.audit]: () => (
    <>
      <DefinirInfoSection id="audit-complet-code" />
      <AuditComplet />
      <div className="mt-6 flex flex-col gap-2">
        <p className="text-sm font-semibold text-dj-texte">Tous tes signalements</p>
        <AuditCorrections />
      </div>
    </>
  ),
  [ROUTES_BUREAU.codes]: () => (
    <>
      <DefinirInfoSection id="mes-codes" />
      <MesCodes sansEnTete />
    </>
  ),
  [ROUTES_BUREAU.programme]: () => (
    <>
      <DefinirInfoSection id="programme-notions" />
      <ProgrammeAvecCatalogue />
    </>
  ),
  [ROUTES_BUREAU.entrerCode]: () => (
    <>
      <DefinirInfoSection id="entrer-code" />
      <EspaceEntrerCode sansEnTete />
    </>
  ),
  [ROUTES_BUREAU.etablissements]: () => <EspaceEtablissements />,
  [ROUTES_BUREAU.signalements]: () => (
    <>
      <DefinirInfoSection id="signalements-prof" />
      <ListeCorrectionsProf />
    </>
  ),
  [ROUTES_BUREAU.editeur]: () => (
    <>
      <DefinirInfoSection id="editeur-code" />
      <EditeurCode />
    </>
  ),
  [ROUTES_BUREAU.configuration]: () => <ConfigurationBureau />,

  [ROUTES_BIBLIOTHEQUE.perso]: () => <EspaceBibliotheque sansOnglets />,
  [ROUTES_BIBLIOTHEQUE.publique]: () => (
    <>
      <DefinirInfoSection id="bibliotheque-publique" />
      <Suspense fallback={null}>
        <BibliothequePublique />
      </Suspense>
    </>
  ),
  [ROUTES_BIBLIOTHEQUE.telephone]: () => <EspaceDossiers />,

  [ROUTES_CONCENTRATION.session]: () => (
    <>
      <DefinirInfoSection id="controle-session" />
      <EspaceControleSession sansEnTete />
    </>
  ),
  [ROUTES_CONCENTRATION.tempsEcran]: () => (
    <>
      <DefinirInfoSection id="temps-ecran" />
      <EspaceTempsEcran sansEnTete />
    </>
  ),

  [ROUTES_PERSONNALISER.comportements]: () => <MesComportements agentId={AGENT_ID} sansOnglets />,
  [ROUTES_PERSONNALISER.skillsPublics]: () => <SkillsPublics />,
  [ROUTES_PERSONNALISER.memoire]: () => <MaMemoire />,
};

/** Le contenu d'une sous-section, identique en vraie page et en fenêtre flottante. */
export function contenuSection(cle: CleSection): ReactNode {
  return CONTENU_SECTIONS[cle]();
}

/** Le titre d'une sous-section, tiré de la même liste que les menus. */
export function titreSection(cle: CleSection): string {
  return trouverSection(cle)?.label ?? cle;
}
