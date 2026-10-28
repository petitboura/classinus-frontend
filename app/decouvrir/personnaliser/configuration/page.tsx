import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

export const metadata: Metadata = {
  title: "Configuration Classinus : créer des règles, procédures et styles",
  description: "Personnalise les réponses de Classinus avec des procédures, des règles, des comportements et des styles, puis active ou partage les éléments utiles.",
};

export default function PageDecouvrirPersonnaliserConfiguration() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Configuration</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        La Configuration sert à définir des repères réutilisables pour guider les réponses de Classinus. Elle distingue quatre types d'éléments afin que tu puisses choisir le bon format pour une consigne, une méthode ou une façon de répondre.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Quatre types d'éléments</h2>
        <dl className="mt-3 space-y-4 text-sm leading-relaxed">
          <div><dt className="font-semibold text-dj-texte">Procédure</dt><dd className="mt-1 text-dj-texte-muet">Une suite d'étapes à suivre pour réaliser une tâche.</dd></div>
          <div><dt className="font-semibold text-dj-texte">Règle</dt><dd className="mt-1 text-dj-texte-muet">Une consigne courte, par exemple la langue ou le format à privilégier.</dd></div>
          <div><dt className="font-semibold text-dj-texte">Comportement</dt><dd className="mt-1 text-dj-texte-muet">Une réaction attendue dans une situation précise : tu décris le contexte et la manière de répondre.</dd></div>
          <div><dt className="font-semibold text-dj-texte">Style</dt><dd className="mt-1 text-dj-texte-muet">Un ton à reproduire, défini par une description ou un exemple d'écriture.</dd></div>
        </dl>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Créer, activer et partager</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux créer ou modifier un élément avec les commandes prévues dans la Configuration ou demander de l'aide à Classinus dans la conversation. Active uniquement les éléments dont tu as besoin ; selon les options disponibles, tu peux les partager avec un code ou les publier dans le catalogue public.</p>
      </section>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
