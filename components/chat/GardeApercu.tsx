"use client";

import { Component, ReactNode } from "react";
import { Download } from "lucide-react";
import { telecharger } from "@/lib/telecharger";
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
};

type State = {
  enErreur: boolean;
  modalOuverte: boolean;
};

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
      const { hrefTelechargement, nomTelechargement, idBibliothequePublique } = this.props;
      const nom = nomTelechargement || "fichier";
      return (
        <div className="flex flex-col items-center gap-2 p-8 text-center text-dj-texte-muet">
          <p className="text-sm">Impossible d&apos;afficher ce fichier ici.</p>
          {hrefTelechargement && (
            <button
              onClick={() =>
                idBibliothequePublique
                  ? this.setState({ modalOuverte: true })
                  : telecharger(hrefTelechargement, nom)
              }
              className="flex items-center gap-1.5 text-xs text-dj-accent-1-texte hover:underline"
            >
              <Download size={13} /> Télécharger
            </button>
          )}
          {this.state.modalOuverte && hrefTelechargement && idBibliothequePublique && (
            <TelechargerCopierModal
              titre={nom}
              surCopie={() => copierVersBibliothequePersonnelle(idBibliothequePublique)}
              surTelechargement={() => telecharger(hrefTelechargement, nom)}
              onFermer={() => this.setState({ modalOuverte: false })}
            />
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
