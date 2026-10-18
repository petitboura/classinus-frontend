// Cree le 17/10/2026, demande Bourama : lot 4 du bouton flottant natif Android
// (micro de dictee et mode vocal). Code COMMUN aux deux flavors (src/main).
//
// Le micro du bouton flottant. Une page web en arriere-plan perd l'acces au micro
// (Android le coupe), donc le micro est pris ici, dans un service au premier plan de
// type microphone (MicroNatifService), qui continue quand l'etudiant est dans une autre
// application. Deux usages, jamais en meme temps :
//   - la DICTEE : un enregistrement court (AAC, 16 kHz, mono) que la page envoie a
//     Whisper, puis envoie le texte a Classinus comme le micro du PC ;
//   - le FLUX de la voix en direct : le son brut (PCM 16 bits, 16 kHz, mono) decoupe en
//     morceaux de 100 ms, remis a la page, qui les envoie a la session Gemini Live.
//
// Pourquoi une activite transparente (DemarrageMicroActivity) : depuis Android 14, un
// service de micro ne peut etre cree que si l'appli est visible. Un appui sur le bouton
// flottant depuis une autre application lance donc cette activite invisible, qui demande
// l'autorisation du micro si besoin, cree le service puis se ferme toute seule.
//
// Cet objet ne parle JAMAIS a la page : il remet ses resultats par les rappels ci-dessous,
// branches par BoutonFlottantService, qui les transmet au plugin. Il ne garde aucun
// enregistrement sur le disque une fois remis.
//
// Tout ce qui touche a l'etat se fait sur le thread principal ; seule la boucle de lecture
// du flux tourne dans son propre fil.
package com.classinus.app.boutonflottant

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import java.io.File

object MicroNatif {

    enum class Intention { DICTEE, VOIX }

    const val ERREUR_REFUSE = "REFUSE"
    const val ERREUR_INDISPONIBLE = "INDISPONIBLE"
    const val ERREUR_AUCUNE_VOIX = "AUCUNE_VOIX"
    const val ERREUR_OCCUPE = "OCCUPE"

    private const val TYPE_MIME_DICTEE = "audio/mp4"
    private const val DUREE_MAX_DICTEE_MS = 180_000
    private const val DELAI_ATTENTE_SERVICE_MS = 60_000L
    private const val DELAI_INACTIVITE_MS = 10_000L
    private const val TAILLE_MIN_DICTEE_OCTETS = 1500L
    private const val FREQUENCE_FLUX = 16_000
    private const val OCTETS_PAR_MORCEAU = 3_200

    /** Etat de la dictee : vrai des que l'enregistrement tourne, faux quand il s'arrete. */
    var surEtatDictee: ((ecoute: Boolean) -> Unit)? = null

    /** Enregistrement termine, a remettre a la page pour transcription. */
    var surDicteeTerminee: ((audio: ByteArray, typeMime: String) -> Unit)? = null

    /** L'etudiant a touche le bouton du mode vocal : la page decide d'ouvrir ou de fermer la voix. */
    var surVoixDemandee: (() -> Unit)? = null

    /** Un morceau de son de 100 ms (PCM 16 bits, 16 kHz, mono). Appele depuis le fil de lecture. */
    var surMorceauFlux: ((pcm: ByteArray) -> Unit)? = null

    /** Le flux s'est arrete sans que la page l'ait demande (micro pris par un appel, par exemple). */
    var surFluxInterrompu: (() -> Unit)? = null

    /** Message court a montrer a l'etudiant (code ERREUR_*). */
    var surErreur: ((code: String) -> Unit)? = null

    private val principal = Handler(Looper.getMainLooper())

    private var intentionEnAttente: Intention? = null
    private var enregistreur: MediaRecorder? = null
    private var fichierDictee: File? = null
    private var dicteeEnCours = false

    @Volatile
    private var fluxEnCours = false
    private var enregistrementFlux: AudioRecord? = null
    private var filFlux: Thread? = null

    private val expirationAttente = Runnable {
        intentionEnAttente = null
        surErreur?.invoke(ERREUR_INDISPONIBLE)
    }

    private val arretInactif = Runnable {
        if (!dicteeEnCours && !fluxEnCours) MicroNatifService.arreter(contexteApplication ?: return@Runnable)
    }

    private var contexteApplication: Context? = null

    fun dicteeActive(): Boolean = dicteeEnCours

    fun fluxActif(): Boolean = fluxEnCours

    fun autorisationAccordee(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

    /**
     * Appui sur le micro de dictee : arrete la dictee en cours (et la remet a la page), sinon
     * la demarre. Sans service pret, la demande passe par l'activite transparente.
     */
    fun basculerDictee(context: Context) {
        if (dicteeEnCours) {
            arreterDictee()
            return
        }
        if (fluxEnCours) {
            // La voix en direct tient deja le micro : une seule chose a la fois.
            surErreur?.invoke(ERREUR_OCCUPE)
            return
        }
        demander(context, Intention.DICTEE)
    }

    /** Appui sur le bouton du mode vocal : la page ouvre ou ferme la voix. */
    fun demanderVoix(context: Context) {
        if (dicteeEnCours) {
            surErreur?.invoke(ERREUR_OCCUPE)
            return
        }
        // Voix deja en cours : le service est deja la, la page ferme la voix sans autre formalite.
        if (fluxEnCours) {
            surVoixDemandee?.invoke()
            return
        }
        demander(context, Intention.VOIX)
    }

    private fun demander(context: Context, intention: Intention) {
        val app = context.applicationContext
        contexteApplication = app
        intentionEnAttente = intention
        principal.removeCallbacks(expirationAttente)
        if (MicroNatifService.estArme()) {
            suivre(app)
            return
        }
        principal.postDelayed(expirationAttente, DELAI_ATTENTE_SERVICE_MS)
        try {
            app.startActivity(
                Intent(app, DemarrageMicroActivity::class.java).addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION or Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS,
                ),
            )
        } catch (e: Exception) {
            Log.w("MicroNatif", "Lancement de l'activite du micro refuse par le systeme.", e)
            principal.removeCallbacks(expirationAttente)
            intentionEnAttente = null
            surErreur?.invoke(ERREUR_INDISPONIBLE)
        }
    }

    /** Le service de micro est cree (appele par le service). Poursuit ce que l'etudiant avait demande. */
    fun serviceArme(context: Context) {
        DemarrageMicroActivity.terminer()
        principal.removeCallbacks(expirationAttente)
        contexteApplication = context.applicationContext
        suivre(context.applicationContext)
    }

    /** Le service n'a pas pu se creer (appele par le service ou l'activite). */
    fun serviceEchoue(refuse: Boolean) {
        DemarrageMicroActivity.terminer()
        principal.removeCallbacks(expirationAttente)
        intentionEnAttente = null
        surErreur?.invoke(if (refuse) ERREUR_REFUSE else ERREUR_INDISPONIBLE)
    }

    /** Le service s'arrete (appele par le service) : plus rien ne doit enregistrer. */
    fun serviceArrete() {
        principal.removeCallbacks(arretInactif)
        val avaitUnFlux = fluxEnCours
        val avaitUneDictee = dicteeEnCours
        arreterFluxInterne()
        annulerDicteeInterne()
        if (avaitUneDictee) surEtatDictee?.invoke(false)
        if (avaitUnFlux) surFluxInterrompu?.invoke()
    }

    private fun suivre(context: Context) {
        val intention = intentionEnAttente ?: return
        intentionEnAttente = null
        when (intention) {
            Intention.DICTEE -> demarrerDictee(context)
            Intention.VOIX -> {
                // Le service reste arme le temps que la page ouvre la voix et demande le flux.
                principal.removeCallbacks(arretInactif)
                principal.postDelayed(arretInactif, DELAI_INACTIVITE_MS)
                surVoixDemandee?.invoke()
            }
        }
    }

    // ---------------------------------------------------------------- dictee

    private fun demarrerDictee(context: Context) {
        principal.removeCallbacks(arretInactif)
        val fichier = File(context.cacheDir, "dictee_${System.currentTimeMillis()}.m4a")
        val nouveau = creerEnregistreur(context)
        try {
            nouveau.setAudioSource(MediaRecorder.AudioSource.MIC)
            nouveau.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            nouveau.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            nouveau.setAudioChannels(1)
            nouveau.setAudioSamplingRate(FREQUENCE_FLUX)
            nouveau.setAudioEncodingBitRate(32_000)
            nouveau.setMaxDuration(DUREE_MAX_DICTEE_MS)
            nouveau.setOutputFile(fichier.absolutePath)
            nouveau.setOnInfoListener { _, quoi, _ ->
                // Duree maximale atteinte : la dictee s'arrete seule et part comme un arret normal.
                if (quoi == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) principal.post { arreterDictee() }
            }
            nouveau.prepare()
            nouveau.start()
        } catch (e: Exception) {
            Log.w("MicroNatif", "Dictee impossible.", e)
            liberer(nouveau)
            fichier.delete()
            surErreur?.invoke(ERREUR_INDISPONIBLE)
            terminerSiInutile(context)
            return
        }
        enregistreur = nouveau
        fichierDictee = fichier
        dicteeEnCours = true
        surEtatDictee?.invoke(true)
    }

    /** Arrete la dictee et remet l'enregistrement a la page. */
    fun arreterDictee() {
        if (!dicteeEnCours) return
        val octets = terminerEnregistrement(garder = true)
        surEtatDictee?.invoke(false)
        if (octets == null) {
            surErreur?.invoke(ERREUR_AUCUNE_VOIX)
        } else {
            surDicteeTerminee?.invoke(octets, TYPE_MIME_DICTEE)
        }
        contexteApplication?.let { terminerSiInutile(it) }
    }

    /** Abandonne la dictee sans rien envoyer (canal coupe, champ Ecrire ouvert). */
    fun annulerDictee() {
        if (!dicteeEnCours) return
        annulerDicteeInterne()
        surEtatDictee?.invoke(false)
        contexteApplication?.let { terminerSiInutile(it) }
    }

    private fun annulerDicteeInterne() {
        if (!dicteeEnCours) return
        terminerEnregistrement(garder = false)
    }

    /** Coupe l'enregistreur. Renvoie les octets si l'enregistrement est exploitable et garde est vrai. */
    private fun terminerEnregistrement(garder: Boolean): ByteArray? {
        val enr = enregistreur
        val fichier = fichierDictee
        enregistreur = null
        fichierDictee = null
        dicteeEnCours = false
        var valide = true
        if (enr != null) {
            try {
                enr.stop()
            } catch (e: RuntimeException) {
                // Arret presque immediat : le fichier est inutilisable.
                valide = false
            }
            liberer(enr)
        }
        if (fichier == null) return null
        try {
            if (!garder || !valide || fichier.length() < TAILLE_MIN_DICTEE_OCTETS) return null
            return fichier.readBytes()
        } catch (e: Exception) {
            Log.w("MicroNatif", "Lecture de la dictee impossible.", e)
            return null
        } finally {
            fichier.delete()
        }
    }

    @Suppress("DEPRECATION")
    private fun creerEnregistreur(context: Context): MediaRecorder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(context) else MediaRecorder()

    private fun liberer(enr: MediaRecorder) {
        try {
            enr.release()
        } catch (e: Exception) {
            // Deja libere : rien a faire.
        }
    }

    // ------------------------------------------------------------------ flux

    /**
     * Demarre le flux de la voix en direct. Le service doit etre arme (un appui sur le bouton
     * l'arme, ou l'appli visible l'arme elle-meme). Renvoie faux si le micro ne peut pas etre pris.
     */
    fun demarrerFlux(): Boolean {
        if (fluxEnCours) return true
        if (dicteeEnCours || !MicroNatifService.estArme()) return false
        val taille = AudioRecord.getMinBufferSize(FREQUENCE_FLUX, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        if (taille <= 0) return false
        val tampon = maxOf(taille, OCTETS_PAR_MORCEAU * 4)
        val enr = try {
            AudioRecord(
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                FREQUENCE_FLUX,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                tampon,
            )
        } catch (e: Exception) {
            Log.w("MicroNatif", "Flux du micro impossible.", e)
            return false
        }
        if (enr.state != AudioRecord.STATE_INITIALIZED) {
            enr.release()
            return false
        }
        try {
            enr.startRecording()
        } catch (e: Exception) {
            Log.w("MicroNatif", "Demarrage du flux impossible.", e)
            enr.release()
            return false
        }
        principal.removeCallbacks(arretInactif)
        enregistrementFlux = enr
        fluxEnCours = true
        val fil = Thread({ lireFlux(enr) }, "MicroNatifFlux")
        filFlux = fil
        fil.start()
        return true
    }

    /** Arrete le flux (la page ferme la voix) et libere le service s'il n'a plus rien a faire. */
    fun arreterFlux() {
        arreterFluxInterne()
        contexteApplication?.let { terminerSiInutile(it) }
    }

    private fun arreterFluxInterne() {
        val enr = enregistrementFlux
        val fil = filFlux
        fluxEnCours = false
        enregistrementFlux = null
        filFlux = null
        if (enr != null) {
            try {
                enr.stop()
            } catch (e: Exception) {
                // Deja arrete : rien a faire.
            }
        }
        // La lecture se termine d'elle-meme des que fluxEnCours est faux : on lui laisse un instant.
        if (fil != null && fil !== Thread.currentThread()) {
            try {
                fil.join(500)
            } catch (e: InterruptedException) {
                Thread.currentThread().interrupt()
            }
        }
        enr?.release()
    }

    private fun lireFlux(enr: AudioRecord) {
        val tampon = ByteArray(OCTETS_PAR_MORCEAU)
        var accumule = 0
        while (fluxEnCours) {
            val lus = try {
                enr.read(tampon, accumule, OCTETS_PAR_MORCEAU - accumule)
            } catch (e: Exception) {
                -1
            }
            if (lus < 0) {
                // Le systeme a repris le micro : on previent la page, qui ferme la voix.
                if (fluxEnCours) principal.post { signalerInterruption() }
                return
            }
            accumule += lus
            if (accumule >= OCTETS_PAR_MORCEAU) {
                accumule = 0
                surMorceauFlux?.invoke(tampon.copyOf())
            }
        }
    }

    private fun signalerInterruption() {
        if (!fluxEnCours) return
        arreterFluxInterne()
        surFluxInterrompu?.invoke()
        contexteApplication?.let { terminerSiInutile(it) }
    }

    // ----------------------------------------------------------------- reste

    /** Arret complet : service du bouton retire ou application fermee. */
    fun arreterTout() {
        principal.removeCallbacks(expirationAttente)
        principal.removeCallbacks(arretInactif)
        intentionEnAttente = null
        val avaitUnFlux = fluxEnCours
        arreterFluxInterne()
        if (dicteeEnCours) {
            annulerDicteeInterne()
            surEtatDictee?.invoke(false)
        }
        contexteApplication?.let { MicroNatifService.arreter(it) }
        if (avaitUnFlux) surFluxInterrompu?.invoke()
    }

    private fun terminerSiInutile(context: Context) {
        if (!dicteeEnCours && !fluxEnCours && intentionEnAttente == null) MicroNatifService.arreter(context)
    }
}
