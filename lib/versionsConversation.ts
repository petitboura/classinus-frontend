import type { MessageAffiche, VersionAlternative } from "@/components/chat/BulleMessage";

// Fonctions pures du chantier "versions navigables" (26/10/2026). Elles vivent
// ici, hors de ChatIA.tsx, pour rester testables et garder ce fichier petit.

// Id du dernier message reellement enregistre en base, en partant de la fin.
// Un message dont la generation a echoue n'a jamais d'id : y rattacher la
// suite avec un parent vide en ferait une racine orpheline au rechargement.
export function dernierIdEnregistre(messages: MessageAffiche[]): number | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const id = messages[i].id;
    if (id !== null && id !== undefined) return id;
  }
  return null;
}

// Copie du message sans ses champs de navigation, telle qu'on la range dans
// une version.
function messageSansNavigation(message: MessageAffiche): MessageAffiche {
  return { ...message, versions: undefined, versionActive: undefined };
}

// Remet a jour l'entree de la version actuellement affichee avec l'etat reel
// du message et de sa suite. A appeler juste avant de quitter une version :
// l'entree rangee a sa creation est vide ou ancienne, le texte affiche mot
// par mot ne la rejoint jamais tout seul.
export function versionsAvecActiveMiseAJour(
  message: MessageAffiche,
  suite: MessageAffiche[]
): VersionAlternative[] | undefined {
  if (!message.versions || message.versionActive === undefined) return message.versions;
  const active = message.versionActive;
  return message.versions.map((v, i) => (i === active ? { message: messageSansNavigation(message), suite } : v));
}

// Versions deja existantes a conserver quand on en ajoute une nouvelle a cet
// endroit. Une reponse en echec ou interrompue qui n'a jamais ete enregistree
// n'est pas gardee : la nouvelle tentative la remplace, sinon le compteur
// compterait des versions qui n'existent pas en base.
export function versionsExistantesPour(message: MessageAffiche, suiteApres: MessageAffiche[]): VersionAlternative[] {
  const jamaisEnregistree = message.id === null || message.id === undefined;
  if ((message.erreurTour || message.interrompue) && jamaisEnregistree) {
    return (message.versions ?? []).filter((_, i) => i !== message.versionActive);
  }
  if (message.versions && message.versions.length > 0 && message.versionActive !== undefined) {
    return versionsAvecActiveMiseAJour(message, suiteApres) ?? message.versions;
  }
  return [{ message: messageSansNavigation(message), suite: suiteApres }];
}
