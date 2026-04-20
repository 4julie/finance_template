// SPDX-License-Identifier: BUSL-1.1

// GoalProgressIntent.swift
// Finance
//
// App Intent for checking savings goal progress via Siri Shortcuts.
// Returns progress information for a specific goal or a summary of
// all active goals when no name is provided.
// Refs #294

import AppIntents
import Foundation
import os

/// Shows savings goal progress via Siri.
///
/// Available as a Siri Shortcut with the phrase *"Goal progress in Finance"*.
/// When a specific goal name is provided, returns detailed progress for that
/// goal. Otherwise, returns an overview of all active goals.
struct GoalProgressIntent: AppIntent {

    static let title: LocalizedStringResource = "Goal Progress"

    static let description: IntentDescription = IntentDescription(
        "Check progress toward your savings goals.",
        categoryName: "Goals"
    )

    // MARK: - Parameters

    @Parameter(
        title: "Goal Name",
        description: "Name of a specific goal to check. Leave empty for an overview."
    )
    var goalName: String?

    // MARK: - Logging

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.finance",
        category: "GoalProgressIntent"
    )

    // MARK: - Perform

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let repository = RepositoryProvider.shared.goals

        let goals: [GoalItem]
        do {
            goals = try await repository.getGoals()
        } catch {
            Self.logger.error(
                "Failed to fetch goals: \(error.localizedDescription, privacy: .public)"
            )
            throw IntentError.saveFailed
        }

        guard !goals.isEmpty else {
            return .result(
                dialog: IntentDialog(stringLiteral: String(
                    localized: "You don't have any savings goals set up yet."
                ))
            )
        }

        // Specific goal lookup
        if let name = goalName {
            guard let matched = goals.first(where: {
                $0.name.localizedCaseInsensitiveCompare(name) == .orderedSame
            }) else {
                Self.logger.info(
                    "Goal not found: \(name, privacy: .private)"
                )
                throw IntentError.notFound
            }

            return .result(
                dialog: IntentDialog(stringLiteral: Self.goalDetail(matched))
            )
        }

        // Overview of all goals
        return .result(
            dialog: IntentDialog(stringLiteral: Self.goalOverview(goals))
        )
    }

    // MARK: - Formatting

    /// Builds a detailed status string for a single goal.
    static func goalDetail(_ goal: GoalItem) -> String {
        let percentage = Int((goal.progress * 100).rounded())
        let current = formatCurrency(
            minorUnits: goal.currentMinorUnits,
            currencyCode: goal.currencyCode
        )
        let target = formatCurrency(
            minorUnits: goal.targetMinorUnits,
            currencyCode: goal.currencyCode
        )

        if goal.isComplete {
            return String(
                localized: "Congratulations! Your \(goal.name) goal is complete — you've saved \(current) of \(target)."
            )
        }

        let remaining = formatCurrency(
            minorUnits: goal.remainingMinorUnits,
            currencyCode: goal.currencyCode
        )

        var result = String(
            localized: "\(goal.name) is \(percentage)% complete — \(current) of \(target) saved, \(remaining) to go."
        )

        if let targetDate = goal.targetDate {
            let formatted = targetDate.formatted(date: .abbreviated, time: .omitted)
            result += " " + String(
                localized: "Target date: \(formatted)."
            )
        }

        return result
    }

    /// Builds an overview string summarising all goals.
    static func goalOverview(_ goals: [GoalItem]) -> String {
        let active = goals.filter { $0.status == .active }
        let completed = goals.filter { $0.status == .completed }

        var parts: [String] = []

        if !completed.isEmpty {
            let completedCount = completed.count
            let word = completedCount == 1
                ? String(localized: "goal")
                : String(localized: "goals")
            parts.append(String(
                localized: "\(completedCount) \(word) completed."
            ))
        }

        if !active.isEmpty {
            let activeCount = active.count
            let word = activeCount == 1
                ? String(localized: "active goal")
                : String(localized: "active goals")

            // Find the closest to completion
            if let closest = active.max(by: { $0.progress < $1.progress }) {
                let percentage = Int((closest.progress * 100).rounded())
                parts.append(String(
                    localized: "\(activeCount) \(word). \(closest.name) is closest at \(percentage)%."
                ))
            } else {
                parts.append(String(
                    localized: "\(activeCount) \(word)."
                ))
            }
        }

        if parts.isEmpty {
            return String(localized: "No active goals.")
        }

        return parts.joined(separator: " ")
    }

    private static func formatCurrency(
        minorUnits: Int64,
        currencyCode: String
    ) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currencyCode
        let majorUnits = NSDecimalNumber(value: minorUnits)
            .dividing(by: NSDecimalNumber(decimal: 100))
        return formatter.string(from: majorUnits)
            ?? "\(currencyCode) \(minorUnits)"
    }
}
