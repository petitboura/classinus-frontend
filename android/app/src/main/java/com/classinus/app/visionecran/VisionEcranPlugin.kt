// Cree le 07/10/2026, demande Bourama : lot 1 du chantier "vision ecran"
// (Clovis voit l'ecran du telephone), branche feature/vision-ecran-android.
// Code COMMUN aux deux flavors, aucune accessibilite ici.
//
// Methodes exposees au JS (voir lib/visionEcran.ts pour les types) :
//   etat()                    : la capture est elle active ?
//   demarrer({...})           : ouvre la fenetre d'autorisation du systeme,
//                               puis lance la capture. Se resout quand la
//                               capture tourne reellement.
//   capturer({tailleMax, qualite}) : derniere image de l'ecran (JPEG base64)
//   arreter()                 : coupe la capture
//
// Evenement : "etatChange" { actif, erreur? }, emis a chaque demarrage,
// arret, ou coupure par le systeme (indicateur systeme, autre appli qui
// prend la main, rotation impossible a suivre...).
//
// Codes d'erreur stables pour le JS (le JS decide du texte affiche et le
// traduit) : REFUSE, INDISPONIBLE, DEJA_EN_COURS, DELAI, ECHEC, INACTIF,
// AUCUNE_IMAGE, CAPTURE_ECHEC.
package com.classinus.app.visionecran

import android.app.Activity
import android.content.Context
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.Looper
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "VisionEcran")
class VisionEcranPlugin : Plugin() {

    companion object {
        // Valeurs par defaut et bornes. Chacune peut etre surchargee par le
        // JS a l'appel : rien n'est impose en dur au reste de l'appli.
        private const val TAILLE_CAPTURE_MAX_DEFAUT = 1600
        private const val TAILLE_ENVOI_DEFAUT = 1280
        private const val TAILLE_MIN = 320
        private const val TAILLE_MAX = 2560
        private const val QUALITE_DEFAUT = 70
        private const val QUALITE_MIN = 30
        private const val QUALITE_MAX = 95

        // Delai maximal entre l'acceptation de l'etudiant et le demarrage
        // reel du service. Au dela, on rejette plutot que de laisser l'appel
        // pendre indefiniment.
        private const val DELAI_DEMARRAGE_MS = 10_000L
    }

    private val gestionnairePrincipal = Handler(Looper.getMainLooper())
    private var appelDemarrage: PluginCall? = null
    private var delaiDemarrage: Runnable? = null

    override fun load() {
        CaptureEcranService.surChangementEtat = { actif, erreur ->
            gererChangementEtat(actif, erreur)
        }
    }

    override fun handleOnDestroy() {
        CaptureEcranService.surChangementEtat = null
        delaiDemarrage?.let { gestionnairePrincipal.removeCallbacks(it) }
        super.handleOnDestroy()
    }

    @PluginMethod
    fun etat(call: PluginCall) {
        call.resolve(construireEtat())
    }

    @PluginMethod
    fun demarrer(call: PluginCall) {
        if (CaptureEcranService.estActif()) {
            call.resolve(construireEtat())
            return
        }
        if (appelDemarrage != null) {
            call.reject("Un démarrage de capture est déjà en cours.", "DEJA_EN_COURS")
            return
        }
        val gestionnaire = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager
        if (gestionnaire == null) {
            call.reject("La capture d'écran n'est pas disponible sur cet appareil.", "INDISPONIBLE")
            return
        }
        // Fenetre d'autorisation du systeme : obligatoire a chaque session.
        startActivityForResult(call, gestionnaire.createScreenCaptureIntent(), "resultatAutorisation")
    }

    @ActivityCallback
    private fun resultatAutorisation(call: PluginCall?, resultat: ActivityResult) {
        if (call == null) return
        val donnees = resultat.data
        if (resultat.resultCode != Activity.RESULT_OK || donnees == null) {
            call.reject("L'autorisation de capture a été refusée.", "REFUSE")
            bridge.releaseCall(call)
            return
        }

        // On garde l'appel : il sera resolu quand le service confirme que la
        // capture tourne (voir gererChangementEtat).
        appelDemarrage = call
        val delai = Runnable {
            val enAttente = appelDemarrage ?: return@Runnable
            appelDemarrage = null
            enAttente.reject("La capture n'a pas démarré à temps.", "DELAI")
            bridge.releaseCall(enAttente)
        }
        delaiDemarrage = delai
        gestionnairePrincipal.postDelayed(delai, DELAI_DEMARRAGE_MS)

        val titre = call.getString("titre") ?: context.getString(com.classinus.app.R.string.vision_ecran_notif_titre)
        val texte = call.getString("texte") ?: context.getString(com.classinus.app.R.string.vision_ecran_notif_texte)
        val libelleArreter = call.getString("libelleArreter")
            ?: context.getString(com.classinus.app.R.string.vision_ecran_notif_arreter)
        val tailleCaptureMax = (call.getInt("tailleCaptureMax") ?: TAILLE_CAPTURE_MAX_DEFAUT)
            .coerceIn(TAILLE_MIN, TAILLE_MAX)

        try {
            context.startForegroundService(
                CaptureEcranService.creerIntentDemarrage(
                    context,
                    resultat.resultCode,
                    donnees,
                    titre,
                    texte,
                    libelleArreter,
                    tailleCaptureMax,
                ),
            )
        } catch (e: Exception) {
            gestionnairePrincipal.removeCallbacks(delai)
            appelDemarrage = null
            call.reject("Le service de capture n'a pas pu démarrer.", "ECHEC")
            bridge.releaseCall(call)
        }
    }

    @PluginMethod
    fun capturer(call: PluginCall) {
        val service = CaptureEcranService.instance
        if (service == null || !CaptureEcranService.estActif()) {
            call.reject("La capture d'écran n'est pas active.", "INACTIF")
            return
        }
        val tailleMax = (call.getInt("tailleMax") ?: TAILLE_ENVOI_DEFAUT).coerceIn(TAILLE_MIN, TAILLE_MAX)
        val qualite = (call.getInt("qualite") ?: QUALITE_DEFAUT).coerceIn(QUALITE_MIN, QUALITE_MAX)

        // Les methodes de plugin tournent deja hors du thread principal.
        val capture = try {
            service.capturerJpeg(tailleMax, qualite)
        } catch (e: Exception) {
            call.reject("La lecture de l'écran a échoué.", "CAPTURE_ECHEC")
            return
        }
        if (capture == null) {
            call.reject("Aucune image de l'écran n'est encore disponible.", "AUCUNE_IMAGE")
            return
        }
        val reponse = JSObject()
        reponse.put("image", capture.imageBase64)
        reponse.put("typeMime", "image/jpeg")
        reponse.put("largeur", capture.largeur)
        reponse.put("hauteur", capture.hauteur)
        reponse.put("ecranLargeur", service.largeurEcran)
        reponse.put("ecranHauteur", service.hauteurEcran)
        reponse.put("horodatage", capture.horodatage)
        call.resolve(reponse)
    }

    @PluginMethod
    fun arreter(call: PluginCall) {
        CaptureEcranService.demanderArret()
        val reponse = JSObject()
        reponse.put("actif", false)
        call.resolve(reponse)
    }

    private fun construireEtat(): JSObject {
        val service = CaptureEcranService.instance
        val actif = CaptureEcranService.estActif()
        val reponse = JSObject()
        reponse.put("actif", actif)
        if (actif && service != null) {
            reponse.put("ecranLargeur", service.largeurEcran)
            reponse.put("ecranHauteur", service.hauteurEcran)
        }
        return reponse
    }

    private fun gererChangementEtat(actif: Boolean, erreur: String?) {
        gestionnairePrincipal.post {
            val enAttente = appelDemarrage
            if (enAttente != null) {
                delaiDemarrage?.let { gestionnairePrincipal.removeCallbacks(it) }
                appelDemarrage = null
                if (actif) {
                    enAttente.resolve(construireEtat())
                } else {
                    enAttente.reject(erreur ?: "Le démarrage de la capture a échoué.", "ECHEC")
                }
                bridge.releaseCall(enAttente)
            }
            val evenement = JSObject()
            evenement.put("actif", actif)
            if (erreur != null) evenement.put("erreur", erreur)
            notifyListeners("etatChange", evenement)
        }
    }
}
