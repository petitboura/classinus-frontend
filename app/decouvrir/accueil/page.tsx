import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { QUESTIONS_DECOUVRIR_ACCUEIL } from "@/lib/questionsDecouvrir";
import { AccordeonQuestionsDecouvrir } from "@/components/AccordeonQuestionsDecouvrir";

export const metadata: Metadata = {
  title: "Le coin des étudiants dans Classinus : chat, révisions et modèles d'IA",
  description:
    "Découvre l'espace étudiant de Classinus : chat avec une IA, bibliothèque personnelle et partagée, fiches de révision, QCM, animations, choix du modèle et intégration à Thonny.",
};

export default function PageDecouvrirAccueil() {
  return (
    <main className="mx-auto max-w-2xl">
      <Link
        href={ROUTES_DECOUVRIR.accueil}
        className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline"
      >
        <ChevronLeft size={14} />
        Découvrir Classinus
      </Link>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">Espace étudiant</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-dj-texte">Le coin des étudiants</h1>
        <p className="mt-3 text-base leading-relaxed text-dj-texte">
          Le chat est le point de départ de Classinus : pose une question, demande une explication ou travaille à partir de tes documents. Tu peux retrouver tes fichiers personnels et les ressources partagées dans la bibliothèque, puis transformer un cours en fiche de révision, en QCM interactif ou en animation explicative.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Un espace pour passer de la question à la pratique</h2>
        <div className="mt-4 flex flex-col gap-5">
          <article>
            <h3 className="font-display text-base font-semibold text-dj-texte">Tes ressources à portée de main</h3>
            <p className="mt-1 text-sm leading-relaxed text-dj-texte-muet">Retrouve ta bibliothèque personnelle et le catalogue partagé. Sur mobile, tu peux aussi désigner des dossiers du téléphone pour que Classinus y accède selon les autorisations accordées.</p>
          </article>
          <article>
            <h3 className="font-display text-base font-semibold text-dj-texte">Des supports pour réviser activement</h3>
            <p className="mt-1 text-sm leading-relaxed text-dj-texte-muet">Demande des fiches, réponds à des QCM avec correction expliquée ou fais créer une animation que tu peux télécharger en vidéo horizontale ou verticale.</p>
          </article>
          <article>
            <h3 className="font-display text-base font-semibold text-dj-texte">Des réglages adaptés à ton travail</h3>
            <p className="mt-1 text-sm leading-relaxed text-dj-texte-muet">Depuis les raccourcis, accède à tes skills, à la mémoire, à l'éditeur et aux paramètres. Dans le chat, choisis parmi les modèles d'IA disponibles ; les modèles qui ne sont pas encore activés sont indiqués « Bientôt ».</p>
          </article>
          <article>
            <h3 className="font-display text-base font-semibold text-dj-texte">Programmer sans quitter ton éditeur</h3>
            <p className="mt-1 text-sm leading-relaxed text-dj-texte-muet">Le plugin Thonny-Classinus ajoute un panneau Classinus à droite de Thonny. À ta demande, il peut analyser ton code Python, expliquer une erreur ou proposer une correction. Tu gardes la main sur l'envoi du code et sur son exécution.</p>
          </article>
        </div>
      </section>

      <AccordeonQuestionsDecouvrir groupes={QUESTIONS_DECOUVRIR_ACCUEIL} />
    </main>
  );
}
