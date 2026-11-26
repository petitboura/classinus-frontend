"use client";

import { Download } from "lucide-react";
import { Bouton } from "@/components/Bouton";
import { EtapesInstallation } from "@/components/PanneauInstallation";
import { installerClassinus, useInstallationWeb } from "@/lib/installationWeb";

// Bloc Android de la page /telecharger (25/11/2026) : le bouton ouvre la fenêtre d'installation du téléphone, ou la
// page des étapes ; les étapes restent écrites dessous pour les navigateurs qui ne proposent rien.
export function InstallationAndroid() {
  const { ouvertCommeAppli, dejaInstalle } = useInstallationWeb();

  if (ouvertCommeAppli || dejaInstalle) {
    return <p className="text-sm text-dj-texte-muet">Classinus est déjà installé sur ce téléphone.</p>;
  }

  return (
    <>
      <Bouton onClick={() => void installerClassinus()} className="flex w-full items-center justify-center gap-2">
        <Download size={16} />
        Installer
      </Bouton>
      <div className="mt-4">
        <EtapesInstallation ios={false} />
      </div>
    </>
  );
}
