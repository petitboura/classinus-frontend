// Cree le 23/08/2026, Bourama : Lot 3 Partie 3 (app mobile), notifications & rappels.
package com.classinus.app.notifications

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.classinus.app.BuildConfig
import com.classinus.app.MainActivity
import kotlin.random.Random

object NotificationsNatives {

    /** true si Clovis a le droit d'envoyer une notification du tout (Android 13+). */
    fun permissionNotificationsAccordee(context: Context): Boolean =
        NotificationManagerCompat.from(context).areNotificationsEnabled()

    /**
     * true si Android autorise reellement l'alerte plein ecran pour Clovis
     * (API 34+ seulement ; avant cette API, la permission etait accordee
     * d'office a l'installation, pas de verification possible autrement
     * qu'en essayant). Voir CanalNotifications.kt pour le contexte complet.
     */
    fun pleinEcranAutorise(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < 34) return true
        return NotificationManagerCompat.from(context).canUseFullScreenIntent()
    }

    /** Ouvre l'ecran systeme ou l'etudiant peut activer lui-meme l'alerte plein ecran (API 34+). */
    fun ouvrirReglagesPleinEcran(context: Context) {
        if (Build.VERSION.SDK_INT < 34) return
        val intent = Intent(android.provider.Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
            .setData(android.net.Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    /**
     * Adresse complete a ouvrir au clic, ou null pour ouvrir simplement l'appli.
     * `url` est un chemin interne ("/", "/rappels"). Tout ce qui n'en est pas un
     * (adresse complete, "//hote") est ignore : une notification ne doit jamais
     * pouvoir envoyer l'appli vers un autre site.
     */
    internal fun adresseOuverture(url: String?): Uri? {
        if (url.isNullOrBlank() || !url.startsWith("/") || url.startsWith("//") || url.contains("\\")) return null
        return Uri.parse("https://${BuildConfig.HOTE_LIENS_APP}$url")
    }

    /**
     * Action du clic sur la notification : ouvre l'appli sur la page voulue.
     * Le lien https passe par MainActivity, que Capacitor transmet au JS comme
     * un lien entrant (appUrlOpen a chaud, getLaunchUrl au demarrage a froid),
     * traite par components/EcouteurLiensEntrants.tsx : aucune navigation
     * propre aux notifications a maintenir cote JS.
     */
    private fun actionOuvrirAppli(context: Context, url: String?): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val adresse = adresseOuverture(url)
            if (adresse != null) {
                action = Intent.ACTION_VIEW
                data = adresse
            }
        }
        return PendingIntent.getActivity(
            context, Random.nextInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * `url` : page de l'appli a ouvrir au clic (voir adresseOuverture). Absente,
     * le clic ouvre l'appli la ou elle etait.
     *
     * `prioritaire` correspond a l'alerte plein ecran demandee par
     * 03-notifications-rappels.md. Si Android ne l'autorise pas
     * effectivement (voir pleinEcranAutorise), repli automatique sur une
     * notification heads-up classique ; jamais d'echec silencieux total.
     */
    fun afficherRappel(context: Context, titre: String, corps: String, prioritaire: Boolean = false, url: String? = null) {
        if (!permissionNotificationsAccordee(context)) return

        val demanderPleinEcran = prioritaire && pleinEcranAutorise(context)
        val canal = if (prioritaire) CANAL_RAPPELS_URGENTS else CANAL_RAPPELS

        val builder = NotificationCompat.Builder(context, canal)
            .setContentTitle(titre)
            .setContentText(corps)
            // Petite icone (barre du haut) : silhouette blanche de la plume,
            // seule forme acceptee par Android a cet endroit. Grande icone
            // (a cote du texte) : le logo en couleurs, sur sa tuile sombre.
            .setSmallIcon(com.classinus.app.R.drawable.ic_notification_plume)
            .setLargeIcon(BitmapFactory.decodeResource(context.resources, com.classinus.app.R.drawable.ic_notification_grande))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(actionOuvrirAppli(context, url))
            .setAutoCancel(true)

        if (demanderPleinEcran) {
            val intentAlerte = Intent(context, AlerteRappelActivity::class.java).apply {
                putExtra(EXTRA_TITRE_ALERTE, titre)
                putExtra(EXTRA_CORPS_ALERTE, corps)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            val pending = PendingIntent.getActivity(
                context, Random.nextInt(), intentAlerte,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.setFullScreenIntent(pending, true)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
        }

        NotificationManagerCompat.from(context).notify(Random.nextInt(), builder.build())
    }
}
