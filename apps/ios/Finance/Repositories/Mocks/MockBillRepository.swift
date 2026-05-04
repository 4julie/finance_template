// SPDX-License-Identifier: BUSL-1.1

// MockBillRepository.swift
// Finance
//
// In-memory mock implementation of BillRepository.
// TODO: Replace MockBillRepository with KMP-backed repository
// that reads from SQLDelight via the Swift Export bridge.
//
// References: #1121

import Foundation

/// Returns hardcoded sample bill data for development and SwiftUI previews.
struct MockBillRepository: BillRepository {

    private static let sampleBills: [BillItem] = {
        let calendar = Calendar.current
        let now = Date.now
        return [
            BillItem(
                id: "b1", name: "Rent", payee: "Property Management Co.",
                amountMinorUnits: 1_500_00, currencyCode: "USD",
                frequency: .monthly,
                dueDate: calendar.date(byAdding: .day, value: 5, to: now) ?? now,
                nextDueDate: calendar.date(byAdding: .day, value: 5, to: now) ?? now,
                categoryName: "Housing", icon: "house",
                isAutoPay: true, notes: "Monthly apartment rent",
                status: .upcoming, reminderDaysBefore: 3,
                createdAt: calendar.date(byAdding: .year, value: -1, to: now) ?? now
            ),
            BillItem(
                id: "b2", name: "Electric Bill", payee: "City Power & Light",
                amountMinorUnits: 120_00, currencyCode: "USD",
                frequency: .monthly,
                dueDate: calendar.date(byAdding: .day, value: -2, to: now) ?? now,
                nextDueDate: calendar.date(byAdding: .day, value: -2, to: now) ?? now,
                categoryName: "Utilities", icon: "bolt",
                isAutoPay: false, notes: "",
                status: .overdue, reminderDaysBefore: 5,
                createdAt: calendar.date(byAdding: .month, value: -8, to: now) ?? now
            ),
            BillItem(
                id: "b3", name: "Internet", payee: "ISP Corp.",
                amountMinorUnits: 79_99, currencyCode: "USD",
                frequency: .monthly,
                dueDate: calendar.date(byAdding: .day, value: 12, to: now) ?? now,
                nextDueDate: calendar.date(byAdding: .day, value: 12, to: now) ?? now,
                categoryName: "Utilities", icon: "wifi",
                isAutoPay: true, notes: "Fiber internet plan",
                status: .upcoming, reminderDaysBefore: 3,
                createdAt: calendar.date(byAdding: .month, value: -6, to: now) ?? now
            ),
            BillItem(
                id: "b4", name: "Car Insurance", payee: "SafeDrive Insurance",
                amountMinorUnits: 145_00, currencyCode: "USD",
                frequency: .monthly,
                dueDate: calendar.date(byAdding: .day, value: 18, to: now) ?? now,
                nextDueDate: calendar.date(byAdding: .day, value: 18, to: now) ?? now,
                categoryName: "Insurance", icon: "car",
                isAutoPay: false, notes: "",
                status: .upcoming, reminderDaysBefore: 5,
                createdAt: calendar.date(byAdding: .month, value: -12, to: now) ?? now
            ),
            BillItem(
                id: "b5", name: "Streaming Subscription", payee: "StreamCo",
                amountMinorUnits: 15_99, currencyCode: "USD",
                frequency: .monthly,
                dueDate: calendar.date(byAdding: .day, value: -5, to: now) ?? now,
                nextDueDate: calendar.date(byAdding: .month, value: 1, to: calendar.date(byAdding: .day, value: -5, to: now) ?? now) ?? now,
                categoryName: "Entertainment", icon: "play.tv",
                isAutoPay: true, notes: "Premium plan",
                status: .paid, reminderDaysBefore: 1,
                createdAt: calendar.date(byAdding: .month, value: -3, to: now) ?? now
            ),
        ]
    }()

    func getBills() async throws -> [BillItem] {
        Self.sampleBills
    }

    func getBill(id: String) async throws -> BillItem? {
        Self.sampleBills.first { $0.id == id }
    }

    func createBill(_ bill: BillItem) async throws { }
    func updateBill(_ bill: BillItem) async throws { }
    func deleteBill(id: String) async throws { }
    func markAsPaid(billId: String) async throws { }

    func getPaymentHistory(billId: String) async throws -> [BillPaymentRecord] {
        let calendar = Calendar.current
        let now = Date.now
        return (1...6).map { offset in
            BillPaymentRecord(
                id: "pay-\(billId)-\(offset)",
                billId: billId,
                amountMinorUnits: 1_500_00 + Int64.random(in: -10_00...10_00),
                currencyCode: "USD",
                paidDate: calendar.date(byAdding: .month, value: -offset, to: now) ?? now,
                isLate: offset == 3
            )
        }
    }

    func deleteAllBills() async throws { }
}
