import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

// Vrai logo arXiv, tiré de la collection Simple Icons (simpleicons.org,
// fichier arxiv.svg, domaine public CC0). La marque arXiv reste la
// propriété de son titulaire : le logo sert uniquement à identifier le site
// ou la source concernée par un outil, voir components/chat/LogoSite.tsx.
// Utilisé pour les documents d'arXiv.
//
// Le logo garde sa couleur de marque (#B31B1B) : c'est ce qui le rend
// reconnaissable, et elle reste lisible sur fond clair comme sur fond sombre.
// color et strokeWidth sont acceptés pour rester interchangeables avec les
// icônes lucide et ignorés.
export const IconeArxiv = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color: _color, strokeWidth: _strokeWidth, className, ...reste }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#B31B1B"
      className={className}
      aria-hidden="true"
      {...reste}
    >
      <path d="M3.8423 0a1.0037 1.0037 0 0 0-.922.6078c-.1536.3687-.0438.6275.2938 1.1113l6.9185 8.3597-1.0223 1.1058a1.0393 1.0393 0 0 0 .003 1.4229l1.2292 1.3135-5.4391 6.4444c-.2803.299-.4538.823-.2971 1.1986a1.0253 1.0253 0 0 0 .9585.635.9133.9133 0 0 0 .6891-.3405l5.783-6.126 7.4902 8.0051a.8527.8527 0 0 0 .6835.2597.9575.9575 0 0 0 .8777-.6138c.1577-.377-.017-.7502-.306-1.1407l-7.0518-8.3418 1.0632-1.13a.9626.9626 0 0 0 .0089-1.3165L4.6336.4639s-.3733-.4535-.768-.463zm0 .272h.0166c.2179.0052.4874.2715.5644.3639l.005.006.0052.0055 10.169 10.9905a.6915.6915 0 0 1-.0072.945l-1.0666 1.133-1.4982-1.7724-8.5994-10.39c-.3286-.472-.352-.6183-.2592-.841a.7307.7307 0 0 1 .6704-.4401Zm14.341 1.5701a.877.877 0 0 0-.6554.2418l-5.6962 6.1584 1.6944 1.8319 5.3089-6.5138c.3251-.4335.479-.6603.3247-1.0292a1.1205 1.1205 0 0 0-.9763-.689zm-7.6557 12.2823 1.3186 1.4135-5.7864 6.1295a.6494.6494 0 0 1-.4959.26.7516.7516 0 0 1-.706-.4669c-.1119-.2682.0359-.6864.2442-.9083l.0051-.0055.0047-.0055z" />
    </svg>
  )
);
IconeArxiv.displayName = "IconeArxiv";
