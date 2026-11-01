"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSurAppliPc } from "@/lib/useSurAppliPc";
import { OngletsLiens } from "./OngletsSegment";
import { useEnTeteApp, useDefinirBarreSousSections } from "@/lib/contexteEnTete";

const ContexteInfoSection = createContext<(id: string | null) => void>(() => {});

export function useInfoSection(id: string | null) {
  const definir = useContext(ContexteInfoSection);
  useEffect(() => {
    definir(id);
    return () => definir(null);
  }, [definir, id]);
}

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
    soeurs: { href: string; label: string; icone: React.ReactNode; masqueSurPc?: boolean }[];
  };
}) {
  const pathname = usePathname();
  const surAppliPc = useSurAppliPc();
  const { definir } = useEnTeteApp();
  const [infoRubriqueId, setInfoRubriqueId] = useState<string | null>(null);

  const titreHaut = groupe ? groupe.label : title;
  const retourHaut = groupe ? groupe.href : retour;

  useEffect(() => {
    definir({ titre: titreHaut, retour: retourHaut, infoId: infoRubriqueId });
  }, [titreHaut, retourHaut, infoRubriqueId, definir]);

  // Barre 1 = rangée de navigation entre pages sœurs (ex: Perso/Publique/Téléphone)
  // Elle doit rester FIXE en haut comme ton bouton notif, pas glisser dans le scroll.
  // Sur téléphone elle est au-dessus du contenu, sur ordi c'est le rail à gauche qui prend le relais.
  const soeursFiltrees = useMemo(() => (groupe ? groupe.soeurs.filter((s) => !(surAppliPc && s.masqueSurPc)) : []), [groupe, surAppliPc]);
  const noeudSousSections = useMemo(() => {
    if (!groupe || soeursFiltrees.length === 0) return null;
    return <OngletsLiens ariaLabel={groupe.label} onglets={soeursFiltrees.map((s) => ({ href: s.href, libelle: s.label }))} />;
  }, [groupe, soeursFiltrees]);
  useDefinirBarreSousSections(noeudSousSections);

  if (!groupe) {
    return (
      <ContexteInfoSection.Provider value={setInfoRubriqueId}>
        <div className="mx-auto flow-root w-full max-w-3xl space-y-4 px-4 pb-24">{children}</div>
      </ContexteInfoSection.Provider>
    );
  }

  return (
    <ContexteInfoSection.Provider value={setInfoRubriqueId}>
      <div className="mx-auto flow-root w-full max-w-5xl px-4 pb-24">
        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start">
          {/* Ordi : rail latéral fixe à gauche, reste visible quand on défile à droite */}
          <nav className="hidden w-48 flex-shrink-0 flex-col gap-1 self-start md:sticky md:top-4 md:flex">
            {groupe.soeurs
              .filter((s) => !(surAppliPc && s.masqueSurPc))
              .map((s) => {
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
