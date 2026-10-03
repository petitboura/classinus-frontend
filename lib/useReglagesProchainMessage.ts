"use client";

import { useSyncExternalStore } from "react";
import {
  abonnerReglagesProchainMessage,
  lireReglagesProchainMessage,
  reglagesProchainMessageParDefaut,
  type ReglagesProchainMessage,
} from "@/lib/reglagesProchainMessage";

// Lecture réactive des réglages du prochain message (voir lib/reglagesProchainMessage.ts).
export function useReglagesProchainMessage(): ReglagesProchainMessage {
  return useSyncExternalStore(abonnerReglagesProchainMessage, lireReglagesProchainMessage, reglagesProchainMessageParDefaut);
}
