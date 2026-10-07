// Cree le 07/10/2026, demande Bourama : Clovis doit pouvoir voir l'ecran du
// telephone (lot 1 du chantier "vision ecran", branche
// feature/vision-ecran-android). Code COMMUN aux deux flavors (src/main) :
// la capture d'ecran n'est PAS de l'accessibilite, elle repose sur
// MediaProjection, l'API que les regles Google Play preferent a
// l'accessibilite quand elle suffit.
//
// Contraintes Android respectees ici (verifiees dans la doc officielle) :
//   - consentement de l'utilisateur a chaque session (fenetre systeme),
//     demande par VisionEcranPlugin avant de lancer ce service ;
//   - service au premier plan de type mediaProjection, declare dans le
//     manifest avec FOREGROUND_SERVICE_MEDIA_PROJECTION ;
//   - startForeground() est appele AVANT getMediaProjection() (obligatoire
//     depuis Android 14) ;
//   - un MediaProjection.Callback est enregistre AVANT createVirtualDisplay()
//     (obligatoire depuis Android 14) ;
//   - createVirtualDisplay() n'est appele qu'UNE fois par autorisation
//     (Android 14 refuse un deuxieme appel) : a la rotation on utilise
//     resize() et setSurface() sur l'ecran virtuel existant ;
//   - notification permanente visible avec un bouton Arreter : l'etudiant
//     sait toujours que l'ecran est partage et peut couper en un geste.
//
// Ce service ne sait QUE capturer. Il n'envoie rien nulle part : l'envoi
// d'une image vers le backend est decide plus haut (plugin puis JS), jamais ici.
package com.classinus.app.visionecran

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.util.Base64
import android.util.DisplayMetrics
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import com.classinus.app.R
import java.io.ByteArrayOutputStream
import kotlin.math.roundToInt

/** Une image capturee, deja reduite et encodee, plus les dimensions utiles au pointage. */
data class ResultatCapture(
    val imageBase64: String,
    val largeur: Int,
    val hauteur: Int,
    val horodatage: Long,
)

class CaptureEcranService : Service() {

    companion object {
        const val ACTION_DEMARRER = "com.classinus.app.visionecran.DEMARRER"
        const val ACTION_ARRETER = "com.classinus.app.visionecran.ARRETER"

        private const val EXTRA_CODE = "codeResultat"
        private const val EXTRA_DONNEES = "donneesAutorisation"
        private const val EXTRA_TITRE = "titre"
        private const val EXTRA_TEXTE = "texte"
        private const val EXTRA_LIBELLE_ARRETER = "libelleArreter"
        private const val EXTRA_TAILLE_CAPTURE_MAX = "tailleCaptureMax"

        private const val CANAL_ID = "vision_ecran"
        private const val NOTIFICATION_ID = 4710

        // Nombre de tampons de l'ImageReader. On en garde un en main (la
        // derniere image), il en reste deux pour le producteur.
        private const val TAMPONS_LECTEUR = 3

        @Volatile
        var instance: CaptureEcranService? = null
            private set

        /**
         * Appele par le plugin pour savoir quand la capture demarre, s'arrete
         * ou echoue. `erreur` n'est renseigne que pour un echec ou un arret
         * force par le systeme.
         */
        @Volatile
        var surChangementEtat: ((actif: Boolean, erreur: String?) -> Unit)? = null

        fun estActif(): Boolean = instance?.projection != null

        fun creerIntentDemarrage(
            context: Context,
            codeResultat: Int,
            donnees: Intent,
            titre: String,
            texte: String,
            libelleArreter: String,
            tailleCaptureMax: Int,
        ): Intent = Intent(context, CaptureEcranService::class.java).apply {
            action = ACTION_DEMARRER
            putExtra(EXTRA_CODE, codeResultat)
            putExtra(EXTRA_DONNEES, donnees)
            putExtra(EXTRA_TITRE, titre)
            putExtra(EXTRA_TEXTE, texte)
            putExtra(EXTRA_LIBELLE_ARRETER, libelleArreter)
            putExtra(EXTRA_TAILLE_CAPTURE_MAX, tailleCaptureMax)
        }

        /** Arret demande depuis le plugin (thread quelconque) : on repasse par le thread principal. */
        fun demanderArret() {
            Handler(Looper.getMainLooper()).post { instance?.arreterCapture(null) }
        }
    }

    private val verrou = Any()

    private var projection: MediaProjection? = null
    private var ecranVirtuel: VirtualDisplay? = null
    private var lecteurImages: ImageReader? = null
    private var derniereImage: Image? = null
    private var horodatageImage: Long = 0L

    private var filCapture: HandlerThread? = null
    private var gestionnaireCapture: Handler? = null

    private var tailleCaptureMax: Int = 1600
    private var largeurCapture: Int = 0
    private var hauteurCapture: Int = 0

    @Volatile
    var largeurEcran: Int = 0
        private set

    @Volatile
    var hauteurEcran: Int = 0
        private set

    private var termine = false

    private val rappelProjection = object : MediaProjection.Callback() {
        override fun onStop() {
            // Le systeme (ou l'etudiant, via l'indicateur systeme) a coupe la
            // capture. On nettoie sur le thread principal.
            Handler(Looper.getMainLooper()).post {
                arreterCapture("ARRET_SYSTEME")
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_DEMARRER -> demarrer(intent)
            ACTION_ARRETER -> arreterCapture(null)
            else -> stopSelf()
        }
        return START_NOT_STICKY
    }

    private fun demarrer(intent: Intent) {
        // Une seule capture a la fois : si une est deja en cours, on la ferme
        // proprement avant d'en commencer une nouvelle.
        if (projection != null) {
            nettoyerCapture()
        }
        termine = false

        creerCanalNotification()
        val titre = intent.getStringExtra(EXTRA_TITRE) ?: getString(R.string.vision_ecran_notif_titre)
        val texte = intent.getStringExtra(EXTRA_TEXTE) ?: getString(R.string.vision_ecran_notif_texte)
        val libelleArreter = intent.getStringExtra(EXTRA_LIBELLE_ARRETER)
            ?: getString(R.string.vision_ecran_notif_arreter)
        tailleCaptureMax = intent.getIntExtra(EXTRA_TAILLE_CAPTURE_MAX, tailleCaptureMax)

        // Etape 1 (obligatoire en premier depuis Android 14) : passer au
        // premier plan avec le bon type.
        try {
            val notification = construireNotification(titre, texte, libelleArreter)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION,
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            signalerEchec("PREMIER_PLAN_REFUSE")
            return
        }

        // Etape 2 : recuperer l'autorisation de capture donnee par l'etudiant.
        val codeResultat = intent.getIntExtra(EXTRA_CODE, 0)
        val donnees = lireDonneesAutorisation(intent)
        if (donnees == null) {
            signalerEchec("AUTORISATION_ABSENTE")
            return
        }

        val gestionnaireProjection = getSystemService(MediaProjectionManager::class.java)
        val nouvelleProjection = try {
            gestionnaireProjection?.getMediaProjection(codeResultat, donnees)
        } catch (e: Exception) {
            null
        }
        if (nouvelleProjection == null) {
            signalerEchec("PROJECTION_REFUSEE")
            return
        }

        // Etape 3 : le fil qui recevra les images, puis le rappel de projection
        // (avant createVirtualDisplay, obligatoire depuis Android 14).
        val fil = HandlerThread("ClassinusVisionEcran").also { it.start() }
        filCapture = fil
        val gestionnaire = Handler(fil.looper)
        gestionnaireCapture = gestionnaire

        projection = nouvelleProjection
        try {
            nouvelleProjection.registerCallback(rappelProjection, gestionnaire)
            construireCapture(nouvelleProjection)
        } catch (e: Exception) {
            nettoyerCapture()
            signalerEchec("CAPTURE_IMPOSSIBLE")
            return
        }

        instance = this
        surChangementEtat?.invoke(true, null)
    }

    @Suppress("DEPRECATION")
    private fun lireDonneesAutorisation(intent: Intent): Intent? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(EXTRA_DONNEES, Intent::class.java)
        } else {
            intent.getParcelableExtra(EXTRA_DONNEES)
        }

    /** Taille reelle de l'ecran dans son orientation actuelle, et sa densite. */
    @Suppress("DEPRECATION")
    private fun mesurerEcran(): Triple<Int, Int, Int> {
        val gestionnaireFenetres = getSystemService(WindowManager::class.java)
        val densite = resources.configuration.densityDpi
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val limites = gestionnaireFenetres.maximumWindowMetrics.bounds
            Triple(limites.width(), limites.height(), densite)
        } else {
            val metriques = DisplayMetrics()
            gestionnaireFenetres.defaultDisplay.getRealMetrics(metriques)
            Triple(metriques.widthPixels, metriques.heightPixels, metriques.densityDpi)
        }
    }

    /** Dimensions de capture : l'ecran, reduit pour que le grand cote ne depasse pas tailleCaptureMax. */
    private fun calculerTailleCapture(largeur: Int, hauteur: Int): Pair<Int, Int> {
        val plusGrand = maxOf(largeur, hauteur)
        if (tailleCaptureMax <= 0 || plusGrand <= tailleCaptureMax) return Pair(largeur, hauteur)
        val ratio = tailleCaptureMax.toFloat() / plusGrand
        return Pair(
            (largeur * ratio).roundToInt().coerceAtLeast(1),
            (hauteur * ratio).roundToInt().coerceAtLeast(1),
        )
    }

    private fun creerLecteur(largeur: Int, hauteur: Int): ImageReader {
        val lecteur = ImageReader.newInstance(largeur, hauteur, PixelFormat.RGBA_8888, TAMPONS_LECTEUR)
        lecteur.setOnImageAvailableListener({ source -> garderDerniereImage(source) }, gestionnaireCapture)
        return lecteur
    }

    private fun construireCapture(source: MediaProjection) {
        val (largeurReelle, hauteurReelle, densite) = mesurerEcran()
        largeurEcran = largeurReelle
        hauteurEcran = hauteurReelle
        val (largeur, hauteur) = calculerTailleCapture(largeurReelle, hauteurReelle)
        largeurCapture = largeur
        hauteurCapture = hauteur

        val lecteur = creerLecteur(largeur, hauteur)
        lecteurImages = lecteur
        ecranVirtuel = source.createVirtualDisplay(
            "ClassinusVisionEcran",
            largeur,
            hauteur,
            densite,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            lecteur.surface,
            null,
            gestionnaireCapture,
        )
    }

    /** Garde en main la toute derniere image : un ecran immobile n'en produit plus, on ne veut pas la perdre. */
    private fun garderDerniereImage(source: ImageReader) {
        var image: Image? = null
        try {
            image = source.acquireLatestImage()
        } catch (e: Exception) {
            // Plus de tampon libre ou lecteur ferme : on garde l'image precedente.
        }
        if (image == null) return
        synchronized(verrou) {
            derniereImage?.close()
            derniereImage = image
            horodatageImage = System.currentTimeMillis()
        }
    }

    /** La rotation change la forme de l'ecran : on redimensionne l'ecran virtuel existant (un seul createVirtualDisplay par autorisation). */
    override fun onConfigurationChanged(nouvelle: Configuration) {
        super.onConfigurationChanged(nouvelle)
        val gestionnaire = gestionnaireCapture ?: return
        gestionnaire.post { adapterALaRotation() }
    }

    private fun adapterALaRotation() {
        val ecran = ecranVirtuel ?: return
        val (largeurReelle, hauteurReelle, densite) = mesurerEcran()
        val (largeur, hauteur) = calculerTailleCapture(largeurReelle, hauteurReelle)
        if (largeur == largeurCapture && hauteur == hauteurCapture) return
        try {
            val ancienLecteur = lecteurImages
            val nouveauLecteur = creerLecteur(largeur, hauteur)
            ecran.resize(largeur, hauteur, densite)
            ecran.surface = nouveauLecteur.surface
            synchronized(verrou) {
                derniereImage?.close()
                derniereImage = null
            }
            ancienLecteur?.close()
            lecteurImages = nouveauLecteur
            largeurCapture = largeur
            hauteurCapture = hauteur
            largeurEcran = largeurReelle
            hauteurEcran = hauteurReelle
        } catch (e: Exception) {
            Handler(Looper.getMainLooper()).post { arreterCapture("ROTATION_ECHEC") }
        }
    }

    /**
     * Convertit la derniere image en JPEG reduit. Renvoie null s'il n'y a
     * encore aucune image. A appeler hors du thread principal.
     */
    fun capturerJpeg(tailleMax: Int, qualite: Int): ResultatCapture? {
        synchronized(verrou) {
            val image = derniereImage ?: return null
            val plan = image.planes[0]
            val tampon = plan.buffer
            tampon.rewind()
            val largeurBrute = plan.rowStride / plan.pixelStride
            val bitmapBrut = Bitmap.createBitmap(largeurBrute, image.height, Bitmap.Config.ARGB_8888)
            bitmapBrut.copyPixelsFromBuffer(tampon)

            val bitmapRogne = if (largeurBrute != image.width) {
                Bitmap.createBitmap(bitmapBrut, 0, 0, image.width, image.height)
            } else {
                bitmapBrut
            }

            val plusGrand = maxOf(bitmapRogne.width, bitmapRogne.height)
            val bitmapFinal = if (tailleMax > 0 && plusGrand > tailleMax) {
                val ratio = tailleMax.toFloat() / plusGrand
                Bitmap.createScaledBitmap(
                    bitmapRogne,
                    (bitmapRogne.width * ratio).roundToInt().coerceAtLeast(1),
                    (bitmapRogne.height * ratio).roundToInt().coerceAtLeast(1),
                    true,
                )
            } else {
                bitmapRogne
            }

            val flux = ByteArrayOutputStream()
            bitmapFinal.compress(Bitmap.CompressFormat.JPEG, qualite, flux)
            val resultat = ResultatCapture(
                imageBase64 = Base64.encodeToString(flux.toByteArray(), Base64.NO_WRAP),
                largeur = bitmapFinal.width,
                hauteur = bitmapFinal.height,
                horodatage = horodatageImage,
            )

            // On libere chaque bitmap une seule fois, meme quand plusieurs
            // variables pointent vers le meme objet.
            val aLiberer = linkedSetOf(bitmapBrut, bitmapRogne, bitmapFinal)
            aLiberer.forEach { if (!it.isRecycled) it.recycle() }
            return resultat
        }
    }

    private fun creerCanalNotification() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val gestionnaire = getSystemService(NotificationManager::class.java)
        val canal = NotificationChannel(
            CANAL_ID,
            getString(R.string.vision_ecran_canal_nom),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.vision_ecran_canal_description)
        }
        gestionnaire.createNotificationChannel(canal)
    }

    private fun construireNotification(titre: String, texte: String, libelleArreter: String): Notification {
        val drapeaux = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT

        val intentArreter = Intent(this, CaptureEcranService::class.java).setAction(ACTION_ARRETER)
        val actionArreter = PendingIntent.getService(this, 0, intentArreter, drapeaux)

        val intentOuvrir = packageManager.getLaunchIntentForPackage(packageName)
        val actionOuvrir = intentOuvrir?.let { PendingIntent.getActivity(this, 1, it, drapeaux) }

        return NotificationCompat.Builder(this, CANAL_ID)
            .setSmallIcon(R.drawable.ic_clovis_notification)
            .setContentTitle(titre)
            .setContentText(texte)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(actionOuvrir)
            .addAction(0, libelleArreter, actionArreter)
            .build()
    }

    private fun signalerEchec(code: String) {
        nettoyerCapture()
        stopForegroundCompat()
        stopSelf()
        surChangementEtat?.invoke(false, code)
    }

    private fun stopForegroundCompat() {
        try {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } catch (e: Exception) {
            // Rien a faire : le service n'etait peut etre pas au premier plan.
        }
    }

    /** Libere tout ce que la capture tient (sans toucher au service lui-meme). */
    private fun nettoyerCapture() {
        projection?.let {
            try {
                it.unregisterCallback(rappelProjection)
                it.stop()
            } catch (e: Exception) {
                // Deja arretee par le systeme.
            }
        }
        projection = null
        try {
            ecranVirtuel?.release()
        } catch (e: Exception) {
            // Ignore : on est en train de tout fermer.
        }
        ecranVirtuel = null
        try {
            lecteurImages?.close()
        } catch (e: Exception) {
            // Ignore : on est en train de tout fermer.
        }
        lecteurImages = null
        synchronized(verrou) {
            derniereImage?.close()
            derniereImage = null
        }
        filCapture?.quitSafely()
        filCapture = null
        gestionnaireCapture = null
    }

    /** Arret complet (bouton Arreter, appel du plugin, arret du systeme). Sans effet si deja fait. */
    fun arreterCapture(erreur: String?) {
        if (termine) return
        termine = true
        val etaitActif = projection != null
        nettoyerCapture()
        instance = null
        stopForegroundCompat()
        stopSelf()
        if (etaitActif || erreur != null) {
            surChangementEtat?.invoke(false, erreur)
        }
    }

    override fun onDestroy() {
        if (!termine) {
            termine = true
            val etaitActif = projection != null
            nettoyerCapture()
            instance = null
            if (etaitActif) surChangementEtat?.invoke(false, null)
        }
        super.onDestroy()
    }
}
