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
// `taille` est en pixels. Par défaut l'image est décorative : le nom "Classinus"
// est écrit à côté, d'où l'alt vide. Sur les pages publiques que les robots
// parcourent (en-tête de /decouvrir), on passe `alt="Classinus"` : l'image
// porte alors le nom, et le texte écrit à côté est masqué aux lecteurs d'écran
// pour que le lien ne soit pas lu deux fois.
export function Logo({
  taille = 40,
  sansFond = false,
  alt = "",
}: {
  taille?: number;
  sansFond?: boolean;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sansFond ? "/logo-classinus-sans-fond.webp" : "/logo-classinus.webp"}
      width={taille}
      height={taille}
      alt={alt}
      aria-hidden={alt ? undefined : "true"}
      draggable={false}
      className="flex-shrink-0 select-none"
      style={{ width: taille, height: taille }}
    />
  );
}
