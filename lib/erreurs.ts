/**
 * Traduction des erreurs API par code stable (voir
 * djiguigne-backend/core/erreurs.py:MESSAGES_FR pour la source de vérité
 * côté backend -- les codes doivent rester synchronisés des deux côtés).
 *
 * La locale courante est choisie dans lib/i18n/locale.ts. Les deux dictionnaires
 * gardent les mêmes codes pour assurer un comportement cohérent en français
 * et en anglais.
 */

import { obtenirLocale } from "@/lib/i18n/locale";
export type Locale = "fr" | "en";

export const LOCALE_ACTIVE: Locale = "fr";

export const MESSAGES: Record<Locale, Record<string, string>> = {
  fr: {
    PRECISE_MATIERE_AUTRE: "Précise la matière dans \"Autre\".",
    // 20/09/2026, minuteurs du chat : codes à garder synchronisés avec
    // core/erreurs.py côté backend (voir core/minuteurs.py).
    MINUTEUR_DUREE_INVALIDE: "Cette durée de minuteur n'est pas valide.",
    MINUTEUR_INTROUVABLE: "Ce minuteur est introuvable.",
    MINUTEUR_DEJA_TERMINE: "Ce minuteur est déjà terminé ou arrêté.",
    MINUTEUR_ECHEC: "Impossible de mettre à jour ce minuteur pour le moment.",
    // 07/10/2026, vidéo d'une animation du chat : codes à garder synchronisés
    // avec core/erreurs.py côté backend (voir core/rendu_animation_travaux.py).
    RENDU_VIDEO_FORMAT_INVALIDE: "Ce format de vidéo n'existe pas.",
    RENDU_VIDEO_DOCUMENT_INVALIDE: "Cette animation ne peut pas être convertie en vidéo.",
    RENDU_VIDEO_DOCUMENT_TROP_LOURD: "Cette animation est trop lourde pour être convertie en vidéo.",
    RENDU_VIDEO_DEJA_EN_COURS: "Une vidéo est déjà en cours de création pour toi. Attends qu'elle soit prête.",
    RENDU_VIDEO_OCCUPE: "Beaucoup de vidéos sont en cours de création, réessaie dans un instant.",
    RENDU_VIDEO_INTROUVABLE: "Cette vidéo est introuvable ou n'est plus disponible.",
    RENDU_VIDEO_PAS_PRETE: "Cette vidéo n'est pas encore prête.",
    RENDU_VIDEO_ANIMATION_EN_ERREUR: "L'animation contient une erreur, la vidéo ne peut pas être créée.",
    RENDU_VIDEO_TROP_LONGUE: "Cette animation est trop longue pour être convertie en vidéo (2 minutes maximum).",
    RENDU_VIDEO_INDISPONIBLE: "La création de vidéo n'est pas disponible pour le moment.",
    RENDU_VIDEO_ECHEC: "La création de la vidéo a échoué, réessaie.",
    PRECISE_LA_VALEUR_POUR: "Précise la valeur pour {libelle}.",
    EST_DEJA_PRISE_PAR_UNE: "{libelle} est déjà prise.",
    AUCUNE_FORMULE_DETECTEE_DANS_CETTE_IMAGE: "Aucune formule détectée dans cette image.",
    AUCUN_TEXTE_TROUVE_DOCUMENT_SCANNE_IMAGE: "Aucun texte trouvé (document scanné/image sans OCR ?).",
    AUDIO_TROP_LONG_20_MO_MAX: "Audio trop long (20 Mo max).",
    CATEGORIE_INCONNUE: "Catégorie inconnue.",
    CIBLE_DU_SIGNALEMENT_MANQUANTE: "Précise le document ou l'emplacement concerné.",
    CONTENU_LEGAL_INTROUVABLE: "Contenu légal introuvable.",
    TYPE_DE_SIGNALEMENT_INVALIDE: "Type de signalement invalide.",
    MOTIF_REQUIS: "Précise le motif du signalement.",
    COORDONNEES_PLAIGNANT_REQUISES: "Ton nom et ton email sont requis.",
    DECLARATION_SUR_L_HONNEUR_REQUISE: "La déclaration sur l'honneur est requise.",
    PAS_LE_DROIT_ADMIN: "Réservé aux administrateurs.",
    ACTION_INVALIDE: "Action invalide.",
    SIGNALEMENT_INTROUVABLE: "Signalement introuvable.",
    SIGNALEMENT_DEJA_TRAITE: "Ce signalement a déjà été traité.",
    CETTE_MATIERE_EST_DEJA_PRISE_PAR: "Cette matière est déjà prise.",
    CE_DOCUMENT_N_APPARTIENT_PAS_A: "Ce document n'est pas accessible ici.",
    CONNEXION_INDISPONIBLE: "Connexion à {service} indisponible pour le moment.",
    DOCUMENT_TROP_LOURD_15_MO_MAX: "Document trop lourd (15 Mo max).",
    ECHEC_DE_LA_GENERATION_AUDIO_REESSAIE: "Échec de la génération audio, réessaie.",
    ECHEC_DE_LA_GENERATION_DU_DOCUMENT: "Échec de la génération du document, réessaie.",
    ECHEC_DE_LA_LECTURE_DU_DOCUMENT: "Échec de la lecture du document.",
    ECHEC_DE_LA_TRANSCRIPTION_REESSAIE: "Échec de la transcription, réessaie.",
    ECHEC_DE_L_ENREGISTREMENT_DE_L: "Échec de l'enregistrement de l'abonnement.",
    ECHEC_DE_L_EXPORT_REESSAIE: "Échec de l'export, réessaie.",
    ECHEC_DE_L_EXTRACTION_REESSAIE: "Échec de l'extraction, réessaie.",
    ECHEC_DE_L_UPLOAD_REESSAIE: "Échec de l'upload, réessaie.",
    ECHEC_DU_DESABONNEMENT: "Échec du désabonnement.",
    ERREUR_INCONNUE: "Une erreur est survenue, réessaie dans un instant.",
    ERREUR_RESEAU: "Impossible de joindre Classinus pour le moment. Vérifie ta connexion Internet ; si elle fonctionne, réessaie dans un instant.",
    HTTP_ERREUR_REQUETE: "Les informations envoyées ne sont pas valides. Vérifie les champs puis réessaie.",
    HTTP_ERREUR_AUTORISATION: "Tu n’as pas l’autorisation d’effectuer cette action.",
    HTTP_ERREUR_INTROUVABLE: "Ce contenu est introuvable ou n’est plus disponible. Actualise la page puis réessaie.",
    HTTP_ERREUR_CONFLIT: "Cette action n’est plus possible car les informations ont changé. Actualise la page puis réessaie.",
    HTTP_ERREUR_TROP_DEMANDES: "Trop de demandes en peu de temps. Attends un peu avant de réessayer.",
    HTTP_ERREUR_TIMEOUT: "Le service met trop de temps à répondre. Réessaie dans un instant.",
    HTTP_ERREUR_SERVICE: "Classinus n’a pas pu terminer cette action à cause d’un problème du service. Vérifie le résultat avant de recommencer.",
    HTTP_ERREUR_GENERIQUE: "Classinus n’a pas pu terminer cette action. Réessaie dans un instant.",
    // 18/09/2026, chantier "profil contributeur bibliotheque publique",
    // étapes 5/10 : erreurs des commentaires/compteurs du catalogue public.
    TYPE_ELEMENT_INCONNU: "Type d'élément inconnu.",
    ELEMENT_CATALOGUE_PUBLIC_INTROUVABLE: "Cet élément est introuvable sur la bibliothèque publique.",
    COMMENTAIRE_VIDE: "Le commentaire ne peut pas être vide.",
    PROFIL_PUBLIC_REQUIS_POUR_COMMENTER: "Active ton profil public dans les paramètres pour pouvoir commenter.",
    COMMENTAIRE_INTROUVABLE: "Ce commentaire est introuvable.",
    COMMENTAIRE_NE_T_APPARTIENT_PAS: "Tu ne peux supprimer que tes propres commentaires.",
    ECHEC_DU_STOCKAGE_REESSAIE: "Échec du chargement, réessaie.",
    NOM_DEJA_UTILISE_BIBLIOTHEQUE_PERSO: "Tu as déjà un fichier nommé « {nom} » dans ta bibliothèque. Renomme-le ou remplace l'existant.",
    NOM_DEJA_UTILISE_BIBLIOTHEQUE_PUBLIQUE: "Un document nommé « {nom} » existe déjà dans la bibliothèque publique. Choisis un autre nom.",
    MATIERE_ET_SYSTEM_PROMPT_REQUIS: "La matière et le contenu sont obligatoires.",
    CONTENU_MATIERE_INTROUVABLE: "Contenu introuvable.",
    CODE_INVALIDE: "Ce code ne correspond à aucun contenu.",
    DEJA_RATTACHE_A_CE_CONTENU: "Tu as déjà débloqué ce contenu.",
    RATTACHEMENT_INTROUVABLE: "Rattachement introuvable.",
    COMPORTEMENT_INTROUVABLE: "Skill introuvable.",
    FRONTMATTER_INVALIDE: "Le skill doit commencer par --- et contenir un bloc d'en-tête valide.",
    FRONTMATTER_INCOMPLET: "Le skill doit avoir une description et un corps de texte, tous les deux non vides.",
    TEXTE_REQUIS: "Le texte ne peut pas être vide.",
    FICHIER_AUDIO_VIDE: "Fichier audio vide.",
    FICHIER_VECTORISATION_ECHEC: "« {nom} » n'a pas pu être vectorisé.",
    FICHIER_INTROUVABLE: "Fichier introuvable.",
    CE_FICHIER_NE_T_APPARTIENT_PAS: "Ce fichier ne t'appartient pas.",
    FICHIER_PAS_EN_ECHEC: "Ce fichier n'est pas en échec, rien à réessayer.",
    ENTREE_INTROUVABLE: "Entrée introuvable.",
    CETTE_ENTREE_NE_T_APPARTIENT_PAS: "Cette entrée ne t'appartient pas.",
    ENTREE_PAS_EN_ECHEC: "Cette entrée n'est pas en échec, rien à réessayer.",
    FICHIER_VECTORISE_MAIS_ECHEC_DU_STOCKAGE: "Fichier vectorisé mais échec du stockage en bibliothèque.",
    FICHIER_VIDE: "Fichier vide.",
    FORMAT_NON_SUPPORTE_JPEG_PNG_OU: "Format non supporté (jpeg, png ou webp uniquement).",
    FORMAT_NON_SUPPORTE_MP4_WEBM_OU: "Format non supporté (mp4, webm ou mov uniquement).",
    FORMAT_NON_SUPPORTE_PDF_WORD_DOCX: "Format non supporté (PDF, Word .docx ou Excel .xlsx uniquement).",
    GENERATION_AUDIO_INDISPONIBLE: "La génération audio n'est pas encore disponible.",
    GITHUB_DEPOTS_INDISPONIBLE: "Impossible de récupérer la liste des dépôts.",
    GITHUB_NON_CONNECTE: "Compte GitHub non connecté.",
    NOTION_NON_CONNECTE: "Notion n'est pas encore connecté.",
    NOTION_PAGES_INDISPONIBLE: "Impossible de chercher dans Notion pour le moment.",
    NOTION_BASE_INDISPONIBLE: "Impossible de lire cette base Notion pour le moment.",
    NOTION_BASE_SANS_DATA_SOURCE: "Cette base Notion ne peut pas être lue.",
    NOTION_CREATION_INDISPONIBLE: "Impossible de créer la page Notion pour le moment.",
    NOTION_CONNEXION_ECHEC: "Connexion à Notion impossible.",
    NOTION_URL_AUTORISATION_INDISPONIBLE: "Connexion à Notion indisponible pour le moment.",
    NOTION_RECHERCHE_ECHEC: "Recherche Notion impossible.",
    TITRE_REQUIS: "Donne un titre.",
    IMAGE_TROP_LOURDE_5_MO_MAX: "Image trop lourde (5 Mo max).",
    IMPOSSIBLE_DE_CHARGER_CETTE_CONVERSATION: "Impossible de charger cette conversation.",
    IMPOSSIBLE_DE_MODIFIER_LE_FIL: "Impossible de modifier cette conversation pour le moment.",
    IMPOSSIBLE_DE_SUPPRIMER_LE_FIL: "Impossible de supprimer cette conversation pour le moment.",
    FIL_INTROUVABLE: "Cette conversation est introuvable.",
    TITRE_FIL_INVALIDE: "Le titre de la conversation est invalide (vide ou trop long).",
    IMPOSSIBLE_DE_CHARGER_CET_AGENT_POUR: "Impossible de charger cette conversation pour le moment.",
    IMPOSSIBLE_DE_CHARGER_CE_PROFIL_POUR: "Impossible de charger ce profil pour le moment.",
    MEMOIRE_ELEVE_LECTURE_ECHEC: "Impossible de charger ta mémoire pour le moment.",
    MEMOIRE_ELEVE_EFFACEMENT_ECHEC: "Impossible d'effacer ta mémoire pour le moment.",
    MEMOIRE_ELEVE_CATEGORIE_INCONNUE: "Cette catégorie de mémoire n'existe pas.",
    MEMOIRE_ELEVE_LIGNE_INTROUVABLE: "Cet élément de mémoire n'existe plus.",
    MEMOIRE_ELEVE_EDITION_ECHEC: "Impossible de modifier ta mémoire pour le moment.",
    IMPOSSIBLE_DE_CHARGER_LA_NOTE_POUR: "Impossible de charger la note pour le moment.",
    IMPOSSIBLE_DE_CHARGER_LES_DROITS_POUR: "Impossible de charger les droits pour le moment.",
    IMPOSSIBLE_DE_CHARGER_LES_MATIERES_POUR: "Impossible de charger les matières pour le moment.",
    IMPOSSIBLE_DE_CHARGER_LES_NOTIFICATIONS_POUR: "Impossible de charger les notifications pour le moment.",
    IMPOSSIBLE_DE_CHARGER_LES_OUTILS_DISPONIBLES: "Impossible de charger les outils disponibles pour le moment.",
    IMPOSSIBLE_DE_CHARGER_LE_PROFIL_POUR: "Impossible de charger le profil pour le moment.",
    IMPOSSIBLE_DE_CHARGER_LE_REGISTRE_POUR: "Impossible de charger le registre pour le moment.",
    IMPOSSIBLE_DE_CHARGER_L_AGENT_POUR: "Impossible de charger Classinus pour le moment.",
    IMPOSSIBLE_DE_CHARGER_L_HISTORIQUE: "Impossible de charger l'historique.",
    IMPOSSIBLE_DE_CREER_L_AGENT_ERREUR: "Erreur technique. Réessaie dans un instant.",
    IMPOSSIBLE_DE_LISTER_LA_BIBLIOTHEQUE_POUR: "Impossible de lister la bibliothèque pour le moment.",
    IMPOSSIBLE_DE_LISTER_LES_DOCUMENTS_POUR: "Impossible de lister les documents pour le moment.",
    IMPOSSIBLE_DE_MARQUER_CETTE_NOTIFICATION_COMME: "Impossible de marquer cette notification comme lue.",
    IMPOSSIBLE_DE_MARQUER_LES_NOTIFICATIONS_COMME: "Impossible de marquer les notifications comme lues.",
    IMPOSSIBLE_DE_METTRE_A_JOUR_LE: "Impossible de mettre à jour le profil pour le moment.",
    IMPOSSIBLE_DE_MODIFIER_LES_DROITS_POUR: "Impossible de modifier les droits pour le moment.",
    IMPOSSIBLE_DE_RECUPERER_LE_STATUT: "Impossible de récupérer le statut.",
    IMPOSSIBLE_DE_SUPPRIMER_CE_DOCUMENT: "Impossible de supprimer ce document.",
    IMPOSSIBLE_DE_SUPPRIMER_CE_DOCUMENT_POUR: "Impossible de supprimer ce document pour le moment.",
    IMPOSSIBLE_DE_SUPPRIMER_CE_FICHIER_POUR: "Impossible de supprimer ce fichier pour le moment.",
    IMPOSSIBLE_D_AJOUTER_CE_DOCUMENT_POUR: "Impossible d'ajouter ce document pour le moment.",
    IMPOSSIBLE_D_AJOUTER_CE_FICHIER_POUR: "Impossible d'ajouter ce fichier pour le moment.",
    IMPOSSIBLE_D_ANALYSER_CETTE_VIDEO_REESSAIE: "Impossible d'analyser cette vidéo, réessaie.",
    IMPOSSIBLE_D_ENREGISTRER_LA_NOTE_POUR: "Impossible d'enregistrer la note pour le moment.",
    IMPOSSIBLE_D_ENREGISTRER_LE_PROFIL_POUR: "Impossible d'enregistrer le profil pour le moment.",
    IMPOSSIBLE_D_ENVOYER_CE_RETOUR_POUR: "Impossible d'envoyer ce retour pour le moment.",
    LE_CONTENU_NE_PEUT_PAS_ETRE: "Le contenu ne peut pas être vide.",
    MATIERE_INCONNUE: "Matière inconnue.",
    NOTIFICATIONS_PUSH_INDISPONIBLE: "Les notifications push ne sont pas encore activées.",
    PHOTOS_SUPP_MAXIMUM: "Maximum {maximum} photos supplémentaires en plus de la couverture.",
    PROFIL_INTROUVABLE: "Profil introuvable.",
    PROFIL_MIS_A_JOUR_MAIS_IMPOSSIBLE: "Profil mis à jour mais impossible de le relire pour confirmation.",
    PROFIL_RELECTURE_ECHEC: "Profil mis à jour mais impossible de le relire pour confirmation.",
    RECHERCHE_INDISPONIBLE: "La recherche est indisponible pour le moment.",
    REQUETE_INVALIDE: "La requête envoyée est invalide.",
    RIEN_A_MODIFIER: "Rien à modifier.",
    RIEN_N_A_ETE_COMPRIS_REESSAIE: "Rien n'a été compris, réessaie plus près du micro.",
    SERVICE_INCONNU: "Service « {service} » inconnu.",
    SESSION_EXPIREE: "Ta session a expiré, reconnecte-toi.",
    CONNEXION_REQUISE: "Connecte-toi ou reconnecte-toi pour continuer.",
    SEULS_LES_FICHIERS_PDF_SONT_ACCEPTES: "Seuls les fichiers PDF sont acceptés.",
    TOKEN_INVALIDE: "Ta session n’est plus valide. Reconnecte-toi pour continuer.",
    TOKEN_MANQUANT: "Connecte-toi ou reconnecte-toi pour continuer.",
    TYPE_DE_FICHIER_NON_SUPPORTE: "Type de fichier non supporté.",
    VIDEO_ILLISIBLE_REESSAIE_AVEC_UN_AUTRE: "Vidéo illisible, réessaie avec un autre fichier.",
    VIDEO_TROP_LONGUE: "Vidéo trop longue ({duree}s, {maximum}s max).",
    VIDEO_TROP_LOURDE_40_MO_MAX: "Vidéo trop lourde (40 Mo max).",
    // Structure des notions et avancement (Partie 1/2, 06/09/2026) --
    // préfixe NOTION_PROGRAMME_ pour ne jamais se confondre avec les
    // codes NOTION_... de l'intégration Notion (voir core/erreurs.py).
    NOTION_PROGRAMME_CODE_INTROUVABLE: "Ce code de partage est introuvable.",
    // 22/09/2026, catalogue public du Programme.
    CODE_INTROUVABLE: "Ce code de partage est introuvable.",
    NOM_REQUIS: "Un nom est requis.",
    PROGRAMME_VIDE: "Ce Programme est vide.",
    AUCUNE_MODIFICATION_FOURNIE: "Indique au moins une chose à modifier.",
    PROGRAMME_PUBLIC_INTROUVABLE: "Cette entrée du catalogue public est introuvable.",
    NOTION_PROGRAMME_INTROUVABLE: "Cette notion est introuvable.",
    NOTION_PROGRAMME_NOM_MANQUANT: "Donne un nom à cette notion.",
    NOTION_PROGRAMME_STATUT_INVALIDE: "Statut de notion invalide.",
    NOTION_PROGRAMME_FUSION_INVALIDE: "Cette fusion n'est pas possible.",
    NOTION_PROGRAMME_GENERATION_ECHEC: "Échec de la génération de la structure, réessaie.",
    AGENT_MODIFICATION_ERREUR_TECHNIQUE: "Impossible de modifier l'agent (erreur technique). Réessaie dans un instant.",
    AGENT_MODIFICATION_INDISPONIBLE: "Impossible de modifier l'agent pour le moment.",
    ECHEC_DE_L_ENVOI_POUR_SIGNATURE: "Échec de l'envoi pour signature, réessaie.",
    ECHEC_GENERATION_ARCHIVE: "Échec de la génération de l'archive, réessaie.",
    ECHEC_GENERATION_IMAGE: "Échec de la génération de l'image, réessaie.",
    ECHEC_LANCEMENT_GENERATION_3D: "Échec du lancement de la génération 3D.",
    ECHEC_LANCEMENT_GENERATION_VIDEO: "Échec du lancement de la génération vidéo.",
    ECHEC_LECTURE_USAGE: "Impossible de récupérer le temps d'usage pour le moment.",
    ECHEC_SYNCHRONISATION_USAGE: "Impossible de synchroniser le temps d'usage pour le moment.",
    ETABLISSEMENT_DEJA_DECLARE: "Ce compte est déjà déclaré comme établissement.",
    GENERATION_3D_INDISPONIBLE: "La génération 3D n'est pas encore activée.",
    GENERATION_VIDEO_INDISPONIBLE: "La génération vidéo n'est pas encore activée.",
    IMPOSSIBLE_DE_CHARGER_LES_ADMINISTRATEURS: "Impossible de charger les administrateurs pour le moment.",
    IMPOSSIBLE_DE_CHARGER_LES_COMMENTAIRES_POUR: "Impossible de charger les commentaires pour le moment.",
    IMPOSSIBLE_D_AJOUTER_L_ADMINISTRATEUR: "Impossible d'ajouter cet administrateur pour le moment.",
    IMPOSSIBLE_D_ENREGISTRER_LE_COMMENTAIRE_POUR: "Impossible d'enregistrer le commentaire pour le moment.",
    LE_COMMENTAIRE_N_A_PAS_PU: "Le commentaire n'a pas pu être créé (erreur technique).",
    NOTIFICATIONS_LECTURE_ECHEC: "Impossible de récupérer tes notifications pour le moment.",
    NOTIFICATIONS_MAJ_ECHEC: "Impossible de mettre à jour tes notifications pour le moment.",
    PROFIL_FERMETURE_PARTIELLE: "Le contenu a été supprimé mais le compte lui-même n'a pas pu être fermé, réessaie.",
    RELAIS_EXTERNE_INDISPONIBLE: "L'ouverture des fichiers externes n'est pas disponible pour le moment.",
    SIGNATURE_INDISPONIBLE: "La signature électronique n'est pas encore activée.",
    AFFICHAGE_CARTE_INVALIDE: "Cette carte ne peut pas être affichée car ses données de localisation sont incomplètes ou invalides. Demande à Classinus de la recréer.",
    AFFICHAGE_FICHE_INVALIDE: "Cette fiche n’a pas pu être affichée car son contenu est incomplet ou invalide. Demande à Classinus de la régénérer.",
    AFFICHAGE_GRAPHIQUE_INVALIDE: "Ce graphique n’a pas pu être affiché car ses données sont incomplètes ou invalides. Demande à Classinus de le recréer.",
    AFFICHAGE_DIAGRAMME_INVALIDE: "Ce diagramme n’a pas pu être affiché. Sa syntaxe est peut-être incomplète ou non prise en charge. Demande à Classinus de le recréer plus simplement.",
    AFFICHAGE_QCM_INVALIDE: "Ce QCM n’a pas pu être affiché car son contenu est incomplet ou invalide. Demande à Classinus de le régénérer.",
    AFFICHAGE_QUESTION_INVALIDE: "Cette question interactive n’a pas pu être affichée car son contenu est incomplet ou invalide. Demande à Classinus de la recréer.",
    AFFICHAGE_SCHEMA_INVALIDE: "Ce schéma géométrique n’a pas pu être affiché car ses données sont incomplètes ou invalides. Demande à Classinus de le recréer.",
    CONNEXION_GOOGLE_PREPARATION_ECHEC: "Classinus n’a pas pu préparer la connexion avec Google. Réessaie.",
    PLUGIN_ERREUR_GENERIQUE: "Classinus n’a pas pu terminer cette action. Réessaie dans un instant.",
    PLUGIN_PERMISSION_REFUSEE: "L’autorisation nécessaire a été refusée. Vérifie les permissions de Classinus dans les paramètres de ton appareil, puis réessaie.",
    PLUGIN_INDISPONIBLE: "Cette fonction n’est pas disponible dans cette version de Classinus ou sur cette plateforme.",
    PLUGIN_EXECUTION_ECHEC: "Classinus n’a pas pu exécuter cette fonction sur cet appareil. Vérifie les autorisations nécessaires, puis réessaie. Si le problème persiste, mets à jour Classinus.",
  },
  en: {
    PRECISE_MATIERE_AUTRE: "Specify the subject in \"Other\".",
    PRECISE_LA_VALEUR_POUR: "Specify a value for {libelle}.",
    EST_DEJA_PRISE_PAR_UNE: "{libelle} is already taken.",
    AUCUNE_FORMULE_DETECTEE_DANS_CETTE_IMAGE: "No formula detected in this image.",
    AUCUN_TEXTE_TROUVE_DOCUMENT_SCANNE_IMAGE: "No text found (scanned document/image without OCR?).",
    AUDIO_TROP_LONG_20_MO_MAX: "Audio too long (20 MB max).",
    CATEGORIE_INCONNUE: "Unknown category.",
    CETTE_MATIERE_EST_DEJA_PRISE_PAR: "This subject is already taken.",
    COMPORTEMENT_INTROUVABLE: "Skill not found.",
    FRONTMATTER_INVALIDE: "The skill must start with --- and contain a valid header block.",
    FRONTMATTER_INCOMPLET: "The skill must have a description and a body of text, both non-empty.",
    CE_DOCUMENT_N_APPARTIENT_PAS_A: "This document isn't accessible here.",
    CONNEXION_INDISPONIBLE: "Connection to {service} is unavailable right now.",
    DOCUMENT_TROP_LOURD_15_MO_MAX: "Document too large (15 MB max).",
    ECHEC_DE_LA_GENERATION_AUDIO_REESSAIE: "Audio generation failed, try again.",
    ECHEC_DE_LA_GENERATION_DU_DOCUMENT: "Document generation failed, try again.",
    ECHEC_DE_LA_LECTURE_DU_DOCUMENT: "Failed to read the document.",
    ECHEC_DE_LA_TRANSCRIPTION_REESSAIE: "Transcription failed, try again.",
    ECHEC_DE_L_ENREGISTREMENT_DE_L: "Failed to save the subscription.",
    ECHEC_DE_L_EXPORT_REESSAIE: "Export failed, try again.",
    ECHEC_DE_L_EXTRACTION_REESSAIE: "Extraction failed, try again.",
    ECHEC_DE_L_UPLOAD_REESSAIE: "Upload failed, try again.",
    ECHEC_DU_DESABONNEMENT: "Failed to unsubscribe.",
    ERREUR_INCONNUE: "Something went wrong, try again in a moment.",
    ERREUR_RESEAU: "Classinus could not reach the service. Check your internet connection; if it works, try again shortly.",
    HTTP_ERREUR_REQUETE: "The information sent is invalid. Check the fields and try again.",
    HTTP_ERREUR_AUTORISATION: "You are not allowed to perform this action.",
    HTTP_ERREUR_INTROUVABLE: "This content could not be found or is no longer available. Refresh the page and try again.",
    HTTP_ERREUR_CONFLIT: "This action is no longer possible because the information has changed. Refresh the page and try again.",
    HTTP_ERREUR_TROP_DEMANDES: "Too many requests in a short time. Wait a little before trying again.",
    HTTP_ERREUR_TIMEOUT: "The service is taking too long to respond. Try again shortly.",
    HTTP_ERREUR_SERVICE: "Classinus could not complete this action because of a service problem. Check the result before trying again.",
    HTTP_ERREUR_GENERIQUE: "Classinus could not complete this action. Try again shortly.",
    NOM_DEJA_UTILISE_BIBLIOTHEQUE_PERSO: "You already have a file named \"{nom}\" in your library. Rename it or replace the existing one.",
    NOM_DEJA_UTILISE_BIBLIOTHEQUE_PUBLIQUE: "A document named \"{nom}\" already exists in the public library. Choose a different name.",
    FICHIER_AUDIO_VIDE: "Empty audio file.",
    FICHIER_VECTORISATION_ECHEC: "« {nom} » could not be indexed.",
    FICHIER_INTROUVABLE: "File not found.",
    CE_FICHIER_NE_T_APPARTIENT_PAS: "This file doesn't belong to you.",
    FICHIER_PAS_EN_ECHEC: "This file isn't in a failed state, nothing to retry.",
    ENTREE_INTROUVABLE: "Entry not found.",
    CETTE_ENTREE_NE_T_APPARTIENT_PAS: "This entry doesn't belong to you.",
    ENTREE_PAS_EN_ECHEC: "This entry isn't in a failed state, nothing to retry.",
    FICHIER_VECTORISE_MAIS_ECHEC_DU_STOCKAGE: "File indexed but could not be saved to the library.",
    FICHIER_VIDE: "Empty file.",
    FORMAT_NON_SUPPORTE_JPEG_PNG_OU: "Unsupported format (jpeg, png or webp only).",
    FORMAT_NON_SUPPORTE_MP4_WEBM_OU: "Unsupported format (mp4, webm or mov only).",
    FORMAT_NON_SUPPORTE_PDF_WORD_DOCX: "Unsupported format (PDF, Word .docx or Excel .xlsx only).",
    GENERATION_AUDIO_INDISPONIBLE: "Audio generation isn't available yet.",
    GITHUB_DEPOTS_INDISPONIBLE: "Could not retrieve the list of repositories.",
    GITHUB_NON_CONNECTE: "GitHub account not connected.",
    NOTION_NON_CONNECTE: "Notion isn't connected yet.",
    NOTION_PAGES_INDISPONIBLE: "Can't search Notion right now.",
    NOTION_BASE_INDISPONIBLE: "Can't read this Notion database right now.",
    NOTION_BASE_SANS_DATA_SOURCE: "This Notion database can't be read.",
    NOTION_CREATION_INDISPONIBLE: "Can't create the Notion page right now.",
    NOTION_CONNEXION_ECHEC: "Couldn't connect to Notion.",
    NOTION_URL_AUTORISATION_INDISPONIBLE: "Connecting to Notion is unavailable right now.",
    NOTION_RECHERCHE_ECHEC: "Notion search failed.",
    TITRE_REQUIS: "Give it a title.",
    IMAGE_TROP_LOURDE_5_MO_MAX: "Image too large (5 MB max).",
    IMPOSSIBLE_DE_CHARGER_CETTE_CONVERSATION: "Could not load this conversation.",
    IMPOSSIBLE_DE_MODIFIER_LE_FIL: "Could not update this conversation right now.",
    IMPOSSIBLE_DE_SUPPRIMER_LE_FIL: "Could not delete this conversation right now.",
    FIL_INTROUVABLE: "This conversation could not be found.",
    TITRE_FIL_INVALIDE: "The conversation title is invalid (empty or too long).",
    IMPOSSIBLE_DE_CHARGER_CET_AGENT_POUR: "Could not load this conversation right now.",
    IMPOSSIBLE_DE_CHARGER_CE_PROFIL_POUR: "Could not load this profile right now.",
    MEMOIRE_ELEVE_LECTURE_ECHEC: "Could not load your memory right now.",
    MEMOIRE_ELEVE_EFFACEMENT_ECHEC: "Could not clear your memory right now.",
    MEMOIRE_ELEVE_CATEGORIE_INCONNUE: "This memory category does not exist.",
    MEMOIRE_ELEVE_LIGNE_INTROUVABLE: "This memory item no longer exists.",
    MEMOIRE_ELEVE_EDITION_ECHEC: "Could not edit your memory right now.",
    IMPOSSIBLE_DE_CHARGER_LA_NOTE_POUR: "Could not load the rating right now.",
    IMPOSSIBLE_DE_CHARGER_LES_DROITS_POUR: "Could not load permissions right now.",
    IMPOSSIBLE_DE_CHARGER_LES_MATIERES_POUR: "Could not load subjects right now.",
    IMPOSSIBLE_DE_CHARGER_LES_NOTIFICATIONS_POUR: "Could not load notifications right now.",
    IMPOSSIBLE_DE_CHARGER_LES_OUTILS_DISPONIBLES: "Could not load available tools right now.",
    IMPOSSIBLE_DE_CHARGER_LE_PROFIL_POUR: "Could not load the profile right now.",
    IMPOSSIBLE_DE_CHARGER_LE_REGISTRE_POUR: "Could not load the registry right now.",
    IMPOSSIBLE_DE_CHARGER_L_AGENT_POUR: "Could not load Classinus right now.",
    IMPOSSIBLE_DE_CHARGER_L_HISTORIQUE: "Could not load history.",
    IMPOSSIBLE_DE_CREER_L_AGENT_ERREUR: "Technical error. Try again in a moment.",
    IMPOSSIBLE_DE_LISTER_LA_BIBLIOTHEQUE_POUR: "Could not list the library right now.",
    IMPOSSIBLE_DE_LISTER_LES_DOCUMENTS_POUR: "Could not list documents right now.",
    IMPOSSIBLE_DE_MARQUER_CETTE_NOTIFICATION_COMME: "Could not mark this notification as read.",
    IMPOSSIBLE_DE_MARQUER_LES_NOTIFICATIONS_COMME: "Could not mark notifications as read.",
    IMPOSSIBLE_DE_METTRE_A_JOUR_LE: "Could not update the profile right now.",
    IMPOSSIBLE_DE_MODIFIER_LES_DROITS_POUR: "Could not update permissions right now.",
    IMPOSSIBLE_DE_RECUPERER_LE_STATUT: "Could not retrieve the status.",
    IMPOSSIBLE_DE_SUPPRIMER_CE_DOCUMENT: "Could not delete this document.",
    IMPOSSIBLE_DE_SUPPRIMER_CE_DOCUMENT_POUR: "Could not delete this document right now.",
    IMPOSSIBLE_DE_SUPPRIMER_CE_FICHIER_POUR: "Could not delete this file right now.",
    IMPOSSIBLE_D_AJOUTER_CE_DOCUMENT_POUR: "Could not add this document right now.",
    IMPOSSIBLE_D_AJOUTER_CE_FICHIER_POUR: "Could not add this file right now.",
    IMPOSSIBLE_D_ANALYSER_CETTE_VIDEO_REESSAIE: "Could not analyze this video, try again.",
    IMPOSSIBLE_D_ENREGISTRER_LA_NOTE_POUR: "Could not save the rating right now.",
    IMPOSSIBLE_D_ENREGISTRER_LE_PROFIL_POUR: "Could not save the profile right now.",
    IMPOSSIBLE_D_ENVOYER_CE_RETOUR_POUR: "Could not send this feedback right now.",
    LE_CONTENU_NE_PEUT_PAS_ETRE: "The content cannot be empty.",
    MATIERE_INCONNUE: "Unknown subject.",
    NOTIFICATIONS_PUSH_INDISPONIBLE: "Push notifications aren't available yet.",
    PHOTOS_SUPP_MAXIMUM: "Maximum {maximum} extra photos in addition to the cover.",
    PROFIL_INTROUVABLE: "Profile not found.",
    PROFIL_MIS_A_JOUR_MAIS_IMPOSSIBLE: "Profile updated, but could not reload it for confirmation.",
    PROFIL_RELECTURE_ECHEC: "Profile updated, but could not reload it for confirmation.",
    RECHERCHE_INDISPONIBLE: "Search is unavailable right now.",
    REQUETE_INVALIDE: "The request sent is invalid.",
    RIEN_A_MODIFIER: "Nothing to change.",
    RIEN_N_A_ETE_COMPRIS_REESSAIE: "Nothing was understood, try again closer to the microphone.",
    SERVICE_INCONNU: "Unknown service « {service} ».",
    SESSION_EXPIREE: "Your session has expired, please sign in again.",
    CONNEXION_REQUISE: "Sign in or sign in again to continue.",
    SEULS_LES_FICHIERS_PDF_SONT_ACCEPTES: "Only PDF files are accepted.",
    TOKEN_INVALIDE: "Your session is no longer valid. Sign in again to continue.",
    TOKEN_MANQUANT: "Sign in or sign in again to continue.",
    TEXTE_REQUIS: "Text can't be empty.",
    TYPE_DE_FICHIER_NON_SUPPORTE: "Unsupported file type.",
    VIDEO_ILLISIBLE_REESSAIE_AVEC_UN_AUTRE: "Video unreadable, try again with a different file.",
    VIDEO_TROP_LONGUE: "Video too long ({duree}s, {maximum}s max).",
    VIDEO_TROP_LOURDE_40_MO_MAX: "Video too large (40 MB max).",
    NOTION_PROGRAMME_CODE_INTROUVABLE: "This share code was not found.",
    // 22/09/2026, Programme public catalogue.
    CODE_INTROUVABLE: "This share code was not found.",
    NOM_REQUIS: "A name is required.",
    PROGRAMME_VIDE: "This Programme is empty.",
    AUCUNE_MODIFICATION_FOURNIE: "Give at least one thing to change.",
    PROGRAMME_PUBLIC_INTROUVABLE: "This public catalogue entry was not found.",
    NOTION_PROGRAMME_INTROUVABLE: "This topic was not found.",
    NOTION_PROGRAMME_NOM_MANQUANT: "Give this topic a name.",
    NOTION_PROGRAMME_STATUT_INVALIDE: "Invalid topic status.",
    NOTION_PROGRAMME_FUSION_INVALIDE: "This merge isn't possible.",
    NOTION_PROGRAMME_GENERATION_ECHEC: "Structure generation failed, try again.",
    AGENT_MODIFICATION_ERREUR_TECHNIQUE: "Unable to modify the agent (technical error). Try again in a moment.",
    AGENT_MODIFICATION_INDISPONIBLE: "Unable to modify the agent right now.",
    ECHEC_DE_L_ENVOI_POUR_SIGNATURE: "Sending for signature failed, please try again.",
    ECHEC_GENERATION_ARCHIVE: "Archive generation failed, please try again.",
    ECHEC_GENERATION_IMAGE: "Image generation failed, please try again.",
    ECHEC_LANCEMENT_GENERATION_3D: "Could not start 3D generation.",
    ECHEC_LANCEMENT_GENERATION_VIDEO: "Could not start video generation.",
    ECHEC_LECTURE_USAGE: "Unable to retrieve your usage time right now.",
    ECHEC_SYNCHRONISATION_USAGE: "Unable to sync your usage time right now.",
    ETABLISSEMENT_DEJA_DECLARE: "This account is already registered as an institution.",
    GENERATION_3D_INDISPONIBLE: "3D generation is not available yet.",
    GENERATION_VIDEO_INDISPONIBLE: "Video generation is not available yet.",
    IMPOSSIBLE_DE_CHARGER_LES_ADMINISTRATEURS: "Unable to load the administrators right now.",
    IMPOSSIBLE_DE_CHARGER_LES_COMMENTAIRES_POUR: "Unable to load the comments right now.",
    IMPOSSIBLE_D_AJOUTER_L_ADMINISTRATEUR: "Unable to add this administrator right now.",
    IMPOSSIBLE_D_ENREGISTRER_LE_COMMENTAIRE_POUR: "Unable to save the comment right now.",
    LE_COMMENTAIRE_N_A_PAS_PU: "The comment could not be created (technical error).",
    NOTIFICATIONS_LECTURE_ECHEC: "Unable to retrieve your notifications right now.",
    NOTIFICATIONS_MAJ_ECHEC: "Unable to update your notifications right now.",
    PROFIL_FERMETURE_PARTIELLE: "Your content was deleted but the account itself could not be closed, please try again.",
    RELAIS_EXTERNE_INDISPONIBLE: "Opening external files is not available right now.",
    SIGNATURE_INDISPONIBLE: "Electronic signature is not available yet.",
    AGENT_INTROUVABLE: "Agent not found.",
    ARTICLE_SANS_PHOTOS_SUPP: "An article has no additional photos.",
    ARTICLE_SANS_TITRE: "An article must have a title.",
    AUCUN_COMPTE_AVEC_CET_EMAIL: "No Classinus account uses this email address.",
    CIBLE_DU_SIGNALEMENT_MANQUANTE: "Specify the document or location concerned.",
    COMPTE_NON_CREATEUR: "This account does not have creator status yet.",
    COMMENTAIRE_VIDE: "The comment cannot be empty.",
    COMMENTAIRE_INTROUVABLE: "Comment not found.",
    COMMENTAIRE_NE_T_APPARTIENT_PAS: "This comment does not belong to you.",
    PROFIL_PUBLIC_REQUIS_POUR_COMMENTER: "Make your profile public in profile settings to comment.",
    CONTENU_LEGAL_INTROUVABLE: "Legal content not found.",
    CETTE_PUBLICATION_NE_T_APPARTIENT_PAS: "This post does not belong to you.",
    CET_AGENT_NE_T_APPARTIENT_PAS: "This agent does not belong to you.",
    DONNE_AU_MOINS_UNE_DESCRIPTION_OU: "Provide at least a description or a title.",
    FICHIER_TROP_LOURD_50_MO_MAX: "File is too large (50 MB maximum).",
    ZIP_TROP_LOURD_200_MO_MAX: "Archive is too large (200 MB maximum).",
    FORMAT_NON_SUPPORTE_ZIP: "Unsupported format (ZIP only).",
    HISTOIRE_SANS_COUVERTURE: "A story must have a cover image.",
    HISTOIRE_SANS_TITRE: "A story must have a title.",
    IMPOSSIBLE_DE_CHARGER_LES_ABONNES_POUR: "Unable to load followers right now.",
    IMPOSSIBLE_DE_CHARGER_LES_CATEGORIES_POUR: "Unable to load categories right now.",
    IMPOSSIBLE_DE_CHARGER_LES_CREATEURS_POUR: "Unable to load creators right now.",
    IMPOSSIBLE_DE_CHARGER_LES_MISES_A: "Unable to load updates right now.",
    IMPOSSIBLE_DE_CHARGER_LES_PUBLICATIONS_POUR: "Unable to load posts right now.",
    IMPOSSIBLE_DE_CHARGER_LE_FEED_POUR: "Unable to load the feed right now.",
    IMPOSSIBLE_DE_PUBLIER_LA_MISE_A: "Unable to publish the update right now.",
    IMPOSSIBLE_DE_PUBLIER_POUR_LE_MOMENT: "Unable to publish right now.",
    IMPOSSIBLE_DE_RETIRER_CE_FOLLOW_POUR: "Unable to unfollow right now.",
    IMPOSSIBLE_DE_SE_SUIVRE_SOI_MEME: "You cannot follow yourself.",
    IMPOSSIBLE_DE_SUIVRE_CE_CREATEUR_POUR: "Unable to follow this creator right now.",
    IMPOSSIBLE_DE_SUPPRIMER_CETTE_PUBLICATION_POUR: "Unable to delete this post right now.",
    IMPOSSIBLE_DE_SUPPRIMER_CET_AGENT_POUR: "Unable to delete this agent right now.",
    IMPOSSIBLE_DE_VERIFIER_CET_AGENT_POUR: "Unable to verify this agent right now.",
    IMPOSSIBLE_D_EFFACER_LE_PROFIL_POUR: "Unable to delete the profile right now.",
    IMPOSSIBLE_D_ENREGISTRER_LE_LIKE_POUR: "Unable to save the like right now.",
    LA_MISE_A_JOUR_N_A: "The update could not be created due to a technical error.",
    LA_NOTE_DOIT_ETRE_COMPRISE_ENTRE: "The rating must be between 1 and 5.",
    LA_PUBLICATION_N_A_PAS_PU: "The post could not be created due to a technical error.",
    LE_COMMENTAIRE_NE_PEUT_PAS_ETRE: "The comment cannot be empty.",
    LE_CONTENU_A_ETE_SUPPRIME_MAIS: "The content was deleted, but the account could not be closed. Try again.",
    LE_DELAI_D_INACTIVITE_DOIT_ETRE: "The inactivity period must be at least 1 day.",
    LE_DELAI_MINIMUM_ENTRE_DEUX_RELANCES: "The minimum time between reminders must be at least 1 day.",
    LE_NOM_DE_L_AGENT_EST: "The agent name is required.",
    LE_TITRE_NE_PEUT_PAS_ETRE: "The title cannot be empty.",
    PERSONA_PEDAGOGIQUE_INVALIDE: "Unknown teaching mode.",
    PLAGE_JOURS_INVALIDE: "The requested date range is invalid.",
    PLATEFORME_INCONNUE: "Unknown platform (expected Android or iOS).",
    PUBLICATION_INTROUVABLE: "Post not found.",
    REFLEXION_SANS_PHOTO: "A reflection does not contain a photo.",
    REMPLIS_AU_MOINS_LA_POSTURE_GENERALE: "Fill in at least the general approach or global limits.",
    RIEN_A_METTRE_A_JOUR_IMAGE: "Nothing to update (image_vitrine_url and description are missing).",
    TYPE_DE_PUBLICATION_INVALIDE: "Invalid post type.",
    TYPE_ELEMENT_INCONNU: "Unknown item type.",
    VITRINE_ERREUR_TECHNIQUE: "Unable to update the showcase due to a technical error. Try again shortly.",
    VITRINE_INDISPONIBLE: "Unable to update the showcase right now.",
    RENDU_VIDEO_FORMAT_INVALIDE: "This video format does not exist.",
    RENDU_VIDEO_DOCUMENT_INVALIDE: "This animation cannot be converted to video.",
    RENDU_VIDEO_DOCUMENT_TROP_LOURD: "This animation is too large to convert to video.",
    RENDU_VIDEO_DEJA_EN_COURS: "A video is already being created for you. Wait until it is ready.",
    RENDU_VIDEO_OCCUPE: "Many videos are being created right now. Try again in a moment.",
    RENDU_VIDEO_INTROUVABLE: "This video cannot be found or is no longer available.",
    RENDU_VIDEO_PAS_PRETE: "This video is not ready yet.",
    RENDU_VIDEO_ANIMATION_EN_ERREUR: "The animation contains an error, so the video cannot be created.",
    RENDU_VIDEO_TROP_LONGUE: "This animation is too long to convert to video (2-minute maximum).",
    RENDU_VIDEO_INDISPONIBLE: "Video creation is unavailable right now.",
    RENDU_VIDEO_ECHEC: "Video creation failed. Try again.",
    MATIERE_ET_SYSTEM_PROMPT_REQUIS: "The subject and content are required.",
    CONTENU_MATIERE_INTROUVABLE: "Content not found.",
    CODE_INVALIDE: "This code does not match any content.",
    DEJA_RATTACHE_A_CE_CONTENU: "You have already unlocked this content.",
    RATTACHEMENT_INTROUVABLE: "Link not found.",
    DOCUMENT_ARCHIVE_INTROUVABLE: "This document was not found on Internet Archive.",
    DOCUMENT_ARCHIVE_RESTREINT: "This document is available for digital lending and cannot be opened here. Use its Internet Archive page link.",
    DOCUMENT_ARCHIVE_SANS_PDF: "This document has no PDF to open.",
    DOCUMENT_ARCHIVE_TROP_GROS: "This PDF is too large to open here. Use its Internet Archive page link.",
    ARCHIVE_INDISPONIBLE: "Internet Archive is not responding right now. Try again shortly.",
    LIEN_RELAIS_INVALIDE: "This file link has expired or is invalid. Reopen the file from the message.",
    LIEN_EXTERNE_NON_AUTORISE: "This address cannot be opened here.",
    SITE_EXTERNE_INDISPONIBLE: "The file's website is not responding right now. Try again shortly.",
    FICHIER_EXTERNE_RESTREINT: "This website denies access to the file.",
    FICHIER_EXTERNE_INTROUVABLE: "This file no longer exists on its website.",
    FICHIER_EXTERNE_TROP_GROS: "This file is too large to open here. Use the website link.",
    TYPE_FICHIER_NON_AUTORISE: "This file type cannot be opened here.",
    ELEMENT_CATALOGUE_PUBLIC_INTROUVABLE: "This item was not found in the public catalog.",
    AGENT_NOM_DEJA_PROCHE: "An agent with a very similar name already exists (generated ID: {agent_id}). Choose a slightly different name.",
    VITRINE_RIEN_A_METTRE_A_JOUR: "Nothing to update (image_vitrine_url and description are missing).",
    AGENT_CREATION_CHAMPS_MANQUANTS: "Fill in at least the general approach or global limits.",
    AGENT_CREE_MAIS_INDEXATION_ECHEC: "The agent was created, but “{nom}” could not be indexed. Try again from “My agents”.",
    ROLE_DEJA_CHOISI: "Your role has already been selected and cannot be changed here.",
    ROLE_INVALIDE: "Invalid role.",
    ETABLISSEMENT_INTROUVABLE: "Institution not found.",
    ENSEIGNANT_INTROUVABLE: "Teacher not found.",
    ENSEIGNANT_ID_REQUIS_POUR_ETUDIANT: "Choose your teacher to continue.",
    ETABLISSEMENT_ID_REQUIS_POUR_ENSEIGNANT: "Choose your institution to continue.",
    ACTION_RESERVEE_A_CE_ROLE: "This action is not available for your role.",
    ETABLISSEMENT_NOM_REQUIS: "Enter a name for your institution.",
    ETABLISSEMENT_PROFIL_INTROUVABLE: "This account does not have an institution profile yet.",
    SEUL_ETABLISSEMENT_PEUT_ACCEPTER: "Only the relevant institution can accept this request.",
    SEUL_ETABLISSEMENT_PEUT_LISTER_RATTACHEMENTS: "Only the relevant institution can view this list.",
    PUBLICATION_CONTENU_REQUIS: "Enter content to publish.",
    SEUL_ETABLISSEMENT_PEUT_VALIDER: "Only the relevant institution can approve this post.",
    RATTACHEMENT_ACCEPTE_REQUIS_POUR_PUBLIER: "You must be linked to and approved by this institution to publish on its behalf.",
    AUCUNE_INVITATION_ACTIVE: "There is no active code yet. Generate one.",
    CODE_MANQUANT: "Enter a code to continue.",
    NOM_AFFICHE_MANQUANT: "Enter your name to continue.",
    CODE_INVITATION_INVALIDE: "This invitation code is invalid.",
    PAS_LE_DROIT_SUR_CET_AGENT: "You are not allowed to edit this agent.",
    DESTINATAIRE_INTROUVABLE: "Recipient not found.",
    MESSAGE_VIDE: "The message cannot be empty.",
    ANNONCE_VIDE: "The announcement cannot be empty.",
    NON_LIE_A_UN_CODE: "This item is not linked to any code, so it applies to you.",
    PORTEE_INVALIDE: "Unknown recipient selection.",
    MOTIF_REQUIS: "Specify the reason for the report.",
    COORDONNEES_PLAIGNANT_REQUISES: "Your name and email are required.",
    DECLARATION_SUR_L_HONNEUR_REQUISE: "The declaration of good faith is required.",
    PAS_LE_DROIT_ADMIN: "Administrators only.",
    ACTION_INVALIDE: "Invalid action.",
    SIGNALEMENT_INTROUVABLE: "Report not found.",
    SIGNALEMENT_DEJA_TRAITE: "This report has already been handled.",
    DEMANDE_INTROUVABLE: "Request not found.",
    DEMANDE_DEJA_TRAITEE: "This request has already been handled.",
    SEUL_LE_CREATEUR_CONCERNE_PEUT_CONFIRMER: "Only the creator concerned can confirm this request.",
    SEUL_LE_CREATEUR_CONCERNE_PEUT_REFUSER: "Only the creator concerned can decline this request.",
    DEPLACEMENT_CREERAIT_UNE_BOUCLE: "This move is not possible (a folder cannot be moved into itself or one of its own subfolders).",
    DOSSIER_DESTINATION_INTROUVABLE: "Destination folder not found.",
    MINUTEUR_DUREE_INVALIDE: "This timer duration is invalid.",
    MINUTEUR_INTROUVABLE: "Timer not found.",
    MINUTEUR_DEJA_TERMINE: "This timer has already ended or been stopped.",
    MINUTEUR_ECHEC: "Unable to update this timer right now.",
    TYPE_DE_SIGNALEMENT_INVALIDE: "Invalid report type.",
    ECHEC_DU_STOCKAGE_REESSAIE: "Loading failed. Try again.",
    CE_MODELE_N_EST_PAS_DEBLOQUE_POUR: "This model is not enabled for your account.",
    URL_MANQUANTE: "A URL is required.",
    IMPOSSIBLE_D_AJOUTER_CE_LIEN_POUR: "Unable to add this link right now.",
    ECHEC_DE_L_ENREGISTREMENT_DU_LIEN: "Failed to save the link.",
    APPAREIL_ID_MANQUANT: "Device ID is required.",
    ECHEC_SYNCHRONISATION_DOSSIERS: "Failed to sync designated folders.",
    TOKEN_VIDE: "The push notification token is empty.",
    ECHEC_ENREGISTREMENT_TOKEN: "Failed to save the push notification token.",
    ECHEC_DESINSCRIPTION_TOKEN: "Failed to unregister the push notification token.",
    ACTION_DEJA_PRISE_OU_INTROUVABLE: "This action has already been handled or could not be found.",
    ACTION_INTROUVABLE: "Action not found.",
    ECHEC_RAPPORT_RESULTAT: "Failed to submit the action result.",
    TEXTE_VIDE: "Text cannot be empty.",
    ECHEC_DE_L_ENREGISTREMENT_DE_LA_NOTE: "Failed to save the text note.",
    CODE_INVALIDE_OU_INACTIF: "Invalid or inactive code.",
    SKILL_INTROUVABLE: "Skill not found.",
    LIEN_INCOMPLET: "The link is incomplete.",
    TYPE_LIEN_INVALIDE: "Invalid link type.",
    EMPLACEMENT_INTROUVABLE: "Linked item not found.",
    CATEGORIE_INVALIDE: "Invalid category.",
    FICHIER_MD_REQUIS: "A Markdown (.md) file is required.",
    COMPORTEMENT_PUBLIC_INTROUVABLE: "Public skill not found.",
    CONTENU_INTROUVABLE: "Content not found.",
    DOSSIER_INTROUVABLE: "Folder not found.",
    DOSSIER_PARENT_INTROUVABLE: "Parent folder not found.",
    CE_DOSSIER_PARENT_NE_T_APPARTIENT_PAS: "You do not own this parent folder.",
    CE_DOSSIER_NE_T_APPARTIENT_PAS: "You do not own this folder.",
    NOM_DE_DOSSIER_MANQUANT: "Folder name is required.",
    STATUT_INVALIDE: "Invalid folder status.",
    CE_DOSSIER_EST_PRIVE_A_SON_CREATEUR: "This folder is private to its creator.",
    SEUL_LE_CREATEUR_DU_DOSSIER_PEUT_EN_RETIRER_UN_FICHIER: "Only the folder's creator can remove a file from it.",
    ECHEC_DU_TRANSFERT: "File transfer failed. Please try again.",
    ECHEC_ENREGISTREMENT: "Failed to save the file.",
    CHEMIN_INVALIDE_LISTE_JSON_ATTENDUE: "Invalid path. Expected a JSON list.",
    ECHEC_LECTURE_PROGRESSION: "Failed to read progress.",
    MODE_VERROUILLE_MINEUR: "This mode is locked for minor accounts.",
    MODE_SOURCE_INVALIDE: "Invalid source mode.",
    NOTION_PROGRAMME_REGLE_INVALIDE: "Invalid curriculum concept rule.",
    TYPE_SIGNALEMENT_DESACTIVE: "This report type is no longer actionable.",
    IMPOSSIBLE_D_ENREGISTRER_CE_SIGNALEMENT: "Unable to save this report.",
    AFFICHAGE_CARTE_INVALIDE: "This map can’t be displayed because its location data is incomplete or invalid. Ask Classinus to recreate it.",
    AFFICHAGE_FICHE_INVALIDE: "This study sheet couldn’t be displayed because its content is incomplete or invalid. Ask Classinus to regenerate it.",
    AFFICHAGE_GRAPHIQUE_INVALIDE: "This chart couldn’t be displayed because its data is incomplete or invalid. Ask Classinus to recreate it.",
    AFFICHAGE_DIAGRAMME_INVALIDE: "This diagram couldn’t be displayed. Its syntax may be incomplete or unsupported. Ask Classinus to recreate it more simply.",
    AFFICHAGE_QCM_INVALIDE: "This quiz couldn’t be displayed because its content is incomplete or invalid. Ask Classinus to regenerate it.",
    AFFICHAGE_QUESTION_INVALIDE: "This interactive question couldn’t be displayed because its content is incomplete or invalid. Ask Classinus to recreate it.",
    AFFICHAGE_SCHEMA_INVALIDE: "This geometric diagram couldn’t be displayed because its data is incomplete or invalid. Ask Classinus to recreate it.",
    CONNEXION_GOOGLE_PREPARATION_ECHEC: "Classinus couldn’t set up the Google sign-in. Try again.",
    PLUGIN_ERREUR_GENERIQUE: "Classinus couldn’t complete this action. Try again in a moment.",
    PLUGIN_PERMISSION_REFUSEE: "The required permission was denied. Check Classinus’s permissions in your device settings, then try again.",
    PLUGIN_INDISPONIBLE: "This feature isn’t available in this version of Classinus or on this platform.",
    PLUGIN_EXECUTION_ECHEC: "Classinus couldn’t run this feature on this device. Check the required permissions, then try again. If the problem continues, update Classinus.",
  },
};

/**
 * Remplace les paramètres {nom_du_champ} d'un message par leurs valeurs
 * (ex: PHOTOS_SUPP_MAXIMUM: "Maximum {maximum} photos..." + { maximum: 6 }).
 */
function interpoler(gabarit: string, params?: Record<string, string | number>): string {
  if (!params) return gabarit;
  return gabarit.replace(/\{(\w+)\}/g, (correspondance, cle) =>
    Object.prototype.hasOwnProperty.call(params, cle) ? String(params[cle]) : correspondance
  );
}

/**
 * Erreur levée par lib/api.ts pour toute réponse HTTP en échec.
 * Porte le `code` stable renvoyé par le backend (voir core/erreurs.py) en
 * plus du message texte, pour permettre la traduction côté front.
 */
export class ErreurApi extends Error {
  code?: string;
  statusCode: number;
  params?: Record<string, string | number>;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    params?: Record<string, string | number>
  ) {
    super(message);
    this.name = "ErreurApi";
    this.statusCode = statusCode;
    this.code = code;
    this.params = params;
  }
}

/**
 * Produit un message compréhensible pour l'utilisateur sans exposer
 * les détails internes d'une erreur JavaScript ou d'une réponse serveur.
 */
function messageErreurHttp(statusCode: number, locale: Locale): string | undefined {
  const messages = MESSAGES[locale];
  if (statusCode === 400 || statusCode === 422) return messages.HTTP_ERREUR_REQUETE;
  if (statusCode === 401) return messages.CONNEXION_REQUISE;
  if (statusCode === 403) return messages.HTTP_ERREUR_AUTORISATION;
  if (statusCode === 404) return messages.HTTP_ERREUR_INTROUVABLE;
  if (statusCode === 408 || statusCode === 504) return messages.HTTP_ERREUR_TIMEOUT;
  if (statusCode === 409) return messages.HTTP_ERREUR_CONFLIT;
  if (statusCode === 413) return locale === "fr"
    ? "Le fichier est trop volumineux pour être envoyé."
    : "The file is too large to upload.";
  if (statusCode === 429) return messages.HTTP_ERREUR_TROP_DEMANDES;
  if (statusCode >= 500 && statusCode <= 599) return messages.HTTP_ERREUR_SERVICE;
  if (statusCode >= 400 && statusCode <= 499) return messages.HTTP_ERREUR_GENERIQUE;
  return undefined;
}

export function estErreurReseau(message: string): boolean {
  return /failed to fetch|fetch failed|network(?: request)? failed|network(?: request)? error|networkerror|load failed|err(?:_| )network|err(?:_| )internet(?:_| )disconnected|internet.*offline|no internet connection|dns lookup failed|host unreachable|network is unreachable|socket hang up|econn(?:reset|refused|aborted)|etimedout|ehostunreach|enotfound|eai_again|failed to connect|(?:you(?:'re| are)|device is|browser is|went|currently) offline/i.test(message);
}

function estMessageHttpGenerique(message: string): boolean {
  const texte = message.trim();

  // Formulations fréquentes de bibliothèques HTTP (par exemple Axios), qui
  // sont des diagnostics techniques même si elles ne viennent pas d'ErreurApi.
  if (/^(?:request failed with status(?: code)?\s*[45]\d{2}|http(?: error)?\s+[45]\d{2}(?:\b|[:—-]).*|status code\s+[45]\d{2})$/i.test(texte)) {
    return true;
  }

  const erreurStandard = /^(?:error:\s*)?(?:(?:http\s*)?[45]\d{2}\s*[:：—-]?\s*)?(?:internal server error|bad gateway|service unavailable|gateway timeout|request failed|network(?: request)? error|network request failed|failed to fetch|fetch failed|bad request|unauthorized|forbidden|access denied|not found|resource not found|conflict|request timeout|too many requests|rate limit exceeded|missing authentication token|invalid (?:or expired )?token|token expired|authentication required|not authenticated|payload too large|entity too large|request entity too large|erreur api|erreur serveur|api error|server error|http\s+\d{3}|\[object object\])(?:\s*(?:\(\d{3}\)|\[\d{3}\]))?[.!]?$/i;
  if (erreurStandard.test(texte)) return true;

  // Normalise aussi les messages de repli génériques en français renvoyés
  // par certaines routes historiques, en conservant le statut HTTP associé.
  return /^(?:une erreur est survenue|erreur (?:api|serveur)|api error|server error)(?:\s*\(\d{3}\)(?:\s*[,;:—-].*)?)?[.!]?$/i.test(texte);
}

function estErreurTechnique(e: Error): boolean {
  const message = e.message.trim();
  if (!message) return true;
  if (estMessageHttpGenerique(message)) return true;
  if (/^(?:cannot read properties|cannot set properties|undefined is not|cannot convert undefined|null is not|unexpected token|unexpected end of json|invalid hook call|minified react error)/i.test(message)) {
    return true;
  }
  if (/^(?:https?:\/\/|\{\s*["']detail["']|<!doctype html|<html)/i.test(message)) return true;
  if (/^(?:failed to|could not|unable to|error invoking|native error|plugin error|unknown error|exception\b|fatal error\b|err_[a-z0-9_]+\b|econn(?:reset|refused|aborted)\b|etimedout\b|ehostunreach\b|enotfound\b|eai_again\b|enoent\b|eacces\b|eperm\b|eio\b)/i.test(message)) return true;
  if (/^(?:traceback(?: \(most recent call last\))?:|(?:psycopg2?|asyncpg|sqlalchemy|sqlstate|redis|uvicorn|starlette|fastapi|pydantic|sqlite|databaseerror|operationalerror|integrityerror)\b|node:internal\/|errno\b)/i.test(message)) return true;
  if (/\b(?:sqlstate|psycopg|sqlalchemy|stack trace)\b/i.test(message)) return true;
  if (/\b(?:at [\w$.]+\s*\(|node_modules|chunk\.[\w-]+\.js:\d+|\/api\/[\w/?.=&-]+)/i.test(message)) return true;
  return ["TypeError", "ReferenceError", "SyntaxError", "RangeError"].includes(e.name);
}

/**
 * Message à afficher à l'utilisateur pour une erreur donnée.
 * Les codes métier connus gardent la priorité. Les erreurs réseau et les
 * pannes HTTP génériques reçoivent une explication et une action possibles.
 */
export function messageErreur(e: unknown, locale: Locale = obtenirLocale()): string {
  const messages = MESSAGES[locale];

  if (e instanceof ErreurApi) {
    const gabarit = e.code ? messages[e.code] : undefined;
    if (gabarit && e.code !== "ERREUR_INCONNUE") {
      return interpoler(gabarit, e.params);
    }

    // Un code d'erreur métier connu a déjà été traité plus haut. Sinon, un
    // statut 5xx doit toujours rester générique : le corps peut contenir un
    // diagnostic interne imprévu (base de données, proxy, pile technique).
    // On le traite avant le texte : « connection refused » peut désigner
    // le serveur de base de données, pas la connexion Internet de l'étudiant.
    if (e.statusCode >= 500 && e.statusCode <= 599) {
      return messageErreurHttp(e.statusCode, locale) ?? messages.ERREUR_INCONNUE;
    }

    if (estErreurReseau(e.message)) {
      return messages.ERREUR_RESEAU;
    }

    if (e.code === "ERREUR_INCONNUE" || !e.message || estErreurTechnique(e)) {
      return messageErreurHttp(e.statusCode, locale) ?? messages.ERREUR_INCONNUE;
    }

    if (e.message) return e.message;
    return messageErreurHttp(e.statusCode, locale) ?? messages.ERREUR_INCONNUE;
  }

  if (e instanceof Error) {
    if (estErreurReseau(e.message)) {
      return messages.ERREUR_RESEAU;
    }
    if (estErreurTechnique(e)) return messages.ERREUR_INCONNUE;
    if (e.message) return e.message;
  }

  return messages.ERREUR_INCONNUE;
}

/**
 * Messages dédiés à l'ouverture audio : les API du navigateur renvoient souvent
 * des DOMException en anglais, dont le texte varie selon le système.
 */
export function messageErreurVoix(e: unknown, locale: Locale = obtenirLocale()): string {
  const objet = e && typeof e === "object" ? e as { name?: unknown; message?: unknown } : {};
  const nom = typeof objet.name === "string" ? objet.name.toLowerCase() : "";
  const message = typeof objet.message === "string"
    ? objet.message.toLowerCase()
    : typeof e === "string" ? e.toLowerCase() : "";

  if (/^(?:notallowederror|permissiondeniederror)$/.test(nom) ||
      /permission (?:denied|was denied)|user denied|microphone.*(?:denied|blocked)|audio capture.*denied|not allowed to access (?:audio|microphone)/i.test(message)) {
    return locale === "fr"
      ? "L’accès au microphone a été refusé. Autorise le microphone dans les paramètres du navigateur ou de l’appareil, puis réessaie."
      : "Microphone access was denied. Allow microphone access in your browser or device settings, then try again.";
  }
  if (/^(?:notfounderror|devicesnotfounderror)$/.test(nom) ||
      /no device found|requested device not found|no microphone|microphone.*not found/i.test(message)) {
    return locale === "fr"
      ? "Aucun microphone compatible n’a été trouvé. Branche ou active un microphone, puis réessaie."
      : "No compatible microphone was found. Connect or enable a microphone, then try again.";
  }
  if (/^(?:notreadableerror|trackstarterror)$/.test(nom) ||
      /could not start audio source|device.*in use|microphone.*in use|audio capture.*(?:failed|unavailable)/i.test(message)) {
    return locale === "fr"
      ? "Le microphone ne peut pas être utilisé pour le moment. Ferme les autres applications qui l’utilisent, puis réessaie."
      : "The microphone cannot be used right now. Close other applications using it, then try again.";
  }

  const normalise = messageErreur(e, locale);
  if (normalise === MESSAGES[locale].ERREUR_INCONNUE) {
    return locale === "fr"
      ? "Impossible d’ouvrir le canal vocal. Vérifie ta connexion et les autorisations du microphone, puis réessaie."
      : "Could not open voice mode. Check your connection and microphone permissions, then try again.";
  }
  return normalise;
}


export type ContexteErreurAuthentification = "connexion" | "inscription" | "autorisation" | "reinitialisation";

/**
 * Normalise les erreurs renvoyées par Supabase Auth avant affichage.
 * Les détails bruts restent disponibles dans la console du navigateur,
 * jamais dans les messages montrés à l'utilisateur.
 */
export function messageErreurAuthentification(
  e: unknown,
  contexte: ContexteErreurAuthentification,
  locale: Locale = obtenirLocale()
): string {
  const objet = e && typeof e === "object" ? e as { message?: unknown; name?: unknown; code?: unknown } : {};
  const brut = typeof objet.message === "string" ? objet.message : typeof e === "string" ? e : "";
  const code = typeof objet.code === "string" ? objet.code : "";
  // Supabase Auth renvoie des codes stables même si le texte est vide ou varie.
  const message = `${brut} ${code}`.replace(/[_-]+/g, " ").toLowerCase();
  const fr = locale === "fr";

  if (estErreurReseau(message)) return MESSAGES[locale].ERREUR_RESEAU;
  if (/rate limit|too many requests|too many attempts|request rate limit|email rate limit|sms rate limit|over (?:email|sms|request) (?:send )?rate limit/i.test(message)) {
    return MESSAGES[locale].HTTP_ERREUR_TROP_DEMANDES;
  }
  if (/access denied|user denied|cancelled by user|user cancelled|authorization cancelled/i.test(message)) {
    return fr
      ? "La connexion a été annulée. Tu peux la relancer quand tu veux."
      : "Sign-in was cancelled. You can try again whenever you're ready.";
  }
  if (/google.*(?:connexion|sign.?in)|(?:connexion|sign.?in).*google/i.test(message)) {
    return fr
      ? "La connexion avec Google n’a pas abouti. Réessaie."
      : "Google sign-in did not complete. Try again.";
  }
  if (/redirect[ _]uri|redirect url|redirect destination.*not allowed|not allowed.*redirect/i.test(message)) {
    return fr
      ? "Cette méthode de connexion n’est pas configurée pour cette adresse. Réessaie plus tard."
      : "This sign-in method is not configured for this address. Try again later.";
  }
  if (/invalid login credentials|invalid credentials|email or password is incorrect|invalid password|user not found|invalid email or password/i.test(message)) {
    return fr
      ? "Adresse e-mail ou numéro de téléphone, ou mot de passe incorrect."
      : "The email address or phone number, or password, is incorrect.";
  }
  if (/user already registered|already registered|user already exists|email already registered|phone number already registered/i.test(message)) {
    // Évite de confirmer explicitement qu'un identifiant appartient à un compte.
    return contexte === "inscription"
      ? fr
        ? "Impossible de créer un compte avec ces informations. Si tu as déjà un compte, connecte-toi ou réinitialise ton mot de passe."
        : "Could not create an account with this information. If you already have an account, sign in or reset your password."
      : fr
        ? "Impossible de traiter ces informations de connexion. Vérifie-les puis réessaie."
        : "Could not process these sign-in details. Check them and try again.";
  }
  if (/email not confirmed|user not confirmed|email not verified/i.test(message)) {
    return fr
      ? "Connexion impossible pour le moment. Si tu viens de créer un compte, vérifie ta boîte mail pour le confirmer."
      : "Could not sign in right now. If you just created an account, check your inbox to confirm it.";
  }
  if (/invalid email|email address.*invalid|unable to validate email address/i.test(message)) {
    return fr ? "L’adresse e-mail n’est pas valide. Vérifie-la puis réessaie." : "The email address is invalid. Check it and try again.";
  }
  if (/invalid phone|phone number.*invalid|phone.*not valid/i.test(message)) {
    return fr ? "Le numéro de téléphone n’est pas valide. Vérifie le pays et le numéro puis réessaie." : "The phone number is invalid. Check the country and number, then try again.";
  }
  if (/password.*(?:at least|too short|weak|must contain|characters)|weak password|password should/i.test(message)) {
    return fr ? "Le mot de passe ne respecte pas les critères requis. Vérifie sa longueur et sa composition." : "The password does not meet the requirements. Check its length and composition.";
  }
  if (/(?:token|otp|verification link|email link).*(?:expired|invalid)|(?:expired|invalid).*(?:token|otp|verification link|email link)|otp_expired|token_expired/i.test(message)) {
    return fr
      ? "Ce code ou lien de vérification a expiré ou n’est plus valide. Demande-en un nouveau puis réessaie."
      : "This verification code or link has expired or is no longer valid. Request a new one and try again.";
  }
  if (/error sending (?:confirmation )?(?:email|sms)|failed to send (?:confirmation )?(?:email|sms)|email delivery|sms provider|sending email/i.test(message)) {
    return fr
      ? "Impossible d’envoyer le message de vérification pour le moment. Réessaie dans un instant."
      : "The verification message could not be sent right now. Try again shortly.";
  }

  if (contexte === "inscription") {
    return fr
      ? "Impossible de créer le compte pour le moment. Vérifie les informations saisies puis réessaie."
      : "The account could not be created right now. Check the information and try again.";
  }
  if (contexte === "autorisation") {
    return fr
      ? "Impossible de traiter cette demande d’autorisation. Actualise la page puis réessaie."
      : "The authorization request could not be processed. Refresh the page and try again.";
  }
  if (contexte === "reinitialisation") {
    return fr
      ? "Impossible de terminer la réinitialisation du mot de passe. Vérifie ta connexion puis réessaie."
      : "The password reset could not be completed. Check your connection and try again.";
  }
  return fr
    ? "Impossible de te connecter avec ces informations. Vérifie-les puis réessaie."
    : "Could not sign in with this information. Check it and try again.";
}

export type ActionErreurFichierNatif = "lister" | "ouvrir" | "lire" | "rechercher";

/**
 * Produit un message stable pour les exceptions du plugin de fichiers natif.
 * Les erreurs de chemin déjà détectées par l'application gardent leur message
 * précis ; cette fonction ne traite que les échecs d'exécution du plugin.
 */
export function messageErreurFichierNatif(
  e: unknown,
  action: ActionErreurFichierNatif,
  locale: Locale = obtenirLocale()
): string {
  const objet = e && typeof e === "object" ? e as { message?: unknown; code?: unknown; name?: unknown } : {};
  const brut = typeof objet.message === "string" ? objet.message : typeof e === "string" ? e : "";
  const code = typeof objet.code === "string" ? objet.code : "";
  const message = (code + " " + brut).toLowerCase();
  const fr = locale === "fr";

  if (/permission|access denied|not authorized|eacces|securityerror/i.test(message)) {
    return fr
      ? "Classinus n’a pas l’autorisation d’accéder à ce dossier ou fichier. Vérifie les autorisations de l’application puis réessaie."
      : "Classinus is not allowed to access this folder or file. Check the app permissions and try again.";
  }
  if (/enospc|no space left|not enough storage|insufficient storage|disk full/i.test(message)) {
    return fr
      ? "L’espace de stockage de l’appareil est insuffisant. Libère de l’espace puis réessaie."
      : "There is not enough storage space on the device. Free up space and try again.";
  }
  if (/enoent|no such file|file not found|file_not_found|directory not found|directory_not_found|path does not exist|does not exist/i.test(message)) {
    return fr
      ? "Le fichier ou le dossier n’est plus disponible à cet emplacement. Actualise la liste puis réessaie."
      : "The file or folder is no longer available at this location. Refresh the list and try again.";
  }
  if (/plugin.*(?:not implemented|not available|not found)|not supported on (?:the )?(?:web|this platform)|unsupported platform/i.test(message)) {
    return fr
      ? "Cette fonction de gestion des fichiers n’est pas disponible sur cet appareil."
      : "This file-management feature is not available on this device.";
  }
  if (estErreurReseau(message)) return MESSAGES[locale].ERREUR_RESEAU;

  if (action === "lire") {
    return fr
      ? "Impossible de lire ce fichier sur cet appareil. Vérifie qu’il est encore accessible puis réessaie."
      : "This file could not be read on this device. Check that it is still accessible and try again.";
  }
  if (action === "rechercher") {
    return fr
      ? "Impossible de terminer la recherche dans ce dossier. Vérifie que le stockage est accessible puis réessaie."
      : "The search in this folder could not be completed. Check that storage is accessible and try again.";
  }
  if (action === "ouvrir") {
    return fr
      ? "Impossible d’ouvrir ce sous-dossier sur cet appareil. Vérifie que le dossier est toujours accessible puis réessaie."
      : "This subfolder could not be opened on this device. Check that it is still accessible and try again.";
  }
  return fr
    ? "Impossible d’accéder au contenu de ce dossier sur cet appareil. Vérifie que le stockage est disponible puis réessaie."
    : "The contents of this folder could not be accessed on this device. Check that storage is available and try again.";
}
