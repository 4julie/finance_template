// SPDX-License-Identifier: BUSL-1.1

export { MaskingMode, formatAmount, formatRange, isMaskingMode } from './masking';
export type { FormatAmountOptions } from './masking';
export { PrivacyPersistenceOption, PrivacyState, createLocalStoragePrivacyStorage } from './state';
export type { PrivacyListener, PrivacySnapshot, PrivacyStorage } from './state';
export {
  DEFAULT_WIDGET_MASKING_MODE,
  WIDGET_FIRST_ADD_PROMPT,
  WIDGET_MASKING_STORAGE_KEY,
  getWidgetMaskingMode,
  listWidgetMaskingModes,
  setWidgetMaskingMode,
} from './widget-storage';
export type { WidgetMaskingConfig } from './widget-storage';
export {
  BiometricAccessCache,
  requireFreshCategoryAccess,
  toggleCategoryProtectionWithFreshAuth,
} from './biometric';
export type {
  CategoryProtectionToggleResult,
  FreshAuthProvider,
  FreshAuthResult,
} from './biometric';
export {
  excludeProtectedCategoriesForSharing,
  rollUpProtectedTransactions,
  shareableCategories,
} from './protected-rollup';
export type { ProtectedRollup } from './protected-rollup';
export { PRIVACY_QUICK_ACTIONS } from './quick-actions';
export type { PrivacyQuickActionDescriptor } from './quick-actions';
export { PRIVACY_STRINGS } from './strings';
