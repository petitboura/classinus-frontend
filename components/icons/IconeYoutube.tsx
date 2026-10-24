import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

// Vrai logo YouTube, tiré de la collection Simple Icons (simpleicons.org,
// fichier youtube.svg, domaine public CC0). La marque YouTube reste la
// propriété de son titulaire : le logo sert uniquement à identifier le site
// ou la source concernée par un outil, voir components/chat/LogoSite.tsx.
// Utilisé pour les recherches et lectures de vidéos.
//
// Le logo garde sa couleur de marque (#FF0000) : c'est ce qui le rend
// reconnaissable, et elle reste lisible sur fond clair comme sur fond sombre.
// color et strokeWidth sont acceptés pour rester interchangeables avec les
// icônes lucide et ignorés.
export const IconeYoutube = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color: _color, strokeWidth: _strokeWidth, className, ...reste }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#FF0000"
      className={className}
      aria-hidden="true"
      {...reste}
    >
      {/* Le triangle est un trou dans le tracé officiel : ce carré blanc placé derrière
          le laisse blanc, comme dans le vrai logo, même sur un fond sombre. */}
      <rect x="9.5" y="8.4" width="6.4" height="7.2" fill="#FFFFFF" />
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
);
IconeYoutube.displayName = "IconeYoutube";
