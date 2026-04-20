# Android Navigation Architecture

> Reference documentation for the Finance app's navigation system.

## Overview

The Finance Android app uses **Jetpack Navigation Compose** with a single-activity
architecture. All screens are Composables managed by a shared `NavHostController`.

## Route Hierarchy

Routes are defined as a sealed class in `FinanceNavHost.kt`:

```
Route (sealed class)
├── Dashboard          "dashboard"                          (top-level tab)
├── Transactions       "transactions"                       (top-level tab)
├── Planning           "planning"                           (top-level tab)
├── Settings           "settings"                           (top-level tab)
├── Accounts           "accounts"                           (secondary)
├── Analytics          "analytics"                          (secondary)
├── AccountDetail      "accounts/{id}"                      (parameterized)
├── AccountCreate      "account/create"                     (secondary)
├── AccountEdit        "account/edit/{id}"                  (parameterized)
├── TransactionCreate  "transactions/create?accountId={..}" (optional param)
├── TransactionEdit    "transaction/edit/{id}"              (parameterized)
├── TransactionDetail  "transaction/{id}"                   (deep link)
├── BudgetCreate       "budget/create"                      (secondary)
├── BudgetEdit         "budget/edit/{id}"                   (parameterized)
├── GoalCreate         "goal/create"                        (secondary)
├── GoalEdit           "goal/edit/{id}"                     (parameterized)
├── AuthCallback       "auth/callback"                      (deep link)
└── Invite             "invite/{code}"                      (deep link)
```

## Navigation Patterns

### Bottom Navigation (Compact Width)

On phones in portrait, four top-level tabs in a Material 3 `NavigationBar`:

- Dashboard, Activity, Planning, Settings

### Modal Drawer (Medium/Expanded Width)

On tablets and landscape orientations, a `ModalNavigationDrawer` replaces
the bottom bar. Same destinations, better use of horizontal space.

### Adaptive Resolution

`AdaptiveNavigation.kt` resolves the layout type based on `WindowWidthSizeClass`:

- `Compact` → Bottom bar
- `Medium` / `Expanded` → Modal drawer

## Transition Animations

Navigation transitions follow Material 3 motion guidelines (`NavTransitions.kt`):

| Navigation Type  | Enter                         | Exit                          |
| ---------------- | ----------------------------- | ----------------------------- |
| **Forward push** | Slide in from right + fade in | Slide out to left + fade out  |
| **Back pop**     | Slide in from left + fade in  | Slide out to right + fade out |
| **Tab switch**   | Crossfade                     | Crossfade                     |

Duration: 300ms for all transitions.

## Deep Links

Three deep link patterns are registered in `AndroidManifest.xml` and handled
in the nav graph:

| Pattern                                | Route               | Purpose               |
| -------------------------------------- | ------------------- | --------------------- |
| `https://finance.app/auth/callback`    | `AuthCallback`      | OAuth redirect        |
| `https://finance.app/invite/{code}`    | `Invite`            | Household invitation  |
| `https://finance.app/transaction/{id}` | `TransactionDetail` | Transaction deep link |

Deep links arriving while the app is running are forwarded via
`addOnNewIntentListener` in `MainActivity.kt`.

## Architecture Diagram

```
┌──────────────────────────────────────────────────┐
│  MainActivity                                     │
│  ┌────────────────────────────────────────────── │
│  │ FinanceTheme                                  │
│  │  ┌─────────────────────────────────────────── │
│  │  │ FinanceApp                                 │
│  │  │  ├── AuthLoadingScreen (AuthState.Loading) │
│  │  │  ├── LoginScreen / SignupScreen            │
│  │  │  └── AuthenticatedContent                  │
│  │  │       ├── Scaffold                         │
│  │  │       │   ├── FinanceTopBar                │
│  │  │       │   ├── FinanceBottomBar (compact)   │
│  │  │       │   │   OR FinanceNavigationDrawer   │
│  │  │       │   ├── FAB (Dashboard/Transactions) │
│  │  │       │   └── FinanceNavHost               │
│  │  │       │       ├── Dashboard                │
│  │  │       │       ├── Transactions             │
│  │  │       │       ├── Planning                 │
│  │  │       │       ├── Settings                 │
│  │  │       │       └── ... (sub-routes)         │
└──┴──┴───────┴────────────────────────────────────┘
```

## Testing

### Unit Tests

- `RouteTest.kt` — Route uniqueness, parameter substitution, deep link patterns
- `NavTransitionsTest.kt` — Transition object smoke tests

### Integration Tests

- Deep link verification via instrumented tests (future)
- Navigation state preservation on configuration change (future)

## Key Files

| File                         | Purpose                                    |
| ---------------------------- | ------------------------------------------ |
| `FinanceNavHost.kt`          | NavHost with all route registrations       |
| `FinanceBottomBar.kt`        | Material 3 bottom navigation bar           |
| `FinanceNavigationDrawer.kt` | Modal drawer for wider screens             |
| `TopBarConfig.kt`            | Adaptive top app bar per route             |
| `NavTransitions.kt`          | Material 3 motion transition definitions   |
| `AdaptiveNavigation.kt`      | Window size → navigation layout resolution |
