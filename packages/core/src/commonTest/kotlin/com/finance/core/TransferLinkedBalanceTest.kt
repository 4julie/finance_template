// SPDX-License-Identifier: BUSL-1.1

package com.finance.core

import com.finance.models.*
import com.finance.models.types.*
import kotlinx.datetime.*
import kotlin.test.*

/**
 * Tests for transfer operations and linked balance integrity (#1358).
 *
 * Verifies transfer creation between accounts, balance consistency
 * (source debit = destination credit), transferTransactionId linking,
 * editing transfers, and deletion affecting both accounts.
 */
class TransferLinkedBalanceTest {

    @BeforeTest
    fun setup() {
        TestFixtures.reset()
    }

    private val sourceAccountId = SyncId("source-account")
    private val destAccountId = SyncId("dest-account")

    private fun createTransferLeg(
        id: SyncId,
        accountId: SyncId,
        amount: Cents,
        transferAccountId: SyncId,
        transferTransactionId: SyncId? = null,
    ) = Transaction(
        id = id,
        householdId = SyncId("household-1"),
        ownerId = SyncId("owner-1"),
        accountId = accountId,
        type = TransactionType.TRANSFER,
        amount = amount,
        currency = Currency.USD,
        date = TestFixtures.fixedDate,
        transferAccountId = transferAccountId,
        transferTransactionId = transferTransactionId,
        createdAt = TestFixtures.fixedInstant,
        updatedAt = TestFixtures.fixedInstant,
    )

    // ═══════════════════════════════════════════════════════════════════
    // Create Transfer Between Two Accounts
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun createTransferBetweenAccounts() {
        val sourceId = SyncId("txn-source")
        val destId = SyncId("txn-dest")

        // Source leg: debit (negative from source perspective)
        val sourceLeg = createTransferLeg(
            id = sourceId,
            accountId = sourceAccountId,
            amount = Cents(50000L), // $500 leaves source
            transferAccountId = destAccountId,
            transferTransactionId = destId,
        )

        // Destination leg: credit (positive to destination)
        val destLeg = createTransferLeg(
            id = destId,
            accountId = destAccountId,
            amount = Cents(50000L), // $500 arrives at destination
            transferAccountId = sourceAccountId,
            transferTransactionId = sourceId,
        )

        assertEquals(TransactionType.TRANSFER, sourceLeg.type)
        assertEquals(TransactionType.TRANSFER, destLeg.type)
        assertEquals(destAccountId, sourceLeg.transferAccountId)
        assertEquals(sourceAccountId, destLeg.transferAccountId)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Balance Changes
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun sourceBalanceDecreases() {
        val sourceAccount = TestFixtures.createAccount(
            id = sourceAccountId,
            name = "Source",
            currentBalance = Cents(200000L), // $2,000
        )

        val transferAmount = Cents(50000L) // $500
        val updatedSource = sourceAccount.copy(
            currentBalance = sourceAccount.currentBalance - transferAmount,
        )

        assertEquals(Cents(150000L), updatedSource.currentBalance) // $1,500
    }

    @Test
    fun destinationBalanceIncreases() {
        val destAccount = TestFixtures.createAccount(
            id = destAccountId,
            name = "Destination",
            currentBalance = Cents(100000L), // $1,000
        )

        val transferAmount = Cents(50000L) // $500
        val updatedDest = destAccount.copy(
            currentBalance = destAccount.currentBalance + transferAmount,
        )

        assertEquals(Cents(150000L), updatedDest.currentBalance) // $1,500
    }

    @Test
    fun transferAmountConsistency_sourceDebitEqualsDestCredit() {
        val transferAmount = Cents(75000L) // $750

        val sourceBalance = Cents(200000L)
        val destBalance = Cents(100000L)

        val newSourceBalance = sourceBalance - transferAmount
        val newDestBalance = destBalance + transferAmount

        // Total across both accounts stays constant
        val totalBefore = sourceBalance + destBalance
        val totalAfter = newSourceBalance + newDestBalance
        assertEquals(totalBefore, totalAfter) // $3,000 = $3,000
    }

    @Test
    fun transferPreservesNetWorthAcrossAccounts() {
        val accounts = mutableMapOf(
            sourceAccountId to Cents(500000L),  // $5,000
            destAccountId to Cents(300000L),     // $3,000
        )

        val netWorthBefore = Cents(accounts.values.sumOf { it.amount })

        // Transfer $1,000
        val transferAmount = Cents(100000L)
        accounts[sourceAccountId] = accounts[sourceAccountId]!! - transferAmount
        accounts[destAccountId] = accounts[destAccountId]!! + transferAmount

        val netWorthAfter = Cents(accounts.values.sumOf { it.amount })

        assertEquals(netWorthBefore, netWorthAfter) // $8,000 = $8,000
        assertEquals(Cents(400000L), accounts[sourceAccountId]) // $4,000
        assertEquals(Cents(400000L), accounts[destAccountId])   // $4,000
    }

    // ═══════════════════════════════════════════════════════════════════
    // transferTransactionId Linking
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun transferTransactionIdLinksLegs() {
        val sourceId = SyncId("txn-source-leg")
        val destId = SyncId("txn-dest-leg")

        val sourceLeg = createTransferLeg(
            id = sourceId,
            accountId = sourceAccountId,
            amount = Cents(25000L),
            transferAccountId = destAccountId,
            transferTransactionId = destId,
        )

        val destLeg = createTransferLeg(
            id = destId,
            accountId = destAccountId,
            amount = Cents(25000L),
            transferAccountId = sourceAccountId,
            transferTransactionId = sourceId,
        )

        // Source points to dest, dest points to source
        assertEquals(destId, sourceLeg.transferTransactionId)
        assertEquals(sourceId, destLeg.transferTransactionId)

        // Each leg's transferAccountId points to the other account
        assertEquals(destAccountId, sourceLeg.transferAccountId)
        assertEquals(sourceAccountId, destLeg.transferAccountId)
    }

    @Test
    fun transferWithoutTransferTransactionIdIsValid() {
        // transferTransactionId is nullable — a leg without the link is still valid
        val leg = createTransferLeg(
            id = SyncId("txn-unlinked"),
            accountId = sourceAccountId,
            amount = Cents(10000L),
            transferAccountId = destAccountId,
            transferTransactionId = null,
        )
        assertNull(leg.transferTransactionId)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Edit Transfer Amount — Both Legs
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun editTransferAmountUpdatesBothLegs() {
        val sourceId = SyncId("src")
        val destId = SyncId("dst")
        val originalAmount = Cents(30000L)
        val newAmount = Cents(45000L)

        val sourceLeg = createTransferLeg(
            id = sourceId,
            accountId = sourceAccountId,
            amount = originalAmount,
            transferAccountId = destAccountId,
            transferTransactionId = destId,
        )
        val destLeg = createTransferLeg(
            id = destId,
            accountId = destAccountId,
            amount = originalAmount,
            transferAccountId = sourceAccountId,
            transferTransactionId = sourceId,
        )

        // Edit both legs to new amount
        val updatedSource = sourceLeg.copy(amount = newAmount)
        val updatedDest = destLeg.copy(amount = newAmount)

        assertEquals(newAmount, updatedSource.amount)
        assertEquals(newAmount, updatedDest.amount)
        assertEquals(updatedSource.amount, updatedDest.amount)
    }

    @Test
    fun editTransferAmountBalanceImpact() {
        val sourceBalance = Cents(200000L)
        val destBalance = Cents(100000L)
        val originalTransfer = Cents(50000L)
        val newTransfer = Cents(80000L)

        // Reverse original transfer then apply new
        val adjustedSource = sourceBalance + originalTransfer - newTransfer
        val adjustedDest = destBalance - originalTransfer + newTransfer

        // Source: $2000 + $500 - $800 = $1700
        assertEquals(Cents(170000L), adjustedSource)
        // Dest: $1000 - $500 + $800 = $1300
        assertEquals(Cents(130000L), adjustedDest)

        // Net worth preserved
        val totalBefore = sourceBalance + destBalance
        val totalAfter = adjustedSource + adjustedDest
        assertEquals(totalBefore, totalAfter)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Delete Transfer — Both Account Balances
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun deleteTransferUpdatesBothAccountBalances() {
        val transferAmount = Cents(50000L)

        // State after transfer was applied
        val sourceBalance = Cents(150000L) // was $2000, sent $500
        val destBalance = Cents(150000L)   // was $1000, received $500

        // Reversing transfer: add back to source, subtract from dest
        val restoredSource = sourceBalance + transferAmount
        val restoredDest = destBalance - transferAmount

        assertEquals(Cents(200000L), restoredSource) // $2,000
        assertEquals(Cents(100000L), restoredDest)    // $1,000
    }

    @Test
    fun softDeleteTransferLegsPreservesLink() {
        val deletedAt = Instant.parse("2024-08-01T00:00:00Z")
        val sourceId = SyncId("src")
        val destId = SyncId("dst")

        val sourceLeg = createTransferLeg(
            id = sourceId,
            accountId = sourceAccountId,
            amount = Cents(10000L),
            transferAccountId = destAccountId,
            transferTransactionId = destId,
        )
        val destLeg = createTransferLeg(
            id = destId,
            accountId = destAccountId,
            amount = Cents(10000L),
            transferAccountId = sourceAccountId,
            transferTransactionId = sourceId,
        )

        val deletedSource = sourceLeg.copy(deletedAt = deletedAt)
        val deletedDest = destLeg.copy(deletedAt = deletedAt)

        assertNotNull(deletedSource.deletedAt)
        assertNotNull(deletedDest.deletedAt)
        // Link preserved even after soft delete
        assertEquals(destId, deletedSource.transferTransactionId)
        assertEquals(sourceId, deletedDest.transferTransactionId)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Edge Cases
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun transferToSameAccountIsStructurallyValid() {
        // The model doesn't prevent same-account transfers (business rule enforced elsewhere)
        val txn = createTransferLeg(
            id = SyncId("self-transfer"),
            accountId = sourceAccountId,
            amount = Cents(1000L),
            transferAccountId = sourceAccountId,
        )
        assertEquals(sourceAccountId, txn.accountId)
        assertEquals(sourceAccountId, txn.transferAccountId)
    }

    @Test
    fun transferOfOneCent() {
        val transferAmount = Cents(1L)

        val sourceBalance = Cents(100L)
        val destBalance = Cents(200L)

        val newSource = sourceBalance - transferAmount
        val newDest = destBalance + transferAmount

        assertEquals(Cents(99L), newSource)
        assertEquals(Cents(201L), newDest)
    }

    @Test
    fun largeTransferAmount() {
        val transferAmount = Cents(999_999_999_99L) // ~$10B
        val sourceBalance = Cents(1_000_000_000_00L)
        val destBalance = Cents.ZERO

        val newSource = sourceBalance - transferAmount
        val newDest = destBalance + transferAmount

        assertEquals(Cents(1L), newSource)
        assertEquals(Cents(999_999_999_99L), newDest)
    }

    @Test
    fun transferRequiresNonZeroAmount() {
        assertFailsWith<IllegalArgumentException> {
            createTransferLeg(
                id = SyncId("zero-transfer"),
                accountId = sourceAccountId,
                amount = Cents.ZERO,
                transferAccountId = destAccountId,
            )
        }
    }

    @Test
    fun multipleTransfersBetweenSameAccounts() {
        val source = Cents(500000L)
        val dest = Cents(200000L)

        val transfer1 = Cents(10000L)
        val transfer2 = Cents(20000L)
        val transfer3 = Cents(5000L)

        val finalSource = source - transfer1 - transfer2 - transfer3
        val finalDest = dest + transfer1 + transfer2 + transfer3

        assertEquals(Cents(465000L), finalSource)
        assertEquals(Cents(235000L), finalDest)

        // Net worth preserved
        assertEquals(source + dest, finalSource + finalDest)
    }
}
