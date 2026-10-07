// Cree le 07/10/2026, demande Bourama : lot 2 du chantier "vision ecran",
// branche feature/vision-ecran-android. Code COMMUN aux deux flavors, aucune
// accessibilite ici.
//
// Gere UNE fenetre de superposition (permission "Afficher par-dessus les
// autres applications") qui porte la vue VueMarques.
//
// Regles de conception :
//   - la fenetre est INTOUCHABLE (FLAG_NOT_TOUCHABLE) : tous les gestes de
//     l'eleve traversent vers l'appli en dessous. Clovis montre, l'eleve agit.
//     C'est aussi ce qu'Android et Google Play attendent d'une superposition
//     qui n'est pas un outil d'accessibilite ;
//   - la permission est donnee par l'eleve dans les reglages systeme, jamais
//     contournee : sans elle, rien ne s'affiche ;
//   - les marques disparaissent toutes seules apres une duree (sauf demande
//     contraire), et la fenetre est retiree quand il n'y a plus rien a
//     montrer, pour ne laisser aucune fenetre invisible en place ;
//   - a la rotation, les marques sont effacees (leurs positions ne sont plus
//     valables).
//
// Tout ce qui touche aux fenetres doit se faire sur le thread principal.
package com.classinus.app.visionecran

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager

enum class ResultatAffichage { OK, PERMISSION_REFUSEE, ECHEC }

object SuperpositionManager {

    private const val DUREE_APPARITION_MS = 180L
    private const val DUREE_DISPARITION_MS = 220L

    private var contexte: Context? = null
    private var vue: VueMarques? = null
    private val principal = Handler(Looper.getMainLooper())
    private var retraitProgramme: Runnable? = null

    fun initialiser(context: Context) {
        if (contexte == null) contexte = context.applicationContext
    }

    fun permissionAccordee(): Boolean {
        val c = contexte ?: return false
        return Settings.canDrawOverlays(c)
    }

    fun estAffichee(): Boolean = vue != null

    /**
     * Montre les marques (elles remplacent celles deja affichees). `dureeMs`
     * a 0 les garde jusqu'a l'appel de effacer(). Thread principal obligatoire.
     */
    fun afficher(
        marques: List<Marque>,
        espaceLargeur: Float,
        espaceHauteur: Float,
        dureeMs: Long,
    ): ResultatAffichage {
        val c = contexte ?: return ResultatAffichage.ECHEC
        if (!Settings.canDrawOverlays(c)) return ResultatAffichage.PERMISSION_REFUSEE

        annulerRetraitProgramme()

        var vueActive = vue
        if (vueActive == null) {
            val nouvelle = VueMarques(c)
            nouvelle.alpha = 0f
            nouvelle.surRedimensionnement = { effacer() }
            val gestionnaire = c.getSystemService(WindowManager::class.java)
            try {
                gestionnaire.addView(nouvelle, creerParametresFenetre())
            } catch (e: Exception) {
                return ResultatAffichage.ECHEC
            }
            vue = nouvelle
            vueActive = nouvelle
        }

        vueActive.definir(marques, espaceLargeur, espaceHauteur)
        vueActive.animate().cancel()
        vueActive.animate().alpha(1f).setDuration(DUREE_APPARITION_MS).start()

        if (dureeMs > 0L) {
            val retrait = Runnable { effacer() }
            retraitProgramme = retrait
            principal.postDelayed(retrait, dureeMs)
        }
        return ResultatAffichage.OK
    }

    /** Fait disparaitre les marques en fondu puis retire la fenetre. Sans effet s'il n'y a rien. */
    fun effacer() {
        annulerRetraitProgramme()
        val aRetirer = vue ?: return
        vue = null
        aRetirer.animate().cancel()
        aRetirer.animate()
            .alpha(0f)
            .setDuration(DUREE_DISPARITION_MS)
            .withEndAction { retirerFenetre(aRetirer) }
            .start()
    }

    private fun retirerFenetre(vueARetirer: VueMarques) {
        val c = contexte
        if (c != null) {
            try {
                c.getSystemService(WindowManager::class.java).removeView(vueARetirer)
            } catch (e: Exception) {
                // Deja retiree : rien a faire.
            }
        }
        vueARetirer.arreter()
    }

    private fun annulerRetraitProgramme() {
        retraitProgramme?.let { principal.removeCallbacks(it) }
        retraitProgramme = null
    }

    private fun creerParametresFenetre(): WindowManager.LayoutParams {
        val drapeaux = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            drapeaux,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            title = "ClassinusSuperposition"
            // La fenetre doit couvrir aussi la zone de l'encoche : sinon les
            // positions seraient decalees par rapport a la capture.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
    }
}
