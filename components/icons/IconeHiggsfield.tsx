import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

// Vrai logo Higgsfield : carré arrondi vert lime (#D1FE17) avec le symbole
// noir, tel que dans le fichier officiel de la collection Dashboard Icons de
// Homarr Labs (github.com/homarr-labs/dashboard-icons, fichier
// higgsfield.svg). Une première version n'en gardait que le symbole sans le
// fond vert, ce qui ne ressemblait pas au vrai logo (demande de Bourama,
// 20/10/2026). La marque Higgsfield reste la propriété de son titulaire : le
// logo sert uniquement à identifier le connecteur.
//
// Le fond vert fait partie du logo : les couleurs de marque sont gardées
// (comme IconeSupabase) et la couleur du bouton ne les change pas.
// strokeWidth et color sont acceptés pour rester interchangeables avec les
// icônes lucide et ignorés.
export const IconeHiggsfield = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, color: _color, strokeWidth: _strokeWidth, className, ...reste }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      {...reste}
    >
      <rect width="512" height="512" rx="92" fill="#D1FE17" />
      <path d="M419.055 253.911L418.753 250.505C415.893 217.823 395.28 156.334 338.099 156.334C295.668 156.334 263.614 199.548 235.326 237.647C212.754 268.158 193.196 294.333 171.676 294.333C165.956 293.715 158.585 290.771 154.073 284.112C150.009 278.069 148.957 270.326 151.062 261.032C154.37 246.318 173.332 232.688 193.343 218.129C204.325 210.386 215.613 202.176 223.438 194.278C246.011 171.82 257.446 155.557 257.446 129.383C257.446 103.21 243.453 90.1964 231.716 84.6198C208.242 73.471 173.785 79.9756 151.817 99.4937C148.508 102.593 145.195 105.532 142.185 108.32C120.065 128.611 105.17 142.397 71.0117 131.861V174.298C116.304 194.899 154.375 155.557 168.821 137.437C179.954 125.512 191.691 118.541 200.421 118.541H200.874C204.787 118.696 208.095 120.246 210.506 123.034C214.419 127.683 215.924 133.104 215.169 139.142C213.513 151.845 200.723 166.71 177.249 182.974C149.712 202.025 103.669 233.931 100.055 274.046C97.3457 302.857 111.792 331.664 134.364 342.813C187.028 368.523 219.082 324.227 253.085 277.452C279.117 241.364 303.795 207.136 338.103 207.136C368.949 207.136 380.385 233.465 380.385 250.039V253.294L377.375 253.911C302.591 267.542 261.812 339.718 261.812 373.016C261.812 406.317 289.198 434.817 322.903 434.817C362.328 434.817 411.079 400.122 418.905 302.546L419.207 298.986H450.354V253.915L419.055 253.911ZM378.276 303.936C372.259 362.326 343.215 389.588 325.611 389.588C317.636 389.588 306.504 382.771 306.504 370.073C306.504 355.826 327.117 312.612 373.462 299.758L378.879 298.364L378.276 303.936Z" fill="#000" />
    </svg>
  )
);
IconeHiggsfield.displayName = "IconeHiggsfield";
