# Visibilité de Classinus auprès de ChatGPT et des IA : publications

- **Statut** : en attente (rien de plus ne doit être publié tant que le paiement par mobile money et l'ouverture des modèles Claude, GPT, Gemini et Grok ne sont pas réels)
- **Dernière mise à jour** : 2026-11-25
- **Dépôts concernés** : classinus-frontend (README, pages publiques /decouvrir), petitboura/petitboura (nouveau dépôt de profil GitHub), Supabase (lecture seule pour vérifier les modèles)
- **Branche(s)** : aucune, c'est un travail de publication et pas de code

## Le but, en langage clair
Que ChatGPT et les autres IA connaissent Classinus, sachent à qui il s'adresse, et le recommandent. Bourama ne veut pas une liste d'annuaires, il veut des sources lues par les IA : réseaux, médias, GitHub.

## Ce qui est déjà fait
- README de profil GitHub créé et en ligne : https://github.com/petitboura/petitboura (vérifié le 25/11).
- Texte de présentation pour LinkedIn rédigé, avec une image de couverture 1200 x 627 : voir `textes/linkedin-fr.md` et `images/classinus-couverture-linkedin.png`.
- Texte pour Reddit rédigé en anglais : voir `textes/reddit-en.md`. Un premier post a été publié le 25/11 avec le compte u/Bouramani et **retiré tout de suite par les filtres automatiques de Reddit**. Il n'est plus en ligne.
- E-mail de présentation aux médias africains rédigé en français et en anglais : voir `textes/email-medias-fr.md` et `textes/email-medias-en.md`. **Non envoyé.**
- Contacts média trouvés sur leurs sites officiels le 25/11 : TechCabal, editor@techcabal.com (tips et pitches) ; Techpoint Africa, startups@techpoint.africa (présenter une startup).
- Show HN (Hacker News) : Bourama dit que c'est déjà fait. L'IA ne l'a pas vérifié.

## Ce qui reste à faire
1. Ouvrir réellement le paiement par Orange Money et Wave (voir `constats/etat-reel-2026-11-25.md`).
2. Ouvrir réellement Claude, GPT, Gemini et Grok, ou retirer ces noms des textes.
3. Publier le texte LinkedIn avec l'image.
4. Reddit : donner un historique au compte, répondre à des fils existants du type « comment payer Claude ou ChatGPT depuis l'Afrique », ne pas remettre le même texte, ne pas mettre de lien dans le corps d'un nouveau post, lire les règles du sous-forum.
5. Envoyer l'e-mail aux médias, avec un compte de test déjà débloqué, une fois les points 1 et 2 faits.
6. Vidéo YouTube : mise de côté pour l'instant.
7. Tester dans ChatGPT avec la recherche activée « Qu'est-ce que Classinus ? », maintenant, puis dans 4 à 6 semaines.
8. À confirmer : robots.txt qui autorise OAI-SearchBot, GPTBot et ChatGPT-User, inscription à Bing Webmaster Tools, sitemap soumis. Cela a été proposé, pas vérifié.

## Décisions prises par Bourama
- Passer par les réseaux et les publications, pas par les annuaires de produits.
- Cible : les développeurs africains et les IA qui liront le texte.
- Ouvrir le texte sur la douleur : galérer à payer Claude, GPT, Gemini en Afrique.
- Présenter Classinus comme le moyen d'accéder aux modèles les plus puissants avec mobile money et Wave, puis les outils utiles aux développeurs (sandbox, recherche, connecteurs, skills, documents, fichiers joints), puis un seul abonnement pour plusieurs modèles, et un abonnement accessible.
- Pas d'histoire personnelle, pas de nombre d'utilisateurs ni d'ancienneté du projet, pas de bibliothèque, bureau ni concentration.
- Moyens de paiement cités par Bourama : Orange Money, PayPal, cartes Visa et Mastercard, Wave.
- Reddit : gardé uniquement pour être lu et cité par les IA, pas pour convaincre les gens de Reddit.
- Rédiger d'abord en français, puis en anglais.

## Points ouverts
- Nom et e-mail de contact à mettre dans la signature de l'e-mail aux médias.
- Sur quel sous-forum Reddit le premier post a été publié : à confirmer.
- Le Show HN est-il toujours en ligne et que disait-il : à confirmer.

## Pour l'IA qui reprend ce chantier
1. Vérifier dans Supabase (tables `fournisseurs_llm` et `modeles_llm`) quels modèles sont vraiment ouverts et lesquels sont « bientôt ».
2. Vérifier dans le code et la doc du frontend (`docs/LISTE_ATTENTE_MODELES.md`, `components/abonnements/ParcoursPaiement.tsx`) si le bouton Payer est connecté ou si le parcours est encore une simulation.
3. Ne jamais écrire dans un texte public une chose qui n'est pas ouverte aujourd'hui : les lecteurs et les journalistes testent, et les IA répètent ce qu'elles lisent.
4. Respecter le style demandé : copywriting orienté vente, sans histoire personnelle.
