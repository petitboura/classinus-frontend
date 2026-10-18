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
//   accuserTexte({numero})    : la page a recu un texte ecrit dans le champ Ecrire (lot 2)
//   definirBulle({mode, texte, proposerOuvrir}) : montre, met a jour ou ferme la bulle de
//   Classinus pres de sa fleche (lot 3). mode : "aucune", "information" ou "reponse".
//
// Evenements vers le JS :
//   basculeDemande {numero, reculerApres} : l'eleve a touche le bouton.
//   reculerApres est vrai si l'appli n'etait pas a l'ecran : une fois le canal
//   bascule, la page doit rendre la main a l'appli d'avant.
//   texteEcrit {numero, texte} : l'eleve a envoye un message depuis le champ du
//   bouton Ecrire. La page l'envoie a Classinus comme le champ du PC.
//   bulleAction {action} : geste de l'eleve sur la fleche ou la bulle (lot 3). action :
//   "basculer" (toucher la fleche : rouvrir ou fermer la derniere reponse), "suspendre"
//   (un doigt sur la reponse : la garder ouverte), "reprendre" (le doigt la quitte).
//
// Si la page ne repond pas dans les 1,5 secondes (WebView gelee ou rechargee,
// appli fermee), l'appli est lancee et la bascule est rejouee des que la page
// est prete. Codes d'erreur stables pour le JS : PERMISSION_REFUSEE, ECHEC.
package com.classinus.app.boutonflottant

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Base64
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

        @Volatile
        private var dernierNumeroTexteAccuse = 0
        private var numeroTexte = 0

        /**
         * Texte ecrit dans le champ du bouton Ecrire (lot 2). Thread principal. Meme principe
         * que l'appui : si la page ecoute on le lui transmet et on attend son accuse ; sinon,
         * ou sans accuse, le texte est garde et l'appli est lancee (sans basculer le canal),
         * la page le recoit des qu'elle est prete. Le texte n'est jamais perdu en silence.
         */
        fun demanderEnvoiTexte(context: Context, texte: String) {
            val app = context.applicationContext
            val plugin = instance
            if (plugin == null || !plugin.pageALEcoute) {
                PreferencesBoutonFlottant.definirTexteEnAttente(app, texte)
                lancerAppli(app, avecBascule = false)
                return
            }
            val numero = ++numeroTexte
            plugin.envoyerTexte(numero, texte)
            principal.postDelayed({
                if (dernierNumeroTexteAccuse < numero) {
                    PreferencesBoutonFlottant.definirTexteEnAttente(app, texte)
                    lancerAppli(app, avecBascule = false)
                }
            }, DELAI_ACCUSE_MS)
        }

        /** Ouvre l'appli sans toucher au canal (ligne "Ouvrir Classinus" de la bulle). */
        fun ouvrirAppli(context: Context) {
            lancerAppli(context.applicationContext, avecBascule = false)
        }

        /** Geste de l'eleve sur la fleche ou la bulle (lot 3), transmis a la page si elle existe. */
        fun transmettreActionBulle(action: String) {
            instance?.envoyerActionBulle(action)
        }

        /** Ouvre une adresse web dans le navigateur (image ou carte de la bulle). http et https seulement. */
        fun ouvrirLien(context: Context, adresse: String) {
            val uri = try {
                Uri.parse(adresse)
            } catch (e: Exception) {
                return
            }
            val schema = uri.scheme?.lowercase()
            if (schema != "https" && schema != "http") return
            try {
                context.applicationContext.startActivity(
                    Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            } catch (e: Exception) {
                Log.w("BoutonFlottant", "Ouverture du lien refusee ou aucun navigateur.", e)
            }
        }

        // Lot 4 : evenements du micro natif remis a la page (dictee et flux de la voix).

        fun transmettreEtatDictee(ecoute: Boolean) {
            instance?.emettre("dicteeEtat", JSObject().put("ecoute", ecoute))
        }

        fun transmettreDicteeTerminee(audio: ByteArray, typeMime: String) {
            val evenement = JSObject().put("audio", Base64.encodeToString(audio, Base64.NO_WRAP)).put("typeMime", typeMime)
            instance?.emettre("dicteeTerminee", evenement)
        }

        fun transmettreVoixDemandee() {
            instance?.emettre("voixDemandee", JSObject())
        }

        /** Appele depuis le fil de lecture du micro, tous les 100 ms pendant la voix. */
        fun transmettreMorceauFlux(pcm: ByteArray) {
            instance?.emettre("fluxMorceau", JSObject().put("pcm", Base64.encodeToString(pcm, Base64.NO_WRAP)))
        }

        fun transmettreFluxInterrompu() {
            instance?.emettre("fluxInterrompu", JSObject())
        }

        fun transmettreErreurMicro(code: String) {
            instance?.emettre("erreurMicro", JSObject().put("code", code))
        }

        private fun lancerAppli(context: Context, avecBascule: Boolean = true) {
            if (avecBascule) PreferencesBoutonFlottant.definirBasculeEnAttente(context, true)
            val intention = Intent(context, MainActivity::class.java).addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
            )
            try {
                context.startActivity(intention)
            } catch (e: Exception) {
                // Lancement refuse par le systeme : on n'invente pas une bascule pour plus tard.
                if (avecBascule) PreferencesBoutonFlottant.definirBasculeEnAttente(context, false)
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
        rejouerTexteEnAttente()
    }

    override fun handleOnPause() {
        appliVisible = false
    }

    override fun handleOnDestroy() {
        if (instance === this) instance = null
        pageALEcoute = false
        // La page n'existe plus : plus personne pour recevoir le son, le micro est libere.
        principal.post { MicroNatif.arreterTout() }
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

    private fun envoyerTexte(numero: Int, texte: String) {
        val evenement = JSObject()
        evenement.put("numero", numero)
        evenement.put("texte", texte)
        notifyListeners("texteEcrit", evenement)
    }

    private fun emettre(nom: String, evenement: JSObject) {
        if (!pageALEcoute) return
        notifyListeners(nom, evenement)
    }

    private fun envoyerActionBulle(action: String) {
        if (!pageALEcoute) return
        val evenement = JSObject()
        evenement.put("action", action)
        notifyListeners("bulleAction", evenement)
    }

    /** Rejoue un texte ecrit pendant que la page ne pouvait pas le recevoir. */
    private fun rejouerTexteEnAttente() {
        if (!pageALEcoute) return
        val texte = PreferencesBoutonFlottant.prendreTexteEnAttente(context) ?: return
        // Numero 0 : pas d'accuse a attendre, l'appli est deja a l'ecran.
        envoyerTexte(0, texte)
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
    fun definirBulle(call: PluginCall) {
        val mode = call.getString("mode") ?: BulleEtCurseurManager.MODE_AUCUNE
        val texte = call.getString("texte")
        val proposerOuvrir = call.getBoolean("proposerOuvrir") ?: false
        // Lot 4 : images (adresses) et cartes d'apercu (liens, videos) de la reponse.
        val images = ArrayList<String>()
        call.getArray("images")?.let { liste ->
            for (i in 0 until liste.length()) liste.optString(i, "").takeIf { it.isNotEmpty() }?.let { images.add(it) }
        }
        val cartes = ArrayList<CarteBulle>()
        call.getArray("cartes")?.let { liste ->
            for (i in 0 until liste.length()) {
                val o = liste.optJSONObject(i) ?: continue
                val url = o.optString("url", "")
                val titre = o.optString("titre", "")
                if (url.isEmpty() || titre.isEmpty()) continue
                cartes.add(
                    CarteBulle(
                        url = url,
                        titre = titre,
                        description = o.optString("description", "").ifEmpty { null },
                        site = o.optString("site", "").ifEmpty { null },
                        image = o.optString("image", "").ifEmpty { null },
                        video = o.optBoolean("video", false),
                    ),
                )
            }
        }
        principal.post { BulleEtCurseurManager.definirBulle(mode, texte, proposerOuvrir, images, cartes) }
        call.resolve()
    }

    /** Etat du micro et de la voix, pousse par la page (lot 4) : transcription en cours, etat de la voix. */
    @PluginMethod
    fun definirEtatMicroVoix(call: PluginCall) {
        val transcription = call.getBoolean("transcription") ?: false
        val voixEtat = call.getString("voix") ?: "inactif"
        principal.post { BoutonFlottantManager.definirEtatMicroVoix(transcription, voixEtat) }
        call.resolve()
    }

    /** Etat et niveaux sonores de la voix pour l'onde de la bulle (lot 4), environ 15 fois par seconde. */
    @PluginMethod
    fun definirNiveauxVoix(call: PluginCall) {
        val etat = call.getString("etat") ?: "inactif"
        val entree = (call.getFloat("entree") ?: 0f)
        val sortie = (call.getFloat("sortie") ?: 0f)
        principal.post { BulleEtCurseurManager.definirNiveauxVoix(etat, entree, sortie) }
        call.resolve()
    }

    /** La page demande le flux du micro pour la voix en direct (lot 4). Renvoie faux si le micro est indisponible. */
    @PluginMethod
    fun demarrerFluxMicro(call: PluginCall) {
        principal.post {
            val reponse = JSObject()
            reponse.put("demarre", MicroNatif.demarrerFlux())
            call.resolve(reponse)
        }
    }

    @PluginMethod
    fun arreterFluxMicro(call: PluginCall) {
        principal.post { MicroNatif.arreterFlux() }
        call.resolve()
    }

    /** Abandonne la dictee en cours sans rien envoyer (champ Ecrire ouvert, canal coupe). */
    @PluginMethod
    fun annulerDictee(call: PluginCall) {
        principal.post { MicroNatif.annulerDictee() }
        call.resolve()
    }

    /** La page ouvre le service du micro elle-meme quand l'appli est visible (voix lancee depuis l'appli). */
    @PluginMethod
    fun armerMicro(call: PluginCall) {
        principal.post {
            if (MicroNatifService.estArme()) {
                val reponse = JSObject()
                reponse.put("arme", true)
                call.resolve(reponse)
            } else if (!MicroNatif.autorisationAccordee(context)) {
                val reponse = JSObject()
                reponse.put("arme", false)
                call.resolve(reponse)
            } else {
                try {
                    MicroNatifService.armer(context)
                    principal.postDelayed({
                        val reponse = JSObject()
                        reponse.put("arme", MicroNatifService.estArme())
                        call.resolve(reponse)
                    }, 600L)
                } catch (e: Exception) {
                    val reponse = JSObject()
                    reponse.put("arme", false)
                    call.resolve(reponse)
                }
            }
        }
    }

    @PluginMethod
    fun signalerPret(call: PluginCall) {
        pageALEcoute = true
        call.resolve()
        // Appui fait appli fermee : l'appli vient de se lancer, on le rejoue maintenant.
        rejouerBasculeEnAttente()
        rejouerTexteEnAttente()
    }

    @PluginMethod
    fun accuserTexte(call: PluginCall) {
        val numero = call.getInt("numero") ?: 0
        if (numero > dernierNumeroTexteAccuse) dernierNumeroTexteAccuse = numero
        // La page a recu le texte : aucun rejeu a prevoir.
        PreferencesBoutonFlottant.effacerTexteEnAttente(context)
        call.resolve()
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
