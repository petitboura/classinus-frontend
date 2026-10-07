// Cree le 07/10/2026, demande Bourama : lot 2 du chantier "vision ecran"
// (Clovis pointe, surligne et souligne par-dessus les autres applis),
// branche feature/vision-ecran-android. Code COMMUN aux deux flavors.
//
// Methodes exposees au JS (voir lib/superposition.ts pour les types) :
//   etat()                 : permission accordee ? marques affichees ?
//   demanderPermission()   : ouvre les reglages systeme "Afficher par-dessus
//                            les autres applications" et se resout quand
//                            l'eleve revient dans l'appli
//   afficher({marques, espace?, dureeMs?}) : montre les marques
//   effacer()              : retire les marques
//
// Une marque : { type: "pointer" | "surligner" | "souligner", x, y,
//   largeur?, hauteur?, etiquette?, couleur? }. Les positions sont dans
// l'"espace" donne (par exemple { largeur, hauteur } de l'image de capture
// envoyee a Clovis) : la conversion vers l'ecran est faite ici cote natif.
// Sans "espace", les positions sont des pixels d'ecran.
//
// Codes d'erreur stables pour le JS (le JS choisit et traduit le texte
// affiche) : PERMISSION_REFUSEE, MARQUES_INVALIDES, ECHEC.
package com.classinus.app.visionecran

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "Superposition")
class SuperpositionPlugin : Plugin() {

    companion object {
        // Bornes de securite, jamais imposees au JS au dela de ce qui est raisonnable.
        private const val MARQUES_MAX = 20
        private const val ETIQUETTE_LONGUEUR_MAX = 80
        private const val DUREE_DEFAUT_MS = 8_000
        private const val DUREE_MAX_MS = 120_000
    }

    private val principal = Handler(Looper.getMainLooper())

    override fun load() {
        SuperpositionManager.initialiser(context)
    }

    @PluginMethod
    fun etat(call: PluginCall) {
        principal.post {
            val reponse = JSObject()
            reponse.put("permissionAccordee", SuperpositionManager.permissionAccordee())
            reponse.put("affichee", SuperpositionManager.estAffichee())
            call.resolve(reponse)
        }
    }

    @PluginMethod
    fun demanderPermission(call: PluginCall) {
        if (SuperpositionManager.permissionAccordee()) {
            val reponse = JSObject()
            reponse.put("accordee", true)
            call.resolve(reponse)
            return
        }
        // Page des reglages propre a Classinus : l'eleve y active lui-meme l'interrupteur.
        val intention = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + context.packageName),
        )
        startActivityForResult(call, intention, "retourReglagesSuperposition")
    }

    @ActivityCallback
    private fun retourReglagesSuperposition(call: PluginCall?, resultat: ActivityResult) {
        if (call == null) return
        val reponse = JSObject()
        reponse.put("accordee", SuperpositionManager.permissionAccordee())
        call.resolve(reponse)
        bridge.releaseCall(call)
    }

    @PluginMethod
    fun afficher(call: PluginCall) {
        val marques = lireMarques(call.getArray("marques"))
        if (marques == null) {
            call.reject("La liste des marques est absente ou invalide.", "MARQUES_INVALIDES")
            return
        }
        val espace = call.getObject("espace")
        val largeurEspace = espace?.optDouble("largeur", 0.0)?.toFloat() ?: 0f
        val hauteurEspace = espace?.optDouble("hauteur", 0.0)?.toFloat() ?: 0f
        val dureeMs = (call.getInt("dureeMs") ?: DUREE_DEFAUT_MS).coerceIn(0, DUREE_MAX_MS).toLong()

        principal.post {
            when (SuperpositionManager.afficher(marques, largeurEspace, hauteurEspace, dureeMs)) {
                ResultatAffichage.OK -> {
                    val reponse = JSObject()
                    reponse.put("affichee", true)
                    call.resolve(reponse)
                }
                ResultatAffichage.PERMISSION_REFUSEE ->
                    call.reject("La permission d'afficher par-dessus les autres applications est absente.", "PERMISSION_REFUSEE")
                ResultatAffichage.ECHEC ->
                    call.reject("La superposition n'a pas pu s'afficher.", "ECHEC")
            }
        }
    }

    @PluginMethod
    fun effacer(call: PluginCall) {
        principal.post {
            SuperpositionManager.effacer()
            val reponse = JSObject()
            reponse.put("affichee", false)
            call.resolve(reponse)
        }
    }

    /** Lit et valide la liste de marques recue du JS. Renvoie null si quoi que ce soit est invalide. */
    private fun lireMarques(tableau: JSArray?): List<Marque>? {
        if (tableau == null || tableau.length() == 0 || tableau.length() > MARQUES_MAX) return null
        val liste = ArrayList<Marque>()
        for (i in 0 until tableau.length()) {
            val objet = tableau.optJSONObject(i) ?: return null

            val type = when (objet.optString("type")) {
                "pointer" -> TypeMarque.POINTER
                "surligner" -> TypeMarque.SURLIGNER
                "souligner" -> TypeMarque.SOULIGNER
                else -> return null
            }

            if (!objet.has("x") || !objet.has("y")) return null
            val x = objet.optDouble("x")
            val y = objet.optDouble("y")
            if (x.isNaN() || y.isNaN()) return null

            val largeur = objet.optDouble("largeur", 0.0)
            val hauteur = objet.optDouble("hauteur", 0.0)
            if (type != TypeMarque.POINTER && !(largeur > 0.0)) return null
            if (type == TypeMarque.SURLIGNER && !(hauteur > 0.0)) return null

            val etiquette = objet.optString("etiquette", "").trim().take(ETIQUETTE_LONGUEUR_MAX)
                .ifEmpty { null }
            val texteCouleur = objet.optString("couleur", "").trim()
            val couleur = if (texteCouleur.isEmpty()) {
                null
            } else {
                try {
                    Color.parseColor(texteCouleur)
                } catch (e: IllegalArgumentException) {
                    null
                }
            }

            liste.add(
                Marque(
                    type = type,
                    x = x.toFloat(),
                    y = y.toFloat(),
                    largeur = largeur.toFloat(),
                    hauteur = hauteur.toFloat(),
                    etiquette = etiquette,
                    couleur = couleur,
                ),
            )
        }
        return liste
    }
}
