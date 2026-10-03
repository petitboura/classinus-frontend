"use client";

// Créé le 02/10/2026, Bourama : onde de la voix en direct. Une seule forme
// qui vacille selon le son et change d'aspect selon l'état, sans aucun texte :
// - il t'écoute : lignes fines qui suivent ta voix ;
// - il parle : ondes pleines, plus amples, qui suivent sa voix ;
// - il travaille : une ligne presque plate qui respire lentement.
// Dessinée sur un canvas, à chaque image, à partir des niveaux sonores lus
// directement dans la session (voir lireNiveaux dans lib/contexteVoixDirecte.tsx),
// sans repasser par React, pour rester fluide.

import { useContext, useEffect, useRef } from "react";
import { ContexteVoixDirecte, type EtatVoixDirecte } from "@/lib/contexteVoixDirecte";

type Props = {
  // Onde réduite pour la bulle : moins de courbes, trait plus épais.
  mini?: boolean;
  className?: string;
};

type Aspect = { amplitude: number; remplissage: number; epaisseur: number; vitesse: number };

const COURBES = [
  { frequence: 1.6, vitesse: 1.1, phase: 0, opacite: 1 },
  { frequence: 2.3, vitesse: -0.8, phase: 1.7, opacite: 0.6 },
  { frequence: 3.1, vitesse: 1.5, phase: 3.1, opacite: 0.35 },
];

function aspectCible(etat: EtatVoixDirecte, entree: number, sortie: number, t: number): Aspect {
  switch (etat) {
    case "ecoute":
      return { amplitude: 0.1 + entree * 0.9, remplissage: 0, epaisseur: 2, vitesse: 1 };
    case "reponse":
      return { amplitude: 0.18 + sortie * 1.0, remplissage: 1, epaisseur: 2.5, vitesse: 1.6 };
    case "travail":
      return { amplitude: 0.05 + 0.04 * Math.sin(t * 1.6), remplissage: 0, epaisseur: 2, vitesse: 0.5 };
    case "silence":
      return { amplitude: 0.02, remplissage: 0, epaisseur: 1.5, vitesse: 0.25 };
    default:
      return { amplitude: 0.04, remplissage: 0, epaisseur: 2, vitesse: 0.4 };
  }
}

export function OndeVoix({ mini = false, className }: Props) {
  const voix = useContext(ContexteVoixDirecte);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Lus à chaque image : on les garde dans des refs pour ne jamais relancer la boucle.
  const etatRef = useRef<EtatVoixDirecte>(voix?.etat ?? "inactif");
  const lireNiveauxRef = useRef(voix?.lireNiveaux);
  useEffect(() => {
    etatRef.current = voix?.etat ?? "inactif";
    lireNiveauxRef.current = voix?.lireNiveaux;
  }, [voix?.etat, voix?.lireNiveaux]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const contexte = canvas?.getContext("2d");
    if (!canvas || !contexte) return;
    const toile = canvas;
    const dessin = contexte;

    const reduireMouvement = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let largeur = 0;
    let hauteur = 0;
    const ajuster = () => {
      const echelle = window.devicePixelRatio || 1;
      largeur = toile.clientWidth;
      hauteur = toile.clientHeight;
      toile.width = Math.max(1, Math.round(largeur * echelle));
      toile.height = Math.max(1, Math.round(hauteur * echelle));
      dessin.setTransform(echelle, 0, 0, echelle, 0, 0);
    };
    ajuster();
    const observateur = new ResizeObserver(ajuster);
    observateur.observe(toile);

    // Couleur du thème, relue de temps en temps pour suivre le mode clair ou sombre.
    let couleur = "#b8860b";
    let derniereLectureCouleur = -Infinity;

    const etatAffiche = { amplitude: 0.04, remplissage: 0, epaisseur: 2 };
    let phase = 0;
    let dernierTemps = performance.now();
    let image = 0;

    const boucle = (maintenant: number) => {
      const t = maintenant / 1000;
      const dt = Math.min(0.05, (maintenant - dernierTemps) / 1000);
      dernierTemps = maintenant;
      if (maintenant - derniereLectureCouleur > 1000) {
        derniereLectureCouleur = maintenant;
        const lue = getComputedStyle(document.documentElement).getPropertyValue("--dj-accent-1").trim();
        if (lue) couleur = lue;
      }

      const niveaux = lireNiveauxRef.current?.() ?? { entree: 0, sortie: 0 };
      const cible = aspectCible(etatRef.current, niveaux.entree, niveaux.sortie, t);
      // Les valeurs affichées rejoignent la cible en douceur : jamais de saut brut.
      const lissage = 1 - Math.pow(0.0005, dt);
      etatAffiche.amplitude += (cible.amplitude - etatAffiche.amplitude) * Math.min(1, lissage * 1.5);
      etatAffiche.remplissage += (cible.remplissage - etatAffiche.remplissage) * Math.min(1, lissage);
      etatAffiche.epaisseur += (cible.epaisseur - etatAffiche.epaisseur) * Math.min(1, lissage);
      phase += dt * cible.vitesse * (reduireMouvement ? 0.4 : 1);

      dessin.clearRect(0, 0, largeur, hauteur);
      if (largeur > 0 && hauteur > 0) {
        const milieu = hauteur / 2;
        const hauteurMax = hauteur * (mini ? 0.42 : 0.4);
        const courbes = mini ? COURBES.slice(0, 2) : COURBES;
        const pas = mini ? 3 : 5;
        const epaisseur = mini ? etatAffiche.epaisseur + 0.8 : etatAffiche.epaisseur;
        dessin.lineJoin = "round";
        dessin.lineCap = "round";
        dessin.strokeStyle = couleur;
        dessin.fillStyle = couleur;
        dessin.shadowColor = couleur;
        dessin.shadowBlur = (mini ? 4 : 10) * etatAffiche.remplissage;

        for (const courbe of courbes) {
          const decalage = (y: number, x: number) => {
            const progression = x / largeur;
            const enveloppe = Math.pow(Math.sin(Math.PI * progression), 2);
            const onde = Math.sin(progression * Math.PI * 2 * courbe.frequence + phase * courbe.vitesse * 3 + courbe.phase);
            return y + onde * enveloppe * etatAffiche.amplitude * hauteurMax * (courbe.opacite * 0.6 + 0.4);
          };
          dessin.globalAlpha = courbe.opacite;
          dessin.lineWidth = epaisseur;

          dessin.beginPath();
          for (let x = 0; x <= largeur; x += pas) {
            const y = decalage(milieu, x);
            if (x === 0) dessin.moveTo(x, y);
            else dessin.lineTo(x, y);
          }
          dessin.stroke();

          // Face miroir de la courbe, pour une onde qui respire des deux côtés.
          dessin.beginPath();
          for (let x = 0; x <= largeur; x += pas) {
            const y = 2 * milieu - decalage(milieu, x);
            if (x === 0) dessin.moveTo(x, y);
            else dessin.lineTo(x, y);
          }
          dessin.stroke();

          if (etatAffiche.remplissage > 0.01) {
            dessin.globalAlpha = courbe.opacite * 0.16 * etatAffiche.remplissage;
            dessin.beginPath();
            for (let x = 0; x <= largeur; x += pas) {
              const y = decalage(milieu, x);
              if (x === 0) dessin.moveTo(x, y);
              else dessin.lineTo(x, y);
            }
            for (let x = largeur; x >= 0; x -= pas) dessin.lineTo(x, 2 * milieu - decalage(milieu, x));
            dessin.closePath();
            dessin.fill();
          }
        }
        dessin.globalAlpha = 1;
        dessin.shadowBlur = 0;
      }
      image = requestAnimationFrame(boucle);
    };
    image = requestAnimationFrame(boucle);

    return () => {
      cancelAnimationFrame(image);
      observateur.disconnect();
    };
  }, [mini]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className ?? "h-full w-full"} />;
}
