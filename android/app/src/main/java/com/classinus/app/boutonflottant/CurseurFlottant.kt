// Cree le 17/10/2026, demande Bourama : lot 3 du bouton flottant natif Android
// (bulle de reponse et fleche). Code COMMUN aux deux flavors (src/main).
//
// La fleche de Classinus, comme le curseur du PC (components/CurseurVirtuelAgent.tsx) :
// une fleche de souris doree que l'etudiant peut faire glisser ou toucher. La bulle de
// reponse se place pres de sa pointe, et la toucher fait reapparaitre la derniere reponse
// (ou la referme si elle est affichee).
//
// Cette vue ne sait RIEN de la bulle ni du canal : elle signale un appui court
// (surAppui) ou un glissement (surDeplacement, surRelachement). Le gestionnaire
// (BulleEtCurseurManager) decide. Pas de gestes ailleurs que sur la fleche : la
// fenetre ne couvre que sa propre zone, partout ailleurs les gestes vont a l'appli
// en dessous.
//
// Tout ce qui touche aux vues se fait sur le thread principal.
package com.classinus.app.boutonflottant

import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import androidx.core.content.ContextCompat
import androidx.core.graphics.PathParser
import com.classinus.app.R

class CurseurFlottant(context: Context) : View(context) {

    companion object {
        /** Zone tactile : assez grande pour un doigt, la fleche est dessinee dans son coin haut gauche. */
        const val TAILLE_ZONE_DP = 48f
        const val TAILLE_FLECHE_DP = 28f
        private const val DECALAGE_POINTE_DP = 6f
        private const val DUREE_APPARITION_MS = 200L
        private const val ECHELLE_APPUI = 0.9f
        private const val DUREE_APPUI_MS = 90L

        // Forme "souris" a 24 unites, la meme que l'icone du curseur du PC (lucide MousePointer2).
        private const val FORME_FLECHE =
            "M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58" +
                "a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"
        private const val TAILLE_FORME = 24f
    }

    /** Appui court sans glissement : afficher ou masquer la derniere reponse. */
    var surAppui: (() -> Unit)? = null

    /** Le doigt deplace la fleche de (dx, dy) pixels depuis le dernier appel. */
    var surDeplacement: ((dx: Float, dy: Float) -> Unit)? = null

    /** Le doigt quitte la fleche apres un glissement : la position est a garder. */
    var surRelachement: (() -> Unit)? = null

    private val densite = context.resources.displayMetrics.density
    val tailleZonePx: Int = (TAILLE_ZONE_DP * densite).toInt()

    /** Distance entre le bord haut gauche de la zone et la pointe de la fleche, en pixels (identique sur x et y). */
    val decalagePointePx: Int = (DECALAGE_POINTE_DP * densite).toInt()

    private val seuilGlissement = ViewConfiguration.get(context).scaledTouchSlop

    private val pinceauFond = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = ContextCompat.getColor(context, R.color.bouton_flottant_actif_fond)
    }
    private val pinceauContour = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeJoin = Paint.Join.ROUND
        strokeWidth = 2.5f * densite
        color = ContextCompat.getColor(context, R.color.vision_ecran_contour)
    }

    private val forme: Path = PathParser.createPathFromPathData(FORME_FLECHE) ?: Path()
    private val formeEchelle = Path()

    private var departX = 0f
    private var departY = 0f
    private var dernierX = 0f
    private var dernierY = 0f
    private var enGlissement = false

    init {
        // La pointe de la forme est a (4, 4) sur 24 : l'echelle et le decalage la posent a
        // decalagePointePx du coin de la zone.
        val echelle = TAILLE_FLECHE_DP * densite / TAILLE_FORME
        val matrice = Matrix().apply {
            setScale(echelle, echelle)
            postTranslate(decalagePointePx - 4f * echelle, decalagePointePx - 4f * echelle)
        }
        forme.transform(matrice, formeEchelle)
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
        isClickable = true
    }

    /** Apparition en fondu avec un leger zoom : la fleche ne surgit jamais d'un coup. */
    fun apparaitre() {
        animate().cancel()
        alpha = 0f
        scaleX = 0.7f
        scaleY = 0.7f
        animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(DUREE_APPARITION_MS).start()
    }

    /** Disparition en fondu, puis action de fin (retrait de la fenetre). */
    fun disparaitre(apres: () -> Unit) {
        animate().cancel()
        animate().alpha(0f).scaleX(0.7f).scaleY(0.7f).setDuration(DUREE_APPARITION_MS).withEndAction { apres() }.start()
    }

    override fun onMeasure(largeurSpec: Int, hauteurSpec: Int) {
        setMeasuredDimension(tailleZonePx, tailleZonePx)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        // Contour clair d'abord pour que la fleche reste visible sur n'importe quel fond.
        canvas.drawPath(formeEchelle, pinceauContour)
        canvas.drawPath(formeEchelle, pinceauFond)
    }

    override fun onTouchEvent(evenement: MotionEvent): Boolean {
        when (evenement.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                departX = evenement.rawX
                departY = evenement.rawY
                dernierX = departX
                dernierY = departY
                enGlissement = false
                animate().cancel()
                animate().scaleX(ECHELLE_APPUI).scaleY(ECHELLE_APPUI).setDuration(DUREE_APPUI_MS).start()
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                if (!enGlissement) {
                    val ecartX = evenement.rawX - departX
                    val ecartY = evenement.rawY - departY
                    if (ecartX * ecartX + ecartY * ecartY < seuilGlissement * seuilGlissement) return true
                    enGlissement = true
                    parent?.requestDisallowInterceptTouchEvent(true)
                }
                surDeplacement?.invoke(evenement.rawX - dernierX, evenement.rawY - dernierY)
                dernierX = evenement.rawX
                dernierY = evenement.rawY
                return true
            }
            MotionEvent.ACTION_UP -> {
                animate().cancel()
                animate().scaleX(1f).scaleY(1f).setDuration(DUREE_APPUI_MS).start()
                if (enGlissement) {
                    surRelachement?.invoke()
                } else {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                    performClick()
                }
                enGlissement = false
                return true
            }
            MotionEvent.ACTION_CANCEL -> {
                animate().cancel()
                animate().scaleX(1f).scaleY(1f).setDuration(DUREE_APPUI_MS).start()
                if (enGlissement) surRelachement?.invoke()
                enGlissement = false
                return true
            }
        }
        return super.onTouchEvent(evenement)
    }

    override fun performClick(): Boolean {
        super.performClick()
        surAppui?.invoke()
        return true
    }

    override fun onDetachedFromWindow() {
        animate().cancel()
        super.onDetachedFromWindow()
    }
}
