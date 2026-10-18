import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

export const metadata: Metadata = {
  title: "Signalements Classinus : examiner les problèmes remontés par les élèves",
  description: "Les enseignants peuvent ouvrir un signalement, examiner le problème avec Classinus et décider des suites à donner. Rien n'est corrigé automatiquement.",
};

export default function PageDecouvrirBureauSignalements() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Signalements</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Lorsqu'un élève signale un problème lié à une réponse de Classinus, l'enseignant peut ouvrir le signalement et examiner le cas avec l'assistant. L'objectif est de comprendre ce qui s'est passé et de décider de la suite à donner, en conservant un contrôle humain sur le traitement.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Un examen au cas par cas</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux discuter du contexte et du problème avec Classinus dans une conversation dédiée. Le signalement n'est pas traité ni corrigé automatiquement : l'enseignant examine les informations et décide des actions à entreprendre. Cette fonction est réservée aux enseignants.</p>
      </section>
    </MiseEnPageDecouvrirBureau>
  );
}
