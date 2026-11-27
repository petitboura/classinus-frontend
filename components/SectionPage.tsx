"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { useSurAppliPc } from "@/lib/useSurAppliPc";
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

  return (
    <ContexteInfoSection.Provider value={setInfoRubriqueId}>
      <div className="mx-auto flow-root w-full max-w-3xl px-4 pb-24">
        {/* Téléphone : navigation entre pages soeurs, dans la page (pas fixée en haut) */}
        <nav className="mt-4 flex flex-nowrap gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden" aria-label={groupe.label}>
          {groupe.soeurs
            .filter((s) => !(surAppliPc && s.masqueSurPc))
            .map((s) => {
              const actif = pathname === s.href;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  replace
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    actif ? "border-dj-texte bg-dj-texte text-dj-fond" : "border-dj-bordure bg-dj-surface text-dj-texte-muet"
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
        </nav>
        {/* Ordi : plus de colonne de pages voisines à côté du contenu (27/11/2026,
            demande de Bourama). La barre latérale montre déjà les sous-sections
            du groupe, en accordéon quand elle est dépliée. */}
        <div className="mt-4 min-w-0 space-y-4">{children}</div>
      </div>
    </ContexteInfoSection.Provider>
  );
}
