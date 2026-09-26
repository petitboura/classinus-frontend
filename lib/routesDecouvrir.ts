// Chantier SEO/AEO de Classinus (26/09/2026, demande Bourama). Nouvelle
// famille de pages publiques de présentation, séparée de l'app elle même
// (jamais un sous domaine à part, pour ne pas diluer le référencement),
// sous /decouvrir/... . Même principe que ROUTES_BIBLIOTHEQUE
// (lib/routesBibliotheque.ts) : ce fichier est la seule source de ces
// adresses, pour ne jamais les répéter en dur ailleurs dans le code.
//
// Bibliothèque est la première section traitée (25 26/09/2026). Les
// prochaines sections (Bureau, Personnaliser Classinus, Concentration,
// Établissements, Utiliser Classinus dans Claude) ajouteront leurs
// propres entrées ici au fil des prochains chantiers.
export const ROUTES_DECOUVRIR = {
  accueil: "/decouvrir",
  bibliotheque: {
    accueil: "/decouvrir/bibliotheque",
    perso: "/decouvrir/bibliotheque/perso",
    publique: "/decouvrir/bibliotheque/publique",
    telephone: "/decouvrir/bibliotheque/telephone",
  },
} as const;
