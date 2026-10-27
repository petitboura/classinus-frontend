import type { LucideIcon } from "lucide-react";
import { IconeGmail } from "@/components/icons/IconeGmail";
import { IconeGoogleCalendar } from "@/components/icons/IconeGoogleCalendar";
import { IconeGoogleChat } from "@/components/icons/IconeGoogleChat";
import { IconeGoogleClassroom } from "@/components/icons/IconeGoogleClassroom";
import { IconeGoogleDocs } from "@/components/icons/IconeGoogleDocs";
import { IconeGoogleSheets } from "@/components/icons/IconeGoogleSheets";
import { IconeGoogleSlides } from "@/components/icons/IconeGoogleSlides";
import { IconeCloudflare } from "@/components/icons/IconeCloudflare";
import { IconeNetlify } from "@/components/icons/IconeNetlify";

// Couleur de marque exacte des icones d'outils dessinees en un seul trait
// (27/10/2026, demande Bourama : les icones ne doivent plus etre grisees).
// Valeurs officielles du paquet Simple Icons, le meme que celui d'ou viennent
// les trace des icones.
//
// Les logos dont la couleur officielle est le noir (Notion, GitHub, Vercel,
// Railway, Render, Internet Archive, Microsoft) ne sont pas dans cette liste
// volontairement : un noir fige disparaitrait sur le theme sombre. Ils suivent
// la couleur du texte du theme, comme les icones generiques. Les icones qui
// portent deja leurs propres couleurs (Python, Bash, YouTube, Higgsfield...)
// n'ont pas besoin d'etre listees non plus.
const COULEURS_MARQUE = new Map<unknown, string>([
  [IconeGmail, "#EA4335"],
  [IconeGoogleCalendar, "#4285F4"],
  [IconeGoogleChat, "#34A853"],
  [IconeGoogleClassroom, "#0F9D58"],
  [IconeGoogleDocs, "#4285F4"],
  [IconeGoogleSheets, "#34A853"],
  [IconeGoogleSlides, "#FBBC04"],
  [IconeCloudflare, "#F38020"],
  [IconeNetlify, "#00C7B7"],
]);

/** Couleur de marque de l'icone, ou undefined : l'icone prend alors la couleur du texte du theme. */
export function couleurMarque(Icone: LucideIcon | unknown): string | undefined {
  return COULEURS_MARQUE.get(Icone);
}
