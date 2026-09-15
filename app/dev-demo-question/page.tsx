"use client";

import { QuestionInteractive } from "@/components/chat/QuestionInteractive";

// Page de démo TEMPORAIRE (Lot 2, "question riche dans le chat" --
// specs-question-riche.md) : un JSON codé en dur par type, pour vérifier
// visuellement l'affichage des 8 types avant le branchement Lot 3 (envoi
// réel + persistance). À retirer une fois la vérification faite -- pas
// liée au chat, pas dans (app), non protégée par auth exprès pour rester
// consultable directement pendant la revue.

const EXEMPLES: { titre: string; json: object }[] = [
  {
    titre: "choix_unique (avec Autre)",
    json: {
      question: "Quel est ton niveau en algèbre ?",
      type: "choix_unique",
      choix: ["Débutant", "Intermédiaire", "Avancé"],
      autre: true,
    },
  },
  {
    titre: "choix_multiple (avec Autre)",
    json: {
      question: "Quelles matières veux-tu réviser cette semaine ?",
      type: "choix_multiple",
      choix: ["Algèbre", "Analyse", "Physique", "Chimie"],
      autre: true,
    },
  },
  {
    titre: "texte (court)",
    json: { question: "Quel est ton objectif principal ce mois-ci ?", type: "texte", format: "court" },
  },
  {
    titre: "texte (long)",
    json: { question: "Décris ce qui te bloque sur cet exercice.", type: "texte", format: "long" },
  },
  {
    titre: "oui_non",
    json: { question: "As-tu déjà vu ce chapitre en cours ?", type: "oui_non" },
  },
  {
    titre: "echelle (petite amplitude)",
    json: {
      question: "À quel point te sens-tu confiant sur ce chapitre ?",
      type: "echelle",
      min: 1,
      max: 5,
      labels: { min: "Pas confiant", max: "Très confiant" },
    },
  },
  {
    titre: "echelle (grande amplitude)",
    json: { question: "Note ta compréhension globale sur 20.", type: "echelle", min: 0, max: 20 },
  },
  {
    titre: "classement",
    json: {
      question: "Classe ces notions de la plus facile à la plus difficile pour toi.",
      type: "classement",
      elements: ["Suites numériques", "Limites", "Continuité", "Dérivabilité"],
    },
  },
  {
    titre: "date (date_heure)",
    json: {
      question: "Quand veux-tu programmer ta prochaine séance de révision ?",
      type: "date",
      granularite: "date_heure",
    },
  },
  {
    titre: "multi_champs",
    json: {
      question: "Petit point rapide avant de commencer",
      type: "multi_champs",
      champs: [
        { question: "Ton prénom", type: "texte", format: "court" },
        { question: "Tu es plutôt matière scientifique ou littéraire ?", type: "choix_unique", choix: ["Scientifique", "Littéraire"] },
        { question: "Combien d'heures par semaine peux-tu réviser ?", type: "echelle", min: 1, max: 10 },
      ],
    },
  },
];

export default function PageDemoQuestion() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 bg-dj-fond p-6">
      <h1 className="text-lg font-semibold text-dj-texte">
        Démo temporaire — bloc ```question (Lot 2)
      </h1>
      {EXEMPLES.map((exemple, i) => (
        <div key={i}>
          <p className="mb-1 text-xs uppercase tracking-wide text-dj-texte-muet">{exemple.titre}</p>
          <QuestionInteractive code={JSON.stringify(exemple.json)} />
        </div>
      ))}
    </div>
  );
}
