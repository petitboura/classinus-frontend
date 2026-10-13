// Cree le 13/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android (branche feature/bouton-flottant-android). Code COMMUN
// aux deux flavors (src/main).
//
// Point d'entree JS <-> natif du bouton flottant (voir
// lib/boutonFlottantAndroid.ts pour les types). Le bouton ne contient AUCUNE
// logique du canal : le canal en direct vit dans la page web (WebView), ce
// plugin ne fait que transmettre l'appui a la page, qui bascule le canal
// exactement comme le bouton du canal dans l'appli.
//
// Methodes exposees au JS :
//   etat()                    : permission accordee ? bouton demarre ? choix de l'eleve ?
//   demarrer({titre, texte, libelleMasquer}) : montre le bouton et garde l'appli en vie
//   arreter()                 : retire le bouton (l'eleve ne le veut plus)
//   definirEtatCanal({actif}) : dessine le bouton selon l'etat du canal
//   signalerPret()            : la page ecoute les appuis
//   accuserBascule({numero})  : la page a pris en compte un appui
//   reculerAppli()            : renvoie l'appli en arriere-plan (retour a l'appli d'avant)
//
// Evenement vers le JS :
//   basculeDemande {numero, reculerApres} : l'eleve a touche le bouton.
//   reculerApres est vrai si l'appli n'etait pas a l'ecran : une fois le canal
//   bascule, la page doit rendre la main a l'appli d'avant.
//
// Si la page ne repond pas dans les 1,5 secondes (WebView gelee ou rechargee,
// appli fermee), l'appli est lancee et la bascule est rejouee des que la page
// est prete. Codes d'erreur stables pour le JS : PERMISSION_REFUSEE, ECHEC.
package com.classinus.app.boutonflottant

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.classinus.app.MainActivity
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "BoutonFlottant")
class BoutonFlottantPlugin : Plugin() {

    companion object {
        private const val DELAI_ACCUSE_MS = 1500L

        @Volatile
        private var instance: BoutonFlottantPlugin? = null

        private val principal = Handler(Looper.getMainLooper())
        private var numeroDemande = 0

        /** La page de l'appli (donc le canal en direct) existe-t-elle encore ? */
        fun pageVivante(): Boolean = instance != null

        @Volatile
        private var dernierNumeroAccuse = 0

        /**
         * Appui sur le bouton flottant. Thread principal. Si la page de l'appli
         * ecoute, on lui transmet l'appui et on attend son accuse ; sinon, ou
         * sans accuse, on lance l'appli et la bascule est rejouee a l'ouverture.
         */
        fun demanderBascule(context: Context) {
            val app = context.applicationContext
            val plugin = instance
            if (plugin == null || !plugin.pageALEcoute) {
                lancerAppli(app)
                return
            }
            val numero = ++numeroDemande
            plugin.envoyerBascule(numero, reculerApres = !plugin.appliVisible)
            principal.postDelayed({
                if (dernierNumeroAccuse < numero) lancerAppli(app)
            }, DELAI_ACCUSE_MS)
        }

        private fun lancerAppli(context: Context) {
            PreferencesBoutonFlottant.definirBasculeEnAttente(context, true)
            val intention = Intent(context, MainActivity::class.java).addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
            )
            try {
                context.startActivity(intention)
            } catch (e: Exception) {
                // Lancement refuse par le systeme : on n'invente pas une bascule pour plus tard.
                PreferencesBoutonFlottant.definirBasculeEnAttente(context, false)
                Log.w("BoutonFlottant", "Lancement de l'appli refuse par le systeme.", e)
            }
        }
    }

    @Volatile
    private var pageALEcoute = false

    @Volatile
    private var appliVisible = false

    override fun load() {
        instance = this
    }

    override fun handleOnResume() {
        appliVisible = true
        rejouerBasculeEnAttente()
    }

    override fun handleOnPause() {
        appliVisible = false
    }

    override fun handleOnDestroy() {
        if (instance === this) instance = null
        pageALEcoute = false
        // La page n'existe plus, le canal en direct non plus : le bouton redevient sombre.
        PreferencesBoutonFlottant.definirCanalActif(context, false)
        principal.post { BoutonFlottantManager.definirEtatCanal(false) }
    }

    private fun envoyerBascule(numero: Int, reculerApres: Boolean) {
        val evenement = JSObject()
        evenement.put("numero", numero)
        evenement.put("reculerApres", reculerApres)
        notifyListeners("basculeDemande", evenement)
    }

    /** Rejoue un appui fait pendant que la page ne pouvait pas repondre. */
    private fun rejouerBasculeEnAttente() {
        if (!pageALEcoute) return
        if (!PreferencesBoutonFlottant.basculeEnAttente(context)) return
        PreferencesBoutonFlottant.definirBasculeEnAttente(context, false)
        // Numero 0 : pas d'accuse a attendre, l'appli est deja a l'ecran.
        envoyerBascule(0, reculerApres = true)
    }

    @PluginMethod
    fun etat(call: PluginCall) {
        val reponse = JSObject()
        reponse.put("permissionAccordee", BoutonFlottantManager.permissionAccordee(context))
        reponse.put("demarre", BoutonFlottantService.estActif())
        // Absent tant que l'eleve n'a jamais choisi : le JS affiche alors le bouton par defaut.
        PreferencesBoutonFlottant.choix(context)?.let { reponse.put("choix", it) }
        call.resolve(reponse)
    }

    @PluginMethod
    fun demarrer(call: PluginCall) {
        if (!BoutonFlottantManager.permissionAccordee(context)) {
            call.reject("La permission d'afficher par-dessus les autres applications est absente.", "PERMISSION_REFUSEE")
            return
        }
        PreferencesBoutonFlottant.definirTextes(
            context,
            call.getString("titre"),
            call.getString("texte"),
            call.getString("libelleMasquer"),
        )
        PreferencesBoutonFlottant.definirChoix(context, true)
        try {
            BoutonFlottantService.demarrer(context)
        } catch (e: Exception) {
            call.reject("Le bouton flottant n'a pas pu demarrer.", "ECHEC", e)
            return
        }
        val reponse = JSObject()
        reponse.put("demarre", true)
        call.resolve(reponse)
    }

    @PluginMethod
    fun arreter(call: PluginCall) {
        PreferencesBoutonFlottant.definirChoix(context, false)
        BoutonFlottantService.arreter(context)
        val reponse = JSObject()
        reponse.put("demarre", false)
        call.resolve(reponse)
    }

    @PluginMethod
    fun definirEtatCanal(call: PluginCall) {
        val actif = call.getBoolean("actif") ?: false
        PreferencesBoutonFlottant.definirCanalActif(context, actif)
        principal.post { BoutonFlottantManager.definirEtatCanal(actif) }
        call.resolve()
    }

    @PluginMethod
    fun signalerPret(call: PluginCall) {
        pageALEcoute = true
        call.resolve()
        // Appui fait appli fermee : l'appli vient de se lancer, on le rejoue maintenant.
        rejouerBasculeEnAttente()
    }

    @PluginMethod
    fun accuserBascule(call: PluginCall) {
        val numero = call.getInt("numero") ?: 0
        if (numero > dernierNumeroAccuse) dernierNumeroAccuse = numero
        // La page a repondu : aucun rejeu a prevoir.
        PreferencesBoutonFlottant.definirBasculeEnAttente(context, false)
        call.resolve()
    }

    @PluginMethod
    fun reculerAppli(call: PluginCall) {
        principal.post {
            try {
                activity?.moveTaskToBack(true)
            } catch (e: Exception) {
                Log.w("BoutonFlottant", "Retour en arriere-plan impossible.", e)
            }
        }
        call.resolve()
    }
}
