// SPDX-License-Identifier: BUSL-1.1

// BillRepository.swift
// Finance
//
// Protocol defining the data-access contract for bill reminders.
// Swap the concrete implementation to move from mock data to a
// KMP-backed repository without changing any ViewModel or View code.
//
// References: #1121

import Foundation

/// Data-access contract for bill reminders and recurring payments.
///
/// All methods are `async throws` so implementations can perform
/// network, database, or KMP bridge calls transparently.
protocol BillRepository: Sendable {

    /// Returns all bills for the current user.
    func getBills() async throws -> [BillItem]

    /// Returns a single bill by its identifier, or `nil` if not found.
    func getBill(id: String) async throws -> BillItem?

    /// Persists a new bill.
    func createBill(_ bill: BillItem) async throws

    /// Updates an existing bill.
    func updateBill(_ bill: BillItem) async throws

    /// Deletes a bill by its identifier.
    func deleteBill(id: String) async throws

    /// Marks a bill as paid for the current period.
    func markAsPaid(billId: String) async throws

    /// Returns payment history for a given bill.
    func getPaymentHistory(billId: String) async throws -> [BillPaymentRecord]

    /// Permanently deletes all bills. Used for GDPR "Delete Everything".
    func deleteAllBills() async throws
}
