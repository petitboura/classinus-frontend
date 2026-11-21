"use client";

import type { ReactNode } from "react";
import { IconeFournisseur } from "@/components/chat/IconeFournisseur";
import { IconeGithub } from "@/components/icons/IconeGithub";
import { IconeNotion } from "@/components/icons/IconeNotion";
import { IconeSupabase } from "@/components/icons/IconeSupabase";
import { IconeVercel } from "@/components/icons/IconeVercel";
import type { EntrepriseModeles } from "@/lib/listeAttente";

// Libellé d'une ligne du tableau de comparaison (21/11/2026, demande de Bourama). Un libellé qui contient une
// liste entre parenthèses (« Haut de gamme (Claude Opus 5.5, GPT-6.2 Sol) », « Connecteurs (GitHub, Notion) »)
// est coupé en deux : le texte en haut, puis les éléments de la liste en dessous, séparés par un petit trait
// vertical plutôt que par des virgules. Chaque élément qu'on sait reconnaître reçoit son logo devant son nom :
// - un modèle : le logo de son IA (le même que dans le sélecteur du chat, voir IconeFournisseur), retrouvé par
//   son nom grâce aux modèles que renvoie le serveur, donc sans aucune liste de modèles écrite ici ;
// - un connecteur : le logo du tableau CONNECTEURS ci-dessous, retrouvé par son nom. Pour en ajouter un,
//   ajouter une ligne dans ce tableau (et son logo dans components/icons si besoin).
// Un élément sans logo connu, comme « et plus », reste du texte seul. Des parenthèses sans virgule, comme
// « (OCR) », restent dans le texte.
const LISTE_ENTRE_PARENTHESES = /^(.*?)\s*\(([^()]*,[^()]*)\)\s*(.*)$/;
const TAILLE_LOGO = 16;

function LogoMasque({ url }: { url: string }) {
  const masque = `url(${url})`;
  return (
    <span
      aria-hidden
      style={{
        width: TAILLE_LOGO,
        height: TAILLE_LOGO,
        backgroundColor: "currentColor",
        WebkitMaskImage: masque,
        maskImage: masque,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      className="inline-block shrink-0"
    />
  );
}

// Clé : le nom du connecteur en minuscules, tel qu'il est écrit dans le texte de la ligne.
const CONNECTEURS: Record<string, () => ReactNode> = {
  github: () => <IconeGithub size={TAILLE_LOGO} aria-hidden className="shrink-0" />,
  notion: () => <IconeNotion size={TAILLE_LOGO} aria-hidden className="shrink-0" />,
  vercel: () => <IconeVercel size={TAILLE_LOGO} aria-hidden className="shrink-0" />,
  supabase: () => <IconeSupabase size={TAILLE_LOGO} aria-hidden className="shrink-0" />,
  google: () => <img src="/logos-entreprises/google.svg" alt="" draggable={false} width={TAILLE_LOGO} height={TAILLE_LOGO} className="shrink-0" />,
  mcp: () => <LogoMasque url="/logos-connecteurs/mcp.svg" />,
};

export function distributeurParNomDeModele(entreprises: EntrepriseModeles[] | undefined): Map<string, string> {
  const carte = new Map<string, string>();
  for (const entreprise of entreprises ?? []) {
    for (const modele of entreprise.modeles) carte.set(modele.label.trim().toLowerCase(), entreprise.distributeur);
  }
  return carte;
}

function LogoDeElement({ element, distributeurs }: { element: string; distributeurs: Map<string, string> }) {
  const cle = element.toLowerCase();
  const distributeur = distributeurs.get(cle);
  if (distributeur) return <IconeFournisseur distributeur={distributeur} taille={TAILLE_LOGO} />;
  const connecteur = CONNECTEURS[cle];
  return connecteur ? <>{connecteur()}</> : null;
}

export function LibelleAvecLogos({ texte, distributeurs }: { texte: string; distributeurs: Map<string, string> }) {
  const m = LISTE_ENTRE_PARENTHESES.exec(texte);
  if (!m) return <>{texte}</>;
  const [, debut, liste, fin] = m;
  const elements = liste.split(",").map((e) => e.trim()).filter(Boolean);
  return (
    <>
      {[debut, fin].filter(Boolean).join(" ")}
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-dj-texte-muet">
        {elements.map((element, i) => (
          <span key={`${i}-${element}`} className="inline-flex items-center gap-2">
            {i > 0 && (
              <>
                <span className="sr-only">, </span>
                <span aria-hidden className="inline-block h-3.5 w-px bg-dj-bordure-forte" />
              </>
            )}
            <span className="inline-flex items-center gap-1.5">
              <LogoDeElement element={element} distributeurs={distributeurs} />
              {element}
            </span>
          </span>
        ))}
      </span>
    </>
  );
}
