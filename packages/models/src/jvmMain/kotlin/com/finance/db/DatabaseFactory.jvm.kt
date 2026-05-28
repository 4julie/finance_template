// SPDX-License-Identifier: BUSL-1.1

@file:Suppress("MatchingDeclarationName")

package com.finance.db

import app.cash.sqldelight.async.coroutines.synchronous
import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import java.util.Properties

/**
 * JVM/Desktop DatabaseFactory.
 * For Windows: encryption key from DPAPI/Credential Locker.
 * For development: key from environment variable or config file.
 */
actual class DatabaseFactory(
    private val dbPath: String,
    private val keyProvider: EncryptionKeyProvider,
) {
    actual fun createDatabase(): FinanceDatabase {
        val key = keyProvider.getOrCreateKey()
        val properties = Properties().apply {
            put("cipher", "sqlcipher")
            put("key", key)
        }
        // Passing the synchronous schema causes JdbcSqliteDriver to call
        // Schema.create() on a fresh DB (PRAGMA user_version = 0) or
        // Schema.migrate() on an out-of-date DB. Without this, the local
        // DB file is created with no tables and every repository's
        // refreshCache() fails with "no such table: account" (see #1893).
        val driver = JdbcSqliteDriver(
            url = "jdbc:sqlite:$dbPath",
            properties = properties,
            schema = FinanceDatabase.Schema.synchronous(),
        )
        return FinanceDatabase(driver)
    }
}
