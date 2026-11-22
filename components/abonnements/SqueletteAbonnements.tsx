import { Skeleton } from "@/components/Skeleton";
import { CLASSES_ENVELOPPE_CARTE, CLASSES_GRILLE_PALIERS } from "@/components/chat/CartePalierListeAttente";

// Squelette de la page des abonnements (19/11/2026, demande de Bourama : très précis, icônes comprises).
// Il reprend bloc par bloc ce que la page affiche une fois chargée : les trois cartes de palier
// (components/chat/CartePalierListeAttente.tsx) puis le tableau de comparaison
// (components/abonnements/TableauComparaison.tsx). Les conteneurs gardent les mêmes classes que le vrai
// contenu (grille, espacements, bordures, remplissages) et chaque ligne de texte a la hauteur exacte d'une
// vraie ligne (text-sm : h-5, text-base : h-6, text-lg : h-7, text-2xl : h-8), pour que rien ne saute au
// moment où le contenu arrive. Les icônes (coche de 16 px dans les cartes, coche de 18 px et horloge de 14 px
// dans le tableau) ont leur propre petit bloc à la même taille.
// Les largeurs et les nombres de lignes ci-dessous imitent le contenu réel actuel (3 cartes de 11, 7 et 5 lignes, 16 lignes de
// fonctionnalités, 7 lignes de modèles) ; ce sont des formes, jamais des textes. Si le contenu change
// beaucoup, il suffit d'ajuster ces tableaux.

// Une ligne de texte : une barre arrondie, plus fine que la ligne, centrée dans la hauteur réelle de la ligne.
function Ligne({ largeur, hauteur = "h-5" }: { largeur: string; hauteur?: string }) {
  return (
    <div className={`flex items-center ${hauteur}`}>
      <Skeleton className={`h-3 rounded ${largeur}`} />
    </div>
  );
}

type CarteForme = {
  nom: string;
  accroche: string[];
  titreInclus: boolean;
  inclus: string[][];
};

const CARTES: CarteForme[] = [
  {
    nom: "w-12",
    accroche: ["w-full", "w-1/4"],
    titreInclus: false,
    inclus: [["w-5/6"], ["w-full", "w-1/2"], ["w-2/5"], ["w-1/2"], ["w-full", "w-1/3"], ["w-5/6"], ["w-full", "w-3/5"], ["w-3/4"], ["w-5/6"], ["w-full", "w-1/2"], ["w-4/5"]],
  },
  {
    nom: "w-14",
    accroche: ["w-full", "w-1/3"],
    titreInclus: true,
    inclus: [["w-5/6"], ["w-2/5"], ["w-1/2"], ["w-3/5"], ["w-1/2"], ["w-2/5"], ["w-4/5"]],
  },
  {
    nom: "w-20",
    accroche: ["w-4/5"],
    titreInclus: true,
    inclus: [["w-5/6"], ["w-full", "w-1/2"], ["w-5/6"], ["w-full", "w-1/3"], ["w-3/5"]],
  },
];

function SqueletteCarte({ forme, index }: { forme: CarteForme; index: number }) {
  return (
    <div className={CLASSES_ENVELOPPE_CARTE}>
      <div className="relative flex h-full flex-col gap-5 rounded-2xl border border-dj-bordure p-5">
        {/* Nom (text-2xl) puis courte phrase (text-base, deux lignes de hauteur réservées) */}
        <div className="flex flex-col gap-1">
          <div className="flex h-8 items-center">
            <Skeleton className={`h-6 rounded ${forme.nom}`} />
          </div>
          <div className="min-h-12">
            {forme.accroche.map((largeur, i) => (
              <Ligne key={i} largeur={largeur} hauteur="h-6" />
            ))}
          </div>
        </div>

        {/* Prix en grand (text-4xl) avec « par mois » à côté */}
        <div className="flex items-end gap-1.5">
          <Skeleton className="h-9 w-16 rounded" />
          <div className="flex h-5 items-center">
            <Skeleton className="h-3 w-14 rounded" />
          </div>
        </div>

        {/* Bouton Payer : py-3 et text-base, donc 48 px de haut, sur toute la largeur */}
        <Skeleton className="h-12 w-full rounded-lg" />

        {/* Trait, titre « Tout ce qui est inclus dans... » (place réservée au premier palier sur ordinateur), puis la liste à coches */}
        <div className="flex flex-1 flex-col gap-3 border-t border-dj-bordure pt-5">
          {forme.titreInclus ? (
            <Ligne largeur="w-4/5" />
          ) : (
            index === 0 && <div aria-hidden className="hidden h-5 md:block" />
          )}
          <div className="flex flex-col gap-3">
            {forme.inclus.map((lignes, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-sm" />
                <div className="flex min-w-0 flex-1 flex-col">
                  {lignes.map((largeur, j) => (
                    <Ligne key={j} largeur={largeur} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Valeur d'une cellule du tableau : « icone » (coche de 18 px), « horloge » (horloge de 14 px et mot) ou
// une largeur de texte court.
type Cellule = "icone" | "horloge" | string;

type LigneTableau = {
  // Libellé : une ou plusieurs lignes de texte, ou un début suivi d'une liste d'éléments en dessous.
  lignes?: string[];
  debut?: string;
  liste?: string[];
  cellules: [Cellule, Cellule, Cellule];
};

const TOUS_OUI: [Cellule, Cellule, Cellule] = ["icone", "icone", "icone"];

const SECTION_FONCTIONS: LigneTableau[] = [
  { lignes: ["w-full", "w-2/5"], cellules: TOUS_OUI },
  { lignes: ["w-5/6"], cellules: TOUS_OUI },
  { lignes: ["w-full", "w-3/5"], cellules: TOUS_OUI },
  { lignes: ["w-full", "w-1/4"], cellules: TOUS_OUI },
  { lignes: ["w-full", "w-1/5"], cellules: TOUS_OUI },
  { lignes: ["w-1/2"], cellules: TOUS_OUI },
  { lignes: ["w-11/12"], cellules: TOUS_OUI },
  { lignes: ["w-5/6"], cellules: TOUS_OUI },
  { lignes: ["w-2/5"], cellules: TOUS_OUI },
  { lignes: ["w-5/6"], cellules: TOUS_OUI },
  { lignes: ["w-3/5"], cellules: TOUS_OUI },
  { debut: "w-1/4", liste: ["w-4/5"], cellules: ["w-3/4", "w-3/4", "w-3/4"] },
  { lignes: ["w-1/3"], cellules: ["w-3/4", "w-3/4", "w-5/6"] },
  { lignes: ["w-1/2"], cellules: ["w-1/3", "icone", "icone"] },
  { lignes: ["w-full", "w-1/3"], cellules: ["w-1/3", "icone", "icone"] },
  { lignes: ["w-3/5"], cellules: ["horloge", "horloge", "horloge"] },
];

const SECTION_MODELES: LigneTableau[] = [
  { debut: "w-2/5", liste: ["w-full", "w-1/3"], cellules: ["w-1/4", "w-5/6", "w-5/6"] },
  { debut: "w-1/4", liste: ["w-full", "w-1/2"], cellules: ["w-5/6", "w-5/6", "w-5/6"] },
  { debut: "w-1/3", liste: ["w-full", "w-2/5"], cellules: ["w-5/6", "w-5/6", "w-5/6"] },
  { debut: "w-1/6", liste: ["w-full", "w-3/5"], cellules: ["w-5/6", "w-5/6", "w-5/6"] },
  { debut: "w-2/5", liste: ["w-full", "w-1/2"], cellules: TOUS_OUI },
  { lignes: ["w-full", "w-1/2"], cellules: TOUS_OUI },
  { lignes: ["w-full", "w-1/6"], cellules: TOUS_OUI },
];

// Mêmes colonnes que le vrai tableau : une colonne de libellés plus large, puis une colonne par palier.
const COLONNES = { gridTemplateColumns: "minmax(0,1.6fr) repeat(3, minmax(0,1fr))" };

function SqueletteCellule({ valeur }: { valeur: Cellule }) {
  if (valeur === "icone") {
    return (
      <div className="flex h-5 items-center sm:h-6">
        <Skeleton className="h-[18px] w-[18px] rounded-sm" />
      </div>
    );
  }
  if (valeur === "horloge") {
    return (
      <div className="flex h-5 items-center gap-1 sm:h-6">
        <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-full" />
        <Skeleton className="h-3 w-12 rounded" />
      </div>
    );
  }
  return <Ligne largeur={valeur} hauteur="h-5 sm:h-6" />;
}

function SqueletteSection({ titre, lignes }: { titre: string; lignes: LigneTableau[] }) {
  return (
    <div className="flex flex-col text-sm sm:text-base">
      {/* Ligne de titre : le titre de la section (text-lg sm:text-xl) puis le nom de chaque palier (gras) */}
      <div className="grid items-end gap-x-3 border-b border-dj-bordure-forte pb-3" style={COLONNES}>
        <div className="flex h-7 items-center">
          <Skeleton className={`h-5 rounded ${titre}`} />
        </div>
        {["w-8", "w-8", "w-12"].map((largeur, i) => (
          <Ligne key={i} largeur={largeur} hauteur="h-5 sm:h-6" />
        ))}
      </div>

      {lignes.map((ligne, i) => (
        <div key={i} className="grid items-start gap-x-3 border-b border-dj-bordure py-3" style={COLONNES}>
          <div className="min-w-0">
            {ligne.lignes?.map((largeur, j) => (
              <Ligne key={j} largeur={largeur} hauteur="h-5 sm:h-6" />
            ))}
            {ligne.debut && (
              <>
                <Ligne largeur={ligne.debut} hauteur="h-5 sm:h-6" />
                <div className="mt-1">
                  {ligne.liste?.map((largeur, j) => (
                    <Ligne key={j} largeur={largeur} hauteur="h-5 sm:h-6" />
                  ))}
                </div>
              </>
            )}
          </div>
          {ligne.cellules.map((valeur, j) => (
            <div key={j} className="min-w-0">
              <SqueletteCellule valeur={valeur} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Rangée des entreprises sous le titre (components/abonnements/LogosEntreprises.tsx) : une ligne de texte
// puis des pastilles arrondies (logo de 20 px et nom). Largeurs de nom et nombre de modèles par entreprise
// imitent le contenu réel actuel (9 entreprises).
const LARGEURS_PASTILLES = ["w-24", "w-28", "w-32", "w-20", "w-28", "w-32", "w-24", "w-24", "w-20"];
const MODELES_PAR_ENTREPRISE = [2, 2, 2, 4, 1, 4, 4, 4, 3];

function SqueletteLogos() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-5 items-center sm:h-6">
        <Skeleton className="h-3 w-64 max-w-full rounded" />
      </div>
      <div className="flex flex-wrap gap-2">
        {LARGEURS_PASTILLES.map((largeur, i) => (
          <Skeleton key={i} className={`h-[34px] rounded-full sm:h-[38px] ${largeur}`} />
        ))}
      </div>
    </div>
  );
}

// Bloc des modèles disponibles (components/abonnements/BlocModeles.tsx) : un titre puis une carte par
// entreprise (logo de 24 px et nom, trait, puis une ligne par modèle avec son petit logo de 18 px).
function SqueletteBlocModeles() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-7 items-center">
        <Skeleton className="h-5 w-48 rounded" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODELES_PAR_ENTREPRISE.map((nb, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-dj-bordure p-4">
            <div className="flex items-center gap-2.5 border-b border-dj-bordure pb-3">
              <Skeleton className="h-6 w-6 shrink-0 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: nb }, (_, j) => (
                <div key={j} className="flex h-5 items-center gap-2.5 sm:h-6">
                  <Skeleton className="h-[18px] w-[18px] shrink-0 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SqueletteAbonnements() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      <SqueletteLogos />

      <div className={CLASSES_GRILLE_PALIERS}>
        {CARTES.map((forme, i) => (
          <SqueletteCarte key={i} forme={forme} index={i} />
        ))}
      </div>

      <div className="flex flex-col gap-10">
        <SqueletteSection titre="w-1/2" lignes={SECTION_FONCTIONS} />
        <SqueletteSection titre="w-3/5" lignes={SECTION_MODELES} />
      </div>

      <SqueletteBlocModeles />
    </div>
  );
}
