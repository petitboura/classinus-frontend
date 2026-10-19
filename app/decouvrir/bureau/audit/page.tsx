import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

export const metadata: Metadata = {
  title: "Audit hebdomadaire Classinus : suivre les signalements et l'activité",
  description: "Consulte le récapitulatif hebdomadaire des signalements, repère ceux qui attendent une correction et ouvre les statistiques d'un code. Réservé aux enseignants.",
};

export default function PageDecouvrirBureauAudit() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Audit hebdomadaire</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        L'Audit hebdomadaire donne aux enseignants une vue régulière des signalements associés à leurs codes. Le récapitulatif est envoyé chaque semaine, y compris lorsqu'aucun signalement n'a été reçu : tu peux ainsi garder un point de repère sans devoir vérifier manuellement chaque code.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Ce que contient le récapitulatif</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-dj-texte-muet">
          <li>Les signalements reçus, avec une priorité donnée à ceux qui attendent encore une correction.</li>
          <li>Un accès pour ouvrir le signalement concerné et examiner le problème.</li>
          <li>Un accès au tableau de bord détaillé d'un code, avec des indicateurs d'activité tels que les élèves actifs, les conversations, les périodes les plus actives et les outils les plus utilisés.</li>
        </ul>
      </section>
      <p className="mt-5 text-sm leading-relaxed text-dj-texte-muet">L'audit sert à repérer les points à examiner ; il ne signifie pas qu'un problème est corrigé automatiquement. Le traitement reste sous le contrôle de l'enseignant.</p>
    </MiseEnPageDecouvrirBureau>
  );
}
