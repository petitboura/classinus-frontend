// 17/09/2026, demande Bourama : la description d'un document (page de
// consultation via lien de partage, perso ou publique) était affichée en
// texte brut -- un lien collé dedans par la personne qui a publié le
// document ne devenait jamais cliquable pour qui consulte ensuite.
//
// Volontairement PAS de rendu Markdown complet ici (react-markdown, déjà
// utilisé ailleurs pour le corps d'une skill, voir
// app/(app)/skills/[id]/page.tsx) : une description est un texte simple
// tapé par un utilisateur, pas un contenu écrit pour être formaté --
// passer par du Markdown complet transformerait un `*` ou un `_` déjà
// présent dans une description existante en gras/italique inattendu.
// Seules les URLs sont détectées et rendues cliquables, le reste du
// texte reste affiché tel quel.
//
// Composant volontairement sans "use client" ni hook : utilisable tel
// quel depuis un Server Component (voir app/(app)/bibliotheque/[id]/page.tsx)
// comme depuis un Client Component (ConsultationFichierBibliothequePerso.tsx).

const REGEX_URL = /(https?:\/\/[^\s]+)/g;

// Ponctuation de fin de phrase qu'on ne veut pas avaler dans le lien
// quand elle suit directement une URL collée dans une description
// ("Voir https://exemple.com." -> le "." final reste hors du lien).
const PONCTUATION_FINALE = /[.,;:!?)\]]+$/;

export function TexteAvecLiens({ texte, className = "" }: { texte: string; className?: string }) {
  const morceaux = texte.split(REGEX_URL);

  return (
    <p className={className}>
      {morceaux.map((morceau, i) => {
        const estUrl = /^https?:\/\//.test(morceau);
        if (!estUrl) return <span key={i}>{morceau}</span>;

        const suffixe = morceau.match(PONCTUATION_FINALE)?.[0] || "";
        const lien = suffixe ? morceau.slice(0, -suffixe.length) : morceau;

        return (
          <span key={i}>
            <a
              href={lien}
              target="_blank"
              rel="noopener noreferrer"
              className="text-dj-accent-1 underline decoration-dj-accent-1/40 underline-offset-2 transition-colors hover:text-dj-accent-2"
            >
              {lien}
            </a>
            {suffixe}
          </span>
        );
      })}
    </p>
  );
}
