// Cree le 17/10/2026, demande Bourama : lot 3 du bouton flottant natif Android
// (bulle de reponse et fleche). Code COMMUN aux deux flavors (src/main).
//
// Transforme la reponse de Classinus (du markdown, comme dans le chat) en texte
// simple que la bulle native sait afficher : titres et gras en gras, listes avec
// des puces, code en police a chasse fixe, liens reduits a leur texte, tableaux
// remis en lignes. Ce que la bulle ne sait pas dessiner (schemas, QCM, questions,
// fiches, animations, widgets, formules) n'est pas affiche : le resultat le
// signale (contenuIgnore) pour que la bulle propose d'ouvrir Classinus.
//
// Aucune dependance, aucun acces au reseau, aucune vue : une simple conversion,
// sur le thread principal, de textes courts.
package com.classinus.app.boutonflottant

import android.graphics.Typeface
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.BackgroundColorSpan
import android.text.style.RelativeSizeSpan
import android.text.style.StyleSpan
import android.text.style.TypefaceSpan

object TexteSimplifie {

    /** Texte pret a afficher, et vrai si une partie de la reponse n'a pas pu etre dessinee. */
    data class Resultat(val texte: CharSequence, val contenuIgnore: Boolean)

    // Blocs de code que le chat dessine autrement qu'en code (voir
    // components/chat/composantsMarkdownRiches.tsx) : la bulle ne sait pas les montrer.
    private val LANGAGES_RICHES = setOf(
        "mermaid", "chart", "carte", "geometrie", "qcm", "question", "fiche", "animation", "widget", "html",
    )

    private const val CLOTURE_CODE = "```"
    private const val ECHELLE_TITRE_PRINCIPAL = 1.2f
    private const val ECHELLE_TITRE_SECONDAIRE = 1.1f

    private val titre = Regex("^(#{1,6})\\s+(.*)$")
    private val puce = Regex("^(\\s*)[-*+]\\s+(.*)$")
    private val ligneSeparatriceTableau = Regex("^\\|?[\\s:|-]+\\|?$")
    private val regleHorizontale = Regex("^\\s*([-*_])(\\s*\\1){2,}\\s*$")

    // Dans l'ordre : gras, code en ligne, formule, lien. Une formule commence et finit par
    // un caractere non vide collé au dollar, pour ne pas confondre "5$ et 7$" avec une formule.
    private val elementEnLigne = Regex(
        "\\*\\*(.+?)\\*\\*|`([^`]+)`|\\$(?=\\S)([^$\\n]*?\\S)\\$|\\[([^\\]]+)\\]\\(([^)]+)\\)",
    )

    fun simplifier(source: String, fondCode: Int): Resultat {
        val sortie = SpannableStringBuilder()
        var ignore = false
        var dansCode = false
        var codeIgnore = false
        var debutCode = 0

        for (ligne in source.replace("\r\n", "\n").split("\n")) {
            val nette = ligne.trim()

            if (nette.startsWith(CLOTURE_CODE)) {
                if (!dansCode) {
                    dansCode = true
                    val langage = nette.removePrefix(CLOTURE_CODE).trim().lowercase()
                    codeIgnore = langage in LANGAGES_RICHES
                    if (codeIgnore) ignore = true
                    debutCode = sortie.length
                } else {
                    dansCode = false
                    if (!codeIgnore && sortie.length > debutCode) marquerCode(sortie, debutCode, sortie.length, fondCode)
                    codeIgnore = false
                }
                continue
            }
            if (dansCode) {
                if (!codeIgnore) sortie.append(ligne).append('\n')
                continue
            }

            if (nette.isEmpty()) {
                ajouterLigneVide(sortie)
                continue
            }
            if (regleHorizontale.matches(nette)) continue

            if (nette.startsWith("|")) {
                // Tableau : la ligne de tirets est retiree, les autres lignes deviennent du texte.
                ignore = true
                if (ligneSeparatriceTableau.matches(nette)) continue
                val cellules = nette.trim('|').split('|').map { it.trim() }
                ajouterEnLigne(sortie, cellules.joinToString("   |   "), fondCode) { ignore = true }
                sortie.append('\n')
                continue
            }

            val correspondanceTitre = titre.matchEntire(nette)
            if (correspondanceTitre != null) {
                val niveau = correspondanceTitre.groupValues[1].length
                val debut = sortie.length
                ajouterEnLigne(sortie, correspondanceTitre.groupValues[2], fondCode) { ignore = true }
                sortie.setSpan(StyleSpan(Typeface.BOLD), debut, sortie.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                val echelle = if (niveau <= 1) ECHELLE_TITRE_PRINCIPAL else if (niveau == 2) ECHELLE_TITRE_SECONDAIRE else 1f
                if (echelle != 1f) {
                    sortie.setSpan(RelativeSizeSpan(echelle), debut, sortie.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                sortie.append('\n')
                continue
            }

            val correspondancePuce = puce.matchEntire(ligne)
            if (correspondancePuce != null) {
                val retrait = " ".repeat((correspondancePuce.groupValues[1].length / 2) * 2)
                sortie.append(retrait).append("• ")
                ajouterEnLigne(sortie, correspondancePuce.groupValues[2], fondCode) { ignore = true }
                sortie.append('\n')
                continue
            }

            val citation = nette.removePrefix(">").trimStart()
            ajouterEnLigne(sortie, citation, fondCode) { ignore = true }
            sortie.append('\n')
        }

        // Un bloc de code laisse ouvert (reponse coupee) garde quand meme son style.
        if (dansCode && !codeIgnore && sortie.length > debutCode) marquerCode(sortie, debutCode, sortie.length, fondCode)

        var fin = sortie.length
        while (fin > 0 && sortie[fin - 1] == '\n') fin--
        sortie.delete(fin, sortie.length)
        return Resultat(sortie, ignore)
    }

    private fun ajouterLigneVide(sortie: SpannableStringBuilder) {
        val longueur = sortie.length
        if (longueur == 0) return
        if (sortie[longueur - 1] == '\n' && longueur >= 2 && sortie[longueur - 2] == '\n') return
        if (sortie[longueur - 1] == '\n') sortie.append('\n')
    }

    private fun marquerCode(sortie: SpannableStringBuilder, debut: Int, fin: Int, fond: Int) {
        sortie.setSpan(TypefaceSpan("monospace"), debut, fin, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        sortie.setSpan(BackgroundColorSpan(fond), debut, fin, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }

    /** Ajoute une ligne en traitant gras, code en ligne, formules et liens. surFormule est appelee pour chaque formule retiree. */
    private fun ajouterEnLigne(
        sortie: SpannableStringBuilder,
        ligne: String,
        fondCode: Int,
        surFormule: () -> Unit,
    ) {
        var curseur = 0
        for (element in elementEnLigne.findAll(ligne)) {
            if (element.range.first > curseur) sortie.append(ligne, curseur, element.range.first)
            val debut = sortie.length
            val gras = element.groups[1]?.value
            val code = element.groups[2]?.value
            val formule = element.groups[3]?.value
            val texteLien = element.groups[4]?.value
            when {
                gras != null -> {
                    sortie.append(gras)
                    sortie.setSpan(StyleSpan(Typeface.BOLD), debut, sortie.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                code != null -> {
                    sortie.append(code)
                    marquerCode(sortie, debut, sortie.length, fondCode)
                }
                formule != null -> {
                    sortie.append(formule)
                    surFormule()
                }
                texteLien != null -> sortie.append(texteLien)
            }
            curseur = element.range.last + 1
        }
        if (curseur < ligne.length) sortie.append(ligne, curseur, ligne.length)
    }
}
