import { Suspense } from "react";
import { SectionPage } from "@/components/SectionPage";
import { ParametresAide } from "@/components/ParametresAide";
import { groupeParametres } from "@/lib/sectionsParametres";

// Suspense requis : ParametresAide lit useSearchParams (?aide=<id>), comme
// le faisait l'ancien EspaceParametres.tsx en entier.
export default function PageParametresAide() {
  return (
    <SectionPage title="Aide et support" groupe={groupeParametres()}>
      <Suspense fallback={null}>
        <ParametresAide />
      </Suspense>
    </SectionPage>
  );
}
