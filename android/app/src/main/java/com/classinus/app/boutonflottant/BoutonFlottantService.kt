// Cree le 13/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android. Code COMMUN aux deux flavors (src/main).
//
// Service au premier plan qui porte le bouton. Il fait deux choses :
//   1. il possede la fenetre du bouton (BoutonFlottantManager), donc le bouton
//      reste a l'ecran appli fermee ;
//   2. il garde le processus de l'appli en vie, donc la page web qui tient la
//      connexion du canal en direct n'est pas arretee par Android quand
//      Classinus passe en arriere-plan.
//
// Type specialUse : aucun des types standards ne decrit "un bouton disponible
// par-dessus les autres applications". Le sous-type est declare dans le
// manifest. Depuis Android 14 la notification est obligatoire, mais l'eleve
// peut la fermer ; son bouton "Masquer le bouton" retire aussi le bouton.
//
// Redemarre tout seul (START_STICKY) si le systeme le tue.
package com.classinus.app.boutonflottant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.content.res.Configuration
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.classinus.app.MainActivity
import com.classinus.app.R

class BoutonFlottantService : Service() {

    companion object {
        private const val ACTION_MASQUER = "com.classinus.app.boutonflottant.MASQUER"
        private const val CANAL_ID = "bouton_flottant"
        private const val NOTIFICATION_ID = 4720

        @Volatile
        private var actif = false

        fun estActif(): Boolean = actif

        /** Demarre le service. Doit etre appele appli au premier plan ou depuis un recepteur de demarrage. */
        fun demarrer(context: Context) {
            ContextCompat.startForegroundService(context, Intent(context, BoutonFlottantService::class.java))
        }

        fun arreter(context: Context) {
            context.stopService(Intent(context, BoutonFlottantService::class.java))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_MASQUER) {
            // L'eleve masque le bouton depuis la notification : on s'en souvient,
            // il ne reviendra pas au prochain demarrage.
            PreferencesBoutonFlottant.definirChoix(this, false)
            arreterTout()
            return START_NOT_STICKY
        }

        try {
            entrerAuPremierPlan()
        } catch (e: Exception) {
            // Le systeme refuse un service au premier plan (relance en arriere-plan
            // par exemple) : on s'arrete proprement, le bouton reviendra a la
            // prochaine ouverture de l'appli.
            Log.w("BoutonFlottant", "Passage au premier plan refuse par le systeme.", e)
            arreterTout()
            return START_NOT_STICKY
        }

        // Service relance sans page (redemarrage, processus tue) : le canal en direct
        // repart toujours de zero, un ancien etat "actif" ne doit pas colorer le bouton.
        if (!BoutonFlottantPlugin.pageVivante()) PreferencesBoutonFlottant.definirCanalActif(this, false)

        BoutonFlottantManager.surAppui = { BoutonFlottantPlugin.demanderBascule(applicationContext) }
        BoutonFlottantManager.surTexteEcrit = { texte -> BoutonFlottantPlugin.demanderEnvoiTexte(applicationContext, texte) }
        // Lot 3 : gestes sur la fleche et la bulle, remis a la page ; ligne "Ouvrir Classinus" de la bulle.
        BulleEtCurseurManager.surAction = { action -> BoutonFlottantPlugin.transmettreActionBulle(action) }
        BulleEtCurseurManager.surOuvrirAppli = { BoutonFlottantPlugin.ouvrirAppli(applicationContext) }
        BulleEtCurseurManager.surOuvrirLien = { adresse -> BoutonFlottantPlugin.ouvrirLien(applicationContext, adresse) }
        // Lot 4 : micro de dictee et mode vocal. Les appuis vont au micro natif, ses resultats a la page.
        BoutonFlottantManager.surMicro = { MicroNatif.basculerDictee(applicationContext) }
        BoutonFlottantManager.surVoix = { MicroNatif.demanderVoix(applicationContext) }
        MicroNatif.surEtatDictee = { ecoute ->
            BoutonFlottantManager.definirEcouteNative(ecoute)
            BoutonFlottantPlugin.transmettreEtatDictee(ecoute)
        }
        MicroNatif.surDicteeTerminee = { audio, typeMime -> BoutonFlottantPlugin.transmettreDicteeTerminee(audio, typeMime) }
        MicroNatif.surVoixDemandee = { BoutonFlottantPlugin.transmettreVoixDemandee() }
        MicroNatif.surMorceauFlux = { pcm -> BoutonFlottantPlugin.transmettreMorceauFlux(pcm) }
        MicroNatif.surFluxInterrompu = { BoutonFlottantPlugin.transmettreFluxInterrompu() }
        MicroNatif.surErreur = { code -> BoutonFlottantPlugin.transmettreErreurMicro(code) }
        if (!BoutonFlottantManager.afficher(this)) {
            // Permission retiree entre-temps ou fenetre refusee : un service sans
            // bouton ne sert a rien, on s'arrete sans oublier le choix de l'eleve.
            arreterTout()
            return START_NOT_STICKY
        }
        actif = true
        return START_STICKY
    }

    override fun onConfigurationChanged(nouvelle: Configuration) {
        super.onConfigurationChanged(nouvelle)
        BoutonFlottantManager.replacer()
    }

    override fun onDestroy() {
        actif = false
        BoutonFlottantManager.surAppui = null
        BoutonFlottantManager.surTexteEcrit = null
        BulleEtCurseurManager.surAction = null
        BulleEtCurseurManager.surOuvrirAppli = null
        BulleEtCurseurManager.surOuvrirLien = null
        BoutonFlottantManager.surMicro = null
        BoutonFlottantManager.surVoix = null
        // Le bouton disparait : plus de dictee ni de voix a tenir, puis les rappels sont debranches.
        MicroNatif.arreterTout()
        MicroNatif.surEtatDictee = null
        MicroNatif.surDicteeTerminee = null
        MicroNatif.surVoixDemandee = null
        MicroNatif.surMorceauFlux = null
        MicroNatif.surFluxInterrompu = null
        MicroNatif.surErreur = null
        BoutonFlottantManager.retirer()
        super.onDestroy()
    }

    private fun arreterTout() {
        actif = false
        BoutonFlottantManager.retirer()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun entrerAuPremierPlan() {
        creerCanalNotification()
        val notification = construireNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun creerCanalNotification() {
        val gestionnaire = getSystemService(NotificationManager::class.java)
        if (gestionnaire.getNotificationChannel(CANAL_ID) != null) return
        val canal = NotificationChannel(
            CANAL_ID,
            getString(R.string.bouton_flottant_canal_nom),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.bouton_flottant_canal_description)
            setShowBadge(false)
        }
        gestionnaire.createNotificationChannel(canal)
    }

    private fun construireNotification(): Notification {
        val titre = PreferencesBoutonFlottant.titre(this) ?: getString(R.string.bouton_flottant_notif_titre)
        val texte = PreferencesBoutonFlottant.texte(this) ?: getString(R.string.bouton_flottant_notif_texte)
        val libelleMasquer = PreferencesBoutonFlottant.libelleMasquer(this) ?: getString(R.string.bouton_flottant_notif_masquer)

        val ouvrirAppli = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val masquer = PendingIntent.getService(
            this,
            1,
            Intent(this, BoutonFlottantService::class.java).setAction(ACTION_MASQUER),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        return NotificationCompat.Builder(this, CANAL_ID)
            .setSmallIcon(R.drawable.ic_clovis_notification)
            .setContentTitle(titre)
            .setContentText(texte)
            .setStyle(NotificationCompat.BigTextStyle().bigText(texte))
            .setContentIntent(ouvrirAppli)
            .addAction(0, libelleMasquer, masquer)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }
}
