// Cree le 17/10/2026, demande Bourama : lot 3 du bouton flottant natif Android
// (bulle de reponse et fleche). Code COMMUN aux deux flavors (src/main).
//
// La bulle de Classinus, version simple de components/BulleDialogueAgent.tsx. Elle
// montre l'une des deux choses que montre la bulle du PC :
//   - l'INFORMATION (ce que Classinus fait, ses petits commentaires) : un texte
//     court, que les gestes traversent (la fenetre n'est pas touchable) ;
//   - la REPONSE de Classinus a un message : du texte mis en forme (voir
//     TexteSimplifie), qu'on peut faire defiler. Poser un doigt dessus la garde
//     ouverte (surToucheDebut), le relever reprend le compte a rebours
//     (surToucheFin). Quand la reponse contient ce que la bulle ne sait pas
//     dessiner (tableau, schema, QCM, formule...), une ligne propose d'ouvrir
//     Classinus pour voir le reste (surOuvrirAppli).
//
// Cette vue ne decide de rien : la page garde le compte a rebours et dit quand
// afficher ou fermer. La taille et la position sont decidees par le gestionnaire
// (BulleEtCurseurManager), qui mesure la bulle puis la place pres de la fleche.
//
// Tout ce qui touche aux vues se fait sur le thread principal.
package com.classinus.app.boutonflottant

import android.content.Context
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.classinus.app.R

class BulleReponseFlottante(context: Context) : FrameLayout(context) {

    companion object {
        private const val RAYON_DP = 18f
        private const val MARGE_INTERIEURE_DP = 14f
        private const val TAILLE_TEXTE_SP = 14.5f
        private const val INTERLIGNE_EXTRA_DP = 2f
        private const val HAUTEUR_LIEN_MIN_DP = 44f
        private const val DUREE_APPARITION_MS = 180L
        private const val DEPLACEMENT_APPARITION_DP = 8f
    }

    /** Un doigt se pose sur la reponse : la garder ouverte. */
    var surToucheDebut: (() -> Unit)? = null

    /** Le doigt quitte la reponse : reprendre le compte a rebours. */
    var surToucheFin: (() -> Unit)? = null

    /** L'etudiant touche la ligne qui propose d'ouvrir Classinus. */
    var surOuvrirAppli: (() -> Unit)? = null

    private val densite = context.resources.displayMetrics.density
    private val texte = TextView(context)
    private val defilement = ScrollView(context)
    private val lienOuvrir = TextView(context)

    init {
        val marge = (MARGE_INTERIEURE_DP * densite).toInt()

        val carte = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                cornerRadius = RAYON_DP * densite
                setColor(ContextCompat.getColor(context, R.color.bouton_flottant_champ_fond))
                setStroke((1.5f * densite).toInt(), ContextCompat.getColor(context, R.color.bouton_flottant_champ_contour))
            }
            contentDescription = context.getString(R.string.bouton_flottant_bulle_description)
        }

        texte.apply {
            setTextColor(ContextCompat.getColor(context, R.color.bouton_flottant_champ_texte))
            textSize = TAILLE_TEXTE_SP
            setLineSpacing(INTERLIGNE_EXTRA_DP * densite, 1f)
            setPadding(marge, marge, marge, marge)
            // TalkBack lit chaque nouveau message sans que l'etudiant ait a chercher la bulle.
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        // Le texte et la ligne "ouvrir Classinus" defilent ensemble : si la hauteur est
        // limitee, la ligne ne se retrouve jamais ecrasee sous le texte.
        val contenuDefilant = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
        contenuDefilant.addView(texte, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

        lienOuvrir.apply {
            text = context.getString(R.string.bouton_flottant_bulle_ouvrir)
            setTextColor(ContextCompat.getColor(context, R.color.bouton_flottant_actif_fond))
            textSize = 13.5f
            typeface = Typeface.DEFAULT_BOLD
            paintFlags = paintFlags or Paint.UNDERLINE_TEXT_FLAG
            gravity = Gravity.CENTER_VERTICAL
            minHeight = (HAUTEUR_LIEN_MIN_DP * densite).toInt()
            setPadding(marge, 0, marge, 0)
            visibility = View.GONE
            isClickable = true
            setOnClickListener { surOuvrirAppli?.invoke() }
        }
        contenuDefilant.addView(lienOuvrir, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

        defilement.apply {
            isVerticalScrollBarEnabled = true
            overScrollMode = View.OVER_SCROLL_NEVER
            addView(contenuDefilant, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
        }
        carte.addView(defilement, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

        addView(carte, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
    }

    /**
     * Remplace le contenu. proposerOuvrir : la reponse contient ce que la bulle ne dessine pas.
     * Le defilement revient en haut quand le message change, jamais quand il est identique.
     */
    fun definir(contenu: CharSequence, proposerOuvrir: Boolean) {
        val change = texte.text.toString() != contenu.toString()
        texte.text = contenu
        lienOuvrir.visibility = if (proposerOuvrir) View.VISIBLE else View.GONE
        if (change) defilement.scrollTo(0, 0)
    }

    /** Apparition en fondu avec une legere montee : la bulle ne surgit jamais d'un coup. */
    fun apparaitre() {
        animate().cancel()
        alpha = 0f
        translationY = DEPLACEMENT_APPARITION_DP * densite
        animate().alpha(1f).translationY(0f).setDuration(DUREE_APPARITION_MS).start()
    }

    /** Disparition en fondu, puis action de fin (retrait de la fenetre). */
    fun disparaitre(apres: () -> Unit) {
        animate().cancel()
        animate()
            .alpha(0f)
            .translationY(DEPLACEMENT_APPARITION_DP * densite)
            .setDuration(DUREE_APPARITION_MS)
            .withEndAction { apres() }
            .start()
    }

    override fun dispatchTouchEvent(evenement: MotionEvent): Boolean {
        when (evenement.actionMasked) {
            MotionEvent.ACTION_DOWN -> surToucheDebut?.invoke()
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> surToucheFin?.invoke()
        }
        return super.dispatchTouchEvent(evenement)
    }

    override fun onDetachedFromWindow() {
        animate().cancel()
        super.onDetachedFromWindow()
    }
}
