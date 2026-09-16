"use client";

import { useState } from "react";
import { Check, Library, Loader2 } from "lucide-react";
import { copierVersBibliothequePersonnelle } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { CTACompteRequis } from "@/components/CTACompteRequis";
import { ButtonPartager, lienPartage } from "@/components/ButtonPartager";
import { BoutonTelechargerFichier } from "@/components/BoutonTelechargerFichier";
import { SuggestionCompte } from "@/components/SuggestionCompte";

// 16/09/2026, demande Bourama ("les pages si tu ouvres un lien de partage
// n'ont aucun CTA") : la page d'un document de la bibliothèque publique
// n'offrait que le téléchargement, donc rien qui ramène la personne dans
// Clovis. Même rôle et même structure qu'ActionsSkillPublic.tsx pour une
// skill : un Client Component isolé, parce que la page elle même reste un
// Server Component pour generateMetadata.
//
// L'action d'ajout réutilise copierVersBibliothequePersonnelle, déjà en
// place côté BibliothequePublique.tsx : aucune nouvelle route, et la
// personne retrouve le document au même endroit que si elle l'avait
// ajouté depuis la liste.
export function ActionsFichierPublic({
  entreeId,
  nom,
  urlPublique,
  nomFichier,
}: {
  entreeId: string;
  nom: string;
  urlPublique?: string | null;
  nomFichier?: string | null;
}) {
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [ajoute, setAjoute] = useState(false);
  const [sansCompte, setSansCompte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouter() {
    if (ajoutEnCours || ajoute) return;
    setAjoutEnCours(true);
    setErreur(null);
    try {
      await copierVersBibliothequePersonnelle(entreeId);
      setAjoute(true);
    } catch (e) {
      if (e instanceof ErreurApi && e.statusCode === 401) {
        setSansCompte(true);
      } else {
        setErreur(messageErreur(e));
      }
    } finally {
      setAjoutEnCours(false);
    }
  }

  if (sansCompte) {
    return <CTACompteRequis texte="Crée un compte pour ajouter ce document à ta bibliothèque." />;
  }

  return (
    <div className="flex flex-col gap-2">
      <SuggestionCompte texte="Crée un compte pour sauvegarder ce document dans ton espace Clovis." />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={ajouter}
          disabled={ajoutEnCours || ajoute}
          className="flex items-center gap-1.5 rounded-cgpt-bouton bg-dj-accent-1 px-4 py-2 text-sm font-semibold text-[#1a0f06] transition-colors duration-200 ease-cgpt-doux hover:bg-dj-accent-2 disabled:pointer-events-none disabled:opacity-70"
        >
          {ajoutEnCours ? <Loader2 size={15} className="animate-spin" /> : ajoute ? <Check size={15} /> : <Library size={15} />}
          {ajoute ? "Ajouté" : "Ajouter à ma bibliothèque"}
        </button>
        {urlPublique && <BoutonTelechargerFichier url={urlPublique} nom={nomFichier || nom} />}
        <ButtonPartager lien={lienPartage("fichier-public", entreeId)} titre={nom} />
      </div>
      {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}
    </div>
  );
}
