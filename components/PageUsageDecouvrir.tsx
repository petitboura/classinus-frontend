import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DonneesStructurees } from "@/components/DonneesStructurees";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { USAGES_DECOUVRIR, type QuestionReponse, type UsageDecouvrir } from "@/lib/usagesDecouvrir";

export function donneesFaq(questions: QuestionReponse[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.reponse },
    })),
  };
}

/** FAQ accessible : toutes les réponses sont repliées au chargement et s'ouvrent à la demande. */
export function ListeQuestionsReponses({ questions }: { questions: QuestionReponse[] }) {
  if (questions.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="questions-frequentes">
      <h2 id="questions-frequentes" className="font-display text-lg font-semibold text-dj-texte">
        Questions fréquentes
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {questions.map((q) => (
          <details
            key={q.question}
            className="group rounded-2xl border border-dj-bordure bg-dj-surface transition-colors open:bg-dj-surface-haute"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
              <span className="font-display text-base font-semibold text-dj-texte">{q.question}</span>
              <ChevronRight
                size={18}
                className="flex-shrink-0 text-dj-texte-muet transition-transform duration-200 group-open:rotate-90"
                aria-hidden="true"
              />
            </summary>
            <div className="px-4 pb-4">
              <p className="text-sm leading-relaxed text-dj-texte-muet">{q.reponse}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function PageUsageDecouvrir({ usage }: { usage: UsageDecouvrir }) {
  const autresUsages = USAGES_DECOUVRIR.filter((u) => u.slug !== usage.slug);

  return (
    <main className="mx-auto max-w-2xl">
      <DonneesStructurees donnees={donneesFaq(usage.questions)} />

      <Link
        href={ROUTES_DECOUVRIR.usages.accueil}
        className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline"
      >
        <ChevronLeft size={14} />
        Tous les usages
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-2xl font-bold text-dj-texte">{usage.titreH1}</h1>
        <p className="mt-3 text-base leading-relaxed text-dj-texte">{usage.introduction}</p>
      </header>

      <section className="mt-8" aria-label="Comment utiliser Classinus">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Comment Classinus peut t'aider</h2>
        <div className="mt-4 flex flex-col gap-6">
          {usage.points.map((point) => (
            <article key={point.titre} className="border-l-2 border-dj-bordure pl-4">
              <h3 className="font-display text-base font-semibold text-dj-texte">{point.titre}</h3>
              <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">{point.texte}</p>
            </article>
          ))}
        </div>
      </section>

      <ListeQuestionsReponses questions={usage.questions} />

      <nav className="mt-10" aria-label="Autres usages de Classinus">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Explorer les autres usages</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {autresUsages.map((autre) => (
            <li key={autre.slug}>
              <Link
                href={autre.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:bg-dj-surface-haute"
              >
                <span className="min-w-0">
                  <span className="block font-display text-base font-semibold text-dj-texte">{autre.titreCarte}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-dj-texte-muet">{autre.resumeCarte}</span>
                </span>
                <ChevronRight size={18} className="flex-shrink-0 text-dj-texte-muet" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
