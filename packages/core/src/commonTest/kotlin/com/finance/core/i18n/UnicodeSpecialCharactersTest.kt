// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.i18n

import com.finance.core.TestFixtures
import com.finance.core.export.CsvExportSerializer
import com.finance.core.export.ExportData
import com.finance.core.export.ExportEntityCounts
import com.finance.core.export.ExportMetadata
import com.finance.models.*
import com.finance.models.types.*
import kotlinx.datetime.*
import kotlin.test.*

/**
 * Verifies that Unicode and special characters are handled correctly
 * throughout the financial domain — category names, transaction descriptions,
 * account names, CSV export roundtrips, string length, search/filter, and sort.
 *
 * Covers issue #1373.
 */
class UnicodeSpecialCharactersTest {

    @BeforeTest
    fun setUp() {
        TestFixtures.reset()
    }

    // ═══════════════════════════════════════════════════════════════════
    // Category names with Unicode
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun categoryName_withEmoji_isPreserved() {
        val category = createCategory(name = "🍕 Pizza")
        assertEquals("🍕 Pizza", category.name)
    }

    @Test
    fun categoryName_withCJK_isPreserved() {
        val category = createCategory(name = "中文分类")
        assertEquals("中文分类", category.name)
    }

    @Test
    fun categoryName_withArabic_isPreserved() {
        val category = createCategory(name = "عربي")
        assertEquals("عربي", category.name)
    }

    @Test
    fun categoryName_withCyrillic_isPreserved() {
        val category = createCategory(name = "кириллица")
        assertEquals("кириллица", category.name)
    }

    @Test
    fun categoryName_withMixedScripts_isPreserved() {
        val category = createCategory(name = "Food 食品 🍜 еда")
        assertEquals("Food 食品 🍜 еда", category.name)
    }

    @Test
    fun categoryName_blankUnicode_isRejected() {
        assertFailsWith<IllegalArgumentException> {
            createCategory(name = "   ")
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Transaction descriptions with special characters
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun transactionPayee_withDoubleQuotes_isPreserved() {
        val txn = TestFixtures.createTransaction(payee = """She said "hello"""")
        assertEquals("""She said "hello"""", txn.payee)
    }

    @Test
    fun transactionNote_withNewlines_isPreserved() {
        val txn = TestFixtures.createTransaction(note = "Line 1\nLine 2\nLine 3")
        assertTrue(txn.note!!.contains("\n"))
        assertEquals(3, txn.note!!.lines().size)
    }

    @Test
    fun transactionNote_withTabs_isPreserved() {
        val txn = TestFixtures.createTransaction(note = "Col1\tCol2\tCol3")
        assertTrue(txn.note!!.contains("\t"))
    }

    @Test
    fun transactionNote_withNullBytes_isPreserved() {
        val txn = TestFixtures.createTransaction(note = "before\u0000after")
        assertEquals("before\u0000after", txn.note)
    }

    @Test
    fun transactionPayee_withUnicodeEmoji_isPreserved() {
        val txn = TestFixtures.createTransaction(payee = "☕ Coffee Shop 🏪")
        assertEquals("☕ Coffee Shop 🏪", txn.payee)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Account names with diacritics
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun accountName_withDiacritics_cafe_isPreserved() {
        val account = TestFixtures.createAccount(name = "café account")
        assertEquals("café account", account.name)
    }

    @Test
    fun accountName_withDiacritics_naive_isPreserved() {
        val account = TestFixtures.createAccount(name = "naïve savings")
        assertEquals("naïve savings", account.name)
    }

    @Test
    fun accountName_withDiacritics_resume_isPreserved() {
        val account = TestFixtures.createAccount(name = "résumé fund")
        assertEquals("résumé fund", account.name)
    }

    @Test
    fun accountName_withAccentedCharacters_isPreserved() {
        val account = TestFixtures.createAccount(name = "Ñoño José María")
        assertEquals("Ñoño José María", account.name)
    }

    @Test
    fun accountName_blankIsRejected() {
        assertFailsWith<IllegalArgumentException> {
            TestFixtures.createAccount(name = "  ")
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CSV export roundtrip preserving Unicode
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun csvExport_preservesUnicodeCategoryNames() {
        val serializer = CsvExportSerializer()
        val category = createCategory(name = "🍕 Pizza Night")
        val data = ExportData(
            accounts = emptyList(),
            transactions = emptyList(),
            categories = listOf(category),
            budgets = emptyList(),
            goals = emptyList(),
        )
        val csv = serializer.serialize(data, sampleMetadata())
        assertTrue(csv.contains("🍕 Pizza Night"), "CSV should contain emoji category name")
    }

    @Test
    fun csvExport_preservesAccountNameWithDiacritics() {
        val serializer = CsvExportSerializer()
        val account = TestFixtures.createAccount(name = "café résumé")
        val data = ExportData(
            accounts = listOf(account),
            transactions = emptyList(),
            categories = emptyList(),
            budgets = emptyList(),
            goals = emptyList(),
        )
        val csv = serializer.serialize(data, sampleMetadata())
        assertTrue(csv.contains("café résumé"), "CSV should contain diacritics in account name")
    }

    @Test
    fun csvExport_escapesDoubleQuotesInPayee() {
        val serializer = CsvExportSerializer()
        val txn = TestFixtures.createTransaction(payee = """Bob's "Best" Burgers""")
        val data = ExportData(
            accounts = emptyList(),
            transactions = listOf(txn),
            categories = emptyList(),
            budgets = emptyList(),
            goals = emptyList(),
        )
        val csv = serializer.serialize(data, sampleMetadata())
        // RFC 4180: double-quotes inside quoted fields are doubled
        assertTrue(csv.contains("\"\"Best\"\""), "CSV should escape inner double quotes")
    }

    @Test
    fun csvExport_handlesNewlinesInNotes() {
        val serializer = CsvExportSerializer()
        val txn = TestFixtures.createTransaction(note = "Line 1\nLine 2")
        val data = ExportData(
            accounts = emptyList(),
            transactions = listOf(txn),
            categories = emptyList(),
            budgets = emptyList(),
            goals = emptyList(),
        )
        val csv = serializer.serialize(data, sampleMetadata())
        // Fields with newlines should be quoted per RFC 4180
        assertTrue(csv.contains("\"Line 1\nLine 2\""), "CSV should quote fields containing newlines")
    }

    @Test
    fun csvEscapeField_handlesCommasInValues() {
        val escaped = CsvExportSerializer.escapeField("Rent, Utilities")
        assertEquals("\"Rent, Utilities\"", escaped)
    }

    @Test
    fun csvEscapeField_handlesPlainUnicode() {
        val escaped = CsvExportSerializer.escapeField("中文分类")
        assertEquals("中文分类", escaped)
    }

    @Test
    fun csvEscapeField_handlesEmojiWithComma() {
        val escaped = CsvExportSerializer.escapeField("🍕, 🍔")
        assertEquals("\"🍕, 🍔\"", escaped)
    }

    // ═══════════════════════════════════════════════════════════════════
    // String length calculations with multibyte characters
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun stringLength_asciiCharacters() {
        val name = "Groceries"
        assertEquals(9, name.length)
    }

    @Test
    fun stringLength_cjkCharacters() {
        val name = "中文分类"
        // Kotlin String.length counts UTF-16 code units; each CJK char is 1
        assertEquals(4, name.length)
    }

    @Test
    fun stringLength_emojiCharacters() {
        val name = "🍕"
        // Emoji like 🍕 is a supplementary character (2 UTF-16 code units)
        assertEquals(2, name.length)
    }

    @Test
    fun stringLength_mixedContent_codeUnits() {
        val name = "A🍕B"
        // 'A'=1, '🍕'=2, 'B'=1 → total 4 UTF-16 code units
        assertEquals(4, name.length)
    }

    @Test
    fun stringLength_arabicCharacters() {
        val name = "عربي"
        assertEquals(4, name.length)
    }

    @Test
    fun stringLength_diacriticsPrecomposed() {
        val name = "caf\u00E9"
        assertEquals(4, name.length)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Search/filter with Unicode queries
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun filterCategories_byUnicodeSubstring() {
        val categories = listOf(
            createCategory(name = "🍕 Pizza"),
            createCategory(name = "🍔 Burgers"),
            createCategory(name = "中文分类"),
            createCategory(name = "Groceries"),
        )

        val pizzaResults = categories.filter { it.name.contains("🍕") }
        assertEquals(1, pizzaResults.size)
        assertEquals("🍕 Pizza", pizzaResults.first().name)
    }

    @Test
    fun filterCategories_byCJKSubstring() {
        val categories = listOf(
            createCategory(name = "中文分类"),
            createCategory(name = "日本語カテゴリ"),
            createCategory(name = "Groceries"),
        )

        val cjkResults = categories.filter { it.name.contains("中文") }
        assertEquals(1, cjkResults.size)
    }

    @Test
    fun filterAccounts_byCaseInsensitiveDiacritics() {
        val accounts = listOf(
            TestFixtures.createAccount(name = "Café Savings"),
            TestFixtures.createAccount(name = "Main Checking"),
        )

        val results = accounts.filter { it.name.lowercase().contains("café") }
        assertEquals(1, results.size)
        assertEquals("Café Savings", results.first().name)
    }

    @Test
    fun filterTransactions_byUnicodePayee() {
        val transactions = listOf(
            TestFixtures.createTransaction(payee = "кириллица магазин"),
            TestFixtures.createTransaction(payee = "Regular Store"),
        )

        val results = transactions.filter { it.payee?.contains("кириллица") == true }
        assertEquals(1, results.size)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Sort ordering with mixed-script names
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun sortCategories_mixedScripts_doesNotThrow() {
        val categories = listOf(
            createCategory(name = "Zebra"),
            createCategory(name = "中文"),
            createCategory(name = "Apple"),
            createCategory(name = "кириллица"),
            createCategory(name = "🍕 Pizza"),
        )

        val sorted = categories.sortedBy { it.name }
        assertEquals(5, sorted.size)
    }

    @Test
    fun sortCategories_asciiAlphabetical_worksCorrectly() {
        val categories = listOf(
            createCategory(name = "Groceries"),
            createCategory(name = "Auto"),
            createCategory(name = "Bills"),
        )

        val sorted = categories.sortedBy { it.name }
        assertEquals("Auto", sorted[0].name)
        assertEquals("Bills", sorted[1].name)
        assertEquals("Groceries", sorted[2].name)
    }

    @Test
    fun sortAccounts_diacriticsVsPlain() {
        val accounts = listOf(
            TestFixtures.createAccount(name = "Zürich"),
            TestFixtures.createAccount(name = "Alpha"),
            TestFixtures.createAccount(name = "Beta"),
        )

        val sorted = accounts.sortedBy { it.name }
        assertEquals("Alpha", sorted[0].name)
        assertEquals("Beta", sorted[1].name)
        assertEquals("Zürich", sorted[2].name)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Edge cases
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun categoryName_withOnlyEmoji_isValid() {
        val category = createCategory(name = "🏠🚗💰")
        assertEquals("🏠🚗💰", category.name)
    }

    @Test
    fun transactionNote_withAllSpecialCharTypes() {
        val note = "Quote: \"test\"\nTab:\there\r\nEnd"
        val txn = TestFixtures.createTransaction(note = note)
        assertEquals(note, txn.note)
    }

    @Test
    fun accountName_maxLengthUnicode_isAccepted() {
        val longName = "中".repeat(100)
        val account = TestFixtures.createAccount(name = longName)
        assertEquals(100, account.name.length)
    }

    @Test
    fun csvEscapeField_emptyString_returnsEmpty() {
        assertEquals("", CsvExportSerializer.escapeField(""))
    }

    @Test
    fun csvEscapeField_carriageReturn_isQuoted() {
        val escaped = CsvExportSerializer.escapeField("line1\rline2")
        assertEquals("\"line1\rline2\"", escaped)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════════

    private fun createCategory(
        name: String,
        id: SyncId = TestFixtures.nextId(),
    ): Category = Category(
        id = id,
        householdId = SyncId("household-1"),
        ownerId = SyncId("owner-1"),
        name = name,
        createdAt = TestFixtures.fixedInstant,
        updatedAt = TestFixtures.fixedInstant,
    )

    private fun sampleMetadata() = ExportMetadata(
        exportDate = TestFixtures.fixedInstant,
        appVersion = "1.0.0",
        schemaVersion = "1.0",
        userIdHash = "sha256:abc123",
        entityCounts = ExportEntityCounts(
            accounts = 0,
            transactions = 0,
            categories = 0,
            budgets = 0,
            goals = 0,
        ),
    )
}
