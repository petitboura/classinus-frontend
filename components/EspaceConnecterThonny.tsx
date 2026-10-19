"use client";

import { useInfoSection } from "./SectionPage";
import { Capture, EtapeGuide, ValeurACopier } from "./GuideEtapes";

// Guide "Utiliser Classinus dans Thonny" (19/10/2026, demande de Bourama,
// même principe que le guide pour Claude : étapes numérotées avec ses propres
// captures d'écran, dans /public/guide-classinus-thonny/).
//
// L'écran d'autorisation de l'étape 5 est celui du guide pour Claude
// (/public/guide-clovis-claude/6-autoriser-claude.png) : c'est la même page
// Classinus, seul le nom de l'application qui demande l'accès change. Le
// plugin s'enregistre sous le nom "Thonny (Classinus)" (voir connexion.py dans
// le dépôt thonny-classinus).

const NOM_PLUGIN_THONNY = "thonny-classinus";

export function EspaceConnecterThonny() {
  useInfoSection("connecter-thonny");

  return (
    <div className="flex flex-col gap-4">
      <EtapeGuide numero={1} titre="Ouvre la gestion des plug-ins dans Thonny">
        <p>
          Il faut Thonny 5.0 ou une version plus récente. Dans Thonny, clique sur le menu{" "}
          <span className="font-semibold text-dj-texte">Tools</span>, puis sur{" "}
          <span className="font-semibold text-dj-texte">Manage plug-ins...</span>. Si ton Thonny est en français,
          c&apos;est Outils puis Gérer les plugins.
        </p>
        <Capture
          src="/guide-classinus-thonny/1-menu-tools.png"
          largeur={1366}
          hauteur={720}
          alt="Fenêtre de Thonny avec le menu Tools ouvert"
        />
        <Capture
          src="/guide-classinus-thonny/2-manage-plugins.png"
          largeur={226}
          hauteur={144}
          alt="Option Manage plug-ins mise en évidence dans le menu Tools"
          tailleNaturelle
        />
      </EtapeGuide>

      <EtapeGuide numero={2} titre="Cherche le plugin Classinus">
        <p>
          Une fenêtre s&apos;ouvre. Écris le nom ci-dessous dans la case du haut, puis clique sur{" "}
          <span className="font-semibold text-dj-texte">Search on PyPI</span>.
        </p>
        <ValeurACopier valeur={NOM_PLUGIN_THONNY} />
        <Capture
          src="/guide-classinus-thonny/3-recherche-saisie.png"
          largeur={650}
          hauteur={546}
          alt="Fenêtre Thonny plug-ins avec le nom thonny-classinus écrit dans la case de recherche"
        />
        <Capture
          src="/guide-classinus-thonny/4-bouton-search.png"
          largeur={117}
          hauteur={48}
          alt="Bouton Search on PyPI"
          tailleNaturelle
        />
      </EtapeGuide>

      <EtapeGuide numero={3} titre="Installe le plugin">
        <p>
          Dans les résultats, clique sur <span className="font-semibold text-dj-texte">thonny-classinus</span>. Sa
          fiche s&apos;affiche : clique sur le bouton{" "}
          <span className="font-semibold text-dj-texte">Install</span> et attends la fin de l&apos;installation.
          Quand le plugin est déjà installé, la fiche propose à la place{" "}
          <span className="font-semibold text-dj-texte">Upgrade</span> pour le mettre à jour.
        </p>
        <Capture
          src="/guide-classinus-thonny/5-resultat.png"
          largeur={436}
          hauteur={111}
          alt="Résultat de recherche thonny-classinus"
        />
        <Capture
          src="/guide-classinus-thonny/6-details-plugin.png"
          largeur={484}
          hauteur={394}
          alt="Fiche du plugin thonny-classinus avec les boutons Upgrade et Uninstall"
        />
      </EtapeGuide>

      <EtapeGuide numero={4} titre="Redémarre Thonny et ouvre le panneau">
        <p>
          Ferme Thonny puis rouvre-le : c&apos;est obligatoire après l&apos;installation. Clique ensuite sur le menu{" "}
          <span className="font-semibold text-dj-texte">View</span> et choisis{" "}
          <span className="font-semibold text-dj-texte">Classinus</span>. Le panneau apparaît à droite de
          l&apos;éditeur.
        </p>
        <Capture
          src="/guide-classinus-thonny/7-menu-view.png"
          largeur={59}
          hauteur={63}
          alt="Menu View de Thonny"
          tailleNaturelle
        />
        <Capture
          src="/guide-classinus-thonny/8-view-classinus.png"
          largeur={237}
          hauteur={510}
          alt="Menu View de Thonny avec l'entrée Classinus mise en évidence"
          tailleNaturelle
        />
      </EtapeGuide>

      <EtapeGuide numero={5} titre="Connecte ton compte Classinus">
        <p>
          Dans le panneau, clique sur <span className="font-semibold text-dj-texte">Sign in</span> (Se connecter si
          le panneau est en français). Ton navigateur
          s&apos;ouvre sur Classinus. Connecte-toi si besoin, vérifie les accès demandés (l&apos;application
          s&apos;appelle ici <span className="font-semibold text-dj-texte">Thonny (Classinus)</span>), puis clique{" "}
          <span className="font-semibold text-dj-texte">Autoriser</span>. Reviens ensuite dans Thonny : le panneau
          affiche <span className="font-semibold text-dj-texte">Signed in</span>.
        </p>
        <Capture
          src="/guide-clovis-claude/6-autoriser-claude.png"
          largeur={488}
          hauteur={629}
          alt="Écran Classinus d'autorisation d'accès avec la liste des accès demandés"
        />
      </EtapeGuide>

      <EtapeGuide numero={6} titre="C'est prêt : choisis un modèle et pose ta question" dernier>
        <p>
          Clique sur le nom du modèle en haut du panneau pour en choisir un. Écris ensuite ta question, ou utilise les
          boutons sous la conversation : <span className="font-semibold text-dj-texte">Fix my code</span> (Corriger
          mon code) pour corriger, <span className="font-semibold text-dj-texte">Explain this error</span> (Expliquer
          cette erreur) pour comprendre une erreur, <span className="font-semibold text-dj-texte">Send my code</span>{" "}
          (Envoyer mon code) pour envoyer ton programme.
        </p>
        <Capture
          src="/guide-classinus-thonny/9-choix-modele.png"
          largeur={251}
          hauteur={624}
          alt="Liste des modèles du panneau Classinus dans Thonny"
          tailleNaturelle
        />
        <Capture
          src="/guide-classinus-thonny/10-panneau-pret.png"
          largeur={645}
          hauteur={645}
          alt="Panneau Classinus dans Thonny avec une réponse et les boutons d'aide au code"
        />
      </EtapeGuide>
    </div>
  );
}
