# Constats du 2026-11-26 : robots et Bing

Ce fichier dit ce qui était vrai au moment de la vérification. Il peut être dépassé : revérifier avant de s'y fier.

## Dans le code du frontend (vérifié)
- `robots.txt` autorise nommément OAI-SearchBot, ChatGPT-User et GPTBot. Un sitemap existe (mis à jour toutes les heures) ainsi qu'un fichier `llms.txt`.
- Aucun `noindex` ni blocage d'indexation trouvé dans les pages publiques ni dans la configuration.
- La page /decouvrir est écrite côté serveur (texte lisible sans JavaScript), avec titre et description.
- La page d'accueil envoie presque rien de lisible à un robot (c'est le chat). Le seul texte utile est un lien caché vers /decouvrir.

## Chez Bing (vu par Bourama dans Bing Webmaster Tools)
- /decouvrir : découverte le 21/11/2026, exploration refusée avec un message générique (« connue de Bing mais avec des problèmes qui empêchent l'indexation »). Cause exacte non connue. Hypothèses : site récent avec très peu de mentions extérieures, ou protection anti-robots sur Vercel (non vérifiée : l'IA n'avait pas accès à la configuration Vercel de ce projet).
- Demande d'indexation faite.

## Paliers lus dans la base de production (Supabase, projet Clovis)
- Pro 10 $ (crédit 8 $), Max 17 $ (crédit 15 $), Ultra 20 $ (crédit 17 $) ; moyens de paiement prévus : carte, Orange Money, Wave, PayPal. Le paiement réel n'est pas ouvert (liste d'attente).
