// Cree le 17/10/2026, demande Bourama : lot 3 du bouton flottant natif Android
// (bulle de reponse et fleche). Code COMMUN aux deux flavors (src/main).
// Lot 4 (17/10/2026) : la reponse peut aussi montrer des images et des cartes d'apercu
// (liens, videos), comme celles du chat.
//
// La bulle de Classinus, version simple de components/BulleDialogueAgent.tsx. Elle
// montre l'une des deux choses que montre la bulle du PC :
//   - l'INFORMATION (ce que Classinus fait, ses petits commentaires) : un texte
//     court, que les gestes traversent (la fenetre n'est pas touchable) ;
//   - la REPONSE de Classinus a un message : du texte mis en forme (voir
//     TexteSimplifie), puis ses images (une rangee qui defile) et ses cartes d'apercu
//     (une carte par lien ou video : miniature, titre, description, site). Le tout se
//     fait defiler. Poser un doigt dessus la garde ouverte (surToucheDebut), le relever
//     reprend le compte a rebours (surToucheFin). Toucher une image ou une carte ouvre
//     son adresse dans le navigateur (surOuvrirLien). Quand la reponse contient ce que la
//     bulle ne sait pas dessiner (tableau, schema, QCM, formule...), une ligne propose
//     d'ouvrir Classinus pour voir le reste (surOuvrirAppli).
//
// Cette vue ne decide de rien : la page garde le compte a rebours et dit quand
// afficher ou fermer, et c'est elle qui trouve titre, description et miniature des liens.
// La taille et la position sont decidees par le gestionnaire (BulleEtCurseurManager), qui
// mesure la bulle puis la place pres de la fleche ; surContenuChange le previent quand une
// image echoue (son emplacement disparait) pour qu'il replace la bulle.
//
// Tout ce qui touche aux vues se fait sur le thread principal.
package com.classinus.app.boutonflottant

import android.content.Context
import android.graphics.Outline
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.text.TextUtils
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.classinus.app.R

/** Une carte d'apercu : un lien (ou une video) avec ce que la page a trouve a son sujet. */
data class CarteBulle(
    val url: String,
    val titre: String,
    val description: String?,
    val site: String?,
    val image: String?,
    val video: Boolean,
)

class BulleReponseFlottante(context: Context) : FrameLayout(context) {

    companion object {
        private const val RAYON_DP = 18f
        private const val RAYON_MEDIA_DP = 12f
        private const val MARGE_INTERIEURE_DP = 14f
        private const val TAILLE_TEXTE_SP = 14.5f
        private const val INTERLIGNE_EXTRA_DP = 2f
        private const val HAUTEUR_LIEN_MIN_DP = 44f
        private const val DUREE_APPARITION_MS = 180L
        private const val DEPLACEMENT_APPARITION_DP = 8f
        private const val HAUTEUR_IMAGE_DP = 130f
        private const val LARGEUR_IMAGE_DP = 190f
        private const val TAILLE_VIGNETTE_DP = 64f
        private const val ESPACE_DP = 8f
        private const val MAX_IMAGES = 6
        private const val MAX_CARTES = 4
    }

    /** Un doigt se pose sur la reponse : la garder ouverte. */
    var surToucheDebut: (() -> Unit)? = null

    /** Le doigt quitte la reponse : reprendre le compte a rebours. */
    var surToucheFin: (() -> Unit)? = null

    /** L'etudiant touche la ligne qui propose d'ouvrir Classinus. */
    var surOuvrirAppli: (() -> Unit)? = null

    /** L'etudiant touche une image ou une carte : ouvrir cette adresse. */
    var surOuvrirLien: ((url: String) -> Unit)? = null

    /** La taille de la bulle a change sans nouveau message (une image a echoue) : la replacer. */
    var surContenuChange: (() -> Unit)? = null

    private val densite = context.resources.displayMetrics.density
    private val texte = TextView(context)
    private val defilement = ScrollView(context)
    private val lienOuvrir = TextView(context)
    private val rangeeImages = LinearLayout(context)
    private val defilementImages = HorizontalScrollView(context)
    private val colonneCartes = LinearLayout(context)

    // Ce que montre deja la zone des images et des cartes : pas de reconstruction si rien ne change.
    private var imagesAffichees: List<String> = emptyList()
    private var cartesAffichees: List<CarteBulle> = emptyList()

    init {
        val marge = (MARGE_INTERIEURE_DP * densite).toInt()
        val espace = (ESPACE_DP * densite).toInt()

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
        // Le texte, les medias et la ligne "ouvrir Classinus" defilent ensemble : si la hauteur est
        // limitee, rien ne se retrouve ecrase sous le texte.
        val contenuDefilant = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
        contenuDefilant.addView(texte, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

        rangeeImages.orientation = LinearLayout.HORIZONTAL
        rangeeImages.setPadding(marge, 0, marge, espace)
        defilementImages.apply {
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
            visibility = View.GONE
            addView(rangeeImages, LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT))
        }
        contenuDefilant.addView(defilementImages, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

        colonneCartes.orientation = LinearLayout.VERTICAL
        colonneCartes.setPadding(marge, 0, marge, espace)
        colonneCartes.visibility = View.GONE
        contenuDefilant.addView(colonneCartes, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

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
     * images et cartes : seules les adresses https sont montrees. Le defilement revient en haut
     * quand le message change, jamais quand il est identique.
     */
    fun definir(
        contenu: CharSequence,
        proposerOuvrir: Boolean,
        images: List<String> = emptyList(),
        cartes: List<CarteBulle> = emptyList(),
    ) {
        val change = texte.text.toString() != contenu.toString()
        texte.text = contenu
        lienOuvrir.visibility = if (proposerOuvrir) View.VISIBLE else View.GONE
        definirMedias(images.filter { ImageChargeur.adresseAcceptee(it) }.take(MAX_IMAGES), cartes.take(MAX_CARTES))
        if (change) defilement.scrollTo(0, 0)
    }

    private fun definirMedias(images: List<String>, cartes: List<CarteBulle>) {
        if (images != imagesAffichees) {
            imagesAffichees = images
            rangeeImages.removeAllViews()
            for (adresse in images) rangeeImages.addView(creerImage(adresse))
            defilementImages.visibility = if (images.isEmpty()) View.GONE else View.VISIBLE
        }
        if (cartes != cartesAffichees) {
            cartesAffichees = cartes
            colonneCartes.removeAllViews()
            for (c in cartes) colonneCartes.addView(creerCarte(c))
            colonneCartes.visibility = if (cartes.isEmpty()) View.GONE else View.VISIBLE
        }
    }

    private fun arrondir(vue: View, rayonDp: Float) {
        val rayon = rayonDp * densite
        vue.clipToOutline = true
        vue.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(v: View, contour: Outline) {
                contour.setRoundRect(0, 0, v.width, v.height, rayon)
            }
        }
    }

    private fun fondPlaceholder(): GradientDrawable = GradientDrawable().apply {
        setColor(ContextCompat.getColor(context, R.color.bouton_flottant_champ_contour))
    }

    private fun creerImage(adresse: String): View {
        val largeur = (LARGEUR_IMAGE_DP * densite).toInt()
        val hauteur = (HAUTEUR_IMAGE_DP * densite).toInt()
        val vue = ImageView(context).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            background = fondPlaceholder()
            contentDescription = context.getString(R.string.bouton_flottant_bulle_image_description)
            isClickable = true
            setOnClickListener { surOuvrirLien?.invoke(adresse) }
        }
        arrondir(vue, RAYON_MEDIA_DP)
        val parametres = LinearLayout.LayoutParams(largeur, hauteur).apply { marginEnd = (ESPACE_DP * densite).toInt() }
        // L'emplacement a sa taille tout de suite (rien ne saute a l'arrivee de l'image) ; s'il
        // echoue, il disparait et la bulle se replace.
        ImageChargeur.charger(adresse, vue, largeur) {
            // imagesAffichees reste inchange : la meme liste ne relance pas un telechargement qui a echoue.
            rangeeImages.removeView(vue)
            if (rangeeImages.childCount == 0) defilementImages.visibility = View.GONE
            surContenuChange?.invoke()
        }
        vue.layoutParams = parametres
        return vue
    }

    private fun creerCarte(donnees: CarteBulle): View {
        val marge = (10f * densite).toInt()
        val vignette = (TAILLE_VIGNETTE_DP * densite).toInt()
        val ligne = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(marge, marge, marge, marge)
            minimumHeight = (HAUTEUR_LIEN_MIN_DP * densite).toInt()
            background = GradientDrawable().apply {
                cornerRadius = RAYON_MEDIA_DP * densite
                setColor(ContextCompat.getColor(context, R.color.bouton_flottant_bulle_code_fond))
            }
            isClickable = true
            contentDescription = context.getString(R.string.bouton_flottant_bulle_lien_description) + " " + donnees.titre
            setOnClickListener { surOuvrirLien?.invoke(donnees.url) }
        }
        if (ImageChargeur.adresseAcceptee(donnees.image)) {
            val miniature = ImageView(context).apply {
                scaleType = ImageView.ScaleType.CENTER_CROP
                background = fondPlaceholder()
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            }
            arrondir(miniature, 8f)
            val parametres = LinearLayout.LayoutParams(vignette, vignette).apply { marginEnd = marge }
            ligne.addView(miniature, parametres)
            ImageChargeur.charger(donnees.image!!, miniature, vignette) {
                // Miniature introuvable : la carte reste lisible sans elle.
                ligne.removeView(miniature)
                surContenuChange?.invoke()
            }
        }
        val colonne = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
        colonne.addView(
            ligneTexte(donnees.titre, 14f, R.color.bouton_flottant_champ_texte, 2, gras = true),
        )
        if (!donnees.description.isNullOrBlank()) {
            colonne.addView(ligneTexte(donnees.description, 12.5f, R.color.bouton_flottant_champ_indication, 2, gras = false))
        }
        val site = donnees.site?.takeIf { it.isNotBlank() } ?: Uri.parse(donnees.url).host
        val etiquette = listOfNotNull(
            if (donnees.video) context.getString(R.string.bouton_flottant_carte_video) else null,
            site,
        ).joinToString(" · ")
        if (etiquette.isNotBlank()) {
            colonne.addView(ligneTexte(etiquette, 12f, R.color.bouton_flottant_actif_fond, 1, gras = false))
        }
        ligne.addView(colonne, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))

        val enveloppe = FrameLayout(context)
        enveloppe.addView(ligne, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
        enveloppe.layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { bottomMargin = (ESPACE_DP * densite).toInt() }
        return enveloppe
    }

    private fun ligneTexte(contenu: String, tailleSp: Float, couleur: Int, lignesMax: Int, gras: Boolean): TextView =
        TextView(context).apply {
            text = contenu
            textSize = tailleSp
            maxLines = lignesMax
            ellipsize = TextUtils.TruncateAt.END
            setTextColor(ContextCompat.getColor(context, couleur))
            if (gras) typeface = Typeface.DEFAULT_BOLD
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
