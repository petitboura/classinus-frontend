"use client";

import { Clock } from "lucide-react";
import { QuestionInteractive } from "./QuestionInteractive";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";

// Question posée par Classinus PENDANT son travail, avec l'outil poser_question (26/11/2026, demande
// de Bourama). Le serveur envoie l'événement de flux `question_en_direct` avant même que l'outil
// n'attende : la carte apparaît tout de suite. Le rendu et la saisie sont ceux des questions riches
// (QuestionInteractive), seule la destination de la réponse change (ChatIA.tsx:repondreQuestionEnDirect).
//
// Question bloquante : Classinus attend la réponse dans le même tour. Délai dépassé : le serveur
// rend "pas de réponse", Classinus finit son tour et pose la même question dans son message ;
// la carte est alors verrouillée (`expiree`) pour ne pas laisser deux questions identiques ouvertes.

export type QuestionEnDirectAffichee = {
  id: string;
  // JSON de la question, au format des blocs ```question (voir lib/questionRiche.ts).
  code: string;
  bloquante: boolean;
  expiree: boolean;
};

export function QuestionEnDirect({
  question,
  onRepondre,
}: {
  question: QuestionEnDirectAffichee;
  onRepondre: (texte: string) => void;
}) {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  return (
    <div className="flex flex-col items-start" data-question-en-direct={question.id}>
      <div className="w-full max-w-full md:max-w-[80%]">
        <QuestionInteractive code={question.code} onReponse={onRepondre} dejaRepondu={question.expiree} />
        {question.expiree && (
          <p className="-mt-1 mb-2 flex items-center gap-1.5 px-1 text-xs text-dj-texte-muet">
            <Clock size={12} strokeWidth={1.75} />
            {t("Classinus n'a pas reçu de réponse à temps. Il te posera de nouveau la question.")}
          </p>
        )}
      </div>
    </div>
  );
}
