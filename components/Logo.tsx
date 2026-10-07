// Logo = la vraie image de la plume dorée (05/10/2026, demande de Bourama).
// Remplace l'ancienne plume dessinée en code (tracés SVG + dégradé piloté
// par les variables de couleur dj-logo).
//
// Deux versions de la même image :
// - par défaut, public/logo-classinus.webp : la plume sur sa tuile sombre
//   aux coins arrondis transparents (jamais un carré à angles droits) ;
// - avec `sansFond`, public/logo-classinus-sans-fond.webp : la plume seule,
//   fond transparent, recadrée sur la plume. Utilisée partout dans l'appli
//   et sur les pages publiques (demande de Bourama, 05/10/2026), car la
//   tuile sombre jurerait avec le thème clair. La version à tuile ne sert
//   plus qu'aux icônes (web, PWA, natif) et à l'image de partage.
//
// `taille` est en pixels. Image décorative : le nom "Classinus" est toujours
// écrit à côté, d'où l'alt vide.
export function Logo({ taille = 40, sansFond = false }: { taille?: number; sansFond?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sansFond ? "/logo-classinus-sans-fond.webp" : "/logo-classinus.webp"}
      width={taille}
      height={taille}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="flex-shrink-0 select-none"
      style={{ width: taille, height: taille }}
    />
  );
}
