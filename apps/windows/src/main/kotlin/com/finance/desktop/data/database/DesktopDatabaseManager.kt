// SPDX-License-Identifier: BUSL-1.1

package com.finance.desktop.data.database

import com.finance.db.DatabaseFactory
import com.finance.db.EncryptionKeyProvider
import com.finance.db.FinanceDatabase
import java.util.logging.Logger

/**
 * Manages the SQLDelight [FinanceDatabase] singleton for the Windows desktop client.
 *
 * Creates the database in `%LOCALAPPDATA%\Finance\data\` with SQLCipher
 * encryption. The encryption key is derived from DPAPI-protected storage.
 *
 * The database instance is lazily created and cached for the application lifetime.
 *
 * @param keyProvider DPAPI-backed encryption key provider.
 */
class DesktopDatabaseManager(
    private val keyProvider: EncryptionKeyProvider,
) {
    companion object {
        private val logger: Logger = Logger.getLogger(DesktopDatabaseManager::class.java.name)

        private fun resolveDbPath(): String {
            val localAppData = System.getenv("LOCALAPPDATA")
                ?: System.getProperty("user.home") + "\\AppData\\Local"
            val dir = java.nio.file.Path.of(localAppData, "Finance", "data")
            if (!java.nio.file.Files.exists(dir)) {
                java.nio.file.Files.createDirectories(dir)
            }
            return dir.resolve("finance.db").toString()
        }
    }

    val database: FinanceDatabase by lazy {
        logger.info("Initializing SQLDelight database with SQLCipher encryption")
        val dbPath = resolveDbPath()
        val factory = DatabaseFactory(dbPath, keyProvider)
        factory.createDatabase()
    }
}
