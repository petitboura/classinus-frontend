// Écran d'ouverture (refait le 05/10/2026, demande de Bourama : le logo est
// maintenant la vraie image de la plume dorée, plus un dessin en code).
// L'ancienne chorégraphie (plume tracée trait par trait, sursauts, zigzag)
// ne s'applique plus à une image : elle est remplacée par une entrée
// douce du vrai logo.
//
// Déroulé (environ 2 secondes) :
// 1. le logo apparaît en fondu, en grossissant légèrement et en passant du
//    flou au net (cv-logo-entree) ;
// 2. une lueur dorée se lève derrière lui (cv-halo) ;
// 3. un reflet traverse le logo en diagonale (cv-reflet) ;
// 4. le mot "Classinus" se révèle de gauche à droite sous le logo (cv-mot).
//
// Volontairement un composant SERVEUR (pas de "use client" ici) : il doit
// faire partie du tout premier HTML envoyé par le serveur pour être
// visible dès le premier affichage, avant même que React ne s'hydrate.
// Voir SplashPret.tsx et le script juste après ce composant dans
// app/layout.tsx pour la disparition : elle attend la fin réelle de
// cette animation ET que l'appli soit prête.
//
// Thème (05/10/2026, demande de Bourama) : l'animation montre la plume SEULE
// (public/logo-classinus-sans-fond.webp, fond transparent), posée sur le
// fond du thème (bg-dj-fond, clair ou sombre) au lieu d'une tuile noire
// qui ne s'adaptait pas. La lueur prend elle aussi sa couleur sur le thème.
// Le reflet est découpé dans la forme de la plume avec un masque CSS
// construit sur la même image : sans lui, il apparaîtrait comme une bande
// rectangulaire sur le fond.
//
// Unité de longueur de la scène : 1px sur les écrans d'au moins 370px de
// large, puis proportionnelle en dessous, pour que le logo et le mot
// tiennent toujours dans l'écran.
const UNITE = { ["--u" as string]: "min(1px, 0.27vw)" } as React.CSSProperties;

// Masque qui reprend la silhouette de la plume (canal alpha de l'image).
const MASQUE_PLUME = {
  WebkitMaskImage: "url(/logo-classinus-sans-fond.webp)",
  maskImage: "url(/logo-classinus-sans-fond.webp)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
} as React.CSSProperties;

export function SplashOuverture() {
  return (
    <div
      id="clovis-splash"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-dj-fond"
    >
      <div id="clovis-splash-scene" className="relative flex flex-col items-center" style={UNITE}>
        <div className="relative" style={{ width: "calc(140 * var(--u))", height: "calc(140 * var(--u))" }}>
          {/* Lueur dorée derrière le logo, couleur prise sur le thème. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute opacity-0 animate-[cv-halo_1.8s_ease-out_.1s_forwards]"
            style={{
              inset: "calc(-60 * var(--u))",
              background: "radial-gradient(circle, var(--dj-logo-1) 0%, transparent 62%)",
              filter: "blur(calc(14 * var(--u)))",
            }}
          />
          <div className="relative h-full w-full opacity-0 animate-[cv-logo-entree_.95s_cubic-bezier(.2,.8,.2,1)_.1s_forwards]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-classinus-sans-fond.webp"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-full w-full select-none"
            />
            {/* Reflet qui traverse la plume, découpé dans sa silhouette. */}
            <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={MASQUE_PLUME}>
              <div
                className="absolute inset-y-0 left-0 w-1/3 opacity-0 animate-[cv-reflet_.9s_ease-in-out_1s_forwards]"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent)" }}
              />
            </div>
          </div>
        </div>

        {/* Le mot : sa place est sa place finale dès le départ, c'est le
            clip-path qui le révèle de gauche à droite. */}
        <span
          id="clovis-splash-mot"
          className="animate-[cv-mot_.9s_cubic-bezier(.25,.8,.35,1)_1.05s_forwards] whitespace-nowrap font-display font-bold leading-none text-dj-texte [clip-path:inset(0_100%_0_0)]"
          style={{ marginTop: "calc(26 * var(--u))", fontSize: "calc(44 * var(--u))" }}
        >
          Classinus
        </span>
      </div>
    </div>
  );
}
