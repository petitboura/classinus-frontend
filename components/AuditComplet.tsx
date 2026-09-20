"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { MessageSquare, MessagesSquare, Users, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { listerMesCodes, obtenirAuditComplet, type AuditComplet as AuditCompletType, type ElementCompte } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { Skeleton } from "./Skeleton";
import { CTACompteRequis } from "./CTACompteRequis";
import { SelectPersonnalise } from "./SelectPersonnalise";
import { CarteChaleurHeures } from "./CarteChaleurHeures";
import { clesRequetes } from "@/lib/clesRequetes";

// Tableau de bord "Audit complet" d'un code (20/09/2026, demande
// Bourama). Phase 1 : tout ce qui est affiché ici vient de données déjà
// existantes (rattachements, conversations, meta.outils, contenu des
// messages) -- rien de nouveau à tracker. Les points plus lourds (temps
// d'utilisation, niveau des élèves, notions demandées) sont à revoir
// plus tard, volontairement absents d'ici pour ne rien afficher de faux.
//
// Rafraîchissement automatique toutes les 8 secondes (choix de Bourama :
// "le plus simple, celui qui existe déjà" -- react-query déjà utilisé
// partout dans l'app, pas de nouveau système de push/websocket).
const INTERVALLE_RAFRAICHISSEMENT_MS = 8000;
const CLE_DERNIER_CODE = "classinus_audit_dernier_code";

const COULEURS = ["var(--dj-accent-1)", "var(--dj-accent-2)", "var(--dj-code-variable)", "var(--dj-logo-3)", "var(--dj-texte-muet)"];

function lireDernierCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CLE_DERNIER_CODE);
  } catch {
    return null;
  }
}

function ecrireDernierCode(codeId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE_DERNIER_CODE, codeId);
  } catch {
    // silencieux : juste un confort de mémorisation, pas critique
  }
}

function CarteChiffre({
  icone,
  label,
  valeur,
  lienDetail,
}: {
  icone: React.ReactNode;
  label: string;
  valeur: number;
  lienDetail?: { href: string; texte: string };
}) {
  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-1 rounded-xl border border-dj-bordure bg-dj-surface p-4">
      <div className="flex items-center gap-2 text-dj-texte-muet">
        {icone}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold text-dj-texte">{valeur}</p>
      {lienDetail && (
        <Link href={lienDetail.href} className="mt-1 self-start text-[11px] font-medium text-dj-accent-1-texte hover:underline">
          {lienDetail.texte} →
        </Link>
      )}
    </div>
  );
}

function BarresHorizontales({ titre, donnees }: { titre: string; donnees: ElementCompte[] }) {
  if (donnees.length === 0) {
    return (
      <div className="flex h-32 flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-4">
        <p className="text-sm font-semibold text-dj-texte">{titre}</p>
        <div className="flex flex-1 items-center justify-center text-xs text-dj-texte-muet">Rien à afficher pour l&apos;instant.</div>
      </div>
    );
  }
  const donneesTriees = [...donnees].sort((a, b) => a.nombre - b.nombre);
  return (
    <div className="animate-dj-fade-in-rapide rounded-xl border border-dj-bordure bg-dj-surface p-4">
      <p className="mb-2 text-sm font-semibold text-dj-texte">{titre}</p>
      <ResponsiveContainer width="100%" height={Math.max(160, donneesTriees.length * 36)}>
        <BarChart data={donneesTriees} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid stroke="var(--dj-bordure)" horizontal={false} />
          <XAxis type="number" stroke="var(--dj-texte-muet)" fontSize={12} allowDecimals={false} />
          <YAxis type="category" dataKey="nom" stroke="var(--dj-texte-muet)" fontSize={12} width={140} />
          <Tooltip contentStyle={{ background: "var(--dj-surface-haute)", border: "1px solid var(--dj-bordure)" }} />
          <Bar dataKey="nombre" fill="var(--dj-accent-1)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutActifsInactifs({ actifs, inactifs }: { actifs: number; inactifs: number }) {
  const total = actifs + inactifs;
  if (total === 0) {
    return (
      <div className="flex h-full flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-4">
        <p className="text-sm font-semibold text-dj-texte">Élèves rattachés</p>
        <div className="flex flex-1 items-center justify-center text-xs text-dj-texte-muet">Personne n&apos;a encore entré ce code.</div>
      </div>
    );
  }
  const donnees = [
    { name: "Actifs", value: actifs },
    { name: "Inactifs", value: inactifs },
  ];
  return (
    <div className="animate-dj-fade-in-rapide rounded-xl border border-dj-bordure bg-dj-surface p-4">
      <p className="mb-2 text-sm font-semibold text-dj-texte">Élèves rattachés ({total})</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={donnees} dataKey="value" nameKey="name" outerRadius={75} label>
            <Cell fill="var(--dj-succes)" />
            <Cell fill="var(--dj-inactif)" />
          </Pie>
          <Tooltip contentStyle={{ background: "var(--dj-surface-haute)", border: "1px solid var(--dj-bordure)" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TableauDeBord({ audit }: { audit: AuditCompletType }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <CarteChiffre icone={<MessagesSquare size={16} />} label="Conversations" valeur={audit.conversations_total} />
        <CarteChiffre icone={<MessageSquare size={16} />} label="Questions posées" valeur={audit.questions_total} />
        <CarteChiffre icone={<Users size={16} />} label="Élèves actifs" valeur={audit.actifs} />
        <CarteChiffre
          icone={<AlertTriangle size={16} />}
          label="Signalements non traités"
          valeur={audit.signalements_non_traites}
          lienDetail={{ href: "/bureau/signalements", texte: "Détails" }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <CarteChaleurHeures donnees={audit.heures_pointe} />
        <DonutActifsInactifs actifs={audit.actifs} inactifs={audit.inactifs} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <BarresHorizontales titre="Outils les plus utilisés" donnees={audit.outils_top} />
        <BarresHorizontales titre="Affichages les plus utilisés" donnees={audit.visuels_top} />
      </div>
    </div>
  );
}

export function AuditComplet() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [sansCompte, setSansCompte] = useState(false);
  const [codeSelectionne, setCodeSelectionne] = useState<string | null>(null);

  const { data: codes } = useQuery({
    queryKey: clesRequetes.codes,
    queryFn: async () => {
      try {
        return await listerMesCodes();
      } catch (e) {
        if (e instanceof ErreurApi && e.statusCode === 401) setSansCompte(true);
        else setErreur(messageErreur(e));
        return undefined;
      }
    },
  });

  useEffect(() => {
    if (!codes || codes.length === 0) return;
    const dernier = lireDernierCode();
    const dernierValide = dernier && codes.some((c) => c.id === dernier) ? dernier : null;
    setCodeSelectionne((actuel) => actuel ?? dernierValide ?? codes[0].id);
  }, [codes]);

  const { data: audit } = useQuery({
    queryKey: clesRequetes.auditComplet(codeSelectionne ?? ""),
    queryFn: () => obtenirAuditComplet(codeSelectionne as string),
    enabled: Boolean(codeSelectionne),
    refetchInterval: INTERVALLE_RAFRAICHISSEMENT_MS,
    staleTime: 0,
  });

  if (sansCompte) {
    return <CTACompteRequis texte="Crée un compte pour voir le tableau de bord de tes codes." />;
  }

  if (erreur) {
    return <p className="text-sm text-dj-texte-muet">{erreur}</p>;
  }

  if (codes === undefined) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (codes.length === 0) {
    return (
      <div className="flex animate-dj-fade-in-rapide flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-4">
        <p className="text-sm text-dj-texte-muet">Tu n&apos;as pas encore créé de code à partager.</p>
        <Link href="/bureau/codes" className="self-start rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2">
          Créer un code
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SelectPersonnalise
        options={codes.map((c) => ({ id: c.id, label: c.nom || c.code }))}
        valeur={codeSelectionne ?? codes[0].id}
        onChange={(id) => {
          setCodeSelectionne(id);
          ecrireDernierCode(id);
        }}
      />
      {audit ? <TableauDeBord audit={audit} /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
