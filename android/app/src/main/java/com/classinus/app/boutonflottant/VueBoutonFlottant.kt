// Cree le 13/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android. Code COMMUN aux deux flavors (src/main).
//
// Le dessin du bouton : un rond avec le symbole "radio" (un point et deux arcs
// de chaque cote), le meme que le bouton du canal dans l'appli. Au repos il est
// sombre et discret, canal actif il est or. Le passage d'un etat a l'autre est
// anime (jamais de changement brut).
//
// Cette vue ne sait RIEN du canal : elle signale seulement un appui (surAppui),
// un deplacement (surDeplacement) et un relachement apres glissement
// (surRelachement). C'est le gestionnaire qui decide quoi en faire.
package com.classinus.app.boutonflottant

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.core.content.ContextCompat
import com.classinus.app.R

class VueBoutonFlottant(context: Context) : View(context) {

    companion object {
        const val TAILLE_DP = 52f
        private const val ALPHA_REPOS = 0.6f
        private const val DUREE_TRANSITION_MS = 200L
        private const val ECHELLE_APPUI = 0.92f
        private const val DUREE_APPUI_MS = 90L
    }

    /** Appui court sans glissement. */
    var surAppui: (() -> Unit)? = null

    /** Glissement en cours : deplacement en pixels depuis le dernier evenement. */
    var surDeplacement: ((dx: Float, dy: Float) -> Unit)? = null

    /** Doigt leve apres un glissement. */
    var surRelachement: (() -> Unit)? = null

    private val densite = context.resources.displayMetrics.density
    private val tailleDpEnPixels = (TAILLE_DP * densite).toInt()
    private val seuilGlissement = android.view.ViewConfiguration.get(context).scaledTouchSlop

    private val couleurReposFond = ContextCompat.getColor(context, R.color.bouton_flottant_repos_fond)
    private val couleurReposTrait = ContextCompat.getColor(context, R.color.bouton_flottant_repos_trait)
    private val couleurReposContour = ContextCompat.getColor(context, R.color.bouton_flottant_repos_contour)
    private val couleurActifFond = ContextCompat.getColor(context, R.color.bouton_flottant_actif_fond)
    private val couleurActifTrait = ContextCompat.getColor(context, R.color.bouton_flottant_actif_trait)
    private val couleurActifContour = ContextCompat.getColor(context, R.color.bouton_flottant_actif_contour)

    private val pinceauFond = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val pinceauContour = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.5f * densite
    }
    private val pinceauTrait = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeWidth = 2f * densite
    }
    private val pinceauPoint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val zoneArc = RectF()
    private val evaluateurCouleur = ArgbEvaluator()

    // 0 = repos, 1 = canal actif. Anime entre les deux.
    private var progression = 0f
    private var animateurProgression: ValueAnimator? = null

    private var departX = 0f
    private var departY = 0f
    private var dernierX = 0f
    private var dernierY = 0f
    private var glissementEnCours = false
    private var glissementDemarre = false

    init {
        alpha = ALPHA_REPOS
        isClickable = true
        contentDescription = context.getString(R.string.bouton_flottant_description_inactif)
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(tailleDpEnPixels, tailleDpEnPixels)
    }

    /** Passe du repos au canal actif (ou l'inverse) avec une transition douce. Thread principal. */
    fun definirActif(actif: Boolean, animer: Boolean = true) {
        contentDescription = context.getString(
            if (actif) R.string.bouton_flottant_description_actif else R.string.bouton_flottant_description_inactif,
        )
        val cible = if (actif) 1f else 0f
        animateurProgression?.cancel()
        if (!animer || !isAttachedToWindow) {
            progression = cible
            alpha = if (actif) 1f else ALPHA_REPOS
            invalidate()
            return
        }
        animateurProgression = ValueAnimator.ofFloat(progression, cible).apply {
            duration = DUREE_TRANSITION_MS
            interpolator = DecelerateInterpolator()
            addUpdateListener {
                progression = it.animatedValue as Float
                if (!glissementDemarre) alpha = ALPHA_REPOS + (1f - ALPHA_REPOS) * progression
                invalidate()
            }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        animateurProgression?.cancel()
        animate().cancel()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        val centreX = width / 2f
        val centreY = height / 2f
        val rayon = minOf(width, height) / 2f - pinceauContour.strokeWidth

        pinceauFond.color = evaluateurCouleur.evaluate(progression, couleurReposFond, couleurActifFond) as Int
        pinceauContour.color = evaluateurCouleur.evaluate(progression, couleurReposContour, couleurActifContour) as Int
        val couleurTrait = evaluateurCouleur.evaluate(progression, couleurReposTrait, couleurActifTrait) as Int
        pinceauTrait.color = couleurTrait
        pinceauPoint.color = couleurTrait

        canvas.drawCircle(centreX, centreY, rayon, pinceauFond)
        canvas.drawCircle(centreX, centreY, rayon, pinceauContour)

        // Symbole radio : un point au centre, deux arcs de chaque cote.
        canvas.drawCircle(centreX, centreY, 2.6f * densite, pinceauPoint)
        val petitRayon = 7f * densite
        val grandRayon = 11.5f * densite
        for (rayonArc in floatArrayOf(petitRayon, grandRayon)) {
            zoneArc.set(centreX - rayonArc, centreY - rayonArc, centreX + rayonArc, centreY + rayonArc)
            canvas.drawArc(zoneArc, -40f, 80f, false, pinceauTrait)
            canvas.drawArc(zoneArc, 140f, 80f, false, pinceauTrait)
        }
    }

    override fun onTouchEvent(evenement: MotionEvent): Boolean {
        when (evenement.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                departX = evenement.rawX
                departY = evenement.rawY
                dernierX = departX
                dernierY = departY
                glissementEnCours = false
                glissementDemarre = false
                animate().cancel()
                animate().scaleX(ECHELLE_APPUI).scaleY(ECHELLE_APPUI).setDuration(DUREE_APPUI_MS).start()
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val dxTotal = evenement.rawX - departX
                val dyTotal = evenement.rawY - departY
                if (!glissementEnCours && (dxTotal * dxTotal + dyTotal * dyTotal) > seuilGlissement * seuilGlissement) {
                    glissementEnCours = true
                    glissementDemarre = true
                    // Pendant le glissement le bouton est bien visible.
                    animate().alpha(1f).setDuration(DUREE_APPUI_MS).start()
                }
                if (glissementEnCours) {
                    surDeplacement?.invoke(evenement.rawX - dernierX, evenement.rawY - dernierY)
                }
                dernierX = evenement.rawX
                dernierY = evenement.rawY
                return true
            }
            MotionEvent.ACTION_UP -> {
                animate().scaleX(1f).scaleY(1f).setDuration(DUREE_APPUI_MS).start()
                if (glissementEnCours) {
                    glissementEnCours = false
                    glissementDemarre = false
                    animate().alpha(ALPHA_REPOS + (1f - ALPHA_REPOS) * progression).setDuration(DUREE_TRANSITION_MS).start()
                    surRelachement?.invoke()
                } else {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                    performClick()
                    surAppui?.invoke()
                }
                return true
            }
            MotionEvent.ACTION_CANCEL -> {
                animate().scaleX(1f).scaleY(1f).setDuration(DUREE_APPUI_MS).start()
                if (glissementEnCours) {
                    glissementEnCours = false
                    glissementDemarre = false
                    animate().alpha(ALPHA_REPOS + (1f - ALPHA_REPOS) * progression).setDuration(DUREE_TRANSITION_MS).start()
                    surRelachement?.invoke()
                }
                return true
            }
        }
        return super.onTouchEvent(evenement)
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }
}
