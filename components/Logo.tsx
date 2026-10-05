// Logo = la vraie image de la plume dorée (05/10/2026, demande de Bourama).
// Remplace l'ancienne plume dessinée en code (tracés SVG + dégradé piloté
// par les variables --dj-logo-*). Le fichier public/logo-classinus.webp a
// les coins transparents : le logo n'est jamais un carré à angles droits.
//
// Même signature qu'avant (`taille` en pixels), donc aucun des appels
// existants (barre latérale, connexion, chat, pages légales...) ne change.
// Image décorative : le nom "Classinus" est toujours écrit à côté, d'où
// l'alt vide.
export function Logo({ taille = 40 }: { taille?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-classinus.webp"
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
