// Cree le 07/10/2026, demande Bourama : lot 2 du chantier "vision ecran"
// (Clovis pointe, surligne et souligne par-dessus les autres applis),
// branche feature/vision-ecran-android. Code COMMUN aux deux flavors.
//
// Cette vue ne fait que DESSINER. Elle est placee dans une fenetre de
// superposition par SuperpositionManager, qui la rend intouchable : tous les
// gestes de l'eleve traversent la fenetre vers l'appli en dessous. Clovis
// montre, l'eleve agit lui-meme.
//
// Les positions recues sont exprimees dans un "espace" (par exemple les
// dimensions de l'image de capture envoyee a Clovis). La vue les convertit
// elle-meme vers sa propre taille, donc le pointage reste juste quelle que
// soit la reduction appliquee a l'image.
package com.classinus.app.visionecran

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.util.TypedValue
import android.view.View
import android.view.animation.LinearInterpolator
import androidx.core.content.ContextCompat
import com.classinus.app.R
import kotlin.math.hypot

enum class TypeMarque { POINTER, SURLIGNER, SOULIGNER }

/**
 * Une marque a dessiner. Pour POINTER, (x, y) est la pointe de la fleche.
 * Pour SURLIGNER et SOULIGNER, (x, y) est le coin haut gauche de la zone et
 * (largeur, hauteur) sa taille, le soulignement etant trace sous la zone.
 */
data class Marque(
    val type: TypeMarque,
    val x: Float,
    val y: Float,
    val largeur: Float,
    val hauteur: Float,
    val etiquette: String?,
    val couleur: Int?,
)

class VueMarques(context: Context) : View(context) {

    companion object {
        // Valeurs de dessin, toutes en dp (ou sp pour le texte) pour rester
        // proportionnelles a la densite de l'ecran.
        private const val RAYON_ANNEAU_DEBUT_DP = 12f
        private const val RAYON_ANNEAU_FIN_DP = 30f
        private const val LONGUEUR_FLECHE_DP = 64f
        private const val LONGUEUR_TETE_DP = 20f
        private const val LARGEUR_TETE_DP = 22f
        private const val EPAISSEUR_TIGE_DP = 6f
        private const val EPAISSEUR_CONTOUR_DP = 3f
        private const val EPAISSEUR_ANNEAU_DP = 3f
        private const val RAYON_COIN_SURLIGNAGE_DP = 6f
        private const val EPAISSEUR_BORD_SURLIGNAGE_DP = 2f
        private const val DECALAGE_SOULIGNEMENT_DP = 2f
        private const val EPAISSEUR_SOULIGNEMENT_DP = 4f
        private const val TAILLE_TEXTE_SP = 14f
        private const val MARGE_BORD_DP = 12f
        private const val ECART_ETIQUETTE_DP = 10f
        private const val REMPLISSAGE_ETIQUETTE_H_DP = 10f
        private const val REMPLISSAGE_ETIQUETTE_V_DP = 6f
        private const val RAYON_COIN_ETIQUETTE_DP = 10f

        private const val DUREE_PULSATION_MS = 1200L
        private const val OPACITE_SURLIGNAGE = 90
        private const val OPACITE_BORD_SURLIGNAGE = 220
        private const val OPACITE_ANNEAU_MAX = 0.9f
    }

    private var marques: List<Marque> = emptyList()
    private var espaceLargeur = 0f
    private var espaceHauteur = 0f
    private var phasePulsation = 0f
    private var animateurPulsation: ValueAnimator? = null

    /** Appelee quand la taille de la fenetre change (rotation) : les positions ne sont alors plus valables. */
    var surRedimensionnement: (() -> Unit)? = null

    private val densite = resources.displayMetrics.density
    private val couleurParDefaut = ContextCompat.getColor(context, R.color.vision_ecran_marque)
    private val couleurContour = ContextCompat.getColor(context, R.color.vision_ecran_contour)
    private val couleurFondEtiquette = ContextCompat.getColor(context, R.color.vision_ecran_etiquette_fond)
    private val couleurTexteEtiquette = ContextCompat.getColor(context, R.color.vision_ecran_etiquette_texte)

    private val peintureRemplissage = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val peintureTrait = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val peintureTexte = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.DEFAULT_BOLD
        textSize = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_SP,
            TAILLE_TEXTE_SP,
            resources.displayMetrics,
        )
    }

    init {
        setWillNotDraw(false)
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    private fun dp(valeur: Float): Float = valeur * densite

    fun definir(nouvellesMarques: List<Marque>, largeurEspace: Float, hauteurEspace: Float) {
        marques = nouvellesMarques
        espaceLargeur = largeurEspace
        espaceHauteur = hauteurEspace
        if (nouvellesMarques.any { it.type == TypeMarque.POINTER }) {
            demarrerPulsation()
        } else {
            arreterPulsation()
        }
        invalidate()
    }

    fun arreter() {
        arreterPulsation()
        marques = emptyList()
    }

    private fun demarrerPulsation() {
        if (animateurPulsation != null) return
        animateurPulsation = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = DUREE_PULSATION_MS
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener {
                phasePulsation = it.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    private fun arreterPulsation() {
        animateurPulsation?.cancel()
        animateurPulsation = null
    }

    override fun onDetachedFromWindow() {
        arreterPulsation()
        super.onDetachedFromWindow()
    }

    override fun onSizeChanged(largeur: Int, hauteur: Int, ancienneLargeur: Int, ancienneHauteur: Int) {
        super.onSizeChanged(largeur, hauteur, ancienneLargeur, ancienneHauteur)
        val avaitUneTaille = ancienneLargeur > 0 && ancienneHauteur > 0
        if (avaitUneTaille && (largeur != ancienneLargeur || hauteur != ancienneHauteur)) {
            surRedimensionnement?.invoke()
        }
    }

    // Conversion espace vers fenetre. Sans espace precise, les valeurs sont deja en pixels de la fenetre.
    private fun versX(valeur: Float): Float = if (espaceLargeur > 0f) valeur * width / espaceLargeur else valeur
    private fun versY(valeur: Float): Float = if (espaceHauteur > 0f) valeur * height / espaceHauteur else valeur

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        for (marque in marques) {
            val couleur = marque.couleur ?: couleurParDefaut
            when (marque.type) {
                TypeMarque.SURLIGNER -> dessinerSurlignage(canvas, marque, couleur)
                TypeMarque.SOULIGNER -> dessinerSoulignement(canvas, marque, couleur)
                TypeMarque.POINTER -> dessinerPointeur(canvas, marque, couleur)
            }
            val texte = marque.etiquette
            if (texte != null) dessinerEtiquette(canvas, marque, texte)
        }
    }

    /** Zone occupee par la marque, dans les coordonnees de la fenetre (sert a placer l'etiquette). */
    private fun zoneDeMarque(marque: Marque): RectF = when (marque.type) {
        TypeMarque.POINTER -> {
            val rayon = dp(RAYON_ANNEAU_FIN_DP)
            RectF(versX(marque.x) - rayon, versY(marque.y) - rayon, versX(marque.x) + rayon, versY(marque.y) + rayon)
        }
        TypeMarque.SURLIGNER ->
            RectF(versX(marque.x), versY(marque.y), versX(marque.x + marque.largeur), versY(marque.y + marque.hauteur))
        TypeMarque.SOULIGNER -> {
            val ligne = versY(marque.y + marque.hauteur) + dp(DECALAGE_SOULIGNEMENT_DP)
            RectF(versX(marque.x), versY(marque.y), versX(marque.x + marque.largeur), ligne + dp(EPAISSEUR_SOULIGNEMENT_DP))
        }
    }

    private fun dessinerSurlignage(canvas: Canvas, marque: Marque, couleur: Int) {
        val zone = zoneDeMarque(marque)
        val rayon = dp(RAYON_COIN_SURLIGNAGE_DP)
        peintureRemplissage.color = couleur
        peintureRemplissage.alpha = OPACITE_SURLIGNAGE
        canvas.drawRoundRect(zone, rayon, rayon, peintureRemplissage)
        peintureTrait.color = couleur
        peintureTrait.alpha = OPACITE_BORD_SURLIGNAGE
        peintureTrait.strokeWidth = dp(EPAISSEUR_BORD_SURLIGNAGE_DP)
        canvas.drawRoundRect(zone, rayon, rayon, peintureTrait)
    }

    private fun dessinerSoulignement(canvas: Canvas, marque: Marque, couleur: Int) {
        val ligne = versY(marque.y + marque.hauteur) + dp(DECALAGE_SOULIGNEMENT_DP)
        val debut = versX(marque.x)
        val fin = versX(marque.x + marque.largeur)
        // Contour clair d'abord pour que le trait reste visible sur n'importe quel fond.
        peintureTrait.color = couleurContour
        peintureTrait.alpha = 255
        peintureTrait.strokeWidth = dp(EPAISSEUR_SOULIGNEMENT_DP + 2 * EPAISSEUR_CONTOUR_DP)
        canvas.drawLine(debut, ligne, fin, ligne, peintureTrait)
        peintureTrait.color = couleur
        peintureTrait.alpha = 255
        peintureTrait.strokeWidth = dp(EPAISSEUR_SOULIGNEMENT_DP)
        canvas.drawLine(debut, ligne, fin, ligne, peintureTrait)
    }

    /**
     * Fleche dont la pointe touche (x, y). Elle arrive toujours du cote du
     * centre de l'ecran, donc elle ne sort jamais de l'ecran meme pour un
     * point colle a un bord. Un anneau pulse autour de la pointe.
     */
    private fun dessinerPointeur(canvas: Canvas, marque: Marque, couleur: Int) {
        val pointeX = versX(marque.x)
        val pointeY = versY(marque.y)

        var directionX = width / 2f - pointeX
        var directionY = height / 2f - pointeY
        var longueur = hypot(directionX, directionY)
        if (longueur < 1f) {
            directionX = 0f
            directionY = 1f
            longueur = 1f
        }
        val ux = directionX / longueur
        val uy = directionY / longueur
        val perpX = -uy
        val perpY = ux

        val tete = dp(LONGUEUR_TETE_DP)
        val demiLargeurTete = dp(LARGEUR_TETE_DP) / 2f
        val baseTeteX = pointeX + ux * tete
        val baseTeteY = pointeY + uy * tete
        val queueX = pointeX + ux * dp(LONGUEUR_FLECHE_DP)
        val queueY = pointeY + uy * dp(LONGUEUR_FLECHE_DP)

        val teteFleche = Path().apply {
            moveTo(pointeX, pointeY)
            lineTo(baseTeteX + perpX * demiLargeurTete, baseTeteY + perpY * demiLargeurTete)
            lineTo(baseTeteX - perpX * demiLargeurTete, baseTeteY - perpY * demiLargeurTete)
            close()
        }

        // Contour clair, puis couleur : lisible sur fond clair comme sombre.
        peintureTrait.color = couleurContour
        peintureTrait.alpha = 255
        peintureTrait.strokeWidth = dp(EPAISSEUR_TIGE_DP + 2 * EPAISSEUR_CONTOUR_DP)
        canvas.drawLine(baseTeteX, baseTeteY, queueX, queueY, peintureTrait)
        peintureTrait.strokeWidth = dp(2 * EPAISSEUR_CONTOUR_DP)
        canvas.drawPath(teteFleche, peintureTrait)

        peintureTrait.color = couleur
        peintureTrait.strokeWidth = dp(EPAISSEUR_TIGE_DP)
        canvas.drawLine(baseTeteX, baseTeteY, queueX, queueY, peintureTrait)
        peintureRemplissage.color = couleur
        peintureRemplissage.alpha = 255
        canvas.drawPath(teteFleche, peintureRemplissage)

        // Anneau qui s'elargit et s'efface, en boucle.
        val rayon = dp(RAYON_ANNEAU_DEBUT_DP) + (dp(RAYON_ANNEAU_FIN_DP) - dp(RAYON_ANNEAU_DEBUT_DP)) * phasePulsation
        peintureTrait.color = couleur
        peintureTrait.alpha = ((1f - phasePulsation) * OPACITE_ANNEAU_MAX * 255).toInt().coerceIn(0, 255)
        peintureTrait.strokeWidth = dp(EPAISSEUR_ANNEAU_DP)
        canvas.drawCircle(pointeX, pointeY, rayon, peintureTrait)
    }

    private fun dessinerEtiquette(canvas: Canvas, marque: Marque, texteBrut: String) {
        val zone = zoneDeMarque(marque)
        val marge = dp(MARGE_BORD_DP)
        val ecart = dp(ECART_ETIQUETTE_DP)
        val remplissageH = dp(REMPLISSAGE_ETIQUETTE_H_DP)
        val remplissageV = dp(REMPLISSAGE_ETIQUETTE_V_DP)

        // Texte coupe avec des points de suspension s'il depasse la largeur de l'ecran.
        val largeurMax = width - 2 * marge - 2 * remplissageH
        if (largeurMax <= 0f) return
        val nombre = peintureTexte.breakText(texteBrut, true, largeurMax, null)
        val texte = if (nombre < texteBrut.length) texteBrut.substring(0, (nombre - 1).coerceAtLeast(0)) + "\u2026" else texteBrut

        val metriques = peintureTexte.fontMetrics
        val largeurEtiquette = peintureTexte.measureText(texte) + 2 * remplissageH
        val hauteurEtiquette = (metriques.descent - metriques.ascent) + 2 * remplissageV

        // Pour la fleche, l'etiquette va du cote oppose a la queue (la queue arrive du centre de l'ecran).
        val placerAuDessus = when (marque.type) {
            TypeMarque.POINTER -> height / 2f > versY(marque.y)
            else -> zone.top - ecart - hauteurEtiquette >= marge
        }

        val gauche = (zone.centerX() - largeurEtiquette / 2f)
            .coerceIn(marge, (width - largeurEtiquette - marge).coerceAtLeast(marge))
        val haut = (if (placerAuDessus) zone.top - ecart - hauteurEtiquette else zone.bottom + ecart)
            .coerceIn(marge, (height - hauteurEtiquette - marge).coerceAtLeast(marge))

        val fond = RectF(gauche, haut, gauche + largeurEtiquette, haut + hauteurEtiquette)
        peintureRemplissage.color = couleurFondEtiquette
        canvas.drawRoundRect(fond, dp(RAYON_COIN_ETIQUETTE_DP), dp(RAYON_COIN_ETIQUETTE_DP), peintureRemplissage)
        peintureTexte.color = couleurTexteEtiquette
        canvas.drawText(texte, gauche + remplissageH, haut + remplissageV - metriques.ascent, peintureTexte)
    }
}
