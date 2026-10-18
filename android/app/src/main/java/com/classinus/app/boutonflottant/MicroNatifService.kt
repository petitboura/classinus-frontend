// Cree le 17/10/2026, demande Bourama : lot 4 du bouton flottant natif Android
// (micro de dictee et mode vocal). Code COMMUN aux deux flavors (src/main).
//
// Service au premier plan de type microphone. Android coupe le micro d'une application
// qui n'est plus visible, sauf si elle tient un service de ce type : c'est ce service qui
// permet de dicter ou de parler a Classinus depuis une autre application. Il ne fait
// RIEN d'autre que tenir cette autorisation ; l'enregistrement lui-meme est dans
// MicroNatif.
//
// Il n'existe que le temps d'une dictee ou d'une conversation vocale : MicroNatif
// l'arrete des que plus rien n'enregistre. La notification est obligatoire (Android la
// montre tant que le micro est tenu) ; son bouton "Arreter" coupe tout.
//
// Depuis Android 14, un service de micro ne peut pas etre cree depuis l'arriere-plan :
// DemarrageMicroActivity (activite transparente) le demarre pendant qu'elle est visible.
package com.classinus.app.boutonflottant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.classinus.app.R

class MicroNatifService : Service() {

    companion object {
        private const val ACTION_ARRETER = "com.classinus.app.boutonflottant.MICRO_ARRETER"
        private const val CANAL_ID = "micro_classinus"
        private const val NOTIFICATION_ID = 4721

        @Volatile
        private var arme = false

        /** Vrai quand le service tient le micro : on peut enregistrer. */
        fun estArme(): Boolean = arme

        /** Demarre le service. Doit etre appele pendant qu'une activite de l'appli est visible. */
        fun armer(context: Context) {
            ContextCompat.startForegroundService(context, Intent(context, MicroNatifService::class.java))
        }

        fun arreter(context: Context) {
            context.stopService(Intent(context, MicroNatifService::class.java))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_ARRETER) {
            // Bouton "Arreter" de la notification : tout ce qui enregistre est coupe.
            MicroNatif.arreterTout()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        try {
            entrerAuPremierPlan()
        } catch (e: Exception) {
            // Refus du systeme (autorisation du micro absente, ou appli pas assez visible).
            Log.w("MicroNatif", "Service du micro refuse par le systeme.", e)
            arme = false
            MicroNatif.serviceEchoue(refuse = e is SecurityException)
            stopSelf()
            return START_NOT_STICKY
        }

        arme = true
        MicroNatif.serviceArme(applicationContext)
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        arme = false
        MicroNatif.serviceArrete()
        super.onDestroy()
    }

    private fun entrerAuPremierPlan() {
        creerCanalNotification()
        val notification = construireNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun creerCanalNotification() {
        val gestionnaire = getSystemService(NotificationManager::class.java)
        if (gestionnaire.getNotificationChannel(CANAL_ID) != null) return
        val canal = NotificationChannel(
            CANAL_ID,
            getString(R.string.micro_canal_nom),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.micro_canal_description)
            setShowBadge(false)
        }
        gestionnaire.createNotificationChannel(canal)
    }

    private fun construireNotification(): Notification {
        val arreter = PendingIntent.getService(
            this,
            2,
            Intent(this, MicroNatifService::class.java).setAction(ACTION_ARRETER),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val texte = getString(R.string.micro_notif_texte)
        return NotificationCompat.Builder(this, CANAL_ID)
            .setSmallIcon(R.drawable.ic_clovis_notification)
            .setContentTitle(getString(R.string.micro_notif_titre))
            .setContentText(texte)
            .setStyle(NotificationCompat.BigTextStyle().bigText(texte))
            .addAction(0, getString(R.string.micro_notif_arreter), arreter)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }
}
