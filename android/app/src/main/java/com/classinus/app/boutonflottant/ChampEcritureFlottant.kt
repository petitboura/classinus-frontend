// Cree le 17/10/2026, demande Bourama : lot 2 du bouton flottant natif Android
// (bouton Ecrire). Code COMMUN aux deux flavors (src/main).
//
// Le champ de saisie qui s'ouvre quand l'eleve touche Ecrire : une zone de texte
// et un bouton d'envoi, comme la petite zone d'ecriture du PC. Il vit dans sa
// PROPRE fenetre de superposition (posee par BoutonFlottantManager), collee en bas
// de l'ecran, juste au dessus du clavier, la ou se trouve la barre de saisie. Le
// groupe de boutons reste derriere lui, dans sa fenetre, sans jamais etre pousse.
//
// Ce champ ne sait RIEN du canal : il remet le texte a surEnvoi et signale sa
// fermeture (bouton Retour du telephone) a surFermeture. Le gestionnaire decide.
//
// Tout ce qui touche aux vues se fait sur le thread principal.
package com.classinus.app.boutonflottant

import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.text.InputType
import android.view.Gravity
import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.core.content.ContextCompat
import com.classinus.app.R

class ChampEcritureFlottant(context: Context) : FrameLayout(context) {

    companion object {
        private const val MARGE_DP = 8f
        private const val RAYON_DP = 26f
        private const val HAUTEUR_MIN_DP = 52f
        private const val LIGNES_MAX = 5
        private const val DUREE_APPARITION_MS = 180L
        private const val DEPLACEMENT_APPARITION_DP = 16f
    }

    /** Texte a envoyer (deja nettoye des espaces autour, jamais vide). */
    var surEnvoi: ((texte: String) -> Unit)? = null

    /** Retour du telephone : l'eleve veut fermer la zone d'ecriture. */
    var surFermeture: (() -> Unit)? = null

    private val densite = context.resources.displayMetrics.density

    private val champ = EditText(context)
    private val boutonEnvoi = VueBoutonRond(context, VueBoutonRond.Icone.ENVOYER)

    init {
        val marge = (MARGE_DP * densite).toInt()
        setPadding(marge, marge, marge, marge)

        val carte = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.BOTTOM
            background = GradientDrawable().apply {
                cornerRadius = RAYON_DP * densite
                setColor(ContextCompat.getColor(context, R.color.bouton_flottant_champ_fond))
                setStroke((1.5f * densite).toInt(), ContextCompat.getColor(context, R.color.bouton_flottant_champ_contour))
            }
        }

        champ.apply {
            background = null
            setTextColor(ContextCompat.getColor(context, R.color.bouton_flottant_champ_texte))
            setHintTextColor(ContextCompat.getColor(context, R.color.bouton_flottant_champ_indication))
            hint = context.getString(R.string.bouton_flottant_champ_indication)
            contentDescription = context.getString(R.string.bouton_flottant_champ_description)
            textSize = 15f
            minHeight = (HAUTEUR_MIN_DP * densite).toInt()
            maxLines = LIGNES_MAX
            gravity = Gravity.CENTER_VERTICAL
            inputType = InputType.TYPE_CLASS_TEXT or
                InputType.TYPE_TEXT_FLAG_MULTI_LINE or
                InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
            // La touche d'action du clavier envoie, comme Entree sur le PC.
            imeOptions = EditorInfo.IME_ACTION_SEND
            setPadding((18f * densite).toInt(), 0, (4f * densite).toInt(), 0)
            setOnEditorActionListener { _, action, _ ->
                if (action == EditorInfo.IME_ACTION_SEND) {
                    envoyer()
                    true
                } else {
                    false
                }
            }
        }
        carte.addView(champ, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
            gravity = Gravity.BOTTOM
        })

        boutonEnvoi.contentDescription = context.getString(R.string.bouton_flottant_champ_envoyer)
        boutonEnvoi.definirActif(true, animer = false)
        boutonEnvoi.surAppui = { envoyer() }
        carte.addView(boutonEnvoi)

        addView(carte, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
    }

    /** Apparition en fondu avec une legere montee : le champ ne surgit jamais d'un coup. */
    fun apparaitre() {
        animate().cancel()
        alpha = 0f
        translationY = DEPLACEMENT_APPARITION_DP * densite
        animate().alpha(1f).translationY(0f).setDuration(DUREE_APPARITION_MS).start()
        champ.requestFocus()
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

    /** Le clavier est demande par le gestionnaire une fois la fenetre ajoutee. */
    fun champDeSaisie(): EditText = champ

    private fun envoyer() {
        val texte = champ.text?.toString()?.trim().orEmpty()
        if (texte.isEmpty()) return
        champ.setText("")
        surEnvoi?.invoke(texte)
    }

    override fun dispatchKeyEvent(evenement: KeyEvent): Boolean {
        if (evenement.keyCode == KeyEvent.KEYCODE_BACK && evenement.action == KeyEvent.ACTION_UP) {
            surFermeture?.invoke()
            return true
        }
        return super.dispatchKeyEvent(evenement)
    }

    override fun onDetachedFromWindow() {
        animate().cancel()
        super.onDetachedFromWindow()
    }
}
