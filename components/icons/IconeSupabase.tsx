import { forwardRef, useId } from "react";
import type { LucideProps } from "lucide-react";

// Vrai logo Supabase (éclair vert officiel avec ses dégradés), tiré de la
// collection Dashboard Icons de Homarr Labs
// (github.com/homarr-labs/dashboard-icons, fichier supabase.svg). La marque
// Supabase reste la propriété de son titulaire : le logo sert uniquement à
// identifier le connecteur.
//
// Contrairement à IconeNotion et IconeGithub, le logo garde ses couleurs de
// marque (vert #3ECF8E) : c'est ce qui le rend reconnaissable, et il reste
// lisible sur fond clair comme sur fond sombre. useId donne à chaque
// instance ses propres identifiants de dégradé (le logo peut apparaître
// plusieurs fois dans la même page). strokeWidth et color sont acceptés pour
// rester interchangeables avec les icônes lucide et ignorés.
export const IconeSupabase = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color: _color, strokeWidth: _strokeWidth, className, ...reste }, ref) => {
    const id = useId().replace(/:/g, "");
    const a = `supabase-a-${id}`;
    const b = `supabase-b-${id}`;
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 512 512"
        className={className}
        {...reste}
      >
        <linearGradient id={a} x1="237.109" x2="419.106" y1="223.219" y2="146.89" gradientTransform="matrix(1 0 0 -1 0 513)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#249361" />
          <stop offset="1" stopColor="#3ecf8e" />
        </linearGradient>
        <path d="M297.6 501c-12.9 16.3-39.2 7.4-39.5-13.4L253.6 183h204.8c37.1 0 57.8 42.8 34.7 71.9z" fill={`url(#${a})`} />
        <linearGradient id={b} x1="245.829" x2="328.829" y1="411.681" y2="255.438" gradientTransform="matrix(1 0 0 -1 0 513)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <path d="M297.6 501c-12.9 16.3-39.2 7.4-39.5-13.4L253.6 183h204.8c37.1 0 57.8 42.8 34.7 71.9z" fill={`url(#${b})`} fillOpacity=".2" />
        <path d="M214.4 11c12.9-16.3 39.2-7.4 39.5 13.4l2 304.5H53.7c-37.1 0-57.8-42.8-34.7-71.9z" fill="#3ecf8e" />
      </svg>
    );
  }
);
IconeSupabase.displayName = "IconeSupabase";
