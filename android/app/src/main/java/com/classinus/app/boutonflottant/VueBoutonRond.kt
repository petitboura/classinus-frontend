// Cree le 17/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android. Code COMMUN aux deux flavors (src/main).
//
// Un bouton rond du groupe flottant, dessine comme les boutons ronds du bouton
// du PC : un rond avec une icone au centre. Les icones : le symbole "radio" (un
// point et deux arcs de chaque cote) du bouton qui active le canal, le chevron
// (vers le haut ou vers le bas) qui deplie et replie le groupe, le crayon du
// bouton Ecrire, la fleche d'envoi du champ de saisie, le micro de la dictee
// (et le carre qui l'arrete) et les barres du mode vocal (lot 4).
// Au repos le rond est sombre, actif (canal en direct, champ Ecrire ouvert,
// dictee ou voix en cours) il est or. Le passage d'un etat a l'autre est anime
// (jamais de changement brut). Le bouton peut aussi pulser doucement (dictee ou
// reponse en cours, comme animate-pulse du PC) et etre grise (non touchable).
//
// Cette vue ne sait RIEN du canal ni du groupe : elle signale seulement un appui
// (surAppui). Le glissement du groupe entier est gere par GroupeBoutonsFlottant,
// qui reprend la main des qu'un doigt se deplace au dela du seuil.
package com.classinus.app.boutonflottant

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.animation.DecelerateInterpolator
import androidx.core.content.ContextCompat
import com.classinus.app.R

class VueBoutonRond(context: Context, iconeInitiale: Icone) : View(context) {

    enum class Icone { RADIO, CHEVRON_HAUT, CHEVRON_BAS, CRAYON, ENVOYER, MICRO, CARRE, BARRES }

    companion object {
        const val TAILLE_DP = 52f
        private const val DUREE_TRANSITION_MS = 200L
        private const val ECHELLE_APPUI = 0.92f
        private const val DUREE_APPUI_MS = 90L
        private const val DUREE_PULSATION_MS = 900L
        private const val ALPHA_PULSATION_BAS = 0.5f
        private const val ALPHA_GRISE = 0.5f
    }

    /** Appui court sans glissement. */
    var surAppui: (() -> Unit)? = null

    /** Icone dessinee au centre. Peut changer (le chevron se retourne quand le groupe se deplie). */
    var icone: Icone = iconeInitiale
        set(valeur) {
            if (field == valeur) return
            field = valeur
            invalidate()
        }

    private val densite = context.resources.displayMetrics.density
    private val tailleEnPixels = (TAILLE_DP * densite).toInt()
    private val seuilGlissement = ViewConfiguration.get(context).scaledTouchSlop

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
        strokeJoin = Paint.Join.ROUND
        strokeWidth = 2f * densite
    }
    private val pinceauPoint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val zoneArc = RectF()
    private val traceChevron = Path()
    private val traceIcone = Path()
    private val evaluateurCouleur = ArgbEvaluator()

    // 0 = repos, 1 = canal actif. Anime entre les deux.
    private var progression = 0f
    private var animateurProgression: ValueAnimator? = null

    private var departX = 0f
    private var departY = 0f
    private var deplace = false

    private var animateurPulsation: ValueAnimator? = null
    private var grise = false

    private val zoneCapsule = RectF()

    init {
        isClickable = true
    }

    /** Pulsation douce de l'opacite (dictee en cours, reponse en cours). Thread principal. */
    fun definirPulsation(actif: Boolean) {
        if (actif == (animateurPulsation != null)) return
        if (!actif) {
            arreterPulsation()
            alpha = if (grise) ALPHA_GRISE else 1f
            return
        }
        animateurPulsation = ValueAnimator.ofFloat(1f, ALPHA_PULSATION_BAS).apply {
            duration = DUREE_PULSATION_MS
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
            addUpdateListener { alpha = it.animatedValue as Float }
            start()
        }
    }

    /** Bouton grise : l'appui ne fait rien (transcription ou connexion en cours). */
    fun definirGrise(valeur: Boolean) {
        if (valeur == grise) return
        grise = valeur
        isEnabled = !valeur
        if (animateurPulsation == null) alpha = if (valeur) ALPHA_GRISE else 1f
    }

    private fun arreterPulsation() {
        animateurPulsation?.cancel()
        animateurPulsation = null
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(tailleEnPixels, tailleEnPixels)
    }

    /** Passe du repos a l'etat actif (ou l'inverse) avec une transition douce. Thread principal. */
    fun definirActif(actif: Boolean, animer: Boolean = true) {
        val cible = if (actif) 1f else 0f
        animateurProgression?.cancel()
        if (!animer || !isAttachedToWindow) {
            progression = cible
            invalidate()
            return
        }
        animateurProgression = ValueAnimator.ofFloat(progression, cible).apply {
            duration = DUREE_TRANSITION_MS
            interpolator = DecelerateInterpolator()
            addUpdateListener {
                progression = it.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        animateurProgression?.cancel()
        arreterPulsation()
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

        when (icone) {
            Icone.RADIO -> dessinerRadio(canvas, centreX, centreY)
            Icone.CHEVRON_HAUT -> dessinerChevron(canvas, centreX, centreY, versLeHaut = true)
            Icone.CHEVRON_BAS -> dessinerChevron(canvas, centreX, centreY, versLeHaut = false)
            Icone.CRAYON -> dessinerCrayon(canvas, centreX, centreY)
            Icone.ENVOYER -> dessinerFlecheEnvoi(canvas, centreX, centreY)
            Icone.MICRO -> dessinerMicro(canvas, centreX, centreY)
            Icone.CARRE -> dessinerCarre(canvas, centreX, centreY)
            Icone.BARRES -> dessinerBarres(canvas, centreX, centreY)
        }
    }

    /** Micro (comme le Mic du PC) : la capsule, le U qui l'entoure, le pied et sa base. */
    private fun dessinerMicro(canvas: Canvas, centreX: Float, centreY: Float) {
        val d = densite
        zoneCapsule.set(centreX - 3.2f * d, centreY - 8.5f * d, centreX + 3.2f * d, centreY + 2.5f * d)
        canvas.drawRoundRect(zoneCapsule, 3.2f * d, 3.2f * d, pinceauTrait)
        val rayonU = 6.5f * d
        zoneArc.set(centreX - rayonU, centreY - 1f * d - rayonU, centreX + rayonU, centreY - 1f * d + rayonU)
        canvas.drawArc(zoneArc, 0f, 180f, false, pinceauTrait)
        canvas.drawLine(centreX, centreY + 5.5f * d, centreX, centreY + 9f * d, pinceauTrait)
        canvas.drawLine(centreX - 3f * d, centreY + 9f * d, centreX + 3f * d, centreY + 9f * d, pinceauTrait)
    }

    /** Carre (comme le Square qui arrete la dictee sur le PC). */
    private fun dessinerCarre(canvas: Canvas, centreX: Float, centreY: Float) {
        val d = densite
        zoneCapsule.set(centreX - 5f * d, centreY - 5f * d, centreX + 5f * d, centreY + 5f * d)
        canvas.drawRoundRect(zoneCapsule, 1.5f * d, 1.5f * d, pinceauTrait)
    }

    /** Barres verticales de hauteurs differentes (comme le AudioLines du mode vocal du PC). */
    private fun dessinerBarres(canvas: Canvas, centreX: Float, centreY: Float) {
        val d = densite
        val decalages = floatArrayOf(-8f, -4f, 0f, 4f, 8f)
        val demiHauteurs = floatArrayOf(2.5f, 6f, 9f, 5.5f, 2.5f)
        for (i in decalages.indices) {
            val x = centreX + decalages[i] * d
            canvas.drawLine(x, centreY - demiHauteurs[i] * d, x, centreY + demiHauteurs[i] * d, pinceauTrait)
        }
    }

    /** Crayon (comme le PenLine du bouton Ecrire du PC) : le corps en biais, sa pointe, et un trait dessous. */
    private fun dessinerCrayon(canvas: Canvas, centreX: Float, centreY: Float) {
        val d = densite
        traceIcone.reset()
        traceIcone.moveTo(centreX + 4.5f * d, centreY - 7.5f * d)
        traceIcone.lineTo(centreX + 7.5f * d, centreY - 4.5f * d)
        traceIcone.lineTo(centreX - 2f * d, centreY + 5f * d)
        traceIcone.lineTo(centreX - 6.5f * d, centreY + 6.5f * d)
        traceIcone.lineTo(centreX - 5f * d, centreY + 2f * d)
        traceIcone.close()
        canvas.drawPath(traceIcone, pinceauTrait)
        canvas.drawLine(centreX + 1.5f * d, centreY + 8f * d, centreX + 8f * d, centreY + 8f * d, pinceauTrait)
    }

    /** Fleche vers le haut (comme le ArrowUp du bouton d'envoi du PC). */
    private fun dessinerFlecheEnvoi(canvas: Canvas, centreX: Float, centreY: Float) {
        val d = densite
        canvas.drawLine(centreX, centreY + 7f * d, centreX, centreY - 7f * d, pinceauTrait)
        traceIcone.reset()
        traceIcone.moveTo(centreX - 5.5f * d, centreY - 1.5f * d)
        traceIcone.lineTo(centreX, centreY - 7f * d)
        traceIcone.lineTo(centreX + 5.5f * d, centreY - 1.5f * d)
        canvas.drawPath(traceIcone, pinceauTrait)
    }

    /** Symbole radio : un point au centre, deux arcs de chaque cote. */
    private fun dessinerRadio(canvas: Canvas, centreX: Float, centreY: Float) {
        canvas.drawCircle(centreX, centreY, 2.6f * densite, pinceauPoint)
        val petitRayon = 7f * densite
        val grandRayon = 11.5f * densite
        for (rayonArc in floatArrayOf(petitRayon, grandRayon)) {
            zoneArc.set(centreX - rayonArc, centreY - rayonArc, centreX + rayonArc, centreY + rayonArc)
            canvas.drawArc(zoneArc, -40f, 80f, false, pinceauTrait)
            canvas.drawArc(zoneArc, 140f, 80f, false, pinceauTrait)
        }
    }

    /** Chevron : deux traits qui se rejoignent, la pointe vers le haut ou vers le bas. */
    private fun dessinerChevron(canvas: Canvas, centreX: Float, centreY: Float, versLeHaut: Boolean) {
        val demiLargeur = 5.75f * densite
        val demiHauteur = 2.9f * densite
        val sens = if (versLeHaut) -1f else 1f
        traceChevron.reset()
        traceChevron.moveTo(centreX - demiLargeur, centreY - sens * demiHauteur)
        traceChevron.lineTo(centreX, centreY + sens * demiHauteur)
        traceChevron.lineTo(centreX + demiLargeur, centreY - sens * demiHauteur)
        canvas.drawPath(traceChevron, pinceauTrait)
    }

    override fun onTouchEvent(evenement: MotionEvent): Boolean {
        when (evenement.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                departX = evenement.rawX
                departY = evenement.rawY
                deplace = false
                animate().cancel()
                animate().scaleX(ECHELLE_APPUI).scaleY(ECHELLE_APPUI).setDuration(DUREE_APPUI_MS).start()
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = evenement.rawX - departX
                val dy = evenement.rawY - departY
                if (!deplace && (dx * dx + dy * dy) > seuilGlissement * seuilGlissement) deplace = true
                return true
            }
            MotionEvent.ACTION_UP -> {
                rendreEchelle()
                if (!deplace && isEnabled) {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                    performClick()
                    surAppui?.invoke()
                }
                return true
            }
            MotionEvent.ACTION_CANCEL -> {
                rendreEchelle()
                return true
            }
        }
        return super.onTouchEvent(evenement)
    }

    private fun rendreEchelle() {
        animate().scaleX(1f).scaleY(1f).setDuration(DUREE_APPUI_MS).start()
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }
}
