import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

// Vrai logo Internet Archive, tiré de la collection Simple Icons (simpleicons.org,
// fichier internetarchive.svg, domaine public CC0). La marque Internet Archive reste la
// propriété de son titulaire : le logo sert uniquement à identifier le site
// ou la source concernée par un outil, voir components/chat/LogoSite.tsx.
// Utilisé pour les documents d'Internet Archive.
//
// Le logo est monochrome : fill="currentColor", la couleur suit celle du texte
// autour (clair sur le thème sombre, sombre sur le thème clair), comme
// IconeNotion et IconeGithub. strokeWidth est accepté pour rester
// interchangeable avec les icônes lucide et ignoré.
export const IconeInternetArchive = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color = "currentColor", strokeWidth: _strokeWidth, className, ...reste }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden="true"
      {...reste}
    >
      <path d="M22.667 22.884V24H1.333v-1.116zm-.842-1.675v1.396H2.175v-1.396zM4.233 6.14l.234.118.118 1.882.117 3.058v2.941l-.117 3.666-.02 2.47-.332.098H3.062l-.352-.098-.136-2.47-.118-3.646v-2.941l.118-3.078.107-1.892.244-.107zm16.842 0l.235.118.117 1.882.117 3.058v2.941l-.117 3.666-.02 2.47-.332.098h-1.171l-.352-.098-.137-2.47-.117-3.646v-2.941l.117-3.078.108-1.892.244-.107zm-11.79 0l.235.118.117 1.882.117 3.058v2.941l-.117 3.666-.02 2.47-.331.098H8.114l-.352-.098-.136-2.47-.117-3.646v-2.941l.117-3.078.107-1.892.244-.107zm6.457 0l.234.118.117 1.882.118 3.058v2.941l-.118 3.666-.019 2.47-.332.098H14.57l-.351-.098-.137-2.47-.117-3.646v-2.941l.117-3.078.108-1.892.244-.107zm6.083-2.511V5.58H2.175V3.628zM11.798 0l10.307 2.347-.413.723H1.951l-.618-.587Z" />
    </svg>
  )
);
IconeInternetArchive.displayName = "IconeInternetArchive";
