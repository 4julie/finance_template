// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.streak

import kotlinx.coroutines.flow.Flow
import kotlinx.datetime.LocalDate

/**
 * Repository contract for streak data.
 *
 * Abstracts the source of "which dates did the user log at least one
 * transaction?" so that [StreakViewModel] is testable without a real database.
 */
interface StreakRepository {

    /**
     * Observes the distinct set of dates on which the user has logged
     * at least one transaction. Emits a new value whenever the underlying
     * data changes (e.g. a new transaction is created).
     *
     * @param householdId The household to scope the query to.
     * @return A [Flow] of distinct logging dates.
     */
    fun observeLoggingDates(householdId: String): Flow<Set<LocalDate>>
}
