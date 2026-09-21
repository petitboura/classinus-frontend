// Cree le 23/08/2026 (Lot 3, clovis-mobile), porte le 25/08/2026 dans le
// plugin Capacitor (Lot 3B).
package com.classinus.app

import android.app.Application
import com.classinus.app.notifications.creerCanauxNotifications
import com.classinus.app.notifications.firebaseConfigure

class ClovisApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        firebaseConfigure(this)
        creerCanauxNotifications(this)
    }
}
