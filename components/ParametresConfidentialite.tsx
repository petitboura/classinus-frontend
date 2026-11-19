"use client";

import { useState } from "react";
import { ChampMotDePasse } from "./ChampMotDePasse";
import { supabase } from "@/lib/supabase";

// 19/09/2026, demande Bourama : ancien écran "confidentialite" d'EspaceParametres.tsx.
// Aucune donnée à charger (pas de dépendance à ProfilMoi), contenu et
// logique inchangés.
export function ParametresConfidentialite() {
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [enregistrementMotDePasse, setEnregistrementMotDePasse] = useState(false);
  const [messageMotDePasse, setMessageMotDePasse] = useState<string | null>(null);
  const [erreurMotDePasse, setErreurMotDePasse] = useState<string | null>(null);

  async function changerMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    setErreurMotDePasse(null);
    setMessageMotDePasse(null);
    if (motDePasse.length < 6) {
      setErreurMotDePasse("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (motDePasse !== confirmationMotDePasse) {
      setErreurMotDePasse("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setEnregistrementMotDePasse(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: motDePasse });
      if (error) throw error;
      setMessageMotDePasse("Mot de passe mis à jour.");
      setMotDePasse("");
      setConfirmationMotDePasse("");
    } catch (e: any) {
      setErreurMotDePasse(e?.message || "Impossible de mettre à jour le mot de passe, réessaie.");
    } finally {
      setEnregistrementMotDePasse(false);
    }
  }

  return (
    <form onSubmit={changerMotDePasse} className="flex flex-col gap-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
      <p className="text-sm text-dj-texte-muet">Change le mot de passe de ton compte.</p>
      <ChampMotDePasse
        id="nouveau-mdp"
        label="Nouveau mot de passe"
        value={motDePasse}
        onChange={setMotDePasse}
        autoComplete="new-password"
      />
      <ChampMotDePasse
        id="confirmation-mdp"
        label="Confirme le mot de passe"
        value={confirmationMotDePasse}
        onChange={setConfirmationMotDePasse}
        autoComplete="new-password"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enregistrementMotDePasse || !motDePasse}
          className="self-start rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2 text-sm font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
        >
          {enregistrementMotDePasse ? "Mise à jour…" : "Mettre à jour le mot de passe"}
        </button>
        {messageMotDePasse && <span className="text-sm text-dj-texte-muet">{messageMotDePasse}</span>}
      </div>
      {erreurMotDePasse && <p className="text-sm text-[var(--dj-erreur)]">{erreurMotDePasse}</p>}
    </form>
  );
}
