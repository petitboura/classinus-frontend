// Cree le 13/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android (branche feature/bouton-flottant-android). Code COMMUN
// aux deux flavors (src/main).
//
// Petites preferences gardees sur l'appareil, lisibles sans la WebView : le
// service et le recepteur de demarrage s'en servent appli fermee ou apres un
// redemarrage, quand le JS n'existe pas encore. Rien de secret ici (pas de
// token), donc des SharedPreferences ordinaires.
package com.classinus.app.boutonflottant

import android.content.Context

object PreferencesBoutonFlottant {

    private const val FICHIER = "bouton_flottant"
    private const val CLE_VOULU = "voulu"
    private const val CLE_CANAL_ACTIF = "canal_actif"
    private const val CLE_BASCULE_EN_ATTENTE = "bascule_en_attente_depuis"
    // Une bascule demandee mais jamais executee (lancement de l'appli bloque par
    // le systeme) ne doit pas se declencher des heures plus tard a l'improviste.
    private const val VALIDITE_BASCULE_MS = 20_000L
    private const val CLE_TEXTE_EN_ATTENTE = "texte_en_attente"
    private const val CLE_TEXTE_EN_ATTENTE_DEPUIS = "texte_en_attente_depuis"
    private const val VALIDITE_TEXTE_MS = 60_000L
    private const val CLE_COTE_DROIT = "cote_droit"
    private const val CLE_POSITION_VERTICALE = "position_verticale"
    private const val CLE_TITRE = "titre"
    private const val CLE_TEXTE = "texte"
    private const val CLE_LIBELLE_MASQUER = "libelle_masquer"

    private const val POSITION_VERTICALE_DEFAUT = 0.35f

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(FICHIER, Context.MODE_PRIVATE)

    /**
     * Choix de l'eleve : vrai (il veut le bouton), faux (il l'a masque), ou null
     * tant qu'il n'a jamais choisi. Le null laisse le JS afficher le bouton par
     * defaut des que la permission d'affichage est accordee.
     */
    fun choix(context: Context): Boolean? {
        val p = prefs(context)
        return if (p.contains(CLE_VOULU)) p.getBoolean(CLE_VOULU, false) else null
    }

    fun definirChoix(context: Context, voulu: Boolean) {
        prefs(context).edit().putBoolean(CLE_VOULU, voulu).apply()
    }

    /** Dernier etat connu du canal en direct, pour dessiner le bouton juste apres un redemarrage du service. */
    fun canalActif(context: Context): Boolean = prefs(context).getBoolean(CLE_CANAL_ACTIF, false)

    fun definirCanalActif(context: Context, actif: Boolean) {
        prefs(context).edit().putBoolean(CLE_CANAL_ACTIF, actif).apply()
    }

    /**
     * Vrai quand l'eleve a touche le bouton alors que la page de l'appli ne
     * pouvait pas repondre (appli fermee, page rechargee) et que l'appli a ete
     * lancee pour ca il y a moins de 20 secondes. Le JS le lit des qu'il est
     * pret et bascule le canal a ce moment-la.
     */
    fun basculeEnAttente(context: Context): Boolean {
        val depuis = prefs(context).getLong(CLE_BASCULE_EN_ATTENTE, 0L)
        return depuis > 0L && System.currentTimeMillis() - depuis < VALIDITE_BASCULE_MS
    }

    fun definirBasculeEnAttente(context: Context, enAttente: Boolean) {
        prefs(context).edit()
            .putLong(CLE_BASCULE_EN_ATTENTE, if (enAttente) System.currentTimeMillis() else 0L)
            .apply()
    }

    /**
     * Texte ecrit dans le champ du bouton Ecrire (lot 2) alors que la page de
     * l'appli ne pouvait pas le recevoir. Garde moins d'une minute : le JS le lit
     * des qu'il est pret, une seule fois. Au dela, il est abandonne plutot que
     * d'arriver a l'improviste longtemps apres.
     */
    fun prendreTexteEnAttente(context: Context): String? {
        val p = prefs(context)
        val texte = p.getString(CLE_TEXTE_EN_ATTENTE, null)
        val depuis = p.getLong(CLE_TEXTE_EN_ATTENTE_DEPUIS, 0L)
        p.edit().remove(CLE_TEXTE_EN_ATTENTE).remove(CLE_TEXTE_EN_ATTENTE_DEPUIS).apply()
        if (texte.isNullOrBlank() || depuis <= 0L) return null
        return if (System.currentTimeMillis() - depuis < VALIDITE_TEXTE_MS) texte else null
    }

    fun definirTexteEnAttente(context: Context, texte: String) {
        prefs(context).edit()
            .putString(CLE_TEXTE_EN_ATTENTE, texte)
            .putLong(CLE_TEXTE_EN_ATTENTE_DEPUIS, System.currentTimeMillis())
            .apply()
    }

    fun effacerTexteEnAttente(context: Context) {
        prefs(context).edit().remove(CLE_TEXTE_EN_ATTENTE).remove(CLE_TEXTE_EN_ATTENTE_DEPUIS).apply()
    }

    /**
     * Position du bouton, independante de la taille et de l'orientation de
     * l'ecran : le bord ou il est colle, et sa hauteur en proportion de l'ecran.
     */
    fun coteDroit(context: Context): Boolean = prefs(context).getBoolean(CLE_COTE_DROIT, true)

    fun positionVerticale(context: Context): Float =
        prefs(context).getFloat(CLE_POSITION_VERTICALE, POSITION_VERTICALE_DEFAUT).coerceIn(0f, 1f)

    fun definirPosition(context: Context, coteDroit: Boolean, positionVerticale: Float) {
        prefs(context).edit()
            .putBoolean(CLE_COTE_DROIT, coteDroit)
            .putFloat(CLE_POSITION_VERTICALE, positionVerticale.coerceIn(0f, 1f))
            .apply()
    }

    /** Textes de la notification permanente, deja traduits par le JS. Null : texte par defaut du natif. */
    fun titre(context: Context): String? = prefs(context).getString(CLE_TITRE, null)

    fun texte(context: Context): String? = prefs(context).getString(CLE_TEXTE, null)

    fun libelleMasquer(context: Context): String? = prefs(context).getString(CLE_LIBELLE_MASQUER, null)

    fun definirTextes(context: Context, titre: String?, texte: String?, libelleMasquer: String?) {
        prefs(context).edit()
            .putString(CLE_TITRE, titre?.takeIf { it.isNotBlank() })
            .putString(CLE_TEXTE, texte?.takeIf { it.isNotBlank() })
            .putString(CLE_LIBELLE_MASQUER, libelleMasquer?.takeIf { it.isNotBlank() })
            .apply()
    }
}
