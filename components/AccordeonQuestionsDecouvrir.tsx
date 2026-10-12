import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DonneesStructurees } from "@/components/DonneesStructurees";
import { donneesFaq } from "@/components/PageUsageDecouvrir";
import type { GroupeQuestionsDecouvrir } from "@/lib/questionsDecouvrir";

// Chantier SEO/AEO de Classinus, phase questions et réponses (12/10/2026,
// demande Bourama). Accordéon de questions : chaque question est une ligne,
// repliée au départ, qu'on touche pour voir la réponse.
//
// Fait avec la balise native <details>/<summary> plutôt qu'avec du code
// d'interaction : la réponse est dans le HTML envoyé par le serveur, donc
// lue par Google et par les IA même repliée ; le clavier, les lecteurs
// d'écran et le mobile fonctionnent sans rien ajouter ; et c'est compatible
// avec l'export statique de l'appli mobile. Composant serveur, sans état.
//
// Le balisage Google (FAQPage) est fabriqué ici à partir des mêmes textes
// que l'affichage : les deux ne peuvent pas se contredire. Les liens ne sont
// pas dans ce balisage (texte simple seulement).
export function AccordeonQuestionsDecouvrir({ groupes }: { groupes: GroupeQuestionsDecouvrir[] }) {
  const toutes = groupes.flatMap((g) => g.questions);
  if (toutes.length === 0) return null;

  return (
    <section className="mt-12" aria-labelledby="questions-frequentes">
      <DonneesStructurees donnees={donneesFaq(toutes)} />
      <h2 id="questions-frequentes" className="font-display text-xl font-bold text-dj-texte">
        Questions fréquentes
      </h2>

      {groupes.map((groupe) => (
        <div key={groupe.titre} className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">{groupe.titre}</h3>
          <div className="mt-2 flex flex-col gap-2">
            {groupe.questions.map((q) => (
              <details
                key={q.question}
                className="group rounded-2xl border border-dj-bordure bg-dj-surface transition-colors open:bg-dj-surface-haute"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-base font-semibold text-dj-texte">{q.question}</span>
                  <ChevronRight
                    size={18}
                    className="flex-shrink-0 text-dj-texte-muet transition-transform duration-200 group-open:rotate-90"
                    aria-hidden
                  />
                </summary>
                <div className="animate-dj-fade-in-rapide px-4 pb-4">
                  <p className="text-sm leading-relaxed text-dj-texte-muet">{q.reponse}</p>
                  {q.liens && q.liens.length > 0 && (
                    <p className="mt-2 text-sm text-dj-texte-muet">
                      Voir :{" "}
                      {q.liens.map((lien, i) => (
                        <span key={lien.href}>
                          {i > 0 && ", "}
                          <Link href={lien.href} className="underline hover:text-dj-texte">
                            {lien.texte}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
