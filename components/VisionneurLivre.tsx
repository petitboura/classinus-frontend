"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { telecharger } from "@/lib/telecharger";
import { useEtatTelechargement } from "@/lib/etatTelechargements";
import { IconeTelechargement, LibelleTelechargement, MessageEchecTelechargement, classeEtatTelechargement } from "./EtatTelechargement";
import { estLienExterne, traiterLienSortant } from "@/lib/liensSortants";
import { estPageLivre, neutraliserPageLivre } from "@/lib/neutraliserPageLivre";

// Liseuse des livres numériques EPUB et MOBI, dépliée dans le fil comme le PDF
// (voir FichierChip.tsx). Le moteur est foliate-js (MIT), copié tel quel dans
// public/foliate-js (voir ORIGINE.txt) et chargé seulement à l'ouverture d'un
// livre : il n'alourdit ni le chargement de l'appli ni son export statique.
//
// Un livre venu d'un site externe n'est pas fiable. Chaque page passe donc par
// neutraliserPageLivre (lib/) avant d'être affichée, et les fichiers de script
// du livre ne sont jamais chargés.

// Adresse du moteur. Servi tel quel depuis public/, jamais traité par le
// bundler (le commentaire webpackIgnore plus bas le lui interdit).
const ADRESSE_FOLIATE = "/foliate-js/view.js";

// Taille au-delà de laquelle le livre n'est pas ouvert ici (le fichier est lu
// en entier en mémoire). Réglable avec NEXT_PUBLIC_LIVRE_TAILLE_MAX_MO.
const TAILLE_MAX_MO_DEFAUT = 100;

function tailleMaxOctets(): number {
  const reglee = Number(process.env.NEXT_PUBLIC_LIVRE_TAILLE_MAX_MO);
  const mo = Number.isFinite(reglee) && reglee > 0 ? reglee : TAILLE_MAX_MO_DEFAUT;
  return mo * 1024 * 1024;
}

const TYPE_MIME_PAR_EXTENSION: Record<string, string> = {
  epub: "application/epub+zip",
  mobi: "application/x-mobipocket-ebook",
};

type ElementSommaire = { label?: string; href?: string; subitems?: ElementSommaire[] };
type SectionFoliate = { load?: () => Promise<string>; unload?: () => void };
type LivreFoliate = {
  sections?: SectionFoliate[];
  toc?: ElementSommaire[];
  transformTarget?: EventTarget;
};
type VueFoliate = HTMLElement & {
  open: (livre: unknown) => Promise<void>;
  init: (options: { lastLocation?: unknown; showTextStart?: boolean }) => Promise<void>;
  goLeft: () => Promise<void>;
  goRight: () => Promise<void>;
  goTo: (cible: string | number) => Promise<unknown>;
  close: () => void;
  book?: LivreFoliate;
  renderer?: HTMLElement & { setStyles?: (css: string) => void };
};
type ModuleFoliate = { makeBook: (fichier: File) => Promise<LivreFoliate> };

let moduleFoliate: Promise<ModuleFoliate> | null = null;

function chargerFoliate(): Promise<ModuleFoliate> {
  if (!moduleFoliate) {
    moduleFoliate = import(/* webpackIgnore: true */ ADRESSE_FOLIATE).catch((erreur) => {
      moduleFoliate = null;
      throw erreur;
    });
  }
  return moduleFoliate as Promise<ModuleFoliate>;
}

class LivreTropVolumineux extends Error {}

// Lit le fichier en suivant l'avancement. Refuse dès que la taille dépasse la
// limite, en cours de route si le serveur n'a pas annoncé la taille.
async function lireFichier(
  url: string,
  signal: AbortSignal,
  surAvancement: (partie: number | null) => void
): Promise<Blob> {
  const reponse = await fetch(url, { signal });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  const max = tailleMaxOctets();
  const total = Number(reponse.headers.get("Content-Length")) || 0;
  if (total > max) throw new LivreTropVolumineux();
  const lecteur = reponse.body?.getReader();
  if (!lecteur) return reponse.blob();
  const morceaux: Uint8Array[] = [];
  let recu = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    morceaux.push(value);
    recu += value.length;
    if (recu > max) {
      void lecteur.cancel();
      throw new LivreTropVolumineux();
    }
    surAvancement(total ? recu / total : null);
  }
  return new Blob(morceaux as BlobPart[]);
}

// Remplace le chargement de chaque page du livre par une version filtrée
// (voir neutraliserPageLivre). À faire avant l'ouverture du livre.
function filtrerPages(livre: LivreFoliate, urlsCreees: Set<string>) {
  const filtrees = new Map<string, string>();
  const origines = new WeakMap<SectionFoliate, string>();
  for (const section of livre.sections ?? []) {
    const charger = section.load?.bind(section);
    if (!charger) continue;
    const decharger = section.unload?.bind(section);
    section.load = async () => {
      const origine = await charger();
      if (!origine) return origine;
      // La bibliothèque ne produit que des adresses blob:. Tout autre chose
      // est refusée.
      if (!origine.startsWith("blob:")) return "";
      origines.set(section, origine);
      const deja = filtrees.get(origine);
      if (deja) return deja;
      const blob = await (await fetch(origine)).blob();
      if (!estPageLivre(blob.type)) return origine;
      const propre = neutraliserPageLivre(await blob.text(), blob.type);
      const adresse = URL.createObjectURL(new Blob([propre], { type: blob.type.split(";")[0] }));
      filtrees.set(origine, adresse);
      urlsCreees.add(adresse);
      return adresse;
    };
    section.unload = () => {
      const origine = origines.get(section);
      const filtree = origine ? filtrees.get(origine) : undefined;
      if (origine && filtree) {
        URL.revokeObjectURL(filtree);
        urlsCreees.delete(filtree);
        filtrees.delete(origine);
      }
      decharger?.();
    };
  }
  // Les fichiers de script du livre ne sont pas chargés du tout.
  livre.transformTarget?.addEventListener("load", (evenement) => {
    const detail = (evenement as CustomEvent).detail;
    if (detail?.isScript) detail.allow = false;
  });
}

function luminance(couleur: string): number {
  const valeurs = couleur.match(/[\d.]+/g)?.map(Number);
  if (!valeurs || valeurs.length < 3) return 1;
  const [r, g, b] = valeurs;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Style injecté dans les pages du livre. En thème sombre, beaucoup de livres
// imposent un texte noir : sans cette règle il serait illisible sur le fond de
// l'appli. En thème clair, le livre garde ses propres couleurs.
function styleLiseuse(conteneur: HTMLElement, sonde: HTMLElement): string {
  const style = getComputedStyle(conteneur);
  const sombre = luminance(style.backgroundColor) < 0.5;
  const lien = getComputedStyle(sonde).color;
  const base = `html { color-scheme: ${sombre ? "dark" : "light"}; }`;
  if (!sombre) return base;
  return `${base}
    body, body * { color: ${style.color} !important; background-color: transparent !important; }
    a:link, a:link *, a:visited, a:visited * { color: ${lien} !important; }`;
}

function aplatirSommaire(elements: ElementSommaire[] | undefined, profondeur = 0): { label: string; href: string; profondeur: number }[] {
  const resultat: { label: string; href: string; profondeur: number }[] = [];
  for (const element of elements ?? []) {
    if (element.href) resultat.push({ label: (element.label ?? "").trim() || "Sans titre", href: element.href, profondeur });
    resultat.push(...aplatirSommaire(element.subitems, profondeur + 1));
  }
  return resultat;
}

type Etat = "chargement" | "pret" | "erreur" | "trop-gros";

export function VisionneurLivre({ url, nom, extension }: { url: string; nom: string; extension: string }) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const emplacementRef = useRef<HTMLDivElement>(null);
  const sondeLienRef = useRef<HTMLSpanElement>(null);
  const vueRef = useRef<VueFoliate | null>(null);
  const [etat, setEtat] = useState<Etat>("chargement");
  const [avancement, setAvancement] = useState<number | null>(null);
  const [fraction, setFraction] = useState(0);
  const [chapitre, setChapitre] = useState("");
  const [sommaire, setSommaire] = useState<{ label: string; href: string; profondeur: number }[]>([]);
  const [sommaireOuvert, setSommaireOuvert] = useState(false);
  const [essai, setEssai] = useState(0);
  // Le bouton Télécharger de l'écran d'erreur suit l'avancement et l'échec par
  // l'adresse du fichier, comme les autres boutons de téléchargement (voir
  // lib/etatTelechargements.ts).
  const etatTelechargement = useEtatTelechargement(url);

  useEffect(() => {
    const emplacement = emplacementRef.current;
    const conteneur = conteneurRef.current;
    const sonde = sondeLienRef.current;
    if (!emplacement || !conteneur || !sonde) return;

    const controle = new AbortController();
    const urlsCreees = new Set<string>();
    let vue: VueFoliate | null = null;
    let observateur: MutationObserver | null = null;
    const ecouteSysteme = window.matchMedia("(prefers-color-scheme: dark)");
    let annule = false;

    setEtat("chargement");
    setAvancement(null);
    setFraction(0);
    setChapitre("");
    setSommaire([]);
    setSommaireOuvert(false);

    const appliquerStyle = () => vue?.renderer?.setStyles?.(styleLiseuse(conteneur, sonde));
    const surClavier = (evenement: KeyboardEvent) => {
      if (evenement.key === "ArrowLeft") void vue?.goLeft();
      else if (evenement.key === "ArrowRight") void vue?.goRight();
    };

    (async () => {
      try {
        const [{ makeBook }, blob] = await Promise.all([
          chargerFoliate(),
          lireFichier(url, controle.signal, setAvancement),
        ]);
        if (annule) return;
        const nomFichier = nom.toLowerCase().endsWith(`.${extension}`) ? nom : `${nom}.${extension}`;
        const fichier = new File([blob], nomFichier, { type: TYPE_MIME_PAR_EXTENSION[extension] ?? "" });
        const livre = await makeBook(fichier);
        if (annule) return;
        filtrerPages(livre, urlsCreees);

        vue = document.createElement("foliate-view") as VueFoliate;
        Object.assign(vue.style, { display: "block", width: "100%", height: "100%" });
        emplacement.append(vue);
        vueRef.current = vue;
        vue.addEventListener("relocate", (evenement) => {
          const detail = (evenement as CustomEvent).detail;
          if (typeof detail?.fraction === "number") setFraction(detail.fraction);
          setChapitre(detail?.tocItem?.label?.trim() ?? "");
        });
        vue.addEventListener("load", (evenement) => {
          // Les flèches du clavier fonctionnent aussi quand le focus est dans
          // la page du livre.
          (evenement as CustomEvent).detail?.doc?.addEventListener("keydown", surClavier);
        });
        vue.addEventListener("external-link", (evenement) => {
          evenement.preventDefault();
          const adresse = (evenement as CustomEvent).detail?.href_;
          if (typeof adresse === "string" && estLienExterne(adresse)) traiterLienSortant(adresse);
        });

        await vue.open(livre);
        if (annule) return;
        vue.renderer?.setAttribute("margin", "24px");
        appliquerStyle();
        await vue.init({ showTextStart: false });
        if (annule) return;
        setSommaire(aplatirSommaire(livre.toc));
        setEtat("pret");

        // Le thème peut changer pendant la lecture (réglage de l'appli ou du
        // système) : le style des pages suit.
        observateur = new MutationObserver(appliquerStyle);
        observateur.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
        ecouteSysteme.addEventListener("change", appliquerStyle);
      } catch (erreur) {
        if (annule || (erreur as Error)?.name === "AbortError") return;
        console.error("Liseuse : ouverture impossible", erreur);
        setEtat(erreur instanceof LivreTropVolumineux ? "trop-gros" : "erreur");
      }
    })();

    return () => {
      annule = true;
      controle.abort();
      observateur?.disconnect();
      ecouteSysteme.removeEventListener("change", appliquerStyle);
      try {
        vue?.close();
      } catch {
        // Fermeture déjà faite ou livre jamais ouvert : rien à nettoyer.
      }
      vue?.remove();
      vueRef.current = null;
      urlsCreees.forEach((adresse) => URL.revokeObjectURL(adresse));
      urlsCreees.clear();
    };
  }, [url, nom, extension, essai]);

  const versGauche = useCallback(() => void vueRef.current?.goLeft(), []);
  const versDroite = useCallback(() => void vueRef.current?.goRight(), []);
  const aller = useCallback((href: string) => {
    setSommaireOuvert(false);
    void vueRef.current?.goTo(href);
  }, []);

  if (etat === "erreur" || etat === "trop-gros") {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center text-dj-texte-muet">
        <p className="text-sm">
          {etat === "trop-gros" ? "Ce livre est trop volumineux pour être lu ici." : "Impossible d'ouvrir ce livre ici."}
        </p>
        <div className="flex items-center gap-4">
          {etat === "erreur" && (
            <button onClick={() => setEssai((n) => n + 1)} className="text-xs text-dj-accent-1-texte hover:underline">
              Réessayer
            </button>
          )}
          <button
            onClick={() => void telecharger(url, nom)}
            className={`flex items-center gap-1.5 rounded-lg text-xs text-dj-accent-1-texte hover:underline ${classeEtatTelechargement(etatTelechargement)}`}
          >
            <IconeTelechargement href={url} size={13} /> <LibelleTelechargement href={url} defaut="Télécharger" />
          </button>
        </div>
        <MessageEchecTelechargement href={url} />
      </div>
    );
  }

  const pret = etat === "pret";
  const pourcentage = Math.round(Math.min(1, Math.max(0, fraction)) * 100);

  return (
    <div
      ref={conteneurRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") versGauche();
        else if (e.key === "ArrowRight") versDroite();
      }}
      className="relative flex h-full w-full max-w-full min-w-0 flex-col overflow-hidden rounded-lg bg-dj-surface text-dj-texte outline-none [[data-apercu-inline]_&]:h-[70vh]"
    >
      <span ref={sondeLienRef} className="hidden text-dj-accent-1-texte" aria-hidden />
      <div className="relative min-h-0 flex-1">
        <div ref={emplacementRef} className={`h-full w-full transition-opacity duration-300 ${pret ? "opacity-100" : "opacity-0"}`} />
        <AnimatePresence>
          {!pret && (
            <motion.div
              key="chargement"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col gap-3 p-6"
            >
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="mt-auto h-1 w-full overflow-hidden rounded-full bg-dj-surface-haute">
                <div
                  className={`h-full rounded-full bg-dj-accent-1-texte transition-[width] duration-200 ${avancement === null ? "w-1/3 animate-pulse" : ""}`}
                  style={avancement === null ? undefined : { width: `${Math.round(avancement * 100)}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {pret && sommaireOuvert && (
            <motion.div
              key="sommaire"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-2 bottom-2 z-10 max-h-[70%] overflow-y-auto rounded-xl border border-dj-bordure bg-dj-surface-haute p-1 shadow-lg"
            >
              {sommaire.map((element, index) => (
                <button
                  key={`${element.href}-${index}`}
                  onClick={() => aller(element.href)}
                  style={{ paddingInlineStart: `${0.5 + element.profondeur * 0.9}rem` }}
                  className="block w-full truncate rounded-lg py-1.5 pe-2 text-start text-xs text-dj-texte hover:bg-dj-surface"
                >
                  {element.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div dir="ltr" className="flex shrink-0 items-center gap-1.5 border-t border-dj-bordure px-2 py-1.5">
        {sommaire.length > 0 && (
          <button
            onClick={() => setSommaireOuvert((v) => !v)}
            disabled={!pret}
            aria-label="Sommaire"
            aria-expanded={sommaireOuvert}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-40"
          >
            <List size={16} />
          </button>
        )}
        <button
          onClick={versGauche}
          disabled={!pret}
          aria-label="Page vers la gauche"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-xs text-dj-texte-muet">
          {pret ? (chapitre ? `${chapitre} · ${pourcentage} %` : `${pourcentage} %`) : ""}
        </p>
        <button
          onClick={versDroite}
          disabled={!pret}
          aria-label="Page vers la droite"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
