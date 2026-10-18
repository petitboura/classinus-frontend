"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// 18/10/2026, demande Bourama : liens de partage des éléments publics qui
// ouvrent l'appli sur l'aperçu de l'élément (voir lib/ouvertureParUrl.ts).
//
// Ce composant n'affiche rien. Il relie UN paramètre de l'adresse (par
// exemple ?fichier=ID) à l'élément actuellement ouvert dans l'écran qui
// le contient, dans les deux sens :
//
//   adresse -> écran : à l'arrivée sur un lien, ou au bouton retour du
//     navigateur, `onChangementUrl(id)` est appelé et l'écran ouvre (ou
//     ferme, si id vaut null) l'aperçu exactement comme le ferait un clic.
//   écran -> adresse : quand la personne ouvre ou ferme un aperçu, le
//     paramètre est ajouté (nouvelle entrée d'historique, donc le bouton
//     retour ferme l'aperçu) ou retiré.
//
// Deux façons de gérer l'historique (`mode`) :
//   "apercu" : une fenêtre qu'on ouvre puis qu'on ferme (fichier, skill).
//     Fermer revient en arrière dans l'historique, comme le bouton retour.
//   "navigation" : on se déplace de dossier en dossier, y compris en
//     remontant avec la flèche. Chaque déplacement est une nouvelle entrée,
//     jamais un retour arrière : sinon remonter d'un niveau rouvrirait le
//     dossier qu'on vient de quitter.
//
// Il ne fait RIEN si l'écran n'est pas affiché sur sa vraie page
// (`route`) : la fenêtre flottante du chat affiche les mêmes écrans sur
// l'adresse du chat, il ne faut surtout pas y toucher à l'adresse.
//
// Il vit dans son propre <Suspense> (voir les écrans qui l'utilisent) :
// useSearchParams oblige Next.js à une frontière Suspense pour l'export
// statique mobile (build:capacitor), et ce composant isolé évite d'avoir à
// en ajouter une autour de chaque écran parent.

function normaliser(chemin: string | null): string {
  if (!chemin) return "";
  return chemin.length > 1 ? chemin.replace(/\/+$/, "") : chemin;
}

export function SynchroUrlElement({
  parametre,
  route,
  idActuel,
  onChangementUrl,
  mode = "apercu",
}: {
  /** Nom du paramètre d'adresse, voir PARAMETRES_OUVERTURE. */
  parametre: string;
  /** Adresse de la vraie page de l'écran, la synchronisation n'agit que là. */
  route: string;
  /** Id de l'élément actuellement ouvert dans l'écran, null si aucun. */
  idActuel: string | null;
  /** L'adresse a changé : l'écran doit ouvrir cet id (ou tout fermer si null). */
  onChangementUrl: (id: string | null) => void;
  /** Voir l'explication en tête de fichier, "apercu" par défaut. */
  mode?: "apercu" | "navigation";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actif = normaliser(pathname) === normaliser(route);
  const idUrl = searchParams.get(parametre);

  const rappelRef = useRef(onChangementUrl);
  rappelRef.current = onChangementUrl;
  const idActuelRef = useRef(idActuel);
  idActuelRef.current = idActuel;

  // Dernière valeur lue dans l'adresse (undefined : jamais lue). Sert à
  // reconnaître un changement d'écran qui vient de l'adresse elle-même
  // (pour ne pas le réécrire dans l'adresse en boucle).
  const dernierIdUrlRef = useRef<string | null | undefined>(undefined);
  // Vrai quand NOUS avons ajouté l'entrée d'historique de l'aperçu ouvert :
  // alors fermer revient en arrière (le retour du navigateur et la
  // fermeture donnent le même résultat). Faux quand la personne est
  // arrivée directement par un lien : il n'y a rien où revenir dans
  // l'appli, la fermeture retire simplement le paramètre.
  const entreePousseeRef = useRef(false);

  // Adresse -> écran.
  useEffect(() => {
    if (!actif) return;
    dernierIdUrlRef.current = idUrl;
    if (idUrl !== idActuelRef.current) {
      entreePousseeRef.current = false;
      rappelRef.current(idUrl);
    }
  }, [actif, idUrl]);

  // Écran -> adresse.
  const idPrecedentRef = useRef(idActuel);
  useEffect(() => {
    if (!actif) {
      idPrecedentRef.current = idActuel;
      return;
    }
    if (idActuel === idPrecedentRef.current) return;
    idPrecedentRef.current = idActuel;
    // Changement venu de l'adresse : déjà à jour, rien à écrire.
    if (idActuel === dernierIdUrlRef.current) return;

    if (mode === "apercu" && idActuel === null && entreePousseeRef.current) {
      entreePousseeRef.current = false;
      router.back();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (idActuel) params.set(parametre, idActuel);
    else params.delete(parametre);
    const requete = params.toString();
    const adresse = requete ? `${pathname}?${requete}` : pathname;

    if (idActuel || mode === "navigation") {
      entreePousseeRef.current = true;
      router.push(adresse, { scroll: false });
    } else {
      router.replace(adresse, { scroll: false });
    }
  }, [actif, idActuel, parametre, pathname, router, mode]);

  return null;
}
