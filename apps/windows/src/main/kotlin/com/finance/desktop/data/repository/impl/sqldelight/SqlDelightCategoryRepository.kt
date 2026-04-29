// SPDX-License-Identifier: BUSL-1.1

package com.finance.desktop.data.repository.impl.sqldelight

import com.finance.db.FinanceDatabase
import com.finance.desktop.data.repository.CategoryRepository
import com.finance.models.Category
import com.finance.models.types.SyncId
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.datetime.Instant

/**
 * SQLDelight-backed implementation of [CategoryRepository].
 */
class SqlDelightCategoryRepository(
    private val database: FinanceDatabase,
) : CategoryRepository {

    private val queries get() = database.categoryQueries

    private val _cache = MutableStateFlow<List<Category>>(emptyList())

    init {
        refreshCache()
    }

    override fun observeAll(householdId: SyncId): Flow<List<Category>> =
        _cache.map { list ->
            list.filter { it.householdId == householdId && it.deletedAt == null }
        }

    override suspend fun getById(id: SyncId): Category? =
        _cache.value.find { it.id == id && it.deletedAt == null }

    private fun refreshCache() {
        try {
            val rows = queries.selectAll().executeAsList()
            _cache.value = rows.map { it.toCategory() }
        } catch (_: Exception) {
            // Database may not be initialized yet
        }
    }
}

internal fun com.finance.db.Category.toCategory(): Category = Category(
    id = SyncId(id),
    householdId = SyncId(household_id),
    ownerId = SyncId(owner_id),
    name = name,
    icon = icon,
    color = color,
    parentId = parent_id?.let { SyncId(it) },
    isIncome = is_income != 0L,
    isSystem = is_system != 0L,
    sortOrder = sort_order.toInt(),
    createdAt = Instant.parse(created_at),
    updatedAt = Instant.parse(updated_at),
    deletedAt = deleted_at?.let { Instant.parse(it) },
    syncVersion = sync_version,
    isSynced = is_synced != 0L,
)
