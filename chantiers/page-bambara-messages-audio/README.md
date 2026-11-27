# Chantier : page bambara (Maame), conversation façon WhatsApp

Dernière mise à jour : 27/11/2026. Branche de travail : staging. Statut : en cours, une question de Bourama reste ouverte (point 1).

## Objectif
Page `/bambara` (Maame, appli installable sur maame.classinus.com) pour des personnes qui ne savent ni lire ni écrire. La conversation fonctionne comme sur WhatsApp : ce que la personne dit reste en message audio réécoutable, la voix de l'IA aussi.

## Décisions de Bourama (ne jamais les défaire sans lui demander d'abord)
- Dans chaque message : le vocal en haut, le texte en dessous. Le texte de l'assistant est replié par défaut sur UNE seule ligne (ordinateur et téléphone), sans case autour, avec la même mise en forme déplié (seul le nombre de lignes change). La flèche pointe vers la droite replié, vers le bas déplié (comme dans Claude). Composant : `components/bambara/TexteReplieBambara.tsx`.
- Aucun texte écrit dans la bulle de la personne qui parle. Un message écrit par la personne reste visible tel quel.
- C'est l'IA qui choisit quelles images et vidéos s'affichent : seulement celles dont elle écrit le lien dans sa réponse. Les résultats d'une recherche qu'elle ne cite pas ne s'affichent jamais, miniatures YouTube comprises. Seules les images créées par l'outil `generer_image` s'affichent d'office (`OUTILS_GENERATION_PAGE` dans `lib/pageBambaraVisuels.ts`).
- Une seule bulle audio joue à la fois ; pendant une réécoute le micro est en pause et une réponse qui arrive attend la fin de la réécoute pour être lue.
- Les autres demandes de la page (micro façon WhatsApp, Maame installable, historique, voix ElevenLabs, voix gardées) sont résumées dans la mémoire de Claude et dans `journal.md`.

## Fait dans cette session (tout est sur staging)
- Messages audio : bulle à droite pour la parole de la personne, à gauche pour la voix de l'IA, forme d'onde, durée, avance au toucher (`BulleAudioBambara.tsx`, `lib/audioMessageBambara.ts`). Ce qui a été lu est gardé même si on coupe la voix.
- Vocal en haut puis texte replié, bulle de réponse déjà là en préparation pour que rien ne se décale.
- Plus de texte dans la bulle de la personne ; texte de l'assistant sans case ; flèche vers la droite replié.
- L'IA choisit les images et vidéos (`lib/pageBambara.ts` : les résultats de recherche ne servent qu'à compléter ce que l'IA cite).
- Miniatures YouTube qui s'affichaient toutes seules : le serveur annonce comme « fichier généré » toute adresse d'image trouvée dans le résultat d'un outil (`_extraire_fichiers_generes`, `core/execution_outils.py`), donc aussi les miniatures et les images d'une recherche. Côté page, seuls les fichiers de l'outil `generer_image` sont montrés (`visuelsDepuisFichiersGeneres`).

## Points ouverts
1. Question de Bourama du 27/11, non résolue : « pourquoi l'IA dit ne pas pouvoir générer d'image ? » sur la page bambara.
   Constats dans le code (rien vérifié en production) :
   - `generer_image` est bien autorisé sur la page (`OUTILS_GENERATION_VISUELLE`, `core/outils_page_bambara.py`) ;
   - mais `est_client_voix_bambara("page_bambara")` est faux (le test du serveur le confirme), donc `OUTILS_TOUJOURS_VOIX_BAMBARA` (recherche web, images, vidéos) n'est pas appliqué à la page, et `generer_image` n'est dans aucune liste « toujours donnée » ;
   - les outils passent par `demander_outils` (chargement à la demande). Hypothèse : l'IA ne voit pas `generer_image` dans sa liste et ne pense pas à le demander, d'où « je ne peux pas générer d'image ».
   À faire : lire la ligne de journal « Outils envoyés au LLM » pour un message `page_bambara` (le serveur tourne sur Coolify, pas sur Railway), puis relire `core/main.py` (zone du filtre d'outils), `core/mcp_tools.py` (filtre par client) et la note `NOTE_PAGE_OUTILS` dans `core/prompt_voix_bambara.py`. Voir aussi `chantiers/page-bambara-messages-audio/README.md` dans classinus-backend.

## Pour reprendre
- Commencer par le point 1.
- Beaucoup d'autres sessions ont modifié la page depuis (réponse en blocs avec un vocal par bloc, Maame, historique, voix ElevenLabs) : relire le code actuel de `PageBambaraClient.tsx` avant toute modification.
- Mettre à jour ce dossier au fil du travail, sans attendre que Bourama le demande.
