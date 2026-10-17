// Chantier "visibilité auprès des IA" (11/10/2026, demande Bourama).
// Balise de données structurées (JSON-LD, vocabulaire schema.org) : une
// description de la page écrite pour les machines. Les moteurs de recherche
// et les IA y lisent directement ce qu'est Classinus et les questions
// auxquelles la page répond, sans avoir à deviner à partir de la mise en
// page.
//
// Composant serveur, volontairement sans état : le contenu est dans le HTML
// envoyé par le serveur, donc lisible par un robot qui n'exécute pas de
// JavaScript.
//
// Le "<" est remplacé par son code unicode : un texte qui contiendrait
// "</script>" ne pourra jamais refermer la balise avant l'heure.
export function DonneesStructurees({ donnees }: { donnees: Record<string, unknown> }) {
  const json = JSON.stringify(donnees).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
