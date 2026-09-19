import { SectionPage } from "@/components/SectionPage";
import { ListeSections } from "@/components/ListeSections";
import { ScrollText, Brain } from "lucide-react";

const SECTIONS = [
  {
    href: "/comportements",
    label: "Mes skills",
    description: "Des instructions personnalisées que Classinus suit dans le chat",
    Icone: ScrollText,
  },
  {
    href: "/memoire",
    label: "Ma mémoire",
    description: "Ce que Classinus retient de toi entre les conversations",
    Icone: Brain,
  },
];

export default function PagePersonnaliser() {
  return (
    <SectionPage title="Personnaliser Classinus">
      <ListeSections sections={SECTIONS} />
    </SectionPage>
  );
}
