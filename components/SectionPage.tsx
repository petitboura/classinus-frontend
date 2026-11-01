"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { useSurAppliPc } from "@/lib/useSurAppliPc";
import { OngletsLiens } from "./OngletsSegment";
import { useEnTeteApp } from "@/lib/contexteEnTete";

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

  if (!groupe) {
    return (
      <ContexteInfoSection.Provider value={setInfoRubriqueId}>
        <div className="mx-auto flow-root w-full max-w-3xl space-y-4 px-4 pb-24">{children}</div>
      </ContexteInfoSection.Provider>
    );
  }

  const soeurs = groupe.soeurs.filter((s) => !(surAppliPc && s.masqueSurPc));

  return (
    <ContexteInfoSection.Provider value={setInfoRubriqueId}>
      <div className="mx-auto flow-root w-full max-w-5xl px-4 pb-24">
        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="sticky top-0 z-10 -mx-4 border-b border-dj-bordure bg-dj-fond px-4 py-2 md:hidden">
            <OngletsLiens
              ariaLabel={groupe.label}
              onglets={soeurs.map((s) => ({ href: s.href, libelle: s.label }))}
            />
          </div>
          <nav className="hidden w-48 flex-shrink-0 flex-col gap-1 self-start md:sticky md:top-4 md:flex">
            {soeurs.map((s) => {
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
