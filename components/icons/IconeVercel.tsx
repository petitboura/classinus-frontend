import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

// Vrai logo Vercel (triangle officiel), tiré de la collection Dashboard Icons
// de Homarr Labs (github.com/homarr-labs/dashboard-icons, fichier vercel.svg).
// La marque Vercel reste la propriété de son titulaire : le logo sert
// uniquement à identifier le connecteur.
//
// Le logo officiel est monochrome : fill="currentColor", la couleur suit le
// bouton qui l'entoure (clair sur le thème sombre, sombre sur le thème clair),
// comme IconeNotion et IconeGithub. strokeWidth est accepté pour rester
// interchangeable avec les icônes lucide et ignoré.
export const IconeVercel = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color = "currentColor", strokeWidth: _strokeWidth, className, ...reste }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 1155 1000"
      fill={color}
      className={className}
      {...reste}
    >
      <path d="m577.344 0 577.346 1000H0z" />
    </svg>
  )
);
IconeVercel.displayName = "IconeVercel";
