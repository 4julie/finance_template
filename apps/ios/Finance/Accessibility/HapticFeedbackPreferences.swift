// SPDX-License-Identifier: BUSL-1.1

import CoreHaptics
import Foundation

/// Persists the app-level haptic feedback setting.
enum HapticFeedbackPreferences {
    static let key = "finance_haptic_feedback_enabled"

    /// Returns true when this device supports haptics.
    static var deviceSupportsHaptics: Bool {
        CHHapticEngine.capabilitiesForHardware().supportsHaptics
    }

    /// Reads the user preference, defaulting on only when haptics are supported.
    static func isEnabled(defaults: UserDefaults = .standard) -> Bool {
        defaults.object(forKey: key) == nil
            ? deviceSupportsHaptics
            : defaults.bool(forKey: key)
    }

    /// Stores the user preference.
    static func setEnabled(_ enabled: Bool, defaults: UserDefaults = .standard) {
        defaults.set(enabled, forKey: key)
    }
}
