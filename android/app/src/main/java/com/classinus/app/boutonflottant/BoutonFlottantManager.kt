// Cree le 13/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android. Code COMMUN aux deux flavors (src/main).
// Mis a jour le 17/10/2026 : la fenetre porte maintenant le groupe de boutons
// (GroupeBoutonsFlottant) et non plus un rond seul. Lot 2 : une seconde fenetre,
// posee par dessus, porte le champ de saisie du bouton Ecrire (ChampEcritureFlottant).
//
// Gere UNE fenetre de superposition (permission "Afficher par-dessus les
// autres applications", la meme que les marques de SuperpositionManager) qui
// porte le groupe de boutons. Contrairement a la fenetre des marques, celle-ci
// est TOUCHABLE, mais elle ne couvre que le groupe : partout ailleurs les gestes
// vont a l'application en dessous.
//
// Regles de conception :
//   - le groupe se colle au bord gauche ou droit de l'ecran apres un
//     glissement (animation), pour ne gener aucune application ;
//   - sa position est gardee en proportion de l'ecran (bord + hauteur), donc
//     elle reste juste apres une rotation ;
//   - la fenetre est ancree au bord ou le groupe est colle (gauche ou droit) :
//     quand un bouton apparait ou disparait, le groupe grandit ou retrecit du
//     cote libre, sans que le bord bouge ;
//   - il ne decide de rien : un appui sur le bouton d'activation est remis a
//     BoutonFlottantPlugin, qui sait si la page de l'appli peut repondre ;
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
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.view.inputmethod.InputMethodManager

object BoutonFlottantManager {

    private const val DUREE_COLLAGE_MS = 220L
    private const val MARGE_BORD_DP = 4f

    private var contexte: Context? = null
    private var vue: GroupeBoutonsFlottant? = null
    private var parametres: WindowManager.LayoutParams? = null
    private var animateurCollage: ValueAnimator? = null

    // Lot 2 (Ecrire) : le champ de saisie est dans une SECONDE fenetre, ajoutee apres celle
    // du groupe, donc posee par dessus. Le groupe reste derriere, a sa place, sans etre pousse.
    private var champ: ChampEcritureFlottant? = null

    // Vrai quand la fenetre est ancree au bord droit : x est alors la distance a ce
    // bord. Faux : ancree au bord gauche, x est la distance au bord gauche. Pendant
    // un glissement x est toujours compte depuis la gauche.
    private var ancreADroite = false

    /** Appui sur le bouton qui active ou coupe le canal. Branche par le service. */
    var surAppui: (() -> Unit)? = null

    /** Texte ecrit dans le champ de saisie, a transmettre a la page. Branche par le service. */
    var surTexteEcrit: ((texte: String) -> Unit)? = null

    fun estAffiche(): Boolean = vue != null

    fun permissionAccordee(context: Context): Boolean = Settings.canDrawOverlays(context.applicationContext)

    /**
     * Montre le groupe (sans effet s'il l'est deja). Renvoie faux si la
     * permission est absente ou si la fenetre n'a pas pu s'ajouter.
     */
    fun afficher(context: Context): Boolean {
        val c = context.applicationContext
        contexte = c
        if (vue != null) return true
        if (!Settings.canDrawOverlays(c)) return false

        val nouvelle = GroupeBoutonsFlottant(c)
        nouvelle.definirActif(PreferencesBoutonFlottant.canalActif(c), animer = false)
        // Invisible au depart : le groupe apparait en fondu juste apres.
        nouvelle.alpha = 0f
        nouvelle.surAppuiActivation = { surAppui?.invoke() }
        nouvelle.surAppuiEcrire = { basculerChamp() }
        nouvelle.surDeplacement = { dx, dy -> deplacer(dx, dy) }
        nouvelle.surRelachement = { coller() }

        val reglages = creerParametresFenetre()
        placerDepuisPreferences(c, reglages, nouvelle)
        try {
            c.getSystemService(WindowManager::class.java).addView(nouvelle, reglages)
        } catch (e: Exception) {
            return false
        }
        vue = nouvelle
        parametres = reglages
        // Apparition en fondu : le groupe ne surgit jamais d'un coup.
        nouvelle.apparaitre()
        return true
    }

    /** Retire le groupe en fondu. Sans effet s'il n'est pas affiche. */
    fun retirer() {
        animateurCollage?.cancel()
        animateurCollage = null
        retirerChampImmediatement()
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

    /** Dessine le groupe selon l'etat du canal en direct. */
    fun definirEtatCanal(actif: Boolean) {
        // Canal coupe : plus rien a ecrire a Classinus, le champ se referme (comme le panneau du PC).
        if (!actif) fermerChamp()
        vue?.definirActif(actif)
    }

    /** Ouvre le champ de saisie s'il est ferme, le ferme sinon. */
    private fun basculerChamp() {
        if (champ != null) fermerChamp() else ouvrirChamp()
    }

    private fun ouvrirChamp() {
        val c = contexte ?: return
        if (champ != null || vue == null) return
        val nouveau = ChampEcritureFlottant(c)
        nouveau.surEnvoi = { texte ->
            surTexteEcrit?.invoke(texte)
            // Le clavier cacherait l'ecran : apres l'envoi le champ se referme.
            fermerChamp()
        }
        nouveau.surFermeture = { fermerChamp() }
        try {
            c.getSystemService(WindowManager::class.java).addView(nouveau, creerParametresChamp())
        } catch (e: Exception) {
            return
        }
        champ = nouveau
        vue?.definirChampOuvert(true)
        nouveau.apparaitre()
        // Le clavier s'ouvre sur le champ des que la fenetre a le focus.
        nouveau.post {
            val saisie = nouveau.champDeSaisie()
            saisie.requestFocus()
            c.getSystemService(InputMethodManager::class.java)?.showSoftInput(saisie, InputMethodManager.SHOW_IMPLICIT)
        }
    }

    /** Referme le champ en fondu. Sans effet s'il est deja ferme. */
    private fun fermerChamp() {
        val aRetirer = champ ?: return
        champ = null
        vue?.definirChampOuvert(false)
        val c = contexte
        c?.getSystemService(InputMethodManager::class.java)
            ?.hideSoftInputFromWindow(aRetirer.windowToken, 0)
        aRetirer.disparaitre {
            try {
                c?.getSystemService(WindowManager::class.java)?.removeView(aRetirer)
            } catch (e: Exception) {
                // Deja retire : rien a faire.
            }
        }
    }

    /** Retrait sans animation (arret du service) : la fenetre ne doit jamais survivre au gestionnaire. */
    private fun retirerChampImmediatement() {
        val aRetirer = champ ?: return
        champ = null
        aRetirer.animate().cancel()
        try {
            contexte?.getSystemService(WindowManager::class.java)?.removeView(aRetirer)
        } catch (e: Exception) {
            // Deja retire : rien a faire.
        }
    }

    /** A rappeler apres une rotation ou un changement de taille d'ecran. */
    fun replacer() {
        val c = contexte ?: return
        val v = vue ?: return
        val reglages = parametres ?: return
        // Pendant un glissement c'est le doigt qui place le groupe, pas les preferences.
        if (v.enGlissement) return
        animateurCollage?.cancel()
        placerDepuisPreferences(c, reglages, v)
        try {
            c.getSystemService(WindowManager::class.java).updateViewLayout(v, reglages)
        } catch (e: Exception) {
            // La fenetre a disparu entre-temps : rien a replacer.
        }
    }

    private fun marge(): Int = (MARGE_BORD_DP * (contexte?.resources?.displayMetrics?.density ?: 1f)).toInt()

    /** Mesure le groupe s'il n'a pas encore de taille (avant l'ajout de la fenetre). */
    private fun mesurer(v: View) {
        if (v.width > 0 && v.height > 0) return
        val libre = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
        v.measure(libre, libre)
    }

    private fun largeur(v: View): Int = if (v.width > 0) v.width else v.measuredWidth

    private fun hauteur(v: View): Int = if (v.height > 0) v.height else v.measuredHeight

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

    /** Place la fenetre selon le bord et la hauteur gardes : ancree au bord choisi, a une marge de ce bord. */
    private fun placerDepuisPreferences(c: Context, reglages: WindowManager.LayoutParams, v: View) {
        mesurer(v)
        val ecran = limitesEcran(c)
        ancreADroite = PreferencesBoutonFlottant.coteDroit(c)
        reglages.gravity = Gravity.TOP or (if (ancreADroite) Gravity.RIGHT else Gravity.LEFT)
        reglages.x = marge()
        val hauteurLibre = (ecran.height() - hauteur(v)).coerceAtLeast(0)
        reglages.y = (PreferencesBoutonFlottant.positionVerticale(c) * hauteurLibre).toInt()
    }

    /** Pendant un glissement x se compte depuis la gauche : convertit une fenetre ancree a droite. */
    private fun compterDepuisLaGauche(reglages: WindowManager.LayoutParams, ecran: Rect, l: Int) {
        if (!ancreADroite) return
        reglages.x = (ecran.width() - l - reglages.x).coerceAtLeast(0)
        reglages.gravity = Gravity.TOP or Gravity.LEFT
        ancreADroite = false
    }

    private fun deplacer(dx: Float, dy: Float) {
        val c = contexte ?: return
        val v = vue ?: return
        val reglages = parametres ?: return
        animateurCollage?.cancel()
        val ecran = limitesEcran(c)
        val l = largeur(v)
        compterDepuisLaGauche(reglages, ecran, l)
        reglages.x = (reglages.x + dx.toInt()).coerceIn(0, (ecran.width() - l).coerceAtLeast(0))
        reglages.y = (reglages.y + dy.toInt()).coerceIn(0, (ecran.height() - hauteur(v)).coerceAtLeast(0))
        try {
            c.getSystemService(WindowManager::class.java).updateViewLayout(v, reglages)
        } catch (e: Exception) {
            // Fenetre disparue : ignore.
        }
    }

    /**
     * Colle le groupe au bord le plus proche avec une animation, puis garde sa
     * position. La fenetre s'ancre tout de suite a ce bord : x devient la distance
     * a ce bord, et l'animation la ramene a la marge.
     */
    private fun coller() {
        val c = contexte ?: return
        val v = vue ?: return
        val reglages = parametres ?: return
        val ecran = limitesEcran(c)
        val l = largeur(v)
        compterDepuisLaGauche(reglages, ecran, l)
        val coteDroit = reglages.x + l / 2 > ecran.width() / 2
        val hauteurLibre = (ecran.height() - hauteur(v)).coerceAtLeast(1)
        PreferencesBoutonFlottant.definirPosition(c, coteDroit, reglages.y.toFloat() / hauteurLibre)

        val xDepart = if (coteDroit) (ecran.width() - l - reglages.x).coerceAtLeast(0) else reglages.x
        reglages.gravity = Gravity.TOP or (if (coteDroit) Gravity.RIGHT else Gravity.LEFT)
        reglages.x = xDepart
        ancreADroite = coteDroit

        animateurCollage?.cancel()
        animateurCollage = ValueAnimator.ofInt(xDepart, marge()).apply {
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

    /**
     * Fenetre du champ de saisie : pleine largeur, collee en bas, au dessus du clavier.
     * Contrairement a celle du groupe, elle prend le focus (sinon le clavier ne
     * s'ouvrirait pas) et se redimensionne avec le clavier pour rester juste au dessus.
     */
    private fun creerParametresChamp(): WindowManager.LayoutParams {
        val drapeaux = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            drapeaux,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.LEFT
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or
                WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE
            title = "ClassinusChampEcriture"
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
            // Ancrage reel (gauche ou droite) pose par placerDepuisPreferences : ni START ni
            // END, qui s'inverseraient sur un telephone configure de droite a gauche.
            gravity = Gravity.TOP or Gravity.LEFT
            title = "ClassinusBoutonFlottant"
        }
    }
}
