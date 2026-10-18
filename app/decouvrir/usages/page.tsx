import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  Code,
  FileText,
  Image as IconImage,
  Library,
  Plug,
  Search,
  SlidersHorizontal,
  Smartphone,
  Timer,
  Users,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DonneesStructurees } from "@/components/DonneesStructurees";
import { ListeQuestionsReponses, donneesFaq } from "@/components/PageUsageDecouvrir";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { QUESTIONS_GENERALES_CLASSINUS, RESUME_CLASSINUS, USAGES_DECOUVRIR } from "@/lib/usagesDecouvrir";

export const metadata: Metadata = {
  title: "Ce que tu peux faire avec Classinus : étudier, créer, chercher et programmer",
  description: RESUME_CLASSINUS.description,
};

const ICONES_USAGE: Record<(typeof USAGES_DECOUVRIR)[number]["slug"], LucideIcon> = {
  pdf: BookOpen,
  coder: Code,
  videos: Video,
  etudier: Brain,
};

const AUTRES_PARCOURS: {
  titre: string;
  description: string;
  href: string;
  lien: string;
  Icone: LucideIcon;
}[] = [
  {
    titre: "Retrouver et organiser tes documents",
    description:
      "Range tes cours dans ta bibliothèque personnelle, explore les ressources partagées et, sur mobile, donne accès aux dossiers utiles de ton téléphone.",
    href: ROUTES_DECOUVRIR.bibliotheque.accueil,
    lien: "Explorer la bibliothèque",
    Icone: Library,
  },
  {
    titre: "Adapter l'assistant à ta façon de travailler",
    description:
      "Choisis un modèle d'IA parmi ceux activés, prépare tes consignes avec les skills et consulte les informations enregistrées dans ta mémoire.",
    href: ROUTES_DECOUVRIR.personnaliser.accueil,
    lien: "Découvrir la personnalisation",
    Icone: SlidersHorizontal,
  },
  {
    titre: "Programmer dans un éditeur",
    description:
      "Écris et teste du code dans l'éditeur intégré, ou utilise le plugin Classinus dans Thonny pour analyser un programme Python et comprendre une erreur.",
    href: ROUTES_DECOUVRIR.thonny,
    lien: "Voir le guide Thonny",
    Icone: Code,
  },
  {
    titre: "Partager des ressources et travailler en classe",
    description:
      "Utilise des codes de partage pour transmettre des contenus, consulte les établissements et demande l'accès aux ressources auxquelles tu es autorisé. Le Bureau comprend aussi des outils réservés aux enseignants.",
    href: ROUTES_DECOUVRIR.bureau.accueil,
    lien: "Explorer le Bureau",
    Icone: Users,
  },
  {
    titre: "Protéger tes moments de concentration",
    description:
      "Active un contrôle de session pour limiter les interruptions et consulte le temps passé dans les applications sur Android.",
    href: ROUTES_DECOUVRIR.concentration.accueil,
    lien: "Découvrir les outils de concentration",
    Icone: Timer,
  },
  {
    titre: "Connecter Classinus à Claude et à des outils",
    description:
      "Le connecteur dédié permet d'utiliser Classinus depuis Claude. Dans le chat, certains outils peuvent aussi agir sur des services compatibles, comme GitHub, Notion ou Google Drive, après configuration et autorisation.",
    href: "/connecter-claude",
    lien: "Voir le guide de connexion",
    Icone: Plug,
  },
  {
    titre: "Programmer des rappels et des événements",
    description:
      "Dans l'application native compatible, programme une notification ou ajoute un événement à ton calendrier. Ces fonctions dépendent de l'appareil et des autorisations accordées.",
    href: "/rappels",
    lien: "Découvrir les rappels",
    Icone: Bell,
  },
  {
    titre: "Travailler avec différents formats",
    description:
      "Envoie des documents, des images, du code ou des médias dans la conversation. Selon ta demande et les outils disponibles, Classinus peut aussi créer des documents, des images ou des animations.",
    href: ROUTES_DECOUVRIR.accueilClassinus,
    lien: "Voir les possibilités du chat",
    Icone: FileText,
  },
];

export default function PageDecouvrirUsages() {
  return (
    <main className="mx-auto max-w-3xl">
      <DonneesStructurees donnees={donneesFaq(QUESTIONS_GENERALES_CLASSINUS)} />

      <Link
        href={ROUTES_DECOUVRIR.accueil}
        className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline"
      >
        <ChevronLeft size={14} />
        Découvrir Classinus
      </Link>

      <header className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">
          Du besoin au résultat
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-dj-texte">
          Que peux-tu faire avec Classinus ?
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-dj-texte">
          Tu peux partir d'une question, d'un cours, d'une image ou d'un problème à résoudre.
          Classinus t'aide à chercher des ressources, comprendre une notion, préparer tes révisions,
          programmer et produire des supports de travail. Tu peux aussi reprendre une conversation,
          choisir un modèle d'IA activé et personnaliser tes échanges. Choisis ton objectif pour
          voir comment commencer et quelles limites garder en tête.
        </p>
      </header>

      <section className="mt-9" aria-labelledby="guides-pratiques">
        <div className="mb-4">
          <h2 id="guides-pratiques" className="font-display text-xl font-semibold text-dj-texte">
            Commence par ce que tu veux faire
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-dj-texte-muet">
            Des guides concrets pour les besoins les plus courants.
          </p>
        </div>
        <nav aria-label="Guides pratiques Classinus">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {USAGES_DECOUVRIR.map((usage) => {
              const Icone = ICONES_USAGE[usage.slug];
              return (
                <li key={usage.slug}>
                  <Link
                    href={usage.href}
                    className="group flex h-full flex-col rounded-2xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:bg-dj-surface-haute focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dj-bordure-forte"
                  >
                    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-dj-surface-haute text-dj-texte">
                      <Icone size={18} aria-hidden="true" />
                    </span>
                    <span className="font-display text-base font-semibold text-dj-texte">
                      {usage.titreCarte}
                    </span>
                    <span className="mt-1.5 flex-1 text-sm leading-relaxed text-dj-texte-muet">
                      {usage.resumeCarte}
                    </span>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-dj-texte">
                      Voir le guide
                      <ArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </section>

      <section className="mt-10" aria-labelledby="autres-facons">
        <div className="mb-4">
          <h2 id="autres-facons" className="font-display text-xl font-semibold text-dj-texte">
            Et ce n'est pas tout
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-dj-texte-muet">
            Classinus comprend aussi des espaces pour retrouver tes contenus, personnaliser ton
            assistant et organiser ton travail au quotidien.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {AUTRES_PARCOURS.map(({ titre, description, href, lien, Icone }) => (
            <li key={titre}>
              <Link
                href={href}
                className="group flex items-start gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:bg-dj-surface-haute focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dj-bordure-forte"
              >
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-dj-surface-haute text-dj-texte">
                  <Icone size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-semibold text-dj-texte">
                    {titre}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-dj-texte-muet">
                    {description}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-dj-texte">
                    {lien}
                    <ChevronRight
                      size={15}
                      className="transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-2xl border border-dj-bordure bg-dj-surface p-5 sm:p-6" aria-labelledby="de-la-demande-au-resultat">
        <h2 id="de-la-demande-au-resultat" className="font-display text-xl font-semibold text-dj-texte">
          De ta demande à un résultat exploitable
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">01 · Apporte le contexte</span>
            <p className="mt-2 text-sm leading-relaxed text-dj-texte">
              Écris ta question, joins un cours ou une image, partage un extrait de code ou indique une page à consulter.
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">02 · Précise ton objectif</span>
            <p className="mt-2 text-sm leading-relaxed text-dj-texte">
              Demande une explication pas à pas, une recherche de sources, une fiche, un QCM, du code ou un support adapté à ton travail.
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">03 · Vérifie et améliore</span>
            <p className="mt-2 text-sm leading-relaxed text-dj-texte">
              Demande les étapes ou les références, teste le code et compare les résultats à ton cours. Une réponse d'IA peut contenir des erreurs.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-dj-bordure bg-dj-surface p-5 sm:p-6" aria-labelledby="possibilites-formats">
        <h2 id="possibilites-formats" className="font-display text-lg font-semibold text-dj-texte">
          Des formats pour travailler autrement
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <Search size={16} className="text-dj-texte-muet" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-dj-texte">Tu peux apporter</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">
              Des questions, des PDF et autres documents, des images ou photos de formules, des extraits de code, des liens web et certains fichiers audio ou vidéo.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <IconImage size={16} className="text-dj-texte-muet" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-dj-texte">Tu peux obtenir</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">
              Des explications, des fiches et QCM, des documents PDF ou Office, du code, des images et des animations. Les formats dépendent de la demande et des outils disponibles.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-dj-texte-muet">
          Les fonctions disponibles peuvent varier selon l'appareil, le modèle choisi et les outils activés. Vérifie les sources, les calculs et les contenus générés avant de les utiliser dans un devoir ou un projet.
        </p>
      </section>

      <div className="mt-8 flex items-center gap-2 rounded-xl bg-dj-surface-haute p-4">
        <Smartphone size={18} className="flex-shrink-0 text-dj-texte-muet" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-dj-texte-muet">
          Classinus fonctionne dans un navigateur sur ordinateur et téléphone, avec une application Android. Certaines fonctions sont propres à un appareil, comme le suivi du temps d'écran sur Android.
        </p>
      </div>

      <div className="mt-10 border-t border-dj-bordure pt-6">
        <ListeQuestionsReponses questions={QUESTIONS_GENERALES_CLASSINUS} />
      </div>
    </main>
  );
}
