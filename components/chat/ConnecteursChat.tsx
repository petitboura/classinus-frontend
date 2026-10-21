"use client";

import Link from "next/link";
import {
  Cloud,
  Code2,
  Database,
  Github,
  HardDrive,
  Layers,
  Plug,
  Sparkles,
  Triangle,
} from "lucide-react";

type Connecteur = {
  id: string;
  label: string;
  Icone: typeof Cloud;
  href?: string;
};

const CONNECTEURS: Connecteur[] = [
  { id: "github", label: "GitHub", Icone: Github },
  { id: "notion", label: "Notion", Icone: Layers },
  { id: "google-drive", label: "Google Drive", Icone: HardDrive },
  { id: "higgsfield", label: "Higgsfield", Icone: Sparkles },
  { id: "vercel", label: "Vercel", Icone: Triangle },
  { id: "railway", label: "Railway", Icone: Cloud },
  { id: "supabase", label: "Supabase", Icone: Database },
  { id: "thonny", label: "Thonny", Icone: Code2, href: "/connecter-thonny" },
  { id: "claude", label: "Claude", Icone: Plug, href: "/connecter-claude" },
];

type Props = {
  variante: "bureau" | "mobile";
  visible?: boolean;
};

function EtiquetteConnecteur({ connecteur }: { connecteur: Connecteur }) {
  const contenu = (
    <>
      <connecteur.Icone size={14} aria-hidden className="shrink-0" />
      <span>{connecteur.label}</span>
    </>
  );

  const classe =
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dj-bordure bg-dj-surface px-2.5 text-xs text-dj-texte-muet";

  if (connecteur.href) {
    return (
      <Link
        href={connecteur.href}
        className={classe + " transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"}
      >
        {contenu}
      </Link>
    );
  }

  return <span className={classe}>{contenu}</span>;
}

export function ConnecteursChat({ variante, visible = true }: Props) {
  if (variante === "bureau") {
    return (
      <div className="relative mt-3 hidden w-full min-w-0 md:block">
        <nav
          aria-label="Connecteurs"
          className="w-full min-w-0 overflow-hidden whitespace-nowrap"
          style={{
            maskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
          }}
        >
          <div className="flex w-max gap-1.5 py-1 [animation:classinus-connecteurs-defilement_48s_linear_infinite] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
            {[...CONNECTEURS, ...CONNECTEURS].map((connecteur, index) => (
              <EtiquetteConnecteur key={connecteur.id + "-" + index} connecteur={connecteur} />
            ))}
          </div>
        </nav>
        <style jsx>{`
          @keyframes classinus-connecteurs-defilement {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          @media (prefers-reduced-motion: reduce) {
            div[class*="classinus-connecteurs-defilement"] { animation: none; }
          }
        `}</style>
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
        aria-label="Connecteurs"
        className="min-h-0 max-h-[220px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
        }}
      >
        <ul className="pb-2">
          {CONNECTEURS.map((connecteur) => (
            <li key={connecteur.id}>
              {connecteur.href ? (
                <Link
                  href={connecteur.href}
                  tabIndex={visible ? 0 : -1}
                  className="flex h-11 items-center gap-3 pl-[calc(1px+0.75rem)] text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                    <connecteur.Icone size={18} aria-hidden />
                  </span>
                  {connecteur.label}
                </Link>
              ) : (
                <div className="flex h-11 items-center gap-3 pl-[calc(1px+0.75rem)] text-sm text-dj-texte-muet">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                    <connecteur.Icone size={18} aria-hidden />
                  </span>
                  {connecteur.label}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
