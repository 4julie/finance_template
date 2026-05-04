// SPDX-License-Identifier: BUSL-1.1

// BillsViewModel.swift
// Finance
//
// ViewModel for the bill reminders screens. Loads bills from a
// repository, schedules local notifications, and supports CRUD operations.
// Uses @Observable (iOS 17+).
//
// References: #1121

import Observation
import Foundation
import os

/// ViewModel for bill reminder management.
///
/// Consumes ``BillRepository`` for data access and
/// ``NotificationSchedulerProtocol`` for scheduling bill reminders.
@Observable
final class BillsViewModel {
    let repository: BillRepository
    private let notificationScheduler: NotificationSchedulerProtocol

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.finance",
        category: "BillsViewModel"
    )

    var bills: [BillItem] = []
    var isLoading = false
    var showingCreateBill = false
    var selectedBill: BillItem?
    var paymentHistory: [BillPaymentRecord] = []
    var errorMessage: String?

    /// Whether an error alert should be presented.
    var showError: Bool { errorMessage != nil }

    /// Clears the current error message, dismissing the alert.
    func dismissError() { errorMessage = nil }

    /// Upcoming bills sorted by due date.
    var upcomingBills: [BillItem] {
        bills.filter { $0.status == .upcoming }
            .sorted { $0.nextDueDate < $1.nextDueDate }
    }

    /// Overdue bills sorted by due date (most overdue first).
    var overdueBills: [BillItem] {
        bills.filter { $0.status == .overdue }
            .sorted { $0.nextDueDate < $1.nextDueDate }
    }

    /// Paid bills for the current period.
    var paidBills: [BillItem] {
        bills.filter { $0.status == .paid }
    }

    /// Total amount due for upcoming and overdue bills.
    var totalDueMinorUnits: Int64 {
        (upcomingBills + overdueBills).reduce(0) { $0 + $1.amountMinorUnits }
    }

    /// Total monthly bill amount.
    var totalMonthlyMinorUnits: Int64 {
        bills.reduce(0) { $0 + $1.amountMinorUnits }
    }

    init(
        repository: BillRepository,
        notificationScheduler: NotificationSchedulerProtocol = NotificationSchedulerService.shared
    ) {
        self.repository = repository
        self.notificationScheduler = notificationScheduler
    }

    /// Loads all bills from the repository.
    func loadBills() async {
        isLoading = true
        defer { isLoading = false }

        do {
            bills = try await repository.getBills()
        } catch {
            errorMessage = String(localized: "Failed to load bills. Please try again.")
            Self.logger.error("Bills load failed: \(error.localizedDescription, privacy: .public)")
            bills = []
        }
    }

    /// Loads payment history for a specific bill.
    func loadPaymentHistory(for billId: String) async {
        do {
            paymentHistory = try await repository.getPaymentHistory(billId: billId)
        } catch {
            Self.logger.error("Payment history load failed: \(error.localizedDescription, privacy: .public)")
            paymentHistory = []
        }
    }

    /// Creates a new bill and schedules its reminder notification.
    func createBill(_ bill: BillItem) async {
        do {
            try await repository.createBill(bill)
            await scheduleReminder(for: bill)
            Self.logger.info("Bill created: \(bill.id, privacy: .private)")
        } catch {
            errorMessage = String(localized: "Failed to create bill. Please try again.")
            Self.logger.error("Bill creation failed: \(error.localizedDescription, privacy: .public)")
        }
        await loadBills()
    }

    /// Marks a bill as paid for the current period.
    func markAsPaid(billId: String) async {
        do {
            try await repository.markAsPaid(billId: billId)
            Self.logger.info("Bill marked as paid: \(billId, privacy: .private)")
        } catch {
            errorMessage = String(localized: "Failed to mark bill as paid. Please try again.")
            Self.logger.error("Mark as paid failed: \(error.localizedDescription, privacy: .public)")
        }
        await loadBills()
    }

    /// Deletes a bill and cancels its reminder notification.
    func deleteBill(id: String) async {
        do {
            try await repository.deleteBill(id: id)
            await notificationScheduler.cancelNotification(id: "bill-\(id)")
            Self.logger.info("Bill deleted: \(id, privacy: .private)")
        } catch {
            errorMessage = String(localized: "Failed to delete bill. Please try again.")
            Self.logger.error("Bill deletion failed: \(error.localizedDescription, privacy: .public)")
        }
        bills.removeAll { $0.id == id }
    }

    /// Schedules a local notification reminder for a bill.
    private func scheduleReminder(for bill: BillItem) async {
        let schedule = NotificationSchedule(
            id: "bill-\(bill.id)",
            type: .billReminder,
            isEnabled: true,
            frequency: .monthly,
            scheduledHour: 9,
            scheduledMinute: 0
        )
        do {
            try await notificationScheduler.scheduleNotification(schedule)
        } catch {
            Self.logger.error("Failed to schedule bill reminder: \(error.localizedDescription, privacy: .public)")
        }
    }
}
