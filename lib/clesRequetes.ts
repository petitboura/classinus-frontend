// Créé le 17/09/2026 : clés de requêtes React Query centralisées, pour
// que la section qui charge une donnée (ex: EspaceBibliotheque.tsx) et
// tout ce qui doit l'invalider de l'extérieur (ex: le canal temps réel
// sur réception d'un fichier, voir SyncTempsReelCache.tsx) utilisent
// EXACTEMENT la même clé, sans jamais dupliquer une chaîne en dur à
// deux endroits différents (standards-dev #2).
export const clesRequetes = {
  bibliothequeFichiers: ["bibliotheque", "fichiers"] as const,
  bibliothequeDossiers: ["bibliotheque", "dossiers"] as const,
};
