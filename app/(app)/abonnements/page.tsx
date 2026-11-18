import { Suspense } from "react";
import { PageAbonnements } from "@/components/abonnements/PageAbonnements";
import { Skeleton } from "@/components/Skeleton";

// Page des abonnements (liste d'attente des modèles grisés). Visible sans compte. Voir
// components/abonnements/PageAbonnements.tsx. Le Suspense est requis par la lecture de l'adresse.
export default function PageAbonnementsRoute() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-10 sm:px-6" aria-hidden>
          <Skeleton className="h-8 w-64 rounded" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <PageAbonnements />
    </Suspense>
  );
}
