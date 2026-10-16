// Cree le 17/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android. Code COMMUN aux deux flavors (src/main).
//
// Le groupe de boutons flottant, construit sur le modele du groupe du PC
// (components/ControlesInteractionCanal.tsx). Il tient dans UNE seule fenetre de
// superposition, posee par BoutonFlottantManager. Pour l'instant sa ligne du bas
// porte le chevron puis le bouton qui active le canal, comme sur le PC :
//   - canal eteint : seul le bouton d'activation est visible ;
//   - canal actif, groupe deplie : le chevron (qui replie) et le bouton d'activation ;
//   - canal actif, groupe replie : seul le chevron (qui deplie) reste visible.
// Le groupe se deplie des que le canal devient actif, puis se replie seul apres
// DELAI_REPLI_AUTO_MS sans aucun toucher. Les boutons apparaissent et disparaissent
// en fondu avec un leger zoom (jamais de changement brut).
//
// Ce groupe ne sait RIEN du canal : il signale un appui sur le bouton d'activation
// (surAppuiActivation), un deplacement (surDeplacement) et la fin d'un glissement
// (surRelachement). C'est le gestionnaire qui decide quoi en faire. Un doigt qui
// bouge au dela du seuil sur n'importe quel bouton deplace le groupe entier.
//
// Tout ce qui touche aux vues se fait sur le thread principal.
package com.classinus.app.boutonflottant

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.widget.FrameLayout
import android.widget.LinearLayout
import com.classinus.app.R

class GroupeBoutonsFlottant(context: Context) : LinearLayout(context) {

    companion object {
        private const val ALPHA_REPOS = 0.6f
        private const val DUREE_ALPHA_MS = 200L
        private const val DUREE_APPARITION_MS = 150L
        private const val ECHELLE_APPARITION = 0.9f
        private const val DELAI_REPLI_AUTO_MS = 2000L
        private const val ESPACE_ENTRE_BOUTONS_DP = 8f
    }

    /** Appui sur le bouton qui active ou coupe le canal. */
    var surAppuiActivation: (() -> Unit)? = null

    /** Glissement en cours : deplacement en pixels depuis le dernier evenement. */
    var surDeplacement: ((dx: Float, dy: Float) -> Unit)? = null

    /** Doigt leve apres un glissement. */
    var surRelachement: (() -> Unit)? = null

    /** Vrai tant que le doigt deplace le groupe. */
    val enGlissement: Boolean
        get() = glissement

    private val densite = context.resources.displayMetrics.density
    private val seuilGlissement = ViewConfiguration.get(context).scaledTouchSlop
    private val principal = Handler(Looper.getMainLooper())

    private val boutonChevron = VueBoutonRond(context, VueBoutonRond.Icone.CHEVRON_BAS)
    private val boutonActivation = VueBoutonRond(context, VueBoutonRond.Icone.RADIO)
    private val emplacementChevron = creerEmplacement(boutonChevron)
    private val emplacementActivation = creerEmplacement(boutonActivation)

    private var canalActif = false
    private var groupeOuvert = true
    private var toucheEnCours = false
    private var glissement = false
    private var departX = 0f
    private var departY = 0f
    private var dernierX = 0f
    private var dernierY = 0f

    private val repliAutomatique = Runnable {
        if (canalActif && groupeOuvert && !toucheEnCours) {
            groupeOuvert = false
            appliquerEtat(animer = true)
        }
    }

    init {
        orientation = LinearLayout.VERTICAL
        val ligneBas = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            showDividers = LinearLayout.SHOW_DIVIDER_MIDDLE
            // Espace invisible entre deux boutons visibles : il disparait avec le bouton qui disparait.
            dividerDrawable = GradientDrawable().apply {
                setColor(Color.TRANSPARENT)
                setSize((ESPACE_ENTRE_BOUTONS_DP * densite).toInt(), 1)
            }
            addView(emplacementChevron)
            addView(emplacementActivation)
        }
        addView(ligneBas)

        boutonChevron.surAppui = { basculerGroupe() }
        boutonActivation.surAppui = { surAppuiActivation?.invoke() }
        appliquerEtat(animer = false)
    }

    /**
     * Dessine le groupe selon l'etat du canal en direct. Quand le canal devient
     * actif, le groupe se deplie (puis se replie seul). Sans effet visible si
     * l'etat ne change pas.
     */
    fun definirActif(actif: Boolean, animer: Boolean = true) {
        val change = actif != canalActif
        canalActif = actif
        if (actif && change) groupeOuvert = true
        boutonActivation.definirActif(actif, animer)
        boutonActivation.contentDescription = context.getString(
            if (actif) R.string.bouton_flottant_description_actif else R.string.bouton_flottant_description_inactif,
        )
        appliquerEtat(animer)
    }

    /** Apparition en fondu juste apres l'ajout de la fenetre : le groupe ne surgit jamais d'un coup. */
    fun apparaitre() {
        animate().cancel()
        alpha = 0f
        animate().alpha(opaciteCible()).setDuration(DUREE_ALPHA_MS).start()
    }

    private fun basculerGroupe() {
        groupeOuvert = !groupeOuvert
        appliquerEtat(animer = true)
    }

    private fun appliquerEtat(animer: Boolean) {
        afficherEmplacement(emplacementChevron, canalActif, animer)
        afficherEmplacement(emplacementActivation, !canalActif || groupeOuvert, animer)
        boutonChevron.icone = if (groupeOuvert) VueBoutonRond.Icone.CHEVRON_BAS else VueBoutonRond.Icone.CHEVRON_HAUT
        boutonChevron.contentDescription = context.getString(
            if (groupeOuvert) R.string.bouton_flottant_chevron_replier else R.string.bouton_flottant_chevron_deplier,
        )
        animerOpacite(animer)
        replanifierRepli()
    }

    /** Discret au repos, plein quand le canal est actif ou pendant un glissement. */
    private fun opaciteCible(): Float = if (canalActif || glissement) 1f else ALPHA_REPOS

    private fun animerOpacite(animer: Boolean) {
        animate().cancel()
        if (!animer || !isAttachedToWindow) {
            alpha = opaciteCible()
            return
        }
        animate().alpha(opaciteCible()).setDuration(DUREE_ALPHA_MS).start()
    }

    /** Un bouton apparait ou disparait en fondu avec un leger zoom. Disparu : retire de la mise en page. */
    private fun afficherEmplacement(emplacement: View, visible: Boolean, animer: Boolean) {
        val avecAnimation = animer && isAttachedToWindow
        emplacement.animate().cancel()
        if (visible) {
            val etaitVisible = emplacement.visibility == View.VISIBLE
            emplacement.visibility = View.VISIBLE
            if (avecAnimation && !etaitVisible) {
                emplacement.alpha = 0f
                emplacement.scaleX = ECHELLE_APPARITION
                emplacement.scaleY = ECHELLE_APPARITION
                emplacement.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(DUREE_APPARITION_MS).start()
            } else {
                rendreIntact(emplacement)
            }
            return
        }
        if (emplacement.visibility != View.VISIBLE) return
        if (!avecAnimation) {
            emplacement.visibility = View.GONE
            return
        }
        emplacement.animate()
            .alpha(0f)
            .scaleX(ECHELLE_APPARITION)
            .scaleY(ECHELLE_APPARITION)
            .setDuration(DUREE_APPARITION_MS)
            .withEndAction {
                emplacement.visibility = View.GONE
                rendreIntact(emplacement)
            }
            .start()
    }

    private fun rendreIntact(vue: View) {
        vue.alpha = 1f
        vue.scaleX = 1f
        vue.scaleY = 1f
    }

    /** Un emplacement par bouton : l'apparition anime l'emplacement, l'appui anime le bouton, sans se gener. */
    private fun creerEmplacement(bouton: VueBoutonRond): FrameLayout {
        val taille = (VueBoutonRond.TAILLE_DP * densite).toInt()
        return FrameLayout(context).apply {
            addView(bouton, FrameLayout.LayoutParams(taille, taille))
        }
    }

    /** Le groupe ne se replie jamais sous le doigt : le minuteur ne tourne que sans toucher. */
    private fun replanifierRepli() {
        principal.removeCallbacks(repliAutomatique)
        if (canalActif && groupeOuvert && !toucheEnCours) {
            principal.postDelayed(repliAutomatique, DELAI_REPLI_AUTO_MS)
        }
    }

    override fun onInterceptTouchEvent(evenement: MotionEvent): Boolean {
        when (evenement.actionMasked) {
            MotionEvent.ACTION_DOWN -> debuterToucher(evenement)
            MotionEvent.ACTION_MOVE -> if (!glissement && depasseSeuil(evenement)) demarrerGlissement()
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> terminerToucher()
        }
        // Une fois vrai, les boutons recoivent un ACTION_CANCEL (pas d'appui) et le groupe prend la main.
        return glissement
    }

    override fun onTouchEvent(evenement: MotionEvent): Boolean {
        when (evenement.actionMasked) {
            MotionEvent.ACTION_MOVE -> {
                if (!glissement && depasseSeuil(evenement)) demarrerGlissement()
                if (glissement) surDeplacement?.invoke(evenement.rawX - dernierX, evenement.rawY - dernierY)
                dernierX = evenement.rawX
                dernierY = evenement.rawY
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> terminerToucher()
        }
        return true
    }

    private fun debuterToucher(evenement: MotionEvent) {
        departX = evenement.rawX
        departY = evenement.rawY
        dernierX = departX
        dernierY = departY
        glissement = false
        toucheEnCours = true
        principal.removeCallbacks(repliAutomatique)
    }

    private fun depasseSeuil(evenement: MotionEvent): Boolean {
        val dx = evenement.rawX - departX
        val dy = evenement.rawY - departY
        return dx * dx + dy * dy > seuilGlissement * seuilGlissement
    }

    private fun demarrerGlissement() {
        glissement = true
        // Pendant le glissement le groupe est bien visible.
        animerOpacite(animer = true)
    }

    private fun terminerToucher() {
        val etaitEnGlissement = glissement
        glissement = false
        toucheEnCours = false
        if (etaitEnGlissement) {
            animerOpacite(animer = true)
            surRelachement?.invoke()
        }
        replanifierRepli()
    }

    override fun onDetachedFromWindow() {
        principal.removeCallbacks(repliAutomatique)
        animate().cancel()
        super.onDetachedFromWindow()
    }
}
