"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Link2, Share2, Sparkles, Trash2, Upload, Users, X } from "lucide-react";
import {
  definirPorteeComportement,
  lireSkillComportement,
  publierComportement,
  supprimerComportement,
  type Comportement,
  type PorteeElement,
} from "@/lib/api";
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
  onMaj,
  avecActionsSkill = false,
}: {
  agentId: string;
  c: Comportement;
  onSupprime: (id: string) => void;
  /** 04/10/2026 : remplace l'élément dans la liste de l'écran après un
   * changement de destinataire ou de liens. Absent : seul ce menu est à jour. */
  onMaj?: (c: Comportement) => void;
  avecActionsSkill?: boolean;
}) {
  const ouvrirChatAvecTexte = useOuvrirChatAvecTexte();
  const [codesOuvert, setCodesOuvert] = useState(false);
  const { enSortie: codesEnSortie, demarrerFermeture: fermerCodes } = useFermetureAnimee();
  // 04/10/2026, demande Bourama : le choix du destinataire n'existe que pour
  // un élément lié à un code. Sans lien, l'élément s'applique à moi, point.
  const [lie, setLie] = useState(c.lie_a_code ?? false);
  const [portee, setPortee] = useState<PorteeElement>(c.portee ?? "deux");
  const [porteeOuverte, setPorteeOuverte] = useState(false);
  const [porteeEnCours, setPorteeEnCours] = useState(false);
  const [erreurPortee, setErreurPortee] = useState<string | null>(null);
  const { enSortie: porteeEnSortie, demarrerFermeture: fermerPortee } = useFermetureAnimee();

  useEffect(() => {
    setLie(c.lie_a_code ?? false);
    setPortee(c.portee ?? "deux");
  }, [c.lie_a_code, c.portee]);

  function surLiensChange(nombreCodes: number) {
    const estLie = nombreCodes > 0;
    // Premier lien : l'élément repart sur "moi et les destinataires" (le
    // serveur fait la même remise à zéro), jamais sur un ancien choix.
    const nouvellePortee: PorteeElement = estLie && !lie ? "deux" : portee;
    setLie(estLie);
    setPortee(nouvellePortee);
    onMaj?.({ ...c, lie_a_code: estLie, portee: nouvellePortee });
  }

  async function choisirPortee(nouvelle: PorteeElement) {
    if (porteeEnCours || nouvelle === portee) return;
    setPorteeEnCours(true);
    setErreurPortee(null);
    try {
      const maj = await definirPorteeComportement(agentId, c.id, nouvelle);
      setPortee(maj.portee ?? nouvelle);
      onMaj?.({ ...c, ...maj, lie_a_code: true });
    } catch (e) {
      setErreurPortee(messageErreur(e));
    } finally {
      setPorteeEnCours(false);
    }
  }
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
    ...(lie
      ? [
          {
            cle: "destinataire",
            label: texteConfiguration("action.destinataire"),
            icone: <Users size={14} />,
            onClick: () => {
              setErreurPortee(null);
              setPorteeOuverte(true);
            },
          },
        ]
      : []),
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
      {lie && portee === "destinataires" && (
        <span
          title={texteConfiguration("destinataire.badge")}
          aria-label={texteConfiguration("destinataire.badge")}
          className="mr-0.5 flex flex-shrink-0 animate-dj-fade-in-rapide items-center rounded-full bg-dj-accent-1/10 p-1.5 text-dj-accent-1"
        >
          <Users size={13} />
        </span>
      )}
      <MenuActionsCarte actions={actions} ariaLabel={texteConfiguration("menu.aria")} contraste portail />

      {(porteeOuverte || porteeEnSortie) &&
        createPortal(
          <PanneauFlottant
            enSortie={porteeEnSortie}
            onFerme={() => fermerPortee(() => setPorteeOuverte(false))}
            entete={
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-dj-texte">
                  <Users size={16} className="text-dj-texte-muet" />
                  {texteConfiguration("destinataire.titre")}
                </span>
                <button
                  onClick={() => fermerPortee(() => setPorteeOuverte(false))}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-dj-texte-muet transition-colors hover:bg-dj-surface-haute"
                >
                  <X size={14} /> {texteConfiguration("action.fermer")}
                </button>
              </div>
            }
          >
            <div role="radiogroup" aria-label={texteConfiguration("destinataire.titre")} className="flex flex-col gap-2">
              {(["deux", "destinataires"] as const).map((valeur) => {
                const choisi = portee === valeur;
                return (
                  <button
                    key={valeur}
                    type="button"
                    role="radio"
                    aria-checked={choisi}
                    disabled={porteeEnCours}
                    onClick={() => void choisirPortee(valeur)}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-default disabled:opacity-60 ${
                      choisi ? "border-dj-accent-1 bg-dj-accent-1/10" : "border-dj-bordure hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                        choisi ? "border-dj-accent-1" : "border-dj-bordure-forte"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full bg-dj-accent-1 transition-transform duration-150 ${choisi ? "scale-100" : "scale-0"}`} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm text-dj-texte">{texteConfiguration(`destinataire.${valeur}`)}</span>
                      <span className="text-xs text-dj-texte-muet">{texteConfiguration(`destinataire.${valeur}Detail`)}</span>
                    </span>
                  </button>
                );
              })}
              {erreurPortee && <p className="text-xs text-[var(--dj-erreur)]">{erreurPortee}</p>}
            </div>
          </PanneauFlottant>,
          document.body
        )}

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
            <SelecteurCodesPartage type="comportement" id={c.id} onLiensChange={surLiensChange} />
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
              className={`max-w-full animate-dj-fade-in-rapide rounded-xl border border-dj-bordure-forte bg-dj-surface px-4 py-2.5 text-sm shadow-[0_8px_30px_rgba(0,0,0,0.5)] ${
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
