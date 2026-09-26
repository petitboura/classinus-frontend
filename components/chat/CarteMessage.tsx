"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { MapPin, ExternalLink } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Rend un bloc ```carte du markdown -- convention : JSON
//   { "lat": number, "lng": number, "label"?: string }
//
// CORRECTIF 2026-09-26 (demande Bourama) : avant, pas de tuiles
// cartographiques interactives ici -- ca avait ete laisse de cote car ca
// semblait demander une cle API (Mapbox/Google Maps JS) avec facturation
// potentielle. En fait pas necessaire : tuiles OpenStreetMap (gratuites,
// libres, attribution obligatoire seulement) via `leaflet` en import
// dynamique cote client uniquement (leaflet touche `window` au chargement
// du module, donc un import statique casserait le rendu serveur/SSR).
type Lieu = { lat: number; lng: number; label?: string };

export function CarteMessage({ code }: { code: string }) {
  const [lieu, setLieu] = useState<Lieu | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const carteRef = useRef<LeafletMap | null>(null);

  // CORRECTIF 2026-07-30 (audit UX, meme principe que GraphiqueDonnees.tsx
  // et Mermaid.tsx) : avant, un JSON reellement casse (pas juste encore en
  // train d'arriver pendant le streaming) affichait "Localisation du
  // lieu..." pour toujours, sans jamais de message d'erreur. On attend
  // desormais que le texte arrete de changer pendant 500ms avant de
  // tenter le parsing -- un echec a ce moment-la est une vraie erreur.
  useEffect(() => {
    const delai = setTimeout(() => {
      try {
        setLieu(JSON.parse(code));
        setErreur(null);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : String(e));
      }
    }, 500);
    return () => clearTimeout(delai);
  }, [code]);

  const lieuValide =
    lieu && typeof lieu.lat === "number" && typeof lieu.lng === "number" ? lieu : null;

  // Initialisation/mise a jour de la carte Leaflet une fois le lieu connu.
  useEffect(() => {
    if (!lieuValide || !conteneurRef.current) return;

    let annule = false;

    import("leaflet").then((L) => {
      if (annule || !conteneurRef.current) return;

      // Icones par defaut de Leaflet servies depuis un CDN plutot que via
      // les assets webpack (resout systematiquement de travers dans les
      // projets Next.js) -- import dynamique, donc jamais execute cote
      // serveur.
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!carteRef.current) {
        carteRef.current = L.map(conteneurRef.current, {
          scrollWheelZoom: false, // evite de pieger le scroll de la page
        }).setView([lieuValide.lat, lieuValide.lng], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(carteRef.current);
      } else {
        carteRef.current.setView([lieuValide.lat, lieuValide.lng], 13);
      }

      carteRef.current.eachLayer((couche) => {
        if ((couche as L.Marker).getLatLng) carteRef.current?.removeLayer(couche);
      });

      const marqueur = L.marker([lieuValide.lat, lieuValide.lng]).addTo(carteRef.current);
      if (lieuValide.label) marqueur.bindPopup(lieuValide.label);
    });

    return () => {
      annule = true;
    };
  }, [lieuValide?.lat, lieuValide?.lng, lieuValide?.label]);

  // Nettoyage de l'instance Leaflet au demontage du composant.
  useEffect(() => {
    return () => {
      carteRef.current?.remove();
      carteRef.current = null;
    };
  }, []);

  if (!lieu) {
    if (erreur) {
      return (
        <div className="my-3 flex h-20 items-center gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-4 text-xs text-dj-texte-muet">
          <span className="text-[var(--dj-erreur)]">Carte invalide :</span> format JSON non reconnu.
        </div>
      );
    }
    return (
      <div className="my-3 flex h-20 items-center gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-4 text-xs text-dj-texte-muet">
        <span className="h-2 w-2 animate-dj-glow rounded-full bg-dj-texte-muet" />
        Localisation du lieu...
      </div>
    );
  }

  if (!lieuValide) {
    return (
      <div className="my-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4 text-xs text-dj-texte-muet">
        Coordonnees invalides.
      </div>
    );
  }

  const urlMaps = `https://www.google.com/maps/search/?api=1&query=${lieuValide.lat},${lieuValide.lng}`;

  return (
    <div className="my-3 animate-dj-fade-in overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
      <div ref={conteneurRef} className="h-56 w-full" />
      <a
        href={urlMaps}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 border-t border-dj-bordure p-3 transition-colors hover:bg-dj-surface-haute"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dj-surface-haute text-dj-texte">
          <MapPin size={16} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-dj-texte">{lieuValide.label || "Lieu"}</span>
          <span className="block text-xs text-dj-texte-muet">
            {lieuValide.lat.toFixed(5)}, {lieuValide.lng.toFixed(5)}
          </span>
        </span>
        <ExternalLink size={14} className="text-dj-texte-muet" />
      </a>
    </div>
  );
}
