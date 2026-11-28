# Chantier : repositionnement des pages Découvrir (28/11/2026)

Objectif de Bourama : Classinus se présente comme le moyen d'accéder aux grands modèles d'IA en Afrique, avec les outils. Plus d'impression d'assistant d'étude ni d'outil de productivité.

## Fait (poussé sur staging puis sur main le 28/11)
- 11 titres de pages Découvrir reformulés, tous à 70 caractères ou moins (les 8 trop longs de l'audit SEO, plus bureau, programme et un titre éducatif).
- Descriptions des pages Bibliothèque et Bibliothèque personnelle réécrites.
- Textes visibles sans vocabulaire d'école : bibliothèque, session, mémoire, skills, Bureau, audit, programme, signalements, usages (« Réviser et étudier » devient « Fiches, QCM et animations »).
- Traductions anglaises mises à jour avec les nouveaux textes (clés et valeurs).
- Règle gardée : les mots « enseignants » restent seulement là où ils décrivent qui a accès à un outil du Bureau.

## Décisions
- Les adresses des pages ne changent pas (ex. /decouvrir/usages/etudier), pour ne pas casser ce que Google a déjà indexé.
- « Apprendre à coder » et la page d'étude restent, reformulées comme un usage parmi d'autres.

## Pas encore fait
- Images sans texte alternatif (27 pages signalées, liste des URL non disponible).
- Backend : mots « étudiant/élève » remplacés par « utilisateur » dans les consignes de l'IA (staging, voir le chantier du même nom dans classinus-backend). Les modes Professeur, Tuteur, Examinateur restent : ce sont des fonctions au choix de l'utilisateur.
- Nom du projet « clovis-frontend » dans la configuration (le README est déjà neutre). Renommer touche les fichiers de verrouillage : à faire seulement si Bourama le veut.
- Textes de l'application hors pages Découvrir (ex. « signalements de tes élèves » dans les écrans du Bureau, noms de boutons « fiche de révision » dans le chat).
- Vérifier en production après passage de staging vers main (adresse et titres vus par Google).

- Sur main, les pages Bibliothèque gardent leur texte déjà nettoyé qui y était (plus récent que celui de staging) ; seul le titre de la bibliothèque personnelle a été raccourci.
