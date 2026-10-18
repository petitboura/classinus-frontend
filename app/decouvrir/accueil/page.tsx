import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { QUESTIONS_DECOUVRIR_ACCUEIL } from "@/lib/questionsDecouvrir";
import { AccordeonQuestionsDecouvrir } from "@/components/AccordeonQuestionsDecouvrir";

// Chantier SEO/AEO de Classinus (26/09/2026). Titre, description et
// contenu validés par Bourama, revus une première fois : la phrase
// courte devient "Le coin des étudiants" (reprise aussi dans l'appli
// elle même, voir components/EcranAccueil.tsx et app/layout.tsx), et la
// mention de "garde une trace de vos échanges" retirée (pas distinctif,
// tous les assistants IA le font) au profit de ce qui l'est vraiment :
// bibliothèque perso/publique, fiches de révision, QCM, animations.
export const metadata: Metadata = {
  title: "Classinus : le coin des étudiants",
  description:
    "Classinus est une application d'études avec IA : pose tes questions, utilise ta bibliothèque personnelle et le catalogue partagé par les élèves, prépare des fiches de révision, des QCM et des animations téléchargeables en vidéo, et choisis parmi les modèles d'IA disponibles.",
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

      <h1 className="mt-4 font-display text-2xl font-bold text-dj-texte">Le coin des étudiants</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Un compagnon d&apos;études avec IA, disponible directement dans le chat : c&apos;est là que tu arrives dès
        l&apos;ouverture de Classinus. Pose lui tes questions, et retrouve
        tes documents personnels ainsi que ceux partagés par les autres élèves dans la bibliothèque. Il peut aussi te
        préparer des fiches de révision, des QCM interactifs, ou encore des animations, que tu peux télécharger en vidéo (horizontale ou verticale), pour t&apos;aider à comprendre
        un cours. Sur l&apos;écran vide du chat, des raccourcis te mènent directement à la configuration, à l&apos;éditeur,
        à ta mémoire et à tes skills, ainsi qu&apos;à ta bibliothèque perso sur ordinateur, ou au dossier de ton
        téléphone et à ton temps d&apos;écran sur mobile. Dans le tableau de bord, tu retrouves aussi tes raccourcis
        vers chaque partie de Classinus et ton activité récente. En haut du chat, tu peux choisir parmi les modèles d’IA disponibles, regroupés par fournisseur ; les modèles pas encore activés sont signalés « Bientôt ». Pour programmer, Classinus s’intègre aussi directement à Thonny grâce au plugin thonny-classinus : il peut analyser ou corriger ton code Python, expliquer les erreurs et utiliser le modèle d’IA que tu choisis dans son panneau.
      </p>

      <AccordeonQuestionsDecouvrir groupes={QUESTIONS_DECOUVRIR_ACCUEIL} />
    </main>
  );
}
