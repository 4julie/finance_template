// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.streak

import com.finance.android.auth.HouseholdIdProvider
import com.finance.android.data.repository.TransactionRepository
import com.finance.models.types.SyncId
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.datetime.LocalDate

/**
 * [StreakRepository] backed by the existing [TransactionRepository].
 *
 * Derives the set of logging dates from the full transaction list by
 * extracting distinct dates. This is intentionally simple — a future
 * optimisation could use a dedicated SQL query to avoid loading all
 * transaction data.
 */
class TransactionBackedStreakRepository(
    private val transactionRepository: TransactionRepository,
) : StreakRepository {

    override fun observeLoggingDates(householdId: String): Flow<Set<LocalDate>> {
        return transactionRepository.observeAll(SyncId(householdId)).map { transactions ->
            transactions.map { it.date }.toSet()
        }
    }
}
