"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { MenuProfil } from "@/components/MenuProfil";
import { useMonProfilAffiche } from "@/lib/useMonProfilAffiche";
import { useMiseAJourDisponible } from "@/lib/useMiseAJourDisponible";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { supabase } from "@/lib/supabase";

// Bouton profil placé en tête du menu Plus du téléphone, à la place du titre
// "Plus". Même rôle et même panneau que le bouton profil de la barre latérale
// du chat (MenuProfil.tsx) : photo et nom, puis profil, Paramètres, thème et
// déconnexion. Sans compte, le même bouton "Se connecter" que la barre
// latérale.
//
// Le panneau du profil n'est pas inscrit dans la pile du bouton retour : le
// menu Plus est déjà piloté par un paramètre d'adresse (voir
// MenuHamburgerWeb.tsx), y ajouter une deuxième entrée d'historique brute ferait
// perdre le compte à Next. Retour ferme donc tout le menu Plus, comme avant.
export function ProfilEnteteMenuPlus({
  connecte,
  onNaviguer,
}: {
  connecte: boolean;
  onNaviguer: (href: string) => void;
}) {
  const { avatarUrl, nomAffiche } = useMonProfilAffiche(connecte);
  const { misAJourDisponible } = useMiseAJourDisponible();
  const [deplie, setDeplie] = useState(false);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();

  async function seDeconnecter() {
    await supabase.auth.signOut();
    window.location.href = "/connexion";
  }

  if (!connecte) {
    return (
      <button
        // 19/10/2026 : navigation normale de l'appli, plus de rechargement
        // complet de la page (voir AppSidebar, seDeconnecter).
        onClick={() => onNaviguer("/connexion")}
        aria-label="Se connecter"
        title="Se connecter"
        className="group flex items-center gap-2.5 rounded-xl py-1 pr-2 text-dj-texte transition-colors hover:bg-dj-surface-haute"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface-haute">
          <UserRound size={13} className="text-dj-texte-muet" />
        </span>
        <span className="text-sm font-semibold">Se connecter</span>
      </button>
    );
  }

  return (
    <MenuProfil
      entete
      avatarUrl={avatarUrl}
      nomAffiche={nomAffiche}
      ouverte
      menuOuvert={deplie}
      onBasculerMenu={() => setDeplie((v) => !v)}
      onFermerMenu={() => demarrerFermeture(() => setDeplie(false))}
      enSortieMenu={enSortie}
      pointRouge={misAJourDisponible}
      onNaviguer={onNaviguer}
      onNaviguerVersParametres={() => {}}
      onNaviguerVersProfil={() => {}}
      onSeDeconnecter={seDeconnecter}
    />
  );
}
