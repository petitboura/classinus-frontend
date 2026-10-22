"use client";

import { useEffect, useRef } from "react";
import { EVENEMENT_LOCALE_CLASSINUS, obtenirLocale, type Locale } from "@/lib/i18n/locale";
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
  const localeRef = useRef<Locale>("fr");
  // Vrai seulement quand la page porte des textes traduits. En français pur, rien n'est parcouru ni surveillé.
  const traductionActive = useRef(false);
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
      // Français sans traduction préalable : rien à parcourir, on évite de lire toute la page.
      if (localeRef.current !== "en" && !traductionActive.current) {
        document.documentElement.lang = localeRef.current;
        return;
      }
      // Inclut le titre et les métadonnées descriptives du head, ainsi que
      // le corps, tout en laissant les scripts et contenus dynamiques protégés.
      traduireSousArbre(document.documentElement);
      document.documentElement.lang = localeRef.current;
      // Après un retour au français, les textes d'origine sont restaurés : plus rien à surveiller.
      traductionActive.current = localeRef.current === "en";
    };

    localeRef.current = obtenirLocale();
    appliquerPartout();

    const observer = new MutationObserver((changements) => {
      if (!traductionActive.current) return;
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
        appliquerPartout();
    };
    window.addEventListener(EVENEMENT_LOCALE_CLASSINUS, changer);
    const synchroniserAutreOnglet = (event: StorageEvent) => {
      if (event.key === "classinus.locale") {
        const choisie = event.newValue === "en" ? "en" : "fr";
        localeRef.current = choisie;
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

  // 22/10/2026, demande Bourama : la pastille FR/EN flottante est supprimée
  // pour toujours, ne jamais la remettre. La langue se choisit à la création
  // du compte et dans Paramètres > Préférences. Ce composant ne garde que la
  // traduction de la page, sans rien afficher.
  return null;
}
