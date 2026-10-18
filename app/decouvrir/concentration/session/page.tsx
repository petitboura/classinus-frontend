import type { Metadata } from "next";
import { MiseEnPageDecouvrirConcentration } from "@/components/EnTeteDecouvrirConcentration";

export const metadata: Metadata = {
  title: "Contrôle de session Classinus : limiter les notifications pendant les révisions",
  description: "Choisis une durée de travail pour activer Ne pas déranger et limiter les sonneries et notifications. Une autorisation système est nécessaire.",
};

export default function PageDecouvrirConcentrationSession() {
  return (
    <MiseEnPageDecouvrirConcentration>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Contrôle de session</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Avant une séance de révision, lance le contrôle de session et choisis la durée de ton travail. Classinus active alors Ne pas déranger et limite les sonneries et notifications pendant la période choisie, afin de réduire les interruptions.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Activation et autorisations</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">La première utilisation nécessite une autorisation dans les réglages système du téléphone, dans la section Accessibilité. Cette étape se fait en dehors de Classinus. Le contrôle de session ne bloque pas les applications : il agit sur les interruptions et les notifications.</p>
      </section>
    </MiseEnPageDecouvrirConcentration>
  );
}
