"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Link2, Share2, Sparkles, Trash2, Upload, X } from "lucide-react";
import { lireSkillComportement, publierComportement, supprimerComportement, type Comportement } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { texteConfiguration } from "@/lib/i18n/textesConfiguration";
import { telechargerTexte, nomFichierDepuis } from "@/lib/telechargerTexte";
import { useOuvrirChatAvecTexte } from "@/lib/contexteChat";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { usePremierePublicationCatalogue } from "@/lib/usePremierePublicationCatalogue";
import { MenuActionsCarte } from "@/components/MenuActionsCarte";
import { lienPartage, partagerOuCopierLien } from "@/components/ButtonPartager";
import { PanneauFlottant } from "@/components/PanneauFlottant";
import { SelecteurCodesPartage } from "@/components/SelecteurCodesPartage";
import { PopupProposerProfilPublic } from "@/components/PopupProposerProfilPublic";

// 02/10/2026, demande Bourama : après création, les cartes des 4 onglets
// de Configuration et les pastilles de Mes skills n'avaient que la
// bascule activer/désactiver, il fallait ouvrir l'éditeur pour tout le
// reste. Ce menu des trois points regroupe les actions qui n'ont pas
// besoin de l'éditeur. Les 4 onglets de Configuration doivent rester
// différents des skills : ils n'ont que lier à un code, utiliser avec
// l'IA et supprimer. Partager, télécharger et publier sont réservés aux
// skills (avecActionsSkill). Les fenêtres et le message de retour sont
// rendus dans document.body : une carte désactivée est à demi
// transparente, et ses enfants le seraient aussi.
export function MenuElementConfiguration({
  agentId,
  c,
  onSupprime,
  avecActionsSkill = false,
}: {
  agentId: string;
  c: Comportement;
  onSupprime: (id: string) => void;
  avecActionsSkill?: boolean;
}) {
  const ouvrirChatAvecTexte = useOuvrirChatAvecTexte();
  const [codesOuvert, setCodesOuvert] = useState(false);
  const { enSortie: codesEnSortie, demarrerFermeture: fermerCodes } = useFermetureAnimee();
  const [retour, setRetour] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);
  const {
    popupOuverte: popupProfilOuverte,
    fermerPopup: fermerPopupProfil,
    signalerPublication,
  } = usePremierePublicationCatalogue();

  useEffect(() => {
    if (!retour) return;
    const minuteur = setTimeout(() => setRetour(null), retour.erreur ? 5000 : 2500);
    return () => clearTimeout(minuteur);
  }, [retour]);

  async function executer(action: () => Promise<void>) {
    if (actionEnCours) return;
    setActionEnCours(true);
    try {
      await action();
    } catch (e) {
      setRetour({ texte: messageErreur(e), erreur: true });
    } finally {
      setActionEnCours(false);
    }
  }

  const supprimer = () => {
    if (!window.confirm(texteConfiguration("confirm.supprimer"))) return;
    void executer(async () => {
      await supprimerComportement(agentId, c.id);
      onSupprime(c.id);
    });
  };

  const telecharger = () =>
    executer(async () => {
      const md = await lireSkillComportement(agentId, c.id);
      telechargerTexte(nomFichierDepuis(c.nom || texteConfiguration("retour.nomFichierDefaut"), "md"), md);
    });

  const publier = () =>
    executer(async () => {
      setRetour({ texte: texteConfiguration("retour.publication"), erreur: false });
      await publierComportement(agentId, c.id);
      setRetour({ texte: texteConfiguration("retour.publie"), erreur: false });
      void signalerPublication();
    });

  const actions = [
    { cle: "code", label: texteConfiguration("action.lierCode"), icone: <Link2 size={14} />, onClick: () => setCodesOuvert(true) },
    {
      cle: "ia",
      label: texteConfiguration("action.ia"),
      icone: <Sparkles size={14} />,
      onClick: () =>
        ouvrirChatAvecTexte(
          `Je veux utiliser cet élément id ${c.id}. ` +
            `Utilise l'outil gerer_comportement (action "consulter") avec cet id pour voir de quoi il s'agit, ` +
            `puis discutons-en ensemble.`
        ),
    },
    ...(avecActionsSkill
      ? [
    {
      cle: "partager",
      label: texteConfiguration("action.partager"),
      icone: <Share2 size={14} />,
      onClick: () => void partagerOuCopierLien(lienPartage("skill-perso", c.id), c.nom || undefined),
    },
    { cle: "telecharger", label: texteConfiguration("action.telecharger"), icone: <Download size={14} />, onClick: () => void telecharger() },
    { cle: "publier", label: texteConfiguration("action.publier"), icone: <Upload size={14} />, onClick: () => void publier() },
        ]
      : []),
    { cle: "supprimer", label: texteConfiguration("action.supprimer"), icone: <Trash2 size={14} />, onClick: supprimer, destructif: true },
  ];

  return (
    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="flex flex-shrink-0 items-center">
      <MenuActionsCarte actions={actions} ariaLabel={texteConfiguration("menu.aria")} />

      {(codesOuvert || codesEnSortie) &&
        createPortal(
          <PanneauFlottant
            enSortie={codesEnSortie}
            onFerme={() => fermerCodes(() => setCodesOuvert(false))}
            entete={
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-dj-texte">
                  <Link2 size={16} className="text-dj-texte-muet" />
                  {texteConfiguration("action.lierCode")}
                </span>
                <button
                  onClick={() => fermerCodes(() => setCodesOuvert(false))}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-dj-texte-muet transition-colors hover:bg-dj-surface-haute"
                >
                  <X size={14} /> {texteConfiguration("action.fermer")}
                </button>
              </div>
            }
          >
            <SelecteurCodesPartage type="comportement" id={c.id} />
          </PanneauFlottant>,
          document.body
        )}

      {popupProfilOuverte && createPortal(<PopupProposerProfilPublic onFermer={fermerPopupProfil} />, document.body)}

      {retour &&
        createPortal(
          <div
            role="status"
            className="fixed inset-x-0 z-[120] flex justify-center px-3"
            style={{ bottom: "calc(1.25rem + var(--cap-native-navigation-bottom,0px) + var(--dj-barre-onglets-web,0px))" }}
          >
            <p
              className={`max-w-full animate-dj-fade-in-rapide rounded-xl border border-dj-bordure bg-dj-surface px-4 py-2.5 text-sm shadow-[0_4px_20px_rgba(0,0,0,0.35)] ${
                retour.erreur ? "text-[var(--dj-erreur)]" : "text-dj-texte"
              }`}
            >
              {retour.texte}
            </p>
          </div>,
          document.body
        )}
    </span>
  );
}
