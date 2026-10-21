"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  Database,
  Github,
  HardDrive,
  Layers,
  Sparkles,
} from "lucide-react";
import { demarrerConnexion, statutConnexion } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

type Connecteur = {
  service: string;
  label: string;
  Icone: typeof Cloud;
};

const CONNECTEURS: Connecteur[] = [
  { service: "github", label: "GitHub", Icone: Github },
  { service: "notion", label: "Notion", Icone: Layers },
  { service: "google_drive", label: "Google Drive", Icone: HardDrive },
  { service: "higgsfield_mcp", label: "Higgsfield", Icone: Sparkles },
  { service: "railway_mcp", label: "Railway", Icone: Cloud },
  { service: "supabase_mcp", label: "Supabase", Icone: Database },
];

type Props = {
  variante: "bureau" | "mobile";
  visible?: boolean;
};

export function ConnecteursChat({ variante, visible = true }: Props) {
  const [statuts, setStatuts] = useState<Record<string, boolean> | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    Promise.all(
      CONNECTEURS.map(async ({ service }) => {
        try {
          const resultat = await statutConnexion(service);
          return [service, resultat.connecte] as const;
        } catch {
          // En cas de statut indisponible, ne pas afficher un CTA potentiellement
          // trompeur : la connexion pourra être réessayée après rechargement.
          return [service, true] as const;
        }
      }),
    ).then((resultats) => {
      if (actif) setStatuts(Object.fromEntries(resultats));
    });
    return () => {
      actif = false;
    };
  }, []);

  async function connecter(service: string) {
    if (enCours) return;
    setEnCours(service);
    try {
      const { url } = await demarrerConnexion(service);
      window.location.href = url;
    } catch (erreur) {
      window.alert(messageErreur(erreur));
      setEnCours(null);
    }
  }

  // Tant que les statuts ne sont pas connus, ne pas afficher les connecteurs :
  // cela évite de montrer brièvement un CTA pour un compte déjà connecté.
  const aConnecter = statuts
    ? CONNECTEURS.filter(({ service }) => !statuts[service])
    : [];

  if (aConnecter.length === 0) return null;

  if (variante === "bureau") {
    return (
      <div className="relative mt-3 hidden w-full min-w-0 md:block">
        <nav
          aria-label="Connecteurs à connecter"
          className="w-full min-w-0 overflow-hidden whitespace-nowrap"
          style={{
            maskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
          }}
        >
          <div className="flex w-max gap-2 py-1">
            {aConnecter.map(({ service, label, Icone }) => (
              <div
                key={service}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface px-3"
              >
                <Icone size={15} aria-hidden className="shrink-0 text-dj-texte-muet" />
                <span className="text-xs text-dj-texte">{label}</span>
                <button
                  type="button"
                  onClick={() => connecter(service)}
                  disabled={enCours !== null}
                  className="rounded-lg bg-dj-accent-1 px-2.5 py-1.5 text-xs font-medium text-[#1A0D02] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {enCours === service ? "Connexion…" : "Connecter"}
                </button>
              </div>
            ))}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div
      aria-hidden={!visible}
      className={
        "grid transition-[grid-template-rows,opacity] duration-300 ease-cgpt-doux md:hidden " +
        (visible ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0")
      }
    >
      <nav
        aria-label="Connecteurs à connecter"
        className="min-h-0 max-h-[220px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
        }}
      >
        <ul className="pb-2">
          {aConnecter.map(({ service, label, Icone }) => (
            <li key={service}>
              <div className="flex min-h-12 items-center gap-3 pl-3 pr-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center text-dj-texte-muet">
                  <Icone size={18} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm text-dj-texte">{label}</span>
                <button
                  type="button"
                  tabIndex={visible ? 0 : -1}
                  onClick={() => connecter(service)}
                  disabled={enCours !== null}
                  className="shrink-0 rounded-lg bg-dj-accent-1 px-3 py-2 text-xs font-medium text-[#1A0D02] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {enCours === service ? "Connexion…" : "Connecter"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
