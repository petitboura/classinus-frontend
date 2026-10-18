// Cree le 17/10/2026, demande Bourama : lot 4 du bouton flottant natif Android
// (micro de dictee et mode vocal). Code COMMUN aux deux flavors (src/main).
//
// La bulle de la voix : le petit rond qui suit la fleche de Classinus pendant la
// conversation vocale, comme celui du PC (components/voix/VoixDirecteSuperposition.tsx,
// bulle du canal). Dedans, la meme onde miniature que components/voix/OndeVoix.tsx
// (version "mini") : deux courbes et leur miroir, qui vacillent selon le son et changent
// d'aspect selon l'etat, sans aucun texte :
//   - ecoute : lignes fines qui suivent la voix de l'etudiant ;
//   - reponse : ondes pleines, plus amples, qui suivent la voix de Classinus ;
//   - travail : une ligne presque plate qui respire lentement ;
//   - silence : une ligne presque immobile.
//
// Cette vue ne decide de rien et n'est pas touchable : la page envoie l'etat et les niveaux
// sonores (definirEtat), le gestionnaire (BulleEtCurseurManager) la place pres de la fleche.
// Le dessin se rejoue a chaque image tant que la vue est a l'ecran, avec des valeurs lissees
// pour qu'aucun changement ne soit brut.
//
// Tout ce qui touche aux vues se fait sur le thread principal.
package com.classinus.app.boutonflottant

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import androidx.core.content.ContextCompat
import android.view.View
import com.classinus.app.R
import kotlin.math.PI
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

class BulleVoixFlottante(context: Context) : View(context) {

    companion object {
        const val TAILLE_DP = 56f
        private const val DUREE_APPARITION_MS = 250L
        private const val PAS_DP = 3f
        private const val HAUTEUR_MAX_FRACTION = 0.42f
        private const val EPAISSEUR_EN_PLUS_DP = 0.8f

        private val FREQUENCES = floatArrayOf(1.6f, 2.3f)
        private val VITESSES = floatArrayOf(1.1f, -0.8f)
        private val PHASES = floatArrayOf(0f, 1.7f)
        private val OPACITES = floatArrayOf(1f, 0.6f)
    }

    private val densite = context.resources.displayMetrics.density
    private val taillePx = (TAILLE_DP * densite).toInt()

    private var etat = "inactif"
    private var entree = 0f
    private var sortie = 0f

    // Valeurs affichees : elles rejoignent la cible en douceur.
    private var amplitude = 0.04f
    private var remplissage = 0f
    private var epaisseur = 2f
    private var phase = 0f
    private var dernierTemps = 0L

    private val pinceauFond = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = ContextCompat.getColor(context, R.color.bouton_flottant_champ_fond)
    }
    private val pinceauContour = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.5f * densite
        color = ContextCompat.getColor(context, R.color.bouton_flottant_champ_contour)
    }
    private val pinceauOnde = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        color = ContextCompat.getColor(context, R.color.bouton_flottant_actif_fond)
    }
    private val pinceauRemplissage = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = ContextCompat.getColor(context, R.color.bouton_flottant_actif_fond)
    }
    private val zoneRonde = Path()
    private val trace = Path()
    private val remplir = Path()

    init {
        // Decorative : la voix de Classinus s'entend, la bulle n'ajoute rien pour TalkBack.
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    /** Etat de la voix (ecoute, reponse, travail, silence) et niveaux sonores de 0 a 1. */
    fun definirEtat(nouvelEtat: String, niveauEntree: Float, niveauSortie: Float) {
        etat = nouvelEtat
        entree = niveauEntree.coerceIn(0f, 1f)
        sortie = niveauSortie.coerceIn(0f, 1f)
    }

    /** Apparition en fondu avec un zoom (comme celle du PC) : la bulle ne surgit jamais d'un coup. */
    fun apparaitre() {
        animate().cancel()
        alpha = 0f
        scaleX = 0.6f
        scaleY = 0.6f
        animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(DUREE_APPARITION_MS).start()
    }

    /** Disparition en fondu, puis action de fin (retrait de la fenetre). */
    fun disparaitre(apres: () -> Unit) {
        animate().cancel()
        animate().alpha(0f).scaleX(0.6f).scaleY(0.6f).setDuration(DUREE_APPARITION_MS).withEndAction { apres() }.start()
    }

    override fun onMeasure(largeurSpec: Int, hauteurSpec: Int) {
        setMeasuredDimension(taillePx, taillePx)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        dernierTemps = 0L
    }

    override fun onDetachedFromWindow() {
        animate().cancel()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        val largeur = width.toFloat()
        val hauteur = height.toFloat()
        if (largeur <= 0f || hauteur <= 0f) return
        val maintenant = System.nanoTime()
        val dt = if (dernierTemps == 0L) 0.016f else min(0.05f, (maintenant - dernierTemps) / 1_000_000_000f)
        dernierTemps = maintenant
        val t = maintenant / 1_000_000_000f
        mettreAJourAspect(dt, t)

        val rayon = min(largeur, hauteur) / 2f - pinceauContour.strokeWidth / 2f
        canvas.drawCircle(largeur / 2f, hauteur / 2f, rayon, pinceauFond)

        canvas.save()
        zoneRonde.reset()
        zoneRonde.addCircle(largeur / 2f, hauteur / 2f, rayon, Path.Direction.CW)
        canvas.clipPath(zoneRonde)
        dessinerOndes(canvas, largeur, hauteur)
        canvas.restore()

        canvas.drawCircle(largeur / 2f, hauteur / 2f, rayon, pinceauContour)
        // Tant que la vue est a l'ecran, l'onde se redessine a l'image suivante.
        postInvalidateOnAnimation()
    }

    private fun mettreAJourAspect(dt: Float, t: Float) {
        val amplitudeCible: Float
        val remplissageCible: Float
        val epaisseurCible: Float
        val vitesse: Float
        when (etat) {
            "ecoute" -> {
                amplitudeCible = 0.1f + entree * 0.9f; remplissageCible = 0f; epaisseurCible = 2f; vitesse = 1f
            }
            "reponse" -> {
                amplitudeCible = 0.18f + sortie; remplissageCible = 1f; epaisseurCible = 2.5f; vitesse = 1.6f
            }
            "travail" -> {
                amplitudeCible = 0.05f + 0.04f * sin(t * 1.6f); remplissageCible = 0f; epaisseurCible = 2f; vitesse = 0.5f
            }
            "silence" -> {
                amplitudeCible = 0.02f; remplissageCible = 0f; epaisseurCible = 1.5f; vitesse = 0.25f
            }
            else -> {
                amplitudeCible = 0.04f; remplissageCible = 0f; epaisseurCible = 2f; vitesse = 0.4f
            }
        }
        val lissage = 1f - 0.0005f.pow(dt)
        amplitude += (amplitudeCible - amplitude) * min(1f, lissage * 1.5f)
        remplissage += (remplissageCible - remplissage) * min(1f, lissage)
        epaisseur += (epaisseurCible - epaisseur) * min(1f, lissage)
        phase += dt * vitesse
    }

    private fun dessinerOndes(canvas: Canvas, largeur: Float, hauteur: Float) {
        val milieu = hauteur / 2f
        val hauteurMax = hauteur * HAUTEUR_MAX_FRACTION
        val pas = PAS_DP * densite
        pinceauOnde.strokeWidth = (epaisseur + EPAISSEUR_EN_PLUS_DP) * densite
        for (i in FREQUENCES.indices) {
            val echelle = hauteurMax * amplitude * (OPACITES[i] * 0.6f + 0.4f)
            pinceauOnde.alpha = (OPACITES[i] * 255).toInt()

            trace.reset()
            var x = 0f
            while (true) {
                val y = milieu + decalage(x / largeur, i) * echelle
                if (x == 0f) trace.moveTo(x, y) else trace.lineTo(x, y)
                if (x >= largeur) break
                x = min(x + pas, largeur)
            }
            canvas.drawPath(trace, pinceauOnde)

            // Face miroir : l'onde respire des deux cotes.
            trace.reset()
            x = 0f
            while (true) {
                val y = milieu - decalage(x / largeur, i) * echelle
                if (x == 0f) trace.moveTo(x, y) else trace.lineTo(x, y)
                if (x >= largeur) break
                x = min(x + pas, largeur)
            }
            canvas.drawPath(trace, pinceauOnde)

            if (remplissage > 0.01f) {
                remplir.reset()
                x = 0f
                while (true) {
                    val y = milieu + decalage(x / largeur, i) * echelle
                    if (x == 0f) remplir.moveTo(x, y) else remplir.lineTo(x, y)
                    if (x >= largeur) break
                    x = min(x + pas, largeur)
                }
                x = largeur
                while (true) {
                    remplir.lineTo(x, milieu - decalage(x / largeur, i) * echelle)
                    if (x <= 0f) break
                    x = maxOf(x - pas, 0f)
                }
                remplir.close()
                pinceauRemplissage.alpha = (OPACITES[i] * 0.16f * remplissage * 255).toInt()
                canvas.drawPath(remplir, pinceauRemplissage)
            }
        }
    }

    /** Forme de la courbe i en un point (progression de 0 a 1), sans l'amplitude : de -1 a 1. */
    private fun decalage(progression: Float, i: Int): Float {
        val enveloppe = sin(PI.toFloat() * progression).pow(2)
        val onde = sin(progression * PI.toFloat() * 2f * FREQUENCES[i] + phase * VITESSES[i] * 3f + PHASES[i])
        return onde * enveloppe
    }
}
