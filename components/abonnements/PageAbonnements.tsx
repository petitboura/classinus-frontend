"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { CartePalierListeAttente } from "@/components/chat/CartePalierListeAttente";
import { CapacitesParCategorie } from "@/components/abonnements/CapacitesParCategorie";
import { messageErreur } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import { lireConfigListeAttente, remplirTexte, type ConfigListeAttente } from "@/lib/listeAttente";

// Page des abonnements : une page de paiement (19/11/2026, demande de Bourama). Un seul titre, puis les
// trois cartes de palier façon page de tarification de Claude, puis les capacités par catégorie. Chaque
// carte a son bouton Payer. Tout ce qui touchait à la liste d'attente (formulaire, profil, consentement,
// inscription, mention « aucun paiement ») a été retiré de cette page ; les tables, les routes et
// lib/listeAttente.ts n'ont pas bougé. Ouverte depuis un modèle grisé du sélecteur, la page ne lit plus
// les paramètres de l'adresse. Visible sans compte.
// Le bouton Payer n'est pas encore relié à un service de paiement (voir payer() plus bas).
// Paliers, capacités et textes viennent du serveur (Supabase), en français et en anglais : rien n'est
// écrit en dur ici. Les clés de texte gardent le préfixe attente_ car c'est celui que le serveur renvoie.

export function PageAbonnements() {
  const router = useRouter();
  const locale = obtenirLocale();

  const [config, setConfig] = useState<ConfigListeAttente | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

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

  // Retour au chat (ou à la page d'où la personne vient). Sans historique, on revient à l'accueil.
  function revenir() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }

  // Point d'entrée du paiement pour le palier cliqué (prix en dollars par mois). Volontairement vide pour
  // l'instant (demande de Bourama du 19/11/2026 : la page d'abord, le service de paiement ensuite).
  function payer(prix: number) {
    void prix;
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
          {config ? t("attente_abo_titre") : <Skeleton className="h-9 w-64 rounded" />}
        </h1>
      </header>

      {erreurChargement && <p className="text-base text-[var(--dj-erreur)]">{erreurChargement}</p>}

      {!config && !erreurChargement && (
        <div className="flex flex-col gap-8" aria-hidden>
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      )}

      {config && (
        <div className="flex animate-dj-fade-in-rapide flex-col gap-8 motion-reduce:animate-none">
          <section aria-label={t("attente_abo_titre")} className="grid items-start gap-4 pt-3 md:grid-cols-3">
            {config.paliers.map((p, i) => (
              <CartePalierListeAttente
                key={p.prix_usd}
                palier={p}
                nomPrecedent={i > 0 ? t(`attente_palier_nom_${config.paliers[i - 1].prix_usd}`) : ""}
                onPayer={() => payer(p.prix_usd)}
                t={t}
              />
            ))}
          </section>

          <CapacitesParCategorie t={t} locale={locale} modeles={config.modeles ?? []} />
        </div>
      )}
    </div>
  );
}
