// Cree le 17/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android. Code COMMUN aux deux flavors (src/main).
//
// Le groupe de boutons flottant, construit sur le modele du groupe du PC
// (components/ControlesInteractionCanal.tsx). Il tient dans UNE seule fenetre de
// superposition, posee par BoutonFlottantManager. Comme sur le PC, de haut en bas :
//   - le micro de dictee (lot 4), visible canal actif et groupe deplie ;
//   - le mode vocal (lot 4), visible canal actif et groupe deplie ;
//   - la ligne du bas : le chevron, le crayon Ecrire (lot 2) puis le bouton qui active le canal :
//       canal eteint : seul le bouton d'activation est visible ;
//       canal actif, groupe deplie : le chevron (qui replie), Ecrire et le bouton d'activation ;
//       canal actif, groupe replie : le chevron (qui deplie) et Ecrire restent visibles.
// La ligne du bas ne bouge jamais : quand les deux lignes du haut apparaissent, le groupe
// grandit vers le haut (le gestionnaire garde la ligne du bas en place).
// Ecrire n'agrandit jamais ce groupe : le champ de saisie vit dans une autre fenetre,
// posee par dessus (voir ChampEcritureFlottant), et le groupe reste derriere lui.
// Le groupe se deplie des que le canal devient actif, puis se replie seul apres
// DELAI_REPLI_AUTO_MS sans aucun toucher. Les boutons apparaissent et disparaissent
// en fondu avec un leger zoom (jamais de changement brut).
//
// Ce groupe ne sait RIEN du canal ni du micro : il signale un appui sur le bouton d'activation
// (surAppuiActivation), sur le micro (surAppuiMicro), sur le mode vocal (surAppuiVoix), un deplacement (surDeplacement) et la fin d'un glissement
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

    /** Appui sur le bouton Ecrire (ouvre ou ferme le champ de saisie). */
    var surAppuiEcrire: (() -> Unit)? = null

    /** Appui sur le micro de dictee (lot 4). */
    var surAppuiMicro: (() -> Unit)? = null

    /** Appui sur le bouton du mode vocal (lot 4). */
    var surAppuiVoix: (() -> Unit)? = null

    /** Etat de la dictee : rien, le micro ecoute, ou l'enregistrement est en cours de transcription. */
    enum class EtatDictee { INACTIF, ECOUTE, TRANSCRIPTION }

    /** Etat de la voix : rien, connexion en cours, l'etudiant parle, Classinus repond. */
    enum class EtatVoix { INACTIF, CONNEXION, ACTIF, REPONSE }

    /** Glissement en cours : deplacement en pixels depuis le dernier evenement. */
    var surDeplacement: ((dx: Float, dy: Float) -> Unit)? = null

    /** Doigt leve apres un glissement. */
    var surRelachement: (() -> Unit)? = null

    /** Vrai tant que le doigt deplace le groupe. */
    val enGlissement: Boolean
        get() = glissement

    /** Hauteur de la ligne du bas, en pixels : la partie du groupe qui reste en place quand le groupe grandit. */
    val hauteurLigneBasPx: Int = (VueBoutonRond.TAILLE_DP * context.resources.displayMetrics.density).toInt()

    private val densite = context.resources.displayMetrics.density
    private val seuilGlissement = ViewConfiguration.get(context).scaledTouchSlop
    private val principal = Handler(Looper.getMainLooper())

    private val boutonChevron = VueBoutonRond(context, VueBoutonRond.Icone.CHEVRON_BAS)
    private val boutonActivation = VueBoutonRond(context, VueBoutonRond.Icone.RADIO)
    private val boutonEcrire = VueBoutonRond(context, VueBoutonRond.Icone.CRAYON)
    private val boutonMicro = VueBoutonRond(context, VueBoutonRond.Icone.MICRO)
    private val boutonVoix = VueBoutonRond(context, VueBoutonRond.Icone.BARRES)
    private val emplacementMicro = creerEmplacement(boutonMicro)
    private val emplacementVoix = creerEmplacement(boutonVoix)
    private val emplacementChevron = creerEmplacement(boutonChevron)
    private val emplacementEcrire = creerEmplacement(boutonEcrire)
    private val emplacementActivation = creerEmplacement(boutonActivation)

    private var canalActif = false
    private var champOuvert = false
    private var etatDictee = EtatDictee.INACTIF
    private var etatVoix = EtatVoix.INACTIF
    private var groupeOuvert = true
    private var toucheEnCours = false
    private var glissement = false
    private var departX = 0f
    private var departY = 0f
    private var dernierX = 0f
    private var dernierY = 0f

    private val repliAutomatique = Runnable {
        if (repliPossible()) {
            groupeOuvert = false
            appliquerEtat(animer = true)
        }
    }

    // Le groupe ne se replie pas seul pendant une dictee ou une conversation vocale : le
    // bouton qui l'arrete doit rester sous le doigt.
    private fun repliPossible(): Boolean =
        canalActif && groupeOuvert && !toucheEnCours && etatDictee == EtatDictee.INACTIF && etatVoix == EtatVoix.INACTIF

    init {
        orientation = LinearLayout.VERTICAL
        showDividers = LinearLayout.SHOW_DIVIDER_MIDDLE
        // Espace entre deux lignes visibles : il disparait avec la ligne qui disparait.
        dividerDrawable = GradientDrawable().apply {
            setColor(Color.TRANSPARENT)
            setSize(1, (ESPACE_ENTRE_BOUTONS_DP * densite).toInt())
        }
        // Les deux lignes du haut (lot 4), hors de l'ecran tant que le canal est coupe ou le groupe replie.
        addView(emplacementMicro)
        addView(emplacementVoix)
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
            addView(emplacementEcrire)
            addView(emplacementActivation)
        }
        addView(ligneBas)

        boutonChevron.surAppui = { basculerGroupe() }
        boutonEcrire.surAppui = { surAppuiEcrire?.invoke() }
        boutonMicro.surAppui = { surAppuiMicro?.invoke() }
        boutonVoix.surAppui = { surAppuiVoix?.invoke() }
        appliquerEtatMicro()
        appliquerEtatVoix()
        boutonActivation.surAppui = { surAppuiActivation?.invoke() }
        boutonEcrire.contentDescription = context.getString(R.string.bouton_flottant_ecrire_ouvrir)
        appliquerEtat(animer = false)
    }

    /** Le crayon passe a l'or quand le champ de saisie est ouvert, comme sur le PC. */
    fun definirChampOuvert(ouvert: Boolean) {
        if (ouvert == champOuvert) return
        champOuvert = ouvert
        boutonEcrire.definirActif(ouvert)
        boutonEcrire.contentDescription = context.getString(
            if (ouvert) R.string.bouton_flottant_ecrire_fermer else R.string.bouton_flottant_ecrire_ouvrir,
        )
    }

    /** Le micro passe a l'or et devient un carre pendant la dictee, pulse pendant la transcription. */
    fun definirDictee(etat: EtatDictee) {
        if (etat == etatDictee) return
        etatDictee = etat
        appliquerEtatMicro()
        replanifierRepli()
    }

    /** Le bouton du mode vocal passe a l'or quand la voix est ouverte, pulse quand Classinus repond. */
    fun definirVoix(etat: EtatVoix) {
        if (etat == etatVoix) return
        etatVoix = etat
        appliquerEtatVoix()
        replanifierRepli()
    }

    private fun appliquerEtatMicro() {
        val ecoute = etatDictee == EtatDictee.ECOUTE
        val transcription = etatDictee == EtatDictee.TRANSCRIPTION
        boutonMicro.icone = if (ecoute) VueBoutonRond.Icone.CARRE else VueBoutonRond.Icone.MICRO
        boutonMicro.definirActif(ecoute)
        boutonMicro.definirPulsation(ecoute || transcription)
        boutonMicro.definirGrise(transcription)
        boutonMicro.contentDescription = context.getString(
            if (ecoute) R.string.bouton_flottant_micro_arreter else R.string.bouton_flottant_micro_ouvrir,
        )
    }

    private fun appliquerEtatVoix() {
        val ouverte = etatVoix == EtatVoix.ACTIF || etatVoix == EtatVoix.REPONSE
        boutonVoix.definirActif(ouverte)
        boutonVoix.definirPulsation(etatVoix == EtatVoix.REPONSE)
        boutonVoix.definirGrise(etatVoix == EtatVoix.CONNEXION)
        boutonVoix.contentDescription = context.getString(
            if (ouverte) R.string.bouton_flottant_voix_fermer else R.string.bouton_flottant_voix_ouvrir,
        )
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
        // Micro et mode vocal : canal actif et groupe deplie, comme sur le PC.
        afficherEmplacement(emplacementMicro, canalActif && groupeOuvert, animer)
        afficherEmplacement(emplacementVoix, canalActif && groupeOuvert, animer)
        afficherEmplacement(emplacementChevron, canalActif, animer)
        // Ecrire reste visible groupe replie, comme sur le PC.
        afficherEmplacement(emplacementEcrire, canalActif, animer)
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
        if (repliPossible()) {
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
