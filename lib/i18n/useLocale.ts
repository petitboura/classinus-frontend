"use client";

import { useEffect, useState } from "react";
import {
  EVENEMENT_LOCALE_CLASSINUS,
  obtenirLocale,
  type Locale,
} from "@/lib/i18n/locale";

/** Hook réactif à la préférence de langue et à son changement depuis le sélecteur global. */
export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("fr");

  useEffect(() => {
    setLocale(obtenirLocale());

    const changer = (event: Event) => {
      const detail = (event as CustomEvent<Locale>).detail;
      setLocale(detail === "en" ? "en" : "fr");
    };
    const synchroniserAutreOnglet = (event: StorageEvent) => {
      if (event.key === "classinus.locale") {
        setLocale(event.newValue === "en" ? "en" : "fr");
      }
    };

    window.addEventListener(EVENEMENT_LOCALE_CLASSINUS, changer);
    window.addEventListener("storage", synchroniserAutreOnglet);
    return () => {
      window.removeEventListener(EVENEMENT_LOCALE_CLASSINUS, changer);
      window.removeEventListener("storage", synchroniserAutreOnglet);
    };
  }, []);

  return locale;
}
