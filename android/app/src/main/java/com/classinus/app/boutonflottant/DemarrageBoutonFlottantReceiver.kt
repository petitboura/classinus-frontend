// Cree le 13/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android. Code COMMUN aux deux flavors (src/main).
//
// Ramene le bouton apres un redemarrage du telephone ou apres une mise a jour
// de l'appli (qui arrete tous ses services), sans que l'eleve ouvre Classinus.
// Il ne le fait que si l'eleve veut le bouton (choix vrai) ET si la permission
// d'affichage par-dessus les autres applications est toujours accordee.
//
// Android autorise un service au premier plan demarre depuis ces deux
// diffusions systeme ; BoutonFlottantService est de type specialUse, qui n'est
// pas parmi les types interdits au demarrage.
package com.classinus.app.boutonflottant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.util.Log

class DemarrageBoutonFlottantReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        if (PreferencesBoutonFlottant.choix(context) != true) return
        if (!Settings.canDrawOverlays(context)) return
        try {
            BoutonFlottantService.demarrer(context)
        } catch (e: Exception) {
            // Le systeme peut refuser (mode economie, restriction du fabricant) : le
            // bouton reviendra a la prochaine ouverture de l'appli.
            Log.w("BoutonFlottant", "Demarrage apres redemarrage refuse par le systeme.", e)
        }
    }
}
