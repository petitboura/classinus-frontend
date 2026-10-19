"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import { Smartphone, QrCode, Download, Share, MonitorDown } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { detecterAppareil, type AppareilTelechargement } from "@/lib/telechargementPc";

// Créé le 30/08/2026, audit navigation web mobile vs natif, étape 4.
// Complété le 08/09/2026, demande Bourama : sur PC, /telecharger n'offre
// plus de bouton "Télécharger l'APK" direct (voir cette page) mais un QR
// à scanner -- le CTA "Télécharger l'app" y menait tel quel serait
// trompeur (on ne télécharge rien en cliquant depuis un PC). Détection
// légère (même pattern que BoutonFlottantTelecharger.tsx) juste pour ce
// texte, le lien pointe dans les deux cas vers /telecharger qui gère la
// vraie logique d'affichage selon l'appareil.
//
// Complété une seconde fois le même jour : /telecharger distingue
// maintenant aussi iOS (pas d'APK, parcours PWA "Partager > Sur l'écran
// d'accueil", voir cette page) -- "Télécharger l'app" y était tout aussi
// trompeur sur iPhone que sur PC. Trois textes désormais, pas deux.
//
// Message uniforme pour les écrans qui dépendent d'un plugin natif sans
// équivalent web (Contrôle de session, Temps d'écran, Accessibilité,
// Rappels). usePluginNatif.ts ne distingue pas PC et navigateur mobile
// (natif vaut false dans les deux cas), donc ce même bandeau couvre les
// deux à la fois, conformément à la règle de l'audit : une fonction
// disponible seulement sur mobile (natif ou web) ne doit jamais
// apparaître sur PC. Avant cette étape, chacun des 4 écrans écrivait son
// propre texte à la main (repéré comme source de divergence de ton lors
// de l'audit) : un seul endroit désormais, avec en plus un vrai lien
// vers /telecharger plutôt qu'une simple phrase informative.
//
// Complété le 19/10/2026, demande Bourama : un navigateur sur Windows voit
// maintenant "Télécharger pour Windows" (l'installeur de l'appli PC existe,
// voir /telecharger). Dans l'appli PC déjà installée, on garde l'ancien
// texte "pc" : proposer de télécharger ce qu'on est en train d'utiliser
// serait trompeur. Mac et Linux restent sur le QR.
export function BandeauTelechargerApp({ titre }: { titre: string }) {
  const [appareil, setAppareil] = useState<AppareilTelechargement | null>(null);

  useEffect(() => {
    const detecte = detecterAppareil(navigator.userAgent);
    const dansUnNavigateur = Capacitor.getPlatform() === "web";
    setAppareil(detecte === "windows" && !dansUnNavigateur ? "pc" : detecte);
  }, []);

  const CTA: Record<AppareilTelechargement, { icone: typeof Download; texte: string }> = {
    android: { icone: Download, texte: "Télécharger l'app" },
    ios: { icone: Share, texte: "Installer l'app" },
    windows: { icone: MonitorDown, texte: "Télécharger pour Windows" },
    pc: { icone: QrCode, texte: "Scanner avec ton téléphone" },
  };

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col items-center gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-6 text-center">
      <Smartphone size={22} className="text-dj-texte-muet" />
      <p className="text-sm text-dj-texte-muet">{titre} a besoin de l&apos;app Classinus pour fonctionner.</p>
      <Link
        href="/telecharger"
        aria-label="Accéder à l'application Classinus"
        className="mt-1 flex h-[26px] items-center gap-2 rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2"
      >
        {appareil === null ? (
          <Skeleton as="span" className="h-3 w-28 rounded" />
        ) : (
          (() => {
            const Icone = CTA[appareil].icone;
            return (
              <span className="flex animate-dj-fade-in-rapide items-center gap-2">
                <Icone size={14} />
                {CTA[appareil].texte}
              </span>
            );
          })()
        )}
      </Link>
    </div>
  );
}
