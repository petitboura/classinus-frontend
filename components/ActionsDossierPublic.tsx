"use client";

import { useState } from "react";
import { Check, FolderPlus, Loader2 } from "lucide-react";
import { attacherDossierPublic } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { CTACompteRequis } from "@/components/CTACompteRequis";
import { SuggestionCompte } from "@/components/SuggestionCompte";
import { ButtonPartager, lienPartage } from "@/components/ButtonPartager";
import { BoutonAvecIA } from "@/components/BoutonAvecIA";

// 16/09/2026, demande Bourama ("les pages si tu ouvres un lien de partage
// n'ont aucun CTA") : la page d'un dossier public n'avait aucune action du
// tout, juste la liste de son contenu. Pendant équivalent
// d'ActionsFichierPublic.tsx et d'ActionsSkillPublic.tsx.
//
// L'ajout réutilise attacherDossierPublic, déjà en place côté
// BibliothequePublique.tsx : le dossier apparaît dans la bibliothèque
// perso et reste synchronisé avec l'original, exactement comme quand on
// l'attache depuis la liste.
export function ActionsDossierPublic({ dossierId, nom }: { dossierId: string; nom: string }) {
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [ajoute, setAjoute] = useState(false);
  const [sansCompte, setSansCompte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouter() {
    if (ajoutEnCours || ajoute) return;
    setAjoutEnCours(true);
    setErreur(null);
    try {
      await attacherDossierPublic(dossierId);
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
    return <CTACompteRequis texte="Crée un compte pour ajouter ce dossier à ta bibliothèque." />;
  }

  return (
    <div className="flex flex-col gap-2">
      <SuggestionCompte texte="Crée un compte pour ajouter ce dossier à ton espace Clovis." />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={ajouter}
          disabled={ajoutEnCours || ajoute}
          className="flex items-center gap-1.5 rounded-cgpt-bouton bg-dj-accent-1 px-4 py-2 text-sm font-semibold text-[#1a0f06] transition-colors duration-200 ease-cgpt-doux hover:bg-dj-accent-2 disabled:pointer-events-none disabled:opacity-70"
        >
          {ajoutEnCours ? <Loader2 size={15} className="animate-spin" /> : ajoute ? <Check size={15} /> : <FolderPlus size={15} />}
          {ajoute ? "Ajouté" : "Ajouter à ma bibliothèque"}
        </button>
        <BoutonAvecIA
          libelle="Explorer avec l'IA"
          texte={
            `Je veux explorer le dossier public id ${dossierId}. ` +
            `Utilise l'outil gerer_dossier_catalogue_public (action "consulter") avec cet id pour voir ce qu'il contient, ` +
            `puis discutons-en ensemble.`
          }
        />
        <ButtonPartager lien={lienPartage("dossier-public", dossierId)} titre={nom} />
      </div>
      {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}
    </div>
  );
}
