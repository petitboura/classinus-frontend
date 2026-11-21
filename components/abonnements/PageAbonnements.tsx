"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { CartePalierListeAttente, CLASSES_GRILLE_PALIERS } from "@/components/chat/CartePalierListeAttente";
import { ParcoursPaiement } from "@/components/abonnements/ParcoursPaiement";
import { SqueletteAbonnements } from "@/components/abonnements/SqueletteAbonnements";
import { TableauComparaison } from "@/components/abonnements/TableauComparaison";
import { LogosEntreprises } from "@/components/abonnements/LogosEntreprises";
import { BlocModeles } from "@/components/abonnements/BlocModeles";
import { effacerBrouillonPaiement, lireBrouillonPaiement } from "@/lib/brouillonPaiement";
import { messageErreur } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import {
  lireConfigListeAttente,
  lireModeleDansAdresse,
  remplirTexte,
  type ModeleCible,
  type ConfigListeAttente,
  type PalierListeAttente,
} from "@/lib/listeAttente";
import { supabase } from "@/lib/supabase";

// Page des abonnements : une page de paiement (19/11/2026, demande de Bourama). Un seul titre, puis la rangée
// des logos des entreprises (21/11/2026, LogosEntreprises.tsx), les trois cartes de palier façon page de tarification de Claude, puis le tableau de comparaison des paliers et le bloc des modèles disponibles avec leurs logos (BlocModeles.tsx). Chaque
// carte a son bouton Payer. Tout ce qui touchait à la liste d'attente (formulaire, profil, consentement,
// inscription, mention « aucun paiement ») a été retiré de cette page ; les tables, les routes et
// lib/listeAttente.ts n'ont pas bougé. Ouverte depuis un modèle grisé du sélecteur
// (?modele=...&nom=...), la page garde ce modèle et l'envoie avec l'inscription (20/11/2026, demande de
// Bourama), sans l'afficher ; ouverte directement ou depuis le bouton S'abonner de la barre latérale, elle
// n'a pas de modèle. Visible sans compte.
// Les cartes : la mise en avant d'un palier, l'alignement, la ligne « Bientôt » et le défilement sur
// téléphone sont décrits dans components/chat/CartePalierListeAttente.tsx.
// Le bouton Payer ouvre le parcours de paiement simulé (components/abonnements/ParcoursPaiement.tsx) :
// conditions légales, connexion si besoin, moyen de paiement, formulaire, message de préparation. Aucun
// service de paiement n'est branché, rien n'est débité.
// Paliers, tableau et textes viennent du serveur (Supabase), en français et en anglais : rien n'est
// écrit en dur ici. Les clés de texte gardent le préfixe attente_ car c'est celui que le serveur renvoie.

export function PageAbonnements() {
  const router = useRouter();
  const locale = obtenirLocale();

  const [config, setConfig] = useState<ConfigListeAttente | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  // Parcours de paiement ouvert : le palier payé et l'écran de départ (« moyen » quand la personne revient
  // d'une connexion en plein parcours).
  const [parcours, setParcours] = useState<{ palier: PalierListeAttente; etape: "legal" | "moyen" } | null>(null);
  const reprisVerifiee = useRef(false);
  // Modèle grisé d'où la personne vient (adresse de la page), sinon null. Lu après l'affichage pour ne pas
  // différer du rendu du serveur ; retrouvé aussi dans le brouillon quand elle revient d'une connexion.
  const [modele, setModele] = useState<ModeleCible | null>(null);

  useEffect(() => {
    setModele(lireModeleDansAdresse());
  }, []);

  useEffect(() => {
    let actif = true;
    lireConfigListeAttente()
      .then((c) => {
        if (actif) setConfig(c);
      })
      .catch((e) => {
        if (actif) setErreurChargement(messageErreur(e));
      });
    return () => {
      actif = false;
    };
  }, []);

  // Texte de la langue choisie, sinon le français, sinon rien (jamais une clé brute à l'écran).
  const t = useMemo(() => {
    return (cle: string, valeurs: Record<string, string | number> = {}) => {
      const texte = config?.textes[locale]?.[cle] ?? config?.textes.fr?.[cle] ?? "";
      return remplirTexte(texte, valeurs);
    };
  }, [config, locale]);

  // Retour d'une connexion en plein parcours : si un brouillon récent existe et que la personne est
  // maintenant connectée, le parcours reprend au choix du moyen de paiement. Une seule vérification.
  useEffect(() => {
    if (!config || reprisVerifiee.current) return;
    reprisVerifiee.current = true;
    const brouillon = lireBrouillonPaiement();
    if (!brouillon) return;
    const palier = config.paliers.find((p) => p.prix_usd === brouillon.palier);
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (palier && session) {
          if (brouillon.modele) setModele((actuel) => actuel ?? brouillon.modele ?? null);
          setParcours({ palier, etape: "moyen" });
        }
        else effacerBrouillonPaiement();
      })
      .catch(() => effacerBrouillonPaiement());
  }, [config]);

  // Retour au chat (ou à la page d'où la personne vient). Sans historique, on revient à l'accueil.
  function revenir() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }

  // Clic sur Payer d'un palier (prix en dollars par mois) : ouvre le parcours de paiement, qui commence
  // par les conditions légales.
  function payer(prix: number) {
    const palier = config?.paliers.find((p) => p.prix_usd === prix);
    if (palier) setParcours({ palier, etape: "legal" });
  }

  const libelleRetour = t("attente_retour") || (locale === "en" ? "Back" : "Retour");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-6 pt-6 sm:px-6 sm:pt-10">
      <header className="flex flex-col gap-4">
        <button
          type="button"
          onClick={revenir}
          className="-ml-2 inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-base font-medium text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          <ArrowLeft size={18} />
          {libelleRetour}
        </button>

        <h1 className="text-3xl font-bold text-dj-texte sm:text-4xl">
          {config ? t("attente_abo_titre") : <Skeleton className="h-9 w-64 rounded sm:h-10" />}
        </h1>

      </header>

      {erreurChargement && <p className="text-base text-[var(--dj-erreur)]">{erreurChargement}</p>}

      {!config && !erreurChargement && <SqueletteAbonnements />}

      {config && (
        <div className="flex animate-dj-fade-in-rapide flex-col gap-8 motion-reduce:animate-none">
          <LogosEntreprises entreprises={config.modeles ?? []} t={t} />

          <section aria-label={t("attente_abo_titre")} className={CLASSES_GRILLE_PALIERS}>
            {config.paliers.map((p, i) => (
              <CartePalierListeAttente
                key={p.prix_usd}
                palier={p}
                index={i}
                titreReserve={i === 0 && config.paliers.length > 1}
                nomPrecedent={i > 0 ? t(`attente_palier_nom_${config.paliers[i - 1].prix_usd}`) : ""}
                onPayer={() => payer(p.prix_usd)}
                t={t}
              />
            ))}
          </section>

          <TableauComparaison t={t} paliers={config.paliers} entreprises={config.modeles} />

          <BlocModeles entreprises={config.modeles ?? []} t={t} locale={locale} />
        </div>
      )}

      {config && parcours && (
        <ParcoursPaiement
          palier={parcours.palier}
          modele={modele}
          etapeInitiale={parcours.etape}
          moyens={config.moyens_paiement ?? []}
          t={t}
          locale={locale}
          onFerme={() => setParcours(null)}
        />
      )}
    </div>
  );
}
