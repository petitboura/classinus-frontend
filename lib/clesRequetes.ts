// Créé le 17/09/2026 : clés de requêtes React Query centralisées, pour
// que la section qui charge une donnée (ex: EspaceBibliotheque.tsx) et
// tout ce qui doit l'invalider de l'extérieur (ex: le canal temps réel
// sur réception d'un fichier, voir SyncTempsReelCache.tsx) utilisent
// EXACTEMENT la même clé, sans jamais dupliquer une chaîne en dur à
// deux endroits différents (standards-dev #2).
//
// 17/09/2026 (suite, migration "one shot" de toutes les sections) :
// plusieurs sections appellent en réalité le même endpoint (ex: la liste
// de comportements est lue à la fois par MesComportements.tsx et
// MesCodes.tsx, la liste de dossiers de bibliothèque par
// EspaceBibliotheque.tsx et MesCodes.tsx) -- factorisé en fonctions de
// clé (comportements(agentId)) plutôt qu'une clé fixe, pour que ces
// sections PARTAGENT une seule entrée de cache au lieu de reguêter
// chacune de son côté.
export const clesRequetes = {
  bibliothequeFichiers: ["bibliotheque", "fichiers"] as const,
  bibliothequeDossiers: ["bibliotheque", "dossiers"] as const,
  comportements: (agentId: string) => ["comportements", agentId] as const,
  codes: ["codes"] as const,
  programmeNotions: (codeId: string) => ["programme-notions", "notions", codeId] as const,
  etablissements: ["etablissements"] as const,
  etablissementsMesRattachements: ["etablissements", "mes-rattachements"] as const,
  correctionsProf: (onglet: string) => ["corrections-prof", onglet] as const,
  memoire: ["memoire"] as const,
  adminSignalements: ["admin-signalements"] as const,
  auditCorrections: ["audit-corrections"] as const,
  auditComplet: (codeId: string) => ["audit-complet", codeId] as const,
};
