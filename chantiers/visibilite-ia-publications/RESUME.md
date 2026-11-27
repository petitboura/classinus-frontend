# Visibilité de Classinus auprès de ChatGPT et des IA : publications

- **Statut** : en cours. Le 27/11 Bourama a confirmé avoir publié LinkedIn, Indie Hackers, Product Hunt, Hashnode, Dev.to, Threads, Bluesky et Peerlist (liens non fournis). Reste l'e-mail aux médias, BetaList, DevHunt, les annuaires et les groupes Telegram et WhatsApp. Point à clarifier : (le 26/11 Bourama a publié le Show HN et préparé Hashnode et BetaList en disant honnêtement que le paiement et certains modèles ne sont pas encore ouverts ; la règle « rien de plus tant que ce n'est pas réel » du 25/11 est à reconfirmer)
- **Dernière mise à jour** : 2026-11-27
- **Dépôts concernés** : classinus-frontend (README, pages publiques /decouvrir), petitboura/petitboura (nouveau dépôt de profil GitHub), Supabase (lecture seule pour vérifier les modèles et les paliers), Hashnode, Bing Webmaster Tools, BetaList (services externes)
- **Branche(s)** : aucune, c'est un travail de publication et pas de code

## Le but, en langage clair
Que ChatGPT et les autres IA connaissent Classinus, sachent à qui il s'adresse, et le recommandent. Bourama ne veut pas une liste d'annuaires, il veut des sources lues par les IA : réseaux, médias, GitHub.

## Publications confirmées par Bourama le 27/11
Bourama a dit que tout cela est publié. Les liens ne sont pas dans le dossier : à ajouter quand il les donne.
- LinkedIn : publié (texte `textes/linkedin-fr.md`).
- Indie Hackers : publié.
- Product Hunt : publié.
- Hashnode : publié (blog Classinus, article `textes/hashnode-article-en.md`).
- Dev.to : publié.
- Threads : publié.
- Bluesky : publié.
- Peerlist : publié.
- Déjà confirmés avant, sans lien non plus : X et Facebook (dits par Bourama), Show HN du 25/11 (toujours en ligne ou non : à confirmer).

## Ce qui est déjà fait
- README de profil GitHub créé et en ligne : https://github.com/petitboura/petitboura (vérifié le 25/11).
- Texte de présentation pour LinkedIn rédigé, avec une image de couverture 1200 x 627 : voir `textes/linkedin-fr.md` et `images/classinus-couverture-linkedin.png`.
- Texte pour Reddit rédigé en anglais : voir `textes/reddit-en.md`. Un premier post a été publié le 25/11 avec le compte u/Bouramani et **retiré tout de suite par les filtres automatiques de Reddit**. Il n'est plus en ligne.
- E-mail de présentation aux médias africains rédigé en français et en anglais : voir `textes/email-medias-fr.md` et `textes/email-medias-en.md`. **Non envoyé.**
- Contacts média trouvés sur leurs sites officiels le 25/11 : TechCabal, editor@techcabal.com (tips et pitches) ; Techpoint Africa, startups@techpoint.africa (présenter une startup).
- Show HN (Hacker News) : publié le 25/11 avec l'adresse https://classinus.com. Le texte d'ouverture a été collé dans le champ texte puis la publication a été confirmée correcte (adresse et commentaire en place). Le commentaire dit honnêtement que les crédits manquent pour certains grands modèles et que le paiement n'est pas encore ouvert. Voir `textes/show-hn-en.md`. Titre exact publié : à confirmer.
- Bing Webmaster Tools : site ajouté. La page /decouvrir est connue de Bing (découverte le 21/11) mais refusée à l'exploration, sans raison précise donnée. Demande d'indexation faite le 26/11. Voir `constats/bing-et-robots-2026-11-26.md`.
- Vérifié dans le code le 26/11 : `robots.txt` autorise OAI-SearchBot, ChatGPT-User et GPTBot, un sitemap et un fichier `llms.txt` existent.
- Annuaires d'outils IA : vérifiés et mis de côté. Futurepedia est payant (aucune soumission gratuite). There's An AI For That : gratuit ou payant selon les sources, à confirmer. Toolify et AlternativeTo : non confirmés.
- Hashnode : blog « Classinus » en cours de création (nom, adresse classinus.hashnode.dev à confirmer, logo, favicon, image d'aperçu en anglais, titre et description SEO, barre de navigation avec 4 liens externes). Premier article rédigé en anglais, à publier : voir `textes/hashnode-article-en.md`. Il est publié sous le nom de Bourama dans le blog Classinus.
- BetaList : dossier de soumission prêt (`textes/betalist-submission.json`) mais **non envoyé** : l'environnement de l'IA ne pouvait pas joindre betalist.com. La publication y est payante (Lite, Standard, Premium) et c'est Bourama qui doit ouvrir le lien de validation et payer.

## Ce qui reste à faire
1. Ouvrir réellement le paiement par Orange Money et Wave (voir `constats/etat-reel-2026-11-25.md`).
2. Ouvrir réellement Claude, GPT, Gemini et Grok, ou retirer ces noms des textes.
3. (Fait le 27/11) LinkedIn publié.
4. Reddit : donner un historique au compte, répondre à des fils existants du type « comment payer Claude ou ChatGPT depuis l'Afrique », ne pas remettre le même texte, ne pas mettre de lien dans le corps d'un nouveau post, lire les règles du sous-forum.
5. Envoyer l'e-mail aux médias, avec un compte de test déjà débloqué, une fois les points 1 et 2 faits.
6. Vidéo YouTube : mise de côté pour l'instant.
7. Tester dans ChatGPT avec la recherche activée « Qu'est-ce que Classinus ? », maintenant, puis dans 4 à 6 semaines.
8. Bing : suivre la demande d'indexation de /decouvrir ; vérifier dans Vercel (Firewall) que « Attack Challenge Mode » est désactivé ; regarder le rapport de scan de Bing Webmaster Tools.
9. (Fait le 27/11) Hashnode, Product Hunt, Dev.to, LinkedIn, Indie Hackers, Threads, Bluesky et Peerlist publiés. Reste à récupérer les liens.
10. Pas encore fait : DevHunt, annuaires d'outils IA, groupes Telegram et WhatsApp.
11. Envoyer la soumission BetaList (autoriser betalist.com dans le réseau de l'IA, ou lancer la commande soi-même) et décider de payer ou non.

## Décisions prises par Bourama
- Passer par les réseaux et les publications, pas par les annuaires de produits.
- Cible : les développeurs africains et les IA qui liront le texte.
- Ouvrir le texte sur la douleur : galérer à payer Claude, GPT, Gemini en Afrique.
- Présenter Classinus comme le moyen d'accéder aux modèles les plus puissants avec mobile money et Wave, puis les outils utiles aux développeurs (sandbox, recherche, connecteurs, skills, documents, fichiers joints), puis un seul abonnement pour plusieurs modèles, et un abonnement accessible.
- Pas d'histoire personnelle, pas de nombre d'utilisateurs ni d'ancienneté du projet, pas de bibliothèque, bureau ni concentration.
- Moyens de paiement cités par Bourama : Orange Money, PayPal, cartes Visa et Mastercard, Wave.
- Reddit : gardé uniquement pour être lu et cité par les IA, pas pour convaincre les gens de Reddit.
- Rédiger d'abord en français, puis en anglais.

## Décisions prises par Bourama le 26/11
- Le titre du Show HN doit contenir l'Afrique. Il voulait aussi le mobile money ; l'IA a proposé de l'enlever tant que le paiement n'est pas réel. À confirmer ce qui a été publié.
- Hashnode : publier sous son nom, dans un blog appelé Classinus. Ne pas parler de sa situation personnelle ni du prochain gros chantier. Dire que le plus dur a été de trouver des utilisateurs et de soigner l'interface.
- Il veut que l'IA aille chercher elle-même les réponses dans ses dépôts et ses services au lieu de lui reposer des questions.

## Points ouverts
- Liens des publications du 27/11 (LinkedIn, Indie Hackers, Product Hunt, Hashnode, Dev.to, Threads, Bluesky, Peerlist) : à demander à Bourama.
- DevHunt : le message du 27/11 était coupé à cet endroit, à confirmer si c'est fait.
- Conflit à trancher : la décision du 25/11 dit « pas d'histoire personnelle » et « rien de plus tant que le paiement n'est pas réel », alors que le 26/11 le Show HN et l'article Hashnode ont été préparés en disant honnêtement ce qui manque. Confirmer la règle voulue.
- L'image d'aperçu du site (Open Graph) est en français ; une version anglaise a été créée mais le site ne l'utilise pas encore. Changement du site à faire seulement avec l'accord de Bourama.
- Sur la page des applications connectées, les descriptions de Render et de Vercel sont en français dans l'interface anglaise.
- La page d'accueil envoie presque rien de lisible aux robots (c'est le chat) ; une courte présentation visible par les robots pourrait aider, à décider par Bourama.
- Nom et e-mail de contact à mettre dans la signature de l'e-mail aux médias.
- Sur quel sous-forum Reddit le premier post a été publié : à confirmer.
- Le Show HN est-il toujours en ligne et que disait-il : à confirmer.

## Pour l'IA qui reprend ce chantier
1. Vérifier dans Supabase (tables `fournisseurs_llm` et `modeles_llm`) quels modèles sont vraiment ouverts et lesquels sont « bientôt ».
2. Vérifier dans le code et la doc du frontend (`docs/LISTE_ATTENTE_MODELES.md`, `components/abonnements/ParcoursPaiement.tsx`) si le bouton Payer est connecté ou si le parcours est encore une simulation.
3. Ne jamais écrire dans un texte public une chose qui n'est pas ouverte aujourd'hui : les lecteurs et les journalistes testent, et les IA répètent ce qu'elles lisent.
4. Respecter le style demandé : copywriting orienté vente, sans histoire personnelle.
