import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DonneesStructurees } from "@/components/DonneesStructurees";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { USAGES_DECOUVRIR, type QuestionReponse, type UsageDecouvrir } from "@/lib/usagesDecouvrir";

// Chantier "visibilité auprès des IA" (11/10/2026, demande Bourama). Mise en
// page commune aux quatre pages d'usage (trouver des PDF, apprendre à coder,
// trouver des vidéos, étudier), pour que chacune ait exactement la même
// structure : un titre, une introduction, des points précis, des questions
// fréquentes, puis les autres usages. Une structure régulière et du texte
// visible tout de suite (aucun chargement, tout est dans le HTML du serveur)
// est ce qui permet à une IA de retrouver et de citer chaque réponse.

// Données structurées d'une liste de questions (schema.org, FAQPage).
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

export function ListeQuestionsReponses({ questions }: { questions: QuestionReponse[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-semibold text-dj-texte">Questions fréquentes</h2>
      <div className="mt-4 flex flex-col gap-3">
        {questions.map((q) => (
          <div key={q.question} className="rounded-2xl border border-dj-bordure bg-dj-surface p-4">
            <h3 className="font-display text-base font-semibold text-dj-texte">{q.question}</h3>
            <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">{q.reponse}</p>
          </div>
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
        Ce que tu peux faire avec Classinus
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-dj-texte">{usage.titreH1}</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">{usage.introduction}</p>

      <section className="mt-8 flex flex-col gap-6">
        {usage.points.map((point) => (
          <div key={point.titre}>
            <h2 className="font-display text-lg font-semibold text-dj-texte">{point.titre}</h2>
            <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">{point.texte}</p>
          </div>
        ))}
      </section>

      <ListeQuestionsReponses questions={usage.questions} />

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Autres usages</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {autresUsages.map((autre) => (
            <li key={autre.slug}>
              <Link
                href={autre.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:bg-dj-surface-haute"
              >
                <div>
                  <p className="font-display text-base font-semibold text-dj-texte">{autre.titreCarte}</p>
                  <p className="mt-1 text-sm text-dj-texte-muet">{autre.description}</p>
                </div>
                <ChevronRight size={18} className="flex-shrink-0 text-dj-texte-muet" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
