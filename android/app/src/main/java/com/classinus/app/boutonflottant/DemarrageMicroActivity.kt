// Cree le 17/10/2026, demande Bourama : lot 4 du bouton flottant natif Android
// (micro de dictee et mode vocal). Code COMMUN aux deux flavors (src/main).
//
// Activite transparente et sans contenu, lancee par MicroNatif quand l'etudiant touche le
// micro ou le mode vocal du bouton flottant alors que le service du micro n'est pas pret.
// Raison : depuis Android 14, un service de micro ne peut etre cree que si l'appli est
// visible. Cette activite l'est pendant une fraction de seconde : elle demande
// l'autorisation du micro si elle manque, cree le service, puis se ferme toute seule.
//
// Elle n'apparait pas dans les applications recentes et ne montre rien a l'ecran
// (hors la fenetre d'autorisation du systeme, la premiere fois).
package com.classinus.app.boutonflottant

import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.Manifest

class DemarrageMicroActivity : Activity() {

    companion object {
        private const val CODE_AUTORISATION = 4722
        private const val DELAI_SECURITE_MS = 5_000L

        @Volatile
        private var instance: DemarrageMicroActivity? = null

        /** Ferme l'activite si elle est ouverte (le service est cree, ou a echoue). */
        fun terminer() {
            val ouverte = instance ?: return
            Handler(Looper.getMainLooper()).post { if (!ouverte.isFinishing) ouverte.finish() }
        }
    }

    private val principal = Handler(Looper.getMainLooper())
    private var attendAutorisation = false
    private var armeDemande = false
    private val fermetureDeSecurite = Runnable { if (!attendAutorisation) finish() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        instance = this
    }

    override fun onResume() {
        super.onResume()
        if (attendAutorisation || armeDemande) return
        if (MicroNatif.autorisationAccordee(this)) {
            armer()
        } else {
            attendAutorisation = true
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), CODE_AUTORISATION)
        }
    }

    private fun armer() {
        armeDemande = true
        // Le service previent MicroNatif (serviceArme ou serviceEchoue), qui ferme cette activite.
        // Au cas ou rien ne reviendrait, la fermeture de securite evite une activite orpheline.
        principal.postDelayed(fermetureDeSecurite, DELAI_SECURITE_MS)
        try {
            MicroNatifService.armer(applicationContext)
        } catch (e: Exception) {
            MicroNatif.serviceEchoue(refuse = false)
            finish()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != CODE_AUTORISATION) return
        attendAutorisation = false
        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            armer()
        } else {
            MicroNatif.serviceEchoue(refuse = true)
            finish()
        }
    }

    override fun onDestroy() {
        principal.removeCallbacks(fermetureDeSecurite)
        if (instance === this) instance = null
        super.onDestroy()
    }
}
