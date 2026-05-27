// SPDX-License-Identifier: BUSL-1.1

// BiometricCategoryViewModel.swift
// Finance
//
// ViewModel for managing biometric-protected transaction categories.
// Handles authentication flow, protection toggles, and session state.
//
// Uses @Observable, BiometricAuthManager, and ProtectedCategoryService.
//
// References: #295

import Observation
import os
import SwiftUI

@Observable
final class BiometricCategoryViewModel {
    private let protectedService: ProtectedCategoryProviding
    private let biometricManager: BiometricAuthManaging
    private let categoryRepository: CategoryRepository
    private let transactionRepository: TransactionRepository

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.finance",
        category: "BiometricCategoryViewModel"
    )

    // MARK: - Published State

    /// All categories available for protection.
    var categories: [CategoryItem] = []

    /// Set of category IDs currently protected.
    var protectedIds: Set<String> = []

    /// Set of category IDs that have been unlocked for the fresh-auth cache window.
    var unlockedIds: Set<String> = []

    private var unlockedUntilByCategory: [String: Date] = [:]
    private let freshAuthCacheDuration: TimeInterval = 30

    /// Whether biometric auth is available on this device.
    var isBiometricAvailable = false

    /// Whether the system is loading.
    var isLoading = false

    /// Error message for alerts.
    var errorMessage: String?

    /// Whether the auth prompt is showing.
    var isAuthenticating = false

    var showError: Bool { errorMessage != nil }
    func dismissError() { errorMessage = nil }

    /// Returns whether a category's transactions should be visible.
    func isVisible(categoryId: String) -> Bool {
        !protectedIds.contains(categoryId) || hasFreshUnlock(categoryId)
    }

    /// Returns whether a category is currently protected.
    func isProtected(categoryId: String) -> Bool {
        protectedIds.contains(categoryId)
    }

    // MARK: - Init

    init(
        protectedService: ProtectedCategoryProviding = ProtectedCategoryService.shared,
        biometricManager: BiometricAuthManaging = BiometricAuthManager(),
        categoryRepository: CategoryRepository = RepositoryProvider.shared.categories,
        transactionRepository: TransactionRepository = RepositoryProvider.shared.transactions
    ) {
        self.protectedService = protectedService
        self.biometricManager = biometricManager
        self.categoryRepository = categoryRepository
        self.transactionRepository = transactionRepository
    }

    // MARK: - Data Loading

    func loadCategories() async {
        isLoading = true
        defer { isLoading = false }

        isBiometricAvailable = biometricManager.canAuthenticate()
        protectedIds = protectedService.protectedCategoryIds()

        do {
            categories = try await categoryRepository.getCategories()
            Self.logger.debug(
                "Loaded \(self.categories.count, privacy: .public) categories, \(self.protectedIds.count, privacy: .public) protected"
            )
        } catch {
            errorMessage = String(localized: "Failed to load categories.")
            Self.logger.error(
                "Category load failed: \(error.localizedDescription, privacy: .public)"
            )
        }
    }

    // MARK: - Protection Toggle

    /// Toggles biometric protection for a category.
    ///
    /// - When protecting: adds the category to the protected set.
    /// - When unprotecting: requires biometric auth first, then removes.
    func toggleProtection(for categoryId: String) async {
        let currentlyProtected = protectedIds.contains(categoryId)
        do {
            isAuthenticating = true
            let authReason: String
            if currentlyProtected {
                authReason = String(localized: "Authenticate to remove category protection")
            } else {
                authReason = String(localized: "Authenticate to protect this category")
            }
            try await biometricManager.authenticate(reason: authReason)
            isAuthenticating = false

            if currentlyProtected {
                try protectedService.unprotectCategory(id: categoryId)
                protectedIds.remove(categoryId)
                unlockedIds.remove(categoryId)
                unlockedUntilByCategory.removeValue(forKey: categoryId)
                Self.logger.info("Unprotected category \(categoryId, privacy: .private(mask: .hash))")
            } else {
                try protectedService.protectCategory(id: categoryId)
                protectedIds.insert(categoryId)
                Self.logger.info("Protected category \(categoryId, privacy: .private(mask: .hash))")
            }
        } catch {
            isAuthenticating = false
            if case BiometricError.cancelled = error { return }
            errorMessage = String(localized: "Fresh authentication is required to change category protection.")
            Self.logger.error(
                "Protection toggle failed: \(error.localizedDescription, privacy: .public)"
            )
        }
    }

    // MARK: - Unlock Flow

    /// Prompts biometric auth to reveal transactions in a protected category.
    ///
    /// On success, the category is added to `unlockedIds` for the current
    /// session. Re-locking happens when the app enters the background.
    func unlockCategory(_ categoryId: String) async -> Bool {
        guard protectedIds.contains(categoryId) else { return true }
        guard !hasFreshUnlock(categoryId) else { return true }

        do {
            isAuthenticating = true
            try await biometricManager.authenticate(
                reason: String(localized: "Authenticate to view protected transactions")
            )
            isAuthenticating = false

            unlockedIds.insert(categoryId)
            unlockedUntilByCategory[categoryId] = Date().addingTimeInterval(freshAuthCacheDuration)
            Self.logger.info(
                "Unlocked protected category for session: \(categoryId, privacy: .private(mask: .hash))"
            )
            return true
        } catch {
            isAuthenticating = false
            if case BiometricError.cancelled = error { return false }
            errorMessage = String(localized: "Authentication failed. Transactions remain hidden.")
            Self.logger.error(
                "Unlock failed: \(error.localizedDescription, privacy: .public)"
            )
            return false
        }
    }

    private func hasFreshUnlock(_ categoryId: String) -> Bool {
        guard let expiresAt = unlockedUntilByCategory[categoryId] else {
            unlockedIds.remove(categoryId)
            return false
        }

        if Date() < expiresAt {
            unlockedIds.insert(categoryId)
            return true
        }

        unlockedIds.remove(categoryId)
        unlockedUntilByCategory.removeValue(forKey: categoryId)
        return false
    }

    /// Re-locks all unlocked categories (called on background transition).
    func relockAll() {
        unlockedIds.removeAll()
        unlockedUntilByCategory.removeAll()
        Self.logger.debug("Re-locked all protected categories")
    }
}
