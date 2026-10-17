"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { BoutonRetour } from "./BoutonRetour";
import { BoutonInfoSection } from "./BoutonInfoSection";
import { OngletsLiens } from "./OngletsSegment";
import { trouverRubriqueAide } from "@/lib/aideSections";

// Conteneur partagé par les sections de l'app (refonte "Mon espace =
// l'app", 15/08/2026). Remplace le conteneur à onglets d'EspaceClassinus.tsx
// (lien "Retour au chat" et barre d'onglets en state local) -- la
// navigation entre sections passe désormais par AppSidebar.tsx (vraies
// routes), plus besoin de rien de tout ça ici.
//
// Fil d'Ariane ajouté puis retiré le même jour (22/08/2026, demande
// Bourama) : à ce niveau (Accueil -> Section, un seul niveau réel), il ne
// faisait que répéter le titre déjà affiché juste en dessous par le h1 --
// aucune vraie hiérarchie à montrer, donc aucune utilité, juste un
// doublon visuel. Un vrai fil d'Ariane garde son sens uniquement là où il
// y a une vraie profondeur -- pas ajouté ici pour cette raison.
//
// Prop `groupe` réintroduite le 22/08/2026 (demande Bourama, sidebar
// regroupée) : ici la profondeur existe vraiment (Personnaliser Classinus ->
// Mes skills), donc la même logique justifie cette fois d'afficher le fil
// d'Ariane, plus une colonne de navigation persistante vers les sections
// soeurs (comme une vraie page de paramètres avec sidebar, pas un popup
// qu'on doit rouvrir pour changer de section).
//
// animate-dj-fade-in retiré le 01/09/2026 (chantier "changement de
// section" brut) : l'entrée ET la sortie de chaque section sont
// désormais pilotées par components/TransitionPage.tsx (AppShell.tsx),
// qui anime tout l'arbre {children} d'un coup -- garder la classe ici en
// plus aurait fait démarrer deux fondus indépendants sur le même
// opacity (celui-ci en CSS, celui de TransitionPage en style inline via
// framer-motion), l'un pouvant couper l'autre en plein milieu.
//
// `soeurs[].icone` reçoit un élément déjà rendu (ex: <ScrollText
// size={16} />), PAS un composant (ex: ScrollText) -- correctif 24/08 :
// chaque page qui appelle SectionPage est un Server Component, et
// SectionPage est un Client Component ("use client" ci-dessus, requis
// pour usePathname). Passer une RÉFÉRENCE de composant (une fonction) à
// travers cette frontière Server -> Client fait planter Next.js
// ("Functions cannot be passed directly to Client Components"), invisible
// en dev mais fatal à la génération statique en production -- un élément
// JSX déjà construit, lui, est sérialisable normalement.
// Bouton "i" à côté du grand titre de la page (ajouté 02/09/2026, suite
// audit Bourama : "les textes qui décrivent une section... traité que
// dans Bureau, pas ailleurs" -- 6 écrans oubliés du premier passage du
// 01/09 n'avaient pas de petit titre <h2> interne comme Bureau/Rappels,
// juste ce grand titre géré ici). SectionPage ne connaît pas le contenu
// de l'écran qu'elle affiche (ni ses onglets éventuels), donc c'est
// l'écran lui-même qui annonce sa rubrique d'aide actuelle via
// useInfoSection(id), un contexte simple qui remonte jusqu'ici -- permet
// à un écran à onglets (ex: Bibliothèque : Perso/Publique/Dossiers du
// téléphone) de changer le bouton affiché quand on change d'onglet, sans
// que SectionPage ait besoin de connaître cette logique. id à null (ou
// écran qui n'appelle jamais le hook) = pas de bouton.
const ContexteInfoSection = createContext<(id: string | null) => void>(() => {});

export function useInfoSection(id: string | null) {
  const definir = useContext(ContexteInfoSection);
  useEffect(() => {
    definir(id);
    return () => definir(null);
  }, [definir, id]);
}

// Ligne d'en-tête unique de chaque page (refonte du 13/10/2026, demande
// Bourama : un seul titre tout en haut, plus de fil d'Ariane ni de second
// gros titre, plus d'espace vide au dessus). Elle se pose sur la même
// ligne que les boutons flottants du haut (hamburger à gauche sur
// téléphone, cloche et minuteurs à droite) : même décalage haut
// (0.5rem + safe-top) et même hauteur (h-8) que ces boutons : la marge
// négative remonte la ligne dans la bande que <main> réserve au
// hamburger (--dj-hamburger-espace, voir app/globals.css), qui vaut 0px
// sur PC. Les pages qui n'ont pas cette ligne (chat, tableau de bord)
// gardent cette bande telle quelle. Les deux conteneurs de page sont en
// flow-root : sans cela, cette marge négative remontait à travers les
// couches de TransitionPage (la page entrante et la page sortante, en
// position absolue, ne la traitaient pas pareil) et toute la page sautait
// à chaque changement de sous-section. Sur
// téléphone, pl-8 laisse la place du hamburger, et pr-20 laisse celle de
// la cloche et du bouton minuteur sur toute la largeur.
// En-tête qui reste en place quand la page défile (17/10/2026, demande
// Bourama : les titres et boutons du haut ne doivent plus monter avec leur
// section). Collé à la même hauteur que sa place d'origine (0.5rem + marge
// haute de sécurité), avec le fond de la page pour que le contenu qui passe
// dessous ne se voie pas. L'ombre pleine sans flou, décalée vers le haut,
// couvre la bande au dessus de la ligne (encoche, barre d'état) où le
// contenu passerait sinon.
const ENTETE_FIXE =
  "sticky top-[calc(0.5rem+var(--safe-top,0px))] z-30 bg-dj-fond shadow-[0_calc(-1_*_(0.5rem_+_var(--safe-top,0px)))_0_0_var(--dj-fond)]";

function TitreSection({ title, infoRubriqueId, retour }: { title: string; infoRubriqueId: string | null; retour?: string }) {
  const rubrique = infoRubriqueId ? trouverRubriqueAide(infoRubriqueId) : undefined;
  return (
    <div className={`mt-[calc(0.5rem_-_var(--dj-hamburger-espace))] flex h-8 items-center gap-1.5 pl-8 pr-20 md:pl-0 ${ENTETE_FIXE}`}>
      {retour && <BoutonRetour href={retour} padding="p-1" className="-ml-1" />}
      <h1 className="truncate font-display text-xl font-bold text-dj-texte">{title}</h1>
      {rubrique && (
        <BoutonInfoSection
          rubriqueId={rubrique.id}
          texteCourt={rubrique.texteCourt}
          hrefEnSavoirPlus={rubrique.lienDecouvrir}
        />
      )}
    </div>
  );
}

// Prop `retour` (16/09/2026, demande Bourama : "énormément de sections
// ou pages qui n'ont pas de bouton retour"). Concerne les écrans de
// détail atteints depuis une liste (un document, un dossier, une skill,
// un signalement, un établissement) : ils n'avaient jusqu'ici aucun
// moyen de remonter d'un niveau, puisque le bouton retour de ce
// composant n'existait que dans la branche `groupe` (fil d'Ariane
// "Personnaliser Classinus -> Mes skills").
//
// Volontairement un href fixe, pas un router.back() : l'app pousse des
// entrées d'historique factices pour fermer menus et panneaux (voir
// lib/contexteRetour.tsx), et toute la série de bugs de navigation de
// début septembre venait justement de retours qui tombaient sur ces
// entrées-là. Une destination explicite est déterministe, et reste
// correcte quand la page est ouverte directement depuis un lien de
// partage (cas où il n'y a aucun historique à remonter).
// Pages voisines sur téléphone (19/09/2026, demande Bourama : le menu des
// pages voisines lui plaît sur PC mais pas sur mobile, où il fallait
// revenir à la liste puis entrer dans l'autre page). Sur écran étroit, la
// même liste de pages voisines s'affiche donc en haut de la page sous
// forme d'une rangée de pastilles, un seul toucher pour changer de page
// (voir OngletsLiens dans OngletsSegment.tsx). Sur PC, le menu à gauche
// reste tel quel. Les liens du menu de gauche passent aussi en `replace`,
// pour qu'aller d'une page voisine à l'autre n'empile pas d'entrées dans
// l'historique et que le retour ramène toujours à la liste du groupe.
export function SectionPage({
  title,
  children,
  groupe,
  retour,
}: {
  title: string;
  children: React.ReactNode;
  retour?: string;
  groupe?: {
    label: string;
    href: string;
    soeurs: { href: string; label: string; icone: React.ReactNode }[];
  };
}) {
  const pathname = usePathname();
  const [infoRubriqueId, setInfoRubriqueId] = useState<string | null>(null);

  if (!groupe) {
    return (
      <ContexteInfoSection.Provider value={setInfoRubriqueId}>
        <div className="mx-auto flow-root w-full max-w-3xl space-y-4 px-4 pb-24">
          <TitreSection title={title} infoRubriqueId={infoRubriqueId} retour={retour} />
          {children}
        </div>
      </ContexteInfoSection.Provider>
    );
  }

  // Page d'un groupe (Bibliothèque, Paramètres, Personnaliser Classinus) :
  // le seul titre affiché est celui du groupe, en haut, par exemple
  // "Bibliothèque". La page voisine active se lit dans les pastilles
  // (téléphone) ou dans le menu de gauche (PC), plus de fil d'Ariane ni de
  // second titre. `title` n'est donc plus affiché ici, il reste dans la
  // signature pour ne pas toucher les pages qui l'envoient. Le bouton
  // retour vers la page mère du groupe reste, à gauche du titre (retour de
  // Bourama le 13/10/2026 : il doit toujours y en avoir un).
  return (
    <ContexteInfoSection.Provider value={setInfoRubriqueId}>
    <div className="mx-auto flow-root w-full max-w-5xl px-4 pb-24">
      <TitreSection title={groupe.label} infoRubriqueId={infoRubriqueId} retour={groupe.href} />

      <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start">
        {/* Les pastilles restent sous le titre pendant le défilement : la
            ligne du titre fait 2rem de haut (h-8). */}
        <div className="sticky top-[calc(2.5rem+var(--safe-top,0px))] z-30 -mb-2 bg-dj-fond md:hidden">
          <OngletsLiens
            ariaLabel={groupe.label}
            onglets={groupe.soeurs.map((s) => ({ href: s.href, libelle: s.label }))}
          />
        </div>
        <nav className="hidden w-48 flex-shrink-0 flex-col gap-1 md:flex">
          {groupe.soeurs.map((s) => {
            const actif = pathname === s.href;
            return (
              <Link
                key={s.href}
                href={s.href}
                replace
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                  actif
                    ? "bg-dj-surface-haute font-medium text-dj-texte"
                    : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
                }`}
              >
                {s.icone}
                {s.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1 space-y-4">{children}</div>
      </div>
    </div>
    </ContexteInfoSection.Provider>
  );
}
