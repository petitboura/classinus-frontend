"use client";

// Cree le 13/10/2026, demande Bourama : reglage du bouton flottant du canal en
// direct (Parametres, Preferences). N'apparait que dans l'appli Android : le
// bouton n'existe ni sur le web ni sur iOS.
//
// Activer demande d'abord la permission "Afficher par-dessus les autres
// applications" (reglages du systeme, jamais contournee), puis montre le
// bouton. Desactiver le retire et l'etudiant ne le revoit pas, meme apres un
// redemarrage du telephone, tant qu'il ne le reactive pas ici.
import { useEffect, useState } from "react";
import { BoutonInfoSection } from "./BoutonInfoSection";
import {
  arreterBoutonFlottant,
  boutonFlottantDisponible,
  codeErreurBoutonFlottant,
  demarrerBoutonFlottant,
  etatBoutonFlottant,
} from "@/lib/boutonFlottantAndroid";
import { demanderPermissionSuperposition } from "@/lib/superposition";
import { textesBoutonFlottant } from "@/lib/textesBoutonFlottant";

export function ReglageBoutonFlottantAndroid() {
  const textes = textesBoutonFlottant();
  const [disponible, setDisponible] = useState(false);
  const [actif, setActif] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!boutonFlottantDisponible()) return;
    setDisponible(true);
    etatBoutonFlottant()
      .then((etat) => setActif(etat.demarre))
      .catch(() => setActif(false));
  }, []);

  if (!disponible) return null;

  async function activer() {
    const etat = await etatBoutonFlottant();
    if (!etat.permissionAccordee) {
      const { accordee } = await demanderPermissionSuperposition();
      if (!accordee) {
        setMessage(textes.messagePermissionRefusee);
        return;
      }
    }
    await demarrerBoutonFlottant({
      titre: textes.notificationTitre,
      texte: textes.notificationTexte,
      libelleMasquer: textes.notificationMasquer,
    });
    setActif(true);
    setMessage(textes.messageActive);
  }

  async function desactiver() {
    await arreterBoutonFlottant();
    setActif(false);
    setMessage(textes.messageDesactive);
  }

  async function basculer() {
    setEnCours(true);
    setMessage(null);
    try {
      if (actif) await desactiver();
      else await activer();
    } catch (e) {
      setMessage(codeErreurBoutonFlottant(e) === "PERMISSION_REFUSEE" ? textes.messagePermissionRefusee : textes.messageEchec);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <>
      <div className="flex animate-dj-fade-in-rapide items-center justify-between gap-4 border-t border-dj-bordure pt-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-dj-texte">{textes.reglageTitre}</span>
            <BoutonInfoSection rubriqueId="bouton-flottant" texteCourt={textes.reglageDescription} />
          </div>
          <span className="text-xs text-dj-texte-muet">{textes.reglageDescription}</span>
        </div>
        <button
          role="switch"
          aria-checked={actif}
          aria-label={textes.reglageTitre}
          onClick={basculer}
          disabled={enCours}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            actif ? "bg-dj-accent-1" : "bg-dj-inactif"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              actif ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {message && <span className="text-sm text-dj-texte-muet">{message}</span>}
    </>
  );
}
