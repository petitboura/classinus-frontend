import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

// Vrai logo Notion (tracé officiel du logomark "N", source Simple Icons
// -- simpleicons.org, licence CC0-1.0, même bibliothèque de logos de
// marque qu'utilisent la plupart des apps pour afficher un connecteur
// tiers reconnaissable, y compris Claude). Remplace le 19/09/2026
// (demande explicite de Bourama, capture à l'appui : le contour redessiné
// précédent ne ressemblait pas au vrai logo de l'appli Notion) le contour
// façon tabler-icons utilisé avant -- lui-même déjà un remplacement de
// l'icône lucide-react générique "BookOpen" (lucide-react n'inclut aucun
// logo de marque pour Notion, contrairement à Github, disponible
// nativement).
//
// fill="currentColor" (tracé plein, pas un contour) : le logo Notion
// officiel est un aplat, pas un trait -- inchangé par rapport à l'ancien
// composant sur le principe qui compte : jamais de couleur de marque figée
// (noir Notion), la couleur suit toujours le bouton qui l'entoure
// (text-dj-texte / text-dj-texte-muet), exactement comme <Github /> juste
// à côté dans BarreDeSaisie.tsx. strokeWidth n'a pas de sens pour un tracé
// plein : gardé dans les props uniquement pour rester interchangeable avec
// `Icone: typeof Github` dans lib/outils.ts (même interface qu'un composant
// lucide), mais simplement ignoré ici.
export const IconeNotion = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color = "currentColor", strokeWidth: _strokeWidth, className, ...reste }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      {...reste}
    >
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  )
);
IconeNotion.displayName = "IconeNotion";
