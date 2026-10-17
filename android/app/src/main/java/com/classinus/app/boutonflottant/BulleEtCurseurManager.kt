// Cree le 17/10/2026, demande Bourama : lot 3 du bouton flottant natif Android
// (bulle de reponse et fleche). Code COMMUN aux deux flavors (src/main).
//
// Gere les DEUX fenetres de superposition du lot 3 :
//   - la fleche de Classinus (CurseurFlottant), visible tant que le canal en direct
//     est actif, que l'etudiant peut faire glisser et toucher ;
//   - la bulle (BulleReponseFlottante), posee pres de la pointe de la fleche, qui
//     montre une information ou une reponse quand la page le demande.
//
// Regles de conception :
//   - la page decide de tout (quoi afficher, quand fermer) : ce gestionnaire ne
//     garde aucun minuteur, il dessine l'etat recu (definirBulle) et signale les
//     gestes de l'etudiant (surAction : basculer, suspendre, reprendre) ;
//   - la bulle se place au dessus de la pointe s'il y a la place, sinon en dessous,
//     sinon du cote le plus large en reduisant sa hauteur (elle defile alors) ;
//     elle ne sort jamais de la zone utilisable de l'ecran (barres du systeme et
//     encoche exclues) ;
//   - la fleche reste toujours entierement a l'ecran et sa position est gardee en
//     proportion de la zone utilisable, donc elle reste juste apres une rotation ;
//   - la fleche est posee au dessus de la bulle (elle ne passe jamais derriere) ; ces
//     deux fenetres sont au dessus du groupe de boutons. Le champ de saisie du bouton
//     Ecrire est au dessus des deux s'il s'ouvre apres elles ; une bulle qui apparait
//     pendant que le champ est ouvert passe devant lui (il ne peut pas etre remis devant
//     sans perdre le clavier) ;
//   - sans permission d'affichage rien ne s'affiche (jamais contournee) : ce
//     gestionnaire n'est appele que depuis BoutonFlottantManager, qui la verifie.
//
// Tout ce qui touche aux fenetres se fait sur le thread principal.
package com.classinus.app.boutonflottant

import android.content.Context
import android.graphics.PixelFormat
import android.graphics.Rect
import android.os.Build
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import androidx.core.content.ContextCompat
import com.classinus.app.R

object BulleEtCurseurManager {

    const val ACTION_BASCULER = "basculer"
    const val ACTION_SUSPENDRE = "suspendre"
    const val ACTION_REPRENDRE = "reprendre"

    // Modes recus de la page (voir lib/boutonFlottantAndroid.ts, ModeBulleNative) : "aucune"
    // ferme la bulle, "information" un petit message, "reponse" la reponse de Classinus.
    const val MODE_AUCUNE = "aucune"
    const val MODE_REPONSE = "reponse"

    private const val MARGE_ECRAN_DP = 12f
    private const val ECART_BULLE_DP = 8f
    private const val LARGEUR_MAX_DP = 380f
    private const val LARGEUR_MAX_FRACTION = 0.92f
    private const val HAUTEUR_MAX_FRACTION = 0.7f
    private const val HAUTEUR_MIN_DP = 96f

    private var contexte: Context? = null

    private var curseur: CurseurFlottant? = null
    private var reglagesCurseur: WindowManager.LayoutParams? = null

    private var bulle: BulleReponseFlottante? = null
    private var reglagesBulle: WindowManager.LayoutParams? = null
    private var modeBulle = MODE_AUCUNE

    // Position de la pointe, en proportion de la zone utilisable (0 a 1). Au centre au depart,
    // comme le curseur du PC. Jamais gardee d'une ouverture a l'autre : le canal repart de zero.
    private var fractionX = 0.5f
    private var fractionY = 0.5f

    /** Geste de l'etudiant sur la fleche ou la bulle (ACTION_*). Branche par le service. */
    var surAction: ((action: String) -> Unit)? = null

    /** L'etudiant demande d'ouvrir Classinus depuis la bulle. Branche par le service. */
    var surOuvrirAppli: (() -> Unit)? = null

    /** Montre ou retire la fleche selon l'etat du canal en direct. Retire aussi la bulle quand le canal se coupe. */
    fun definirCanalActif(context: Context, actif: Boolean) {
        contexte = context.applicationContext
        if (actif) afficherCurseur() else retirerCurseurEtBulle()
    }

    /**
     * Dessine l'etat de la bulle. Sans fleche (canal coupe) rien ne s'affiche : la bulle n'existe
     * que canal actif, comme celle du PC.
     */
    fun definirBulle(mode: String, texte: String?, proposerOuvrir: Boolean) {
        val c = contexte ?: return
        if (curseur == null) return
        if (mode == MODE_AUCUNE || texte.isNullOrBlank()) {
            masquerBulle()
            return
        }
        val reponse = mode == MODE_REPONSE
        val simplifie = TexteSimplifie.simplifier(texte, ContextCompat.getColor(c, R.color.bouton_flottant_bulle_code_fond))
        val vue = bulle ?: creerBulle(c) ?: return
        modeBulle = mode
        vue.definir(simplifie.texte, reponse && (proposerOuvrir || simplifie.contenuIgnore))
        reglerToucheBulle(reponse)
        placerBulle()
    }

    /** A rappeler apres une rotation ou un changement de taille d'ecran. */
    fun replacer() {
        val c = contexte ?: return
        val vue = curseur ?: return
        val reglages = reglagesCurseur ?: return
        positionnerCurseur(c, reglages, vue)
        try {
            c.getSystemService(WindowManager::class.java).updateViewLayout(vue, reglages)
        } catch (e: Exception) {
            // La fenetre a disparu entre-temps : rien a replacer.
        }
        placerBulle()
    }

    /** Retrait sans animation (arret du service) : aucune fenetre ne doit survivre au gestionnaire. */
    fun retirerTout() {
        val c = contexte
        val gestionnaire = c?.getSystemService(WindowManager::class.java)
        bulle?.let {
            it.animate().cancel()
            try {
                gestionnaire?.removeView(it)
            } catch (e: Exception) {
                // Deja retiree : rien a faire.
            }
        }
        curseur?.let {
            it.animate().cancel()
            try {
                gestionnaire?.removeView(it)
            } catch (e: Exception) {
                // Deja retiree : rien a faire.
            }
        }
        bulle = null
        reglagesBulle = null
        curseur = null
        reglagesCurseur = null
        modeBulle = MODE_AUCUNE
        fractionX = 0.5f
        fractionY = 0.5f
    }

    private fun afficherCurseur() {
        val c = contexte ?: return
        if (curseur != null) return
        val nouveau = CurseurFlottant(c)
        nouveau.contentDescription = c.getString(R.string.bouton_flottant_curseur_description)
        nouveau.alpha = 0f
        nouveau.surAppui = { surAction?.invoke(ACTION_BASCULER) }
        nouveau.surDeplacement = { dx, dy -> deplacerCurseur(dx, dy) }
        nouveau.surRelachement = { memoriserPosition() }

        val reglages = creerReglagesCurseur()
        positionnerCurseur(c, reglages, nouveau)
        try {
            c.getSystemService(WindowManager::class.java).addView(nouveau, reglages)
        } catch (e: Exception) {
            return
        }
        curseur = nouveau
        reglagesCurseur = reglages
        nouveau.apparaitre()
    }

    private fun retirerCurseurEtBulle() {
        val c = contexte
        val gestionnaire = c?.getSystemService(WindowManager::class.java)
        masquerBulle()
        val aRetirer = curseur ?: return
        curseur = null
        reglagesCurseur = null
        fractionX = 0.5f
        fractionY = 0.5f
        aRetirer.disparaitre {
            try {
                gestionnaire?.removeView(aRetirer)
            } catch (e: Exception) {
                // Deja retiree : rien a faire.
            }
        }
    }

    private fun creerBulle(c: Context): BulleReponseFlottante? {
        val gestionnaire = c.getSystemService(WindowManager::class.java)
        val nouvelle = BulleReponseFlottante(c)
        nouvelle.surToucheDebut = { surAction?.invoke(ACTION_SUSPENDRE) }
        nouvelle.surToucheFin = { surAction?.invoke(ACTION_REPRENDRE) }
        nouvelle.surOuvrirAppli = { surOuvrirAppli?.invoke() }
        nouvelle.alpha = 0f
        val reglages = creerReglagesBulle()
        try {
            gestionnaire.addView(nouvelle, reglages)
        } catch (e: Exception) {
            return null
        }
        bulle = nouvelle
        reglagesBulle = reglages
        // La fenetre ajoutee en dernier est au dessus : la fleche est retiree puis remise pour
        // rester devant la bulle. Meme vue, meme position, le changement ne se voit pas.
        remettreCurseurAuDessus(gestionnaire)
        nouvelle.apparaitre()
        return nouvelle
    }

    private fun remettreCurseurAuDessus(gestionnaire: WindowManager) {
        val vue = curseur ?: return
        val reglages = reglagesCurseur ?: return
        try {
            gestionnaire.removeViewImmediate(vue)
            gestionnaire.addView(vue, reglages)
        } catch (e: Exception) {
            // Si la fleche ne peut pas revenir, elle est consideree comme retiree.
            curseur = null
            reglagesCurseur = null
        }
    }

    /** Referme la bulle en fondu. Sans effet si elle est deja fermee. */
    private fun masquerBulle() {
        val aRetirer = bulle ?: return
        bulle = null
        reglagesBulle = null
        modeBulle = MODE_AUCUNE
        val c = contexte
        aRetirer.disparaitre {
            try {
                c?.getSystemService(WindowManager::class.java)?.removeView(aRetirer)
            } catch (e: Exception) {
                // Deja retiree : rien a faire.
            }
        }
    }

    /** Une information laisse passer les gestes ; une reponse les prend (defilement, doigt qui la garde ouverte). */
    private fun reglerToucheBulle(reponse: Boolean) {
        val c = contexte ?: return
        val vue = bulle ?: return
        val reglages = reglagesBulle ?: return
        val sansToucher = WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
        val avant = reglages.flags
        reglages.flags = if (reponse) avant and sansToucher.inv() else avant or sansToucher
        if (reglages.flags == avant) return
        try {
            c.getSystemService(WindowManager::class.java).updateViewLayout(vue, reglages)
        } catch (e: Exception) {
            // Fenetre disparue : ignore.
        }
    }

    private fun deplacerCurseur(dx: Float, dy: Float) {
        val c = contexte ?: return
        val vue = curseur ?: return
        val reglages = reglagesCurseur ?: return
        val zone = zoneUtilisable(c)
        reglages.x = (reglages.x + dx.toInt()).coerceIn(zone.left, (zone.right - vue.tailleZonePx).coerceAtLeast(zone.left))
        reglages.y = (reglages.y + dy.toInt()).coerceIn(zone.top, (zone.bottom - vue.tailleZonePx).coerceAtLeast(zone.top))
        try {
            c.getSystemService(WindowManager::class.java).updateViewLayout(vue, reglages)
        } catch (e: Exception) {
            return
        }
        // La bulle suit la fleche pendant le glissement.
        placerBulle()
    }

    /** Garde la position de la pointe en proportion de la zone utilisable. */
    private fun memoriserPosition() {
        val c = contexte ?: return
        val vue = curseur ?: return
        val reglages = reglagesCurseur ?: return
        val zone = zoneUtilisable(c)
        if (zone.width() <= 0 || zone.height() <= 0) return
        fractionX = ((reglages.x + vue.decalagePointePx - zone.left).toFloat() / zone.width()).coerceIn(0f, 1f)
        fractionY = ((reglages.y + vue.decalagePointePx - zone.top).toFloat() / zone.height()).coerceIn(0f, 1f)
    }

    private fun positionnerCurseur(c: Context, reglages: WindowManager.LayoutParams, vue: CurseurFlottant) {
        val zone = zoneUtilisable(c)
        val pointeX = zone.left + (fractionX * zone.width()).toInt()
        val pointeY = zone.top + (fractionY * zone.height()).toInt()
        reglages.x = (pointeX - vue.decalagePointePx).coerceIn(zone.left, (zone.right - vue.tailleZonePx).coerceAtLeast(zone.left))
        reglages.y = (pointeY - vue.decalagePointePx).coerceIn(zone.top, (zone.bottom - vue.tailleZonePx).coerceAtLeast(zone.top))
    }

    /** Mesure la bulle puis la pose pres de la pointe de la fleche. */
    private fun placerBulle() {
        val c = contexte ?: return
        val vue = bulle ?: return
        val reglages = reglagesBulle ?: return
        val pointe = curseur ?: return
        val reglagesFleche = reglagesCurseur ?: return
        val densite = c.resources.displayMetrics.density
        val zone = zoneUtilisable(c)
        val marge = (MARGE_ECRAN_DP * densite).toInt()
        val ecart = (ECART_BULLE_DP * densite).toInt()
        val hauteurMin = (HAUTEUR_MIN_DP * densite).toInt()

        val pointeX = reglagesFleche.x + pointe.decalagePointePx
        val pointeY = reglagesFleche.y + pointe.decalagePointePx
        // Sous la pointe, la fleche elle meme occupe de la place : la bulle se met sous la zone tactile.
        val basFleche = reglagesFleche.y + pointe.tailleZonePx

        val largeurMax = minOf((LARGEUR_MAX_DP * densite).toInt(), ((zone.width() - 2 * marge) * LARGEUR_MAX_FRACTION).toInt())
            .coerceAtLeast(1)
        val hauteurMax = ((zone.height() - 2 * marge) * HAUTEUR_MAX_FRACTION).toInt().coerceAtLeast(hauteurMin)

        val placeDessus = pointeY - ecart - (zone.top + marge)
        val placeDessous = (zone.bottom - marge) - (basFleche + ecart)

        vue.measure(
            View.MeasureSpec.makeMeasureSpec(largeurMax, View.MeasureSpec.AT_MOST),
            View.MeasureSpec.makeMeasureSpec(hauteurMax, View.MeasureSpec.AT_MOST),
        )
        var hauteur = vue.measuredHeight
        val auDessus = when {
            hauteur <= placeDessus -> true
            hauteur <= placeDessous -> false
            else -> placeDessus >= placeDessous
        }
        val placeDisponible = if (auDessus) placeDessus else placeDessous
        if (hauteur > placeDisponible) {
            // Ni dessus ni dessous : la bulle prend la place du cote le plus large et defile.
            val limite = placeDisponible.coerceAtLeast(hauteurMin)
            vue.measure(
                View.MeasureSpec.makeMeasureSpec(largeurMax, View.MeasureSpec.AT_MOST),
                View.MeasureSpec.makeMeasureSpec(limite, View.MeasureSpec.AT_MOST),
            )
            hauteur = vue.measuredHeight
        }
        val largeur = vue.measuredWidth

        val x = (pointeX - largeur / 2).coerceIn(zone.left + marge, (zone.right - marge - largeur).coerceAtLeast(zone.left + marge))
        val yBrut = if (auDessus) pointeY - ecart - hauteur else basFleche + ecart
        val y = yBrut.coerceIn(zone.top + marge, (zone.bottom - marge - hauteur).coerceAtLeast(zone.top + marge))

        val identique = reglages.x == x && reglages.y == y && reglages.width == largeur && reglages.height == hauteur
        if (identique) return
        reglages.x = x
        reglages.y = y
        reglages.width = largeur
        reglages.height = hauteur
        try {
            c.getSystemService(WindowManager::class.java).updateViewLayout(vue, reglages)
        } catch (e: Exception) {
            // Fenetre disparue : ignore.
        }
    }

    /**
     * Zone utilisable de l'ecran dans son orientation actuelle : l'ecran moins les barres du
     * systeme et l'encoche (depuis Android 11, sinon l'ecran entier).
     */
    private fun zoneUtilisable(c: Context): Rect {
        val gestionnaire = c.getSystemService(WindowManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val metriques = gestionnaire.maximumWindowMetrics
            val bords = metriques.windowInsets.getInsetsIgnoringVisibility(
                WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout(),
            )
            val ecran = metriques.bounds
            return Rect(ecran.left + bords.left, ecran.top + bords.top, ecran.right - bords.right, ecran.bottom - bords.bottom)
        }
        val metriques = DisplayMetrics()
        @Suppress("DEPRECATION")
        gestionnaire.defaultDisplay.getRealMetrics(metriques)
        return Rect(0, 0, metriques.widthPixels, metriques.heightPixels)
    }

    private fun creerReglagesCurseur(): WindowManager.LayoutParams {
        val drapeaux = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            drapeaux,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.LEFT
            title = "ClassinusCurseurFlottant"
        }
    }

    private fun creerReglagesBulle(): WindowManager.LayoutParams {
        val drapeaux = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED or
            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            drapeaux,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.LEFT
            title = "ClassinusBulleFlottante"
        }
    }
}
