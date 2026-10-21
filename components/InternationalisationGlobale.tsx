"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { definirLocale, EVENEMENT_LOCALE_CLASSINUS, obtenirLocale, type Locale } from "@/lib/i18n/locale";
import { traduireTexteInterface } from "@/lib/i18n/interface";

type ValeurTraduisible = { source: string; applique: string };

const ATTRIBUTS = ["title", "placeholder", "aria-label", "aria-description", "alt", "content"] as const;
const SELECTEURS_IGNORES = [
  "script", "style", "noscript", "textarea", "pre", "code", "svg", "math",
  "iframe", "[contenteditable='true']", "[role='textbox']", "[data-i18n-skip]",
  "[data-no-translate]", ".markdown-body", ".dj-markdown", ".cm-editor", ".monaco-editor",
  ".tiptap", ".ql-editor", ".katex", "mjx-container",
].join(",");

function ignorerElement(element: Element | null): boolean {
  return !!element?.closest(SELECTEURS_IGNORES);
}

export function InternationalisationGlobale() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>("fr");
  const localeRef = useRef<Locale>("fr");
  const textesOriginaux = useRef(new WeakMap<Text, ValeurTraduisible>());
  const attributsOriginaux = useRef(new WeakMap<Element, Map<string, ValeurTraduisible>>());

  useEffect(() => {
    const lireAttribut = (element: Element, nom: string) => {
      // Le contenu des autres balises meta (URLs, couleurs, indicateurs PWA,
      // etc.) n'est jamais du texte d'interface et ne doit pas être touché.
      if (
        nom === "content" &&
        !element.matches(
          'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"], meta[property="og:title"], meta[name="twitter:title"]'
        )
      ) return;
      const valeur = element.getAttribute(nom);
      if (valeur === null) return;
      let memoire = attributsOriginaux.current.get(element);
      if (!memoire) {
        memoire = new Map();
        attributsOriginaux.current.set(element, memoire);
      }
      let entree = memoire.get(nom);
      if (!entree) {
        entree = { source: valeur, applique: valeur };
        memoire.set(nom, entree);
      } else if (valeur !== entree.applique) {
        // React ou le composant propriétaire vient de mettre à jour l'attribut.
        entree.source = valeur;
      }
      const traduction = traduireTexteInterface(entree.source, localeRef.current);
      entree.applique = traduction;
      if (valeur !== traduction) element.setAttribute(nom, traduction);
    };

    const traduireNoeud = (noeud: Text) => {
      if (ignorerElement(noeud.parentElement)) return;
      const valeur = noeud.data;
      let entree = textesOriginaux.current.get(noeud);
      if (!entree) {
        entree = { source: valeur, applique: valeur };
        textesOriginaux.current.set(noeud, entree);
      } else if (valeur !== entree.applique) {
        // Garde les textes dynamiques écrits ensuite par React comme source.
        entree.source = valeur;
      }
      const traduction = traduireTexteInterface(entree.source, localeRef.current);
      entree.applique = traduction;
      if (valeur !== traduction) noeud.data = traduction;
    };

    const traduireSousArbre = (racine: Node) => {
      if (racine.nodeType === Node.TEXT_NODE) {
        traduireNoeud(racine as Text);
        return;
      }
      if (racine.nodeType !== Node.ELEMENT_NODE && racine.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
      const element = racine.nodeType === Node.ELEMENT_NODE ? racine as Element : null;
      if (element && !ignorerElement(element)) {
        for (const attribut of ATTRIBUTS) lireAttribut(element, attribut);
      }
      if (element && ignorerElement(element)) return;
      const parcours = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
      let noeud: Node | null;
      while ((noeud = parcours.nextNode())) traduireNoeud(noeud as Text);
      if (element) {
        element.querySelectorAll("*").forEach((enfant) => {
          if (ignorerElement(enfant)) return;
          for (const attribut of ATTRIBUTS) lireAttribut(enfant, attribut);
        });
      }
    };

    const appliquerPartout = () => {
      // Inclut le titre et les métadonnées descriptives du head, ainsi que
      // le corps, tout en laissant les scripts et contenus dynamiques protégés.
      traduireSousArbre(document.documentElement);
      document.documentElement.lang = localeRef.current;
    };

    localeRef.current = obtenirLocale();
    setLocale(localeRef.current);
    appliquerPartout();

    const observer = new MutationObserver((changements) => {
      // Traite chaque lot remis par le navigateur sans en abandonner si
      // React met à jour plusieurs nœuds pendant un rendu rapide.
      for (const changement of changements) {
        if (changement.type === "characterData" && changement.target.nodeType === Node.TEXT_NODE) {
          traduireNoeud(changement.target as Text);
        } else if (changement.type === "attributes" && changement.target.nodeType === Node.ELEMENT_NODE) {
          const element = changement.target as Element;
          if (!ignorerElement(element)) {
            const nom = changement.attributeName;
            if (nom && (ATTRIBUTS as readonly string[]).includes(nom)) lireAttribut(element, nom);
          }
        } else {
          changement.addedNodes.forEach(traduireSousArbre);
        }
      }
    });
    const optionsObservation: MutationObserverInit = {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTS],
    };
    observer.observe(document.documentElement, optionsObservation);

    const changer = (event: Event) => {
      const choisie = (event as CustomEvent<Locale>).detail;
      localeRef.current = choisie === "en" ? "en" : "fr";
      setLocale(localeRef.current);
      appliquerPartout();
    };
    window.addEventListener(EVENEMENT_LOCALE_CLASSINUS, changer);
    const synchroniserAutreOnglet = (event: StorageEvent) => {
      if (event.key === "classinus.locale") {
        const choisie = event.newValue === "en" ? "en" : "fr";
        localeRef.current = choisie;
        setLocale(choisie);
        appliquerPartout();
      }
    };
    window.addEventListener("storage", synchroniserAutreOnglet);

    return () => {
      observer.disconnect();
      window.removeEventListener(EVENEMENT_LOCALE_CLASSINUS, changer);
      window.removeEventListener("storage", synchroniserAutreOnglet);
    };
  }, []);

  if (pathname?.startsWith("/agent-superposition")) return null;

  return (
    <div
      data-i18n-skip
      className="fixed right-3 top-3 z-[90] flex items-center gap-1.5 rounded-full border border-dj-bordure bg-dj-surface/95 px-2.5 py-1.5 text-xs text-dj-texte shadow-sm backdrop-blur"
    >
      <label htmlFor="classinus-locale" className="sr-only">
        {locale === "fr" ? "Langue de l’interface" : "Interface language"}
      </label>
      <select
        id="classinus-locale"
        aria-label={locale === "fr" ? "Langue de l’interface" : "Interface language"}
        value={locale}
        onChange={(event) => definirLocale(event.target.value === "en" ? "en" : "fr")}
        className="cursor-pointer appearance-none bg-transparent pr-1 font-medium outline-none"
      >
        <option value="fr">FR · Français</option>
        <option value="en">EN · English</option>
      </select>
    </div>
  );
}
