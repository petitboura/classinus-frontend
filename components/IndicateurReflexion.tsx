import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";
// Texte "{agent} réfléchit" scintillant (shimmer) -- 09/08, demande
// Bourama : reprendre le vrai principe de Claude.ai (le texte lui-même est
// balayé par la lumière, pas une icône qui pulse à côté d'un texte figé).
// Remplace l'ancienne version à 3 points (cgpt-point-reflexion) : avec le
// texte qui bouge, les points redevenaient un second signal redondant --
// Claude.ai n'en a pas non plus. Voir tailwind.config.ts pour le dégradé
// (dj-shimmer-texte) et le mouvement (dj-shimmer).
export function IndicateurReflexion({ nomAgent }: { nomAgent: string }) {
  const locale = useLocale();
  return (
    <div className="my-1 flex items-center text-[13px]">
      <span className="animate-dj-shimmer bg-dj-shimmer-texte bg-[length:200%_100%] bg-clip-text text-transparent">
        {traduireTexteInterface(`${nomAgent} réfléchit`, locale)}
      </span>
    </div>
  );
}
