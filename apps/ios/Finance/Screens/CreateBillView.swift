// SPDX-License-Identifier: BUSL-1.1

// CreateBillView.swift
// Finance
//
// New bill/recurring payment creation form with frequency picker,
// amount entry, and reminder configuration.
//
// References: #1121

import SwiftUI

// MARK: - View

/// Form for creating a new bill or recurring payment.
///
/// Presented as a sheet from ``BillsListView``. Validates input and
/// calls ``BillsViewModel/createBill(_:)`` on submission.
struct CreateBillView: View {
    let viewModel: BillsViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var payee = ""
    @State private var amountText = ""
    @State private var frequency: BillFrequency = .monthly
    @State private var dueDate = Date.now
    @State private var categoryName = ""
    @State private var isAutoPay = false
    @State private var reminderDaysBefore = 3
    @State private var notes = ""
    @State private var validationError: String?

    var body: some View {
        NavigationStack {
            Form {
                billInfoSection
                scheduleSection
                reminderSection
                notesSection
            }
            .navigationTitle(String(localized: "New Bill"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "Cancel")) { dismiss() }
                        .accessibilityLabel(String(localized: "Cancel"))
                        .accessibilityHint(String(localized: "Dismisses the new bill form"))
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "Save")) { saveBill() }
                        .disabled(!isValid)
                        .accessibilityLabel(String(localized: "Save bill"))
                        .accessibilityHint(String(localized: "Creates the new bill and schedules a reminder"))
                }
            }
            .alert(String(localized: "Validation Error"), isPresented: Binding(
                get: { validationError != nil },
                set: { if !$0 { validationError = nil } }
            )) {
                Button(String(localized: "OK"), role: .cancel) { validationError = nil }
            } message: {
                Text(validationError ?? "")
            }
        }
    }

    // MARK: - Bill Info Section

    private var billInfoSection: some View {
        Section {
            TextField(String(localized: "Bill Name"), text: $name)
                .accessibilityLabel(String(localized: "Bill name"))

            TextField(String(localized: "Payee"), text: $payee)
                .accessibilityLabel(String(localized: "Payee name"))

            TextField(String(localized: "Amount"), text: $amountText)
                .keyboardType(.decimalPad)
                .accessibilityLabel(String(localized: "Amount"))
                .accessibilityHint(String(localized: "Enter the bill amount in dollars"))

            TextField(String(localized: "Category"), text: $categoryName)
                .accessibilityLabel(String(localized: "Category"))
        } header: {
            Text(String(localized: "Bill Information"))
        }
    }

    // MARK: - Schedule Section

    private var scheduleSection: some View {
        Section {
            Picker(String(localized: "Frequency"), selection: $frequency) {
                ForEach(BillFrequency.allCases, id: \.self) { freq in
                    Text(freq.displayName).tag(freq)
                }
            }
            .accessibilityLabel(String(localized: "Bill frequency"))

            DatePicker(
                String(localized: "Due Date"),
                selection: $dueDate,
                displayedComponents: .date
            )
            .accessibilityLabel(String(localized: "Due date"))

            Toggle(String(localized: "Auto-Pay"), isOn: $isAutoPay)
                .accessibilityLabel(String(localized: "Auto-pay enabled"))
                .accessibilityHint(String(localized: "When enabled, this bill is paid automatically"))
        } header: {
            Text(String(localized: "Schedule"))
        }
    }

    // MARK: - Reminder Section

    private var reminderSection: some View {
        Section {
            Stepper(
                String(localized: "\(reminderDaysBefore) days before"),
                value: $reminderDaysBefore,
                in: 0...30
            )
            .accessibilityLabel(String(localized: "Reminder days before due date"))
            .accessibilityValue(String(localized: "\(reminderDaysBefore) days"))
        } header: {
            Text(String(localized: "Reminder"))
        } footer: {
            Text(String(localized: "You'll receive a notification this many days before the bill is due."))
        }
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        Section {
            TextField(String(localized: "Notes (optional)"), text: $notes, axis: .vertical)
                .lineLimit(3...6)
                .accessibilityLabel(String(localized: "Notes"))
        } header: {
            Text(String(localized: "Notes"))
        }
    }

    // MARK: - Validation

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty &&
        !payee.trimmingCharacters(in: .whitespaces).isEmpty &&
        parseAmount() != nil
    }

    private func parseAmount() -> Int64? {
        guard let value = Double(amountText.trimmingCharacters(in: .whitespaces)),
              value > 0 else {
            return nil
        }
        return Int64(round(value * 100))
    }

    // MARK: - Save

    private func saveBill() {
        guard let amountMinorUnits = parseAmount() else {
            validationError = String(localized: "Please enter a valid amount.")
            return
        }

        let iconMap: [String: String] = [
            "housing": "house", "utilities": "bolt", "insurance": "shield",
            "entertainment": "play.tv", "subscription": "play.tv",
            "internet": "wifi", "phone": "phone", "food": "cart",
        ]
        let icon = iconMap[categoryName.lowercased()] ?? "banknote"

        let bill = BillItem(
            id: UUID().uuidString,
            name: name.trimmingCharacters(in: .whitespaces),
            payee: payee.trimmingCharacters(in: .whitespaces),
            amountMinorUnits: amountMinorUnits,
            currencyCode: "USD",
            frequency: frequency,
            dueDate: dueDate,
            nextDueDate: dueDate,
            categoryName: categoryName.trimmingCharacters(in: .whitespaces),
            icon: icon,
            isAutoPay: isAutoPay,
            notes: notes.trimmingCharacters(in: .whitespaces),
            status: .upcoming,
            reminderDaysBefore: reminderDaysBefore,
            createdAt: .now
        )

        Task {
            await viewModel.createBill(bill)
            dismiss()
        }
    }
}

#Preview {
    CreateBillView(viewModel: BillsViewModel(repository: MockBillRepository()))
}
