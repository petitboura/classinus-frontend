// Cree le 17/10/2026, demande Bourama : lot 4 du bouton flottant natif Android
// (images et cartes d'apercu de la bulle de reponse). Code COMMUN aux deux flavors.
//
// Charge une image depuis une adresse https pour la bulle de reponse, sans aucune
// bibliotheque. Un petit cache en memoire evite de retelecharger une image deja vue
// (la bulle se redessine souvent). Trois telechargements au plus en meme temps.
//
// Regles :
//   - seules les adresses https sont chargees (jamais d'http ni d'autre protocole) ;
//   - une image est lue en entier mais plafonnee (MAX_OCTETS) et reduite a la largeur voulue
//     au decodage, pour ne jamais saturer la memoire avec une photo de 12 megapixels ;
//   - une vue reutilisee ou retiree ne recoit jamais une image qui n'est plus la sienne
//     (l'adresse demandee est gardee dans la vue et comparee a l'arrivee) ;
//   - l'image apparait en fondu (jamais d'un coup) ;
//   - en cas d'echec, la vue est prevenue (surEchec) : la bulle retire alors l'emplacement.
//
// Les appels se font sur le thread principal ; le telechargement tourne dans un fil a part
// et rend son resultat sur le thread principal.
package com.classinus.app.boutonflottant

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.widget.ImageView
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

object ImageChargeur {

    private const val MAX_OCTETS = 6 * 1024 * 1024
    private const val DELAI_MS = 8_000
    private const val DUREE_FONDU_MS = 180L

    private val principal = Handler(Looper.getMainLooper())
    private val fils = Executors.newFixedThreadPool(3)

    // Cache en octets : un seizieme de la memoire de l'appli, jamais plus de 16 Mo.
    private val cache = object : LruCache<String, Bitmap>(
        minOf((Runtime.getRuntime().maxMemory() / 16).toInt(), 16 * 1024 * 1024),
    ) {
        override fun sizeOf(cle: String, valeur: Bitmap): Int = valeur.byteCount
    }

    /** Adresse acceptee : https uniquement. */
    fun adresseAcceptee(adresse: String?): Boolean = adresse != null && adresse.startsWith("https://", ignoreCase = true)

    /**
     * Charge l'image dans la vue. largeurMaxPx : largeur utile (l'image est reduite au decodage).
     * surEchec est appele (thread principal) si l'image ne peut pas etre chargee.
     */
    fun charger(adresse: String, vue: ImageView, largeurMaxPx: Int, surEchec: () -> Unit) {
        if (!adresseAcceptee(adresse)) {
            surEchec()
            return
        }
        vue.tag = adresse
        val enCache = cache.get(adresse)
        if (enCache != null) {
            vue.setImageBitmap(enCache)
            return
        }
        vue.setImageDrawable(null)
        fils.execute {
            val image = telecharger(adresse, largeurMaxPx)
            principal.post {
                // La vue a ete reutilisee ou retiree entre-temps : cette image n'est plus pour elle.
                if (vue.tag != adresse) return@post
                if (image == null) {
                    surEchec()
                    return@post
                }
                cache.put(adresse, image)
                vue.alpha = 0f
                vue.setImageBitmap(image)
                vue.animate().alpha(1f).setDuration(DUREE_FONDU_MS).start()
            }
        }
    }

    private fun telecharger(adresse: String, largeurMaxPx: Int): Bitmap? {
        var connexion: HttpURLConnection? = null
        try {
            connexion = URL(adresse).openConnection() as HttpURLConnection
            connexion.connectTimeout = DELAI_MS
            connexion.readTimeout = DELAI_MS
            connexion.instanceFollowRedirects = true
            if (connexion.responseCode != HttpURLConnection.HTTP_OK) return null
            val octets = connexion.inputStream.use { flux ->
                val sortie = java.io.ByteArrayOutputStream()
                val tampon = ByteArray(16 * 1024)
                while (true) {
                    val lus = flux.read(tampon)
                    if (lus < 0) break
                    sortie.write(tampon, 0, lus)
                    if (sortie.size() > MAX_OCTETS) return null
                }
                sortie.toByteArray()
            }
            val mesure = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(octets, 0, octets.size, mesure)
            if (mesure.outWidth <= 0 || mesure.outHeight <= 0) return null
            var reduction = 1
            while (mesure.outWidth / (reduction * 2) >= largeurMaxPx.coerceAtLeast(1)) reduction *= 2
            val options = BitmapFactory.Options().apply { inSampleSize = reduction }
            return BitmapFactory.decodeByteArray(octets, 0, octets.size, options)
        } catch (e: Exception) {
            return null
        } finally {
            connexion?.disconnect()
        }
    }
}
