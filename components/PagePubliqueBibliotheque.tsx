import Link from "next/link";
import type { DossierCataloguePublic, EntreeBibliothequePublique } from "@/lib/api";
import { adresseOuvertureDossierPublic, adresseOuvertureFichierPublic } from "@/lib/ouvertureParUrl";

// 25/11/2026, demande de Bourama ("option 2") : page publique lisible, rendue côté serveur, pour chaque dossier et
// chaque fichier de la bibliothèque publique. Un moteur de recherche ou une IA y trouve le nom, la description et le
// contenu ; une personne y voit la même chose puis clique sur "Ouvrir dans Classinus" pour entrer dans l'appli.
// Composant sans état et sans appel réseau : les pages /bibliotheque/[id] et /dossiers/[id] lui passent les données.
// Les textes sont en français et en anglais (la langue du visiteur n'est pas connue côté serveur).

const CLASSE_BOUTON =
  "inline-flex items-center justify-center rounded-full bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] hover:bg-dj-accent-2";
const CLASSE_CARTE = "rounded-cgpt-carte border border-dj-bordure bg-dj-surface";

function formaterTaille(octets: number | null): string | null {
  if (!octets || octets <= 0) return null;
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko / KB`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo / MB`;
}

function Coquille({ titre, description, bouton, children }: {
  titre: string;
  description?: string | null;
  bouton: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-24 pt-6 md:pt-8">
      <nav className="text-sm text-dj-texte-muet">
        <Link href="/" className="hover:text-dj-texte">Classinus</Link>
        <span aria-hidden> / </span>
        <span>Bibliothèque publique / Public library</span>
      </nav>
      <header className={`${CLASSE_CARTE} p-5`}>
        <h1 className="break-words text-xl font-semibold text-dj-texte">{titre}</h1>
        {description ? <p className="mt-2 whitespace-pre-line break-words text-sm text-dj-texte-muet">{description}</p> : null}
        <div className="mt-4">{bouton}</div>
      </header>
      {children}
    </main>
  );
}

export function PagePubliqueDossier({
  dossier,
  fichiers,
}: {
  dossier: DossierCataloguePublic;
  fichiers: EntreeBibliothequePublique[];
}) {
  const contenu = dossier.contenu;
  const nbSous = dossier.sous_dossiers?.length ?? 0;
  return (
    <Coquille
      titre={dossier.nom}
      description={dossier.description}
      bouton={
        <Link href={adresseOuvertureDossierPublic(dossier.id)} className={CLASSE_BOUTON}>
          Ouvrir dans Classinus / Open in Classinus
        </Link>
      }
    >
      <p className="text-sm text-dj-texte-muet">
        Dossier de la bibliothèque publique de Classinus
        {contenu ? ` : ${contenu.nb_fichiers} fichier(s), ${contenu.nb_liens} lien(s), ${contenu.nb_sous_dossiers} sous-dossier(s).` : "."}
        {" "}Public folder on the Classinus library
        {contenu ? `: ${contenu.nb_fichiers} file(s), ${contenu.nb_liens} link(s), ${contenu.nb_sous_dossiers} subfolder(s).` : "."}
      </p>
      {nbSous > 0 ? (
        <section aria-label="Sous-dossiers / Subfolders" className={`${CLASSE_CARTE} divide-y divide-dj-bordure`}>
          {dossier.sous_dossiers.map((s) => (
            <Link key={s.id} href={`/dossiers/${s.id}`} className="block break-words px-5 py-3 text-sm text-dj-texte hover:bg-dj-surface-haute">
              {s.nom}
            </Link>
          ))}
        </section>
      ) : null}
      {fichiers.length > 0 ? (
        <section aria-label="Fichiers / Files" className={`${CLASSE_CARTE} divide-y divide-dj-bordure`}>
          {fichiers.map((f) => (
            <Link key={f.id} href={`/bibliotheque/${f.id}`} className="block px-5 py-3 hover:bg-dj-surface-haute">
              <span className="block break-words text-sm text-dj-texte">{f.nom}</span>
              {f.description ? <span className="mt-0.5 line-clamp-2 block break-words text-xs text-dj-texte-muet">{f.description}</span> : null}
            </Link>
          ))}
        </section>
      ) : null}
    </Coquille>
  );
}

export function PagePubliqueFichier({ entree }: { entree: EntreeBibliothequePublique }) {
  const taille = formaterTaille(entree.taille_octets);
  return (
    <Coquille
      titre={entree.nom}
      description={entree.description}
      bouton={
        <Link href={adresseOuvertureFichierPublic(entree.id)} className={CLASSE_BOUTON}>
          Ouvrir dans Classinus / Open in Classinus
        </Link>
      }
    >
      <p className="text-sm text-dj-texte-muet">
        Document partagé sur la bibliothèque publique de Classinus. / Document shared on the Classinus public library.
        {entree.nom_fichier ? ` ${entree.nom_fichier}` : ""}
        {taille ? ` (${taille})` : ""}
      </p>
    </Coquille>
  );
}
