package com.classinus.app;

import android.os.Bundle;
import com.classinus.app.pont.PontNatifPlugin;
import com.classinus.app.dossiers.DossiersPlugin;
import com.classinus.app.controlesession.ControleSessionPlugin;
import com.classinus.app.connecteurs.ConnecteursPlugin;
import com.classinus.app.accessibilite.AccessibilitePlugin;
import com.classinus.app.miseajour.MiseAJourPlugin;
import com.classinus.app.tempsecran.TempsEcranPlugin;
import com.classinus.app.notifications.NotificationsPlugin;
import com.classinus.app.telechargement.TelechargementPlugin;
import com.getcapacitor.BridgeActivity;

// Modifie le 25/08/2026, Bourama : Lot 3B (fusion Capacitor). registerPlugin
// est obligatoire ici pour un plugin LOCAL (defini dans cette app, pas
// publie sur npm) : contrairement aux plugins npm officiels, Capacitor ne
// le decouvre pas tout seul.
//
// AccessibilitePlugin et MiseAJourPlugin : meme nom qualifie complet dans
// src/play et src/externe (com.classinus.app.accessibilite.AccessibilitePlugin,
// com.classinus.app.miseajour.MiseAJourPlugin) : Gradle resout automatiquement
// vers la version du flavor compile, pas besoin de code conditionnel ici
// (meme pattern que ModuleAccessibilite/ModuleMiseAJour cote clovis-mobile).
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PontNatifPlugin.class);
        registerPlugin(DossiersPlugin.class);
        registerPlugin(ControleSessionPlugin.class);
        registerPlugin(ConnecteursPlugin.class);
        registerPlugin(AccessibilitePlugin.class);
        registerPlugin(MiseAJourPlugin.class);
        // 26/08/2026, Bourama : temps d'ecran + notifications/rappels
        // (Android n'avait pas d'equivalent au plugin iOS existant).
        registerPlugin(TempsEcranPlugin.class);
        registerPlugin(NotificationsPlugin.class);
        // 12/09/2026, Bourama : vrai téléchargement système (DownloadManager
        // / MediaStore.Downloads), voir TelechargementPlugin.kt.
        registerPlugin(TelechargementPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
