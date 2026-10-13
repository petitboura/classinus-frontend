// Cree le 13/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android. Code COMMUN aux deux flavors (src/main).
//
// Gere UNE fenetre de superposition (permission "Afficher par-dessus les
// autres applications", la meme que les marques de SuperpositionManager) qui
// porte le bouton. Contrairement a la fenetre des marques, celle-ci est
// TOUCHABLE, mais elle ne couvre que le bouton : partout ailleurs les gestes
// vont a l'application en dessous.
//
// Regles de conception :
//   - le bouton se colle au bord gauche ou droit de l'ecran apres un
//     glissement (animation), pour ne gener aucune application ;
//   - sa position est gardee en proportion de l'ecran (bord + hauteur), donc
//     elle reste juste apres une rotation ;
//   - il ne decide de rien : un appui est remis a BoutonFlottantPlugin, qui
//     sait si la page de l'appli peut repondre ;
//   - sans permission d'affichage, rien ne s'affiche (jamais contournee).
//
// Tout ce qui touche aux fenetres se fait sur le thread principal.
package com.classinus.app.boutonflottant

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.PixelFormat
import android.graphics.Rect
import android.os.Build
import android.provider.Settings
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator

object BoutonFlottantManager {

    private const val DUREE_COLLAGE_MS = 220L
    private const val MARGE_BORD_DP = 4f

    private var contexte: Context? = null
    private var vue: VueBoutonFlottant? = null
    private var parametres: WindowManager.LayoutParams? = null
    private var animateurCollage: ValueAnimator? = null

    /** Appui court sur le bouton. Branche par le service. */
    var surAppui: (() -> Unit)? = null

    fun estAffiche(): Boolean = vue != null

    fun permissionAccordee(context: Context): Boolean = Settings.canDrawOverlays(context.applicationContext)

    /**
     * Montre le bouton (sans effet s'il l'est deja). Renvoie faux si la
     * permission est absente ou si la fenetre n'a pas pu s'ajouter.
     */
    fun afficher(context: Context): Boolean {
        val c = context.applicationContext
        contexte = c
        if (vue != null) return true
        if (!Settings.canDrawOverlays(c)) return false

        val nouvelle = VueBoutonFlottant(c)
        val canalActif = PreferencesBoutonFlottant.canalActif(c)
        nouvelle.definirActif(canalActif, animer = false)
        // Invisible au depart : le bouton apparait en fondu juste apres.
        nouvelle.alpha = 0f
        nouvelle.surAppui = { surAppui?.invoke() }
        nouvelle.surDeplacement = { dx, dy -> deplacer(dx, dy) }
        nouvelle.surRelachement = { coller() }

        val reglages = creerParametresFenetre()
        placerDepuisPreferences(c, reglages)
        try {
            c.getSystemService(WindowManager::class.java).addView(nouvelle, reglages)
        } catch (e: Exception) {
            return false
        }
        vue = nouvelle
        parametres = reglages
        // Apparition en fondu : le bouton ne surgit jamais d'un coup.
        nouvelle.animate().alpha(if (canalActif) 1f else 0.6f).setDuration(200L).start()
        return true
    }

    /** Retire le bouton en fondu. Sans effet s'il n'est pas affiche. */
    fun retirer() {
        animateurCollage?.cancel()
        animateurCollage = null
        val aRetirer = vue ?: return
        vue = null
        parametres = null
        val c = contexte
        aRetirer.animate().cancel()
        aRetirer.animate().alpha(0f).setDuration(160L).withEndAction {
            try {
                c?.getSystemService(WindowManager::class.java)?.removeView(aRetirer)
            } catch (e: Exception) {
                // Deja retire : rien a faire.
            }
        }.start()
    }

    /** Dessine le bouton selon l'etat du canal en direct. */
    fun definirEtatCanal(actif: Boolean) {
        vue?.definirActif(actif)
    }

    /** A rappeler apres une rotation ou un changement de taille d'ecran. */
    fun replacer() {
        val c = contexte ?: return
        val v = vue ?: return
        val reglages = parametres ?: return
        animateurCollage?.cancel()
        placerDepuisPreferences(c, reglages)
        try {
            c.getSystemService(WindowManager::class.java).updateViewLayout(v, reglages)
        } catch (e: Exception) {
            // La fenetre a disparu entre-temps : rien a replacer.
        }
    }

    private fun taille(): Int = (VueBoutonFlottant.TAILLE_DP * (contexte?.resources?.displayMetrics?.density ?: 1f)).toInt()

    private fun marge(): Int = (MARGE_BORD_DP * (contexte?.resources?.displayMetrics?.density ?: 1f)).toInt()

    /** Zone utilisable de l'ecran, dans son orientation actuelle. */
    private fun limitesEcran(c: Context): Rect {
        val gestionnaire = c.getSystemService(WindowManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return gestionnaire.maximumWindowMetrics.bounds
        }
        val metriques = DisplayMetrics()
        @Suppress("DEPRECATION")
        gestionnaire.defaultDisplay.getRealMetrics(metriques)
        return Rect(0, 0, metriques.widthPixels, metriques.heightPixels)
    }

    private fun placerDepuisPreferences(c: Context, reglages: WindowManager.LayoutParams) {
        val ecran = limitesEcran(c)
        val t = taille()
        reglages.x = if (PreferencesBoutonFlottant.coteDroit(c)) ecran.width() - t - marge() else marge()
        val hauteurLibre = (ecran.height() - t).coerceAtLeast(0)
        reglages.y = (PreferencesBoutonFlottant.positionVerticale(c) * hauteurLibre).toInt()
    }

    private fun deplacer(dx: Float, dy: Float) {
        val c = contexte ?: return
        val v = vue ?: return
        val reglages = parametres ?: return
        animateurCollage?.cancel()
        val ecran = limitesEcran(c)
        val t = taille()
        reglages.x = (reglages.x + dx.toInt()).coerceIn(0, (ecran.width() - t).coerceAtLeast(0))
        reglages.y = (reglages.y + dy.toInt()).coerceIn(0, (ecran.height() - t).coerceAtLeast(0))
        try {
            c.getSystemService(WindowManager::class.java).updateViewLayout(v, reglages)
        } catch (e: Exception) {
            // Fenetre disparue : ignore.
        }
    }

    /** Colle le bouton au bord le plus proche avec une animation, puis garde sa position. */
    private fun coller() {
        val c = contexte ?: return
        val v = vue ?: return
        val reglages = parametres ?: return
        val ecran = limitesEcran(c)
        val t = taille()
        val coteDroit = reglages.x + t / 2 > ecran.width() / 2
        val xCible = if (coteDroit) ecran.width() - t - marge() else marge()
        val hauteurLibre = (ecran.height() - t).coerceAtLeast(1)
        PreferencesBoutonFlottant.definirPosition(c, coteDroit, reglages.y.toFloat() / hauteurLibre)

        animateurCollage?.cancel()
        animateurCollage = ValueAnimator.ofInt(reglages.x, xCible).apply {
            duration = DUREE_COLLAGE_MS
            interpolator = DecelerateInterpolator()
            addUpdateListener {
                reglages.x = it.animatedValue as Int
                try {
                    c.getSystemService(WindowManager::class.java).updateViewLayout(v, reglages)
                } catch (e: Exception) {
                    cancel()
                }
            }
            start()
        }
    }

    private fun creerParametresFenetre(): WindowManager.LayoutParams {
        val drapeaux = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            drapeaux,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            title = "ClassinusBoutonFlottant"
        }
    }
}
