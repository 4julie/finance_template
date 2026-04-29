// SPDX-License-Identifier: BUSL-1.1

package com.finance.desktop.di

import com.finance.db.EncryptionKeyProvider
import com.finance.db.FinanceDatabase
import com.finance.desktop.data.database.DesktopDatabaseManager
import com.finance.desktop.data.database.DpapiEncryptionKeyProvider
import org.koin.dsl.module

/**
 * Koin module for database infrastructure.
 *
 * Provides:
 * - [DpapiEncryptionKeyProvider] — DPAPI-backed key for SQLCipher
 * - [DesktopDatabaseManager] — manages the SQLDelight database lifecycle
 * - [FinanceDatabase] — the database instance itself
 *
 * The encryption key is derived from DPAPI (CurrentUser scope),
 * ensuring the database file is encrypted at rest and can only be
 * read by the current Windows user.
 */
val databaseModule = module {
    single<EncryptionKeyProvider> { DpapiEncryptionKeyProvider(get()) }
    single { DesktopDatabaseManager(get()) }
    single<FinanceDatabase> { get<DesktopDatabaseManager>().database }
}
