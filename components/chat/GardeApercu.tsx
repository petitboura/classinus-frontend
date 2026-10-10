"use client";

import { Component, ReactNode } from "react";
import { telecharger } from "@/lib/telecharger";
import {
  IconeTelechargement,
  LibelleTelechargement,
  MessageEchecTelechargement,
  classeEtatTelechargement,
} from "@/components/EtatTelechargement";
import { useEtatTelechargement } from "@/lib/etatTelechargements";
import { copierVersBibliothequePersonnelle } from "@/lib/api";
import { TelechargerCopierModal } from "@/components/TelechargerCopierModal";

// 10/09/2026 (demande Bourama, suite au plantage de toute l'appli --
// "Application error" -- en ouvrant un aperçu de document généré par
// l'IA, PDF ET Markdown). Point commun trouvé : tous les aperçus de
// fichier (PDF, Markdown, Office, texte) passent par l'`enfant` de
// BlocExpansible.tsx, ajouté aujourd'hui. Aucune de ces briques n'avait
// de garde-fou -- une erreur inattendue à l'intérieur de N'IMPORTE
// LAQUELLE (bug de librairie, réponse réseau inattendue, etc.) remontait
// donc jusqu'en haut de l'arbre React et faisait planter TOUTE l'appli,
// pas seulement l'aperçu concerné.
//
// Ce composant ne corrige pas la cause de fond (elle peut être
// différente à chaque fois, y compris dans du code de librairie tierce
// non modifiable ici) -- il empêche seulement qu'un plantage d'aperçu
// se propage au-delà de son propre bloc. Doit rester un composant de
// classe : seule une classe React peut définir
// getDerivedStateFromError/componentDidCatch (pas encore possible avec
// les hooks).
//
// 13/09/2026, demande Bourama : "Copier dans ma bibliothèque" et
// "Télécharger" avaient la même icône à plusieurs endroits -- si ce
// fichier vient de la bibliothèque publique (idBibliothequePublique
// fourni par FichierChip.tsx via useEntreePubliqueParUrl), le bouton
// ouvre désormais TelechargerCopierModal (les deux actions au même
// endroit) au lieu de lancer directement le téléchargement.
type Props = {
  children: ReactNode;
  hrefTelechargement?: string;
  nomTelechargement?: string;
  idBibliothequePublique?: string | null;
  // 10/10/2026 : action "ajouter à ma bibliothèque" fournie par l'appelant
  // (fichier de site externe). Prioritaire sur idBibliothequePublique.
  surCopie?: () => Promise<void>;
};

type State = {
  enErreur: boolean;
  modalOuverte: boolean;
};

// Bouton du repli, extrait en composant fonction : GardeApercu est une classe
// et ne peut pas lire l'état du téléchargement (10/10/2026, pourcentage et
// échec affichés sur le bouton).
function BoutonTelechargerRepli({ href, onClic }: { href: string; onClic: () => void }) {
  const etat = useEtatTelechargement(href);
  return (
    <>
      <button
        onClick={onClic}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-dj-accent-1-texte hover:underline ${classeEtatTelechargement(etat)}`}
      >
        <IconeTelechargement href={href} size={13} /> <LibelleTelechargement href={href} defaut="Télécharger" />
      </button>
      <MessageEchecTelechargement href={href} />
    </>
  );
}

export class GardeApercu extends Component<Props, State> {
  state: State = { enErreur: false, modalOuverte: false };

  static getDerivedStateFromError() {
    return { enErreur: true };
  }

  componentDidCatch(erreur: unknown) {
    // Log discret, pas de remontée bruyante -- l'utilisateur voit déjà
    // le repli ci-dessous, inutile de l'alarmer avec du texte technique.
    console.error("Aperçu de fichier : erreur rattrapée par GardeApercu", erreur);
  }

  render() {
    if (this.state.enErreur) {
      const { hrefTelechargement, nomTelechargement, idBibliothequePublique, surCopie } = this.props;
      const nom = nomTelechargement || "fichier";
      const copie = surCopie ?? (idBibliothequePublique ? () => copierVersBibliothequePersonnelle(idBibliothequePublique) : undefined);
      return (
        <div className="flex flex-col items-center gap-2 p-8 text-center text-dj-texte-muet">
          <p className="text-sm">Impossible d&apos;afficher ce fichier ici.</p>
          {hrefTelechargement && (
            <BoutonTelechargerRepli
              href={hrefTelechargement}
              onClic={() => (copie ? this.setState({ modalOuverte: true }) : void telecharger(hrefTelechargement, nom))}
            />
          )}
          {this.state.modalOuverte && hrefTelechargement && copie && (
            <TelechargerCopierModal
              titre={nom}
              surCopie={copie}
              surTelechargement={() => telecharger(hrefTelechargement, nom)}
              hrefTelechargement={hrefTelechargement}
              onFermer={() => this.setState({ modalOuverte: false })}
            />
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
