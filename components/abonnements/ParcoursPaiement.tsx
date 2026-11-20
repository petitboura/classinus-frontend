"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  EtapeConnexion,
  EtapeFormulaire,
  EtapeLegal,
  EtapeMerci,
  EtapeMoyen,
  type EtapeParcours,
  type Traduire,
} from "@/components/abonnements/EtapesPaiement";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { effacerBrouillonPaiement, memoriserBrouillonPaiement } from "@/lib/brouillonPaiement";
import {
  MODELE_PAGE_DIRECTE,
  noterEtapeListeAttente,
  sInscrireListeAttente,
  sourceListeAttente,
  type PalierListeAttente,
} from "@/lib/listeAttente";
import { supabase } from "@/lib/supabase";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { prechargerLogosPaiement } from "@/components/abonnements/LogoMoyenPaiement";

// Parcours de paiement de la page Abonnements (19/11/2026, demande de Bourama). C'est une simulation :
// rien n'est débité. Après le clic sur Payer d'un palier : 1) conditions légales à accepter, 2) connexion
// ou création de compte si la personne n'est pas connectée, 3) choix du moyen de paiement (montré
// seulement ici, jamais sur la page), 4) petit formulaire (pays, WhatsApp), 5) message « préparation de
// ton abonnement, tu seras prévenu dès qu'il est prêt ». Quand la personne revient d'une connexion, le
// parcours reprend au choix du moyen de paiement (voir lib/brouillonPaiement.ts).

export function ParcoursPaiement({
  palier,
  etapeInitiale,
  moyens,
  t,
  locale,
  onFerme,
}: {
  palier: PalierListeAttente;
  etapeInitiale: "legal" | "moyen";
  moyens: string[];
  t: Traduire;
  locale: string;
  onFerme: () => void;
}) {
  const router = useRouter();
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFerme);

  // Sans moyen de paiement configuré côté serveur, l'écran de choix est sauté.
  const debut: EtapeParcours = etapeInitiale === "moyen" && moyens.length === 0 ? "formulaire" : etapeInitiale;

  const [etape, setEtape] = useState<EtapeParcours>(debut);
  const [consentement, setConsentement] = useState(etapeInitiale === "moyen");
  const [moyen, setMoyen] = useState("");
  const [pays, setPays] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const nom = t(`attente_palier_nom_${palier.prix_usd}`);

  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") fermer();
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
    // demarrerFermeture est stable et onFerme vient du parent : le reste des dépendances est volontairement ignoré.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFerme]);

  // Les images des logos (Orange Money, Wave) se téléchargent dès l'ouverture, avant l'écran du choix du moyen.
  useEffect(() => {
    prechargerLogosPaiement();
  }, []);

  useEffect(() => {
    if (etape === "formulaire") noterEtapeListeAttente("formulaire_ouvert", MODELE_PAGE_DIRECTE, locale);
    // Une seule note par ouverture du formulaire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape]);

  // Après les conditions : la connexion n'est demandée que si la personne n'est pas déjà connectée.
  async function apresLegal() {
    let connecte = false;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      connecte = !!session;
    } catch {
      connecte = false;
    }
    if (!connecte) setEtape("connexion");
    else setEtape(moyens.length > 0 ? "moyen" : "formulaire");
  }

  function allerConnexion(chemin: string) {
    memoriserBrouillonPaiement({ palier: palier.prix_usd });
    router.push(chemin);
  }

  async function valider() {
    setEnvoi(true);
    setErreur(null);
    try {
      await sInscrireListeAttente({
        modele_id: MODELE_PAGE_DIRECTE,
        palier_prix: palier.prix_usd,
        consentement,
        pays: pays || null,
        whatsapp: whatsapp.trim() || null,
        moyen_paiement: moyen || null,
        langue: locale,
        source: sourceListeAttente(),
      });
      effacerBrouillonPaiement();
      setEtape("merci");
    } catch (e) {
      // Session perdue en cours de route : on repasse par l'écran de connexion plutôt qu'une erreur brute.
      if (e instanceof ErreurApi && e.code === "CONNEXION_REQUISE") setEtape("connexion");
      else setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 pb-[calc(1rem+var(--dj-barre-onglets-web,0px))] sm:items-center sm:pb-4 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.35)] ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={fermer}
          aria-label={t("attente_pay_fermer")}
          className="float-right ml-2 text-dj-texte-muet transition-colors hover:text-dj-texte"
        >
          <X size={18} />
        </button>

        {etape === "legal" && (
          <EtapeLegal
            t={t}
            nom={nom}
            prix={palier.prix_usd}
            consentement={consentement}
            onConsentement={setConsentement}
            onContinuer={apresLegal}
          />
        )}
        {etape === "connexion" && (
          <EtapeConnexion
            t={t}
            onCreerCompte={() => allerConnexion("/inscription")}
            onSeConnecter={() => allerConnexion(`/connexion?retour=${encodeURIComponent("/abonnements")}`)}
            onRetour={() => setEtape("legal")}
          />
        )}
        {etape === "moyen" && (
          <EtapeMoyen
            t={t}
            moyens={moyens}
            moyen={moyen}
            onMoyen={setMoyen}
            onContinuer={() => setEtape("formulaire")}
            onRetour={() => setEtape("legal")}
          />
        )}
        {etape === "formulaire" && (
          <EtapeFormulaire
            t={t}
            locale={locale}
            pays={pays}
            onPays={setPays}
            whatsapp={whatsapp}
            onWhatsapp={setWhatsapp}
            envoi={envoi}
            erreur={erreur}
            onValider={valider}
            onRetour={() => setEtape(moyens.length > 0 ? "moyen" : "legal")}
          />
        )}
        {etape === "merci" && <EtapeMerci t={t} nom={nom} onFermer={fermer} />}
      </div>
    </div>
  );
}
