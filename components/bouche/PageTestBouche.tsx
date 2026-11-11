"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CarteVoixBouche, CarteVoixBoucheSquelette, type EtatVoixBouche } from "@/components/bouche/CarteVoixBouche";
import { listerVoixBouche, synthetiserBouche, type ListeVoixBouche } from "@/lib/boucheApi";
import { messageErreur } from "@/lib/erreurs";
import { useLocale } from "@/lib/i18n/useLocale";
import { textesBouche } from "@/lib/textesBouche";

const ETAT_VIDE: EtatVoixBouche = { chargement: false, url: null, erreur: null };

/**
 * Page de test des voix bambara : une phrase, une carte par voix, pour comparer à l'oreille.
 * Les voix, le nombre de locuteurs et la longueur maximale viennent du service (rien en dur ici).
 */
export function PageTestBouche() {
  const locale = useLocale();
  const t = textesBouche(locale);

  const [liste, setListe] = useState<ListeVoixBouche | null>(null);
  const [erreurListe, setErreurListe] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [locuteurs, setLocuteurs] = useState<Record<string, number>>({});
  const [etats, setEtats] = useState<Record<string, EtatVoixBouche>>({});
  const [toutEnCours, setToutEnCours] = useState(false);

  const urlsActives = useRef<Record<string, string>>({});
  const monte = useRef(true);

  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
      Object.values(urlsActives.current).forEach((url) => URL.revokeObjectURL(url));
      urlsActives.current = {};
    };
  }, []);

  const chargerListe = useCallback(async () => {
    setErreurListe(null);
    try {
      const donnees = await listerVoixBouche();
      if (monte.current) setListe(donnees);
    } catch (e) {
      if (monte.current) setErreurListe(messageErreur(e, locale));
    }
  }, [locale]);

  useEffect(() => {
    void chargerListe();
  }, [chargerListe]);

  const majEtat = (id: string, partiel: Partial<EtatVoixBouche>) =>
    setEtats((avant) => ({ ...avant, [id]: { ...(avant[id] ?? ETAT_VIDE), ...partiel } }));

  const ecouter = useCallback(
    async (id: string) => {
      majEtat(id, { chargement: true, erreur: null });
      try {
        const audio = await synthetiserBouche(id, texte, locuteurs[id] ?? 0);
        if (!monte.current) return;
        const nouvelle = URL.createObjectURL(audio);
        const ancienne = urlsActives.current[id];
        urlsActives.current[id] = nouvelle;
        if (ancienne) URL.revokeObjectURL(ancienne);
        majEtat(id, { chargement: false, url: nouvelle });
      } catch (e) {
        if (monte.current) majEtat(id, { chargement: false, erreur: messageErreur(e, locale) });
      }
    },
    [texte, locuteurs, locale],
  );

  // Une voix après l'autre : le service ne calcule qu'une phrase à la fois par défaut.
  const toutEcouter = async () => {
    if (!liste || toutEnCours) return;
    setToutEnCours(true);
    for (const voix of liste.voix) {
      if (!monte.current) break;
      await ecouter(voix.id);
    }
    if (monte.current) setToutEnCours(false);
  };

  const max = liste?.texte_max ?? 0;
  const textePret = texte.trim().length > 0 && (max === 0 || texte.length <= max);
  const occupe = toutEnCours || Object.values(etats).some((e) => e.chargement);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <header>
        <h1 className="text-lg font-semibold text-dj-texte">{t.titre}</h1>
        <p className="mt-1 text-sm text-dj-texte-muet">{t.consigne}</p>
      </header>

      <div>
        <label htmlFor="texte-bouche" className="mb-1 block text-xs uppercase tracking-wide text-dj-texte-muet">
          {t.champTexte}
        </label>
        <textarea
          id="texte-bouche"
          rows={4}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={t.exemple}
          className="w-full resize-none rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-3 py-2 text-base text-dj-texte outline-none transition-colors focus:border-dj-accent-1"
        />
        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-dj-texte-muet">
          <span>{t.premiereFois}</span>
          {max > 0 ? (
            <span className={texte.length > max ? "text-dj-texte" : undefined}>{t.compteur(texte.length, max)}</span>
          ) : null}
        </div>
      </div>

      {erreurListe ? (
        <div role="alert" className="animate-dj-fade-in-rapide rounded-xl border border-dj-bordure bg-dj-surface p-4">
          <p className="text-sm text-dj-texte">{erreurListe}</p>
          <button
            type="button"
            onClick={() => void chargerListe()}
            className="mt-3 min-h-11 rounded-cgpt-bouton border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-accent-1"
          >
            {t.reessayer}
          </button>
        </div>
      ) : null}

      {!liste && !erreurListe ? (
        <div className="flex flex-col gap-4">
          <CarteVoixBoucheSquelette />
          <CarteVoixBoucheSquelette />
        </div>
      ) : null}

      {liste && liste.voix.length === 0 ? <p className="text-sm text-dj-texte-muet">{t.aucuneVoix}</p> : null}

      {liste && liste.voix.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => void toutEcouter()}
            disabled={!textePret || occupe}
            className="min-h-11 self-start rounded-cgpt-bouton border border-dj-bordure-forte px-5 py-2.5 text-sm font-medium text-dj-accent-1-texte transition-colors hover:border-dj-accent-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.toutEcouter}
          </button>
          <div className="flex flex-col gap-4">
            {liste.voix.map((voix) => (
              <CarteVoixBouche
                key={voix.id}
                voix={voix}
                locale={locale}
                etat={etats[voix.id] ?? ETAT_VIDE}
                locuteur={locuteurs[voix.id] ?? 0}
                desactive={!textePret || toutEnCours}
                surLocuteur={(n) => setLocuteurs((avant) => ({ ...avant, [voix.id]: n }))}
                surEcouter={() => void ecouter(voix.id)}
              />
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}
