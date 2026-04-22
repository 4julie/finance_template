# Feature Flags

This directory contains feature flag configuration for the Finance app.

## Structure

- `flags.json` — Primary feature flag definitions

## Flag Schema

Each flag must have these required fields:

| Field                | Type     | Required | Description                                                                                 |
| -------------------- | -------- | -------- | ------------------------------------------------------------------------------------------- |
| `description`        | string   | ✅       | Human-readable description                                                                  |
| `enabled`            | boolean  | ✅       | Whether the flag is enabled                                                                 |
| `owner`              | string   | ✅       | Team that owns this flag (`platform`, `backend`, `web`, `android`, `ios`, `devops`, `core`) |
| `platforms`          | string[] | ❌       | Target platforms                                                                            |
| `rollout_percentage` | number   | ❌       | Percentage of users who see this feature (0-100)                                            |
| `expires`            | string   | ❌       | ISO date when flag should be removed (triggers CI warning)                                  |

## CI Validation

The `feature-flags-ci.yml` workflow validates:

- JSON syntax and required fields
- Orphaned flags (defined but not used in code)
- Stale/expired flags
- Posts usage report on PRs

## Adding a New Flag

1. Add the flag to `flags.json` with all required fields
2. Reference the flag name in your source code
3. Open a PR — the CI will validate the configuration
