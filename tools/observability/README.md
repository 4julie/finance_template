# Observability Tools

This directory contains observability standards and tooling for the Finance monorepo.

## Structured Logging

### Standards

All production code should use structured logging instead of raw `console.log`:

**TypeScript/JavaScript:**

```typescript
import { logger } from '@finance/core/logger';

// ✅ Good — structured, filterable
logger.info('Transaction created', { userId, amount, category });

// ❌ Bad — unstructured, can't filter or alert
console.log('Created transaction for', userId, amount);
```

**Kotlin:**

```kotlin
import io.github.oshai.kotlinlogging.KotlinLogging

private val logger = KotlinLogging.logger {}

// ✅ Good
logger.info { "Transaction synced: id=$id, status=$status" }

// ❌ Bad
println("Transaction synced: $id $status")
```

### Forbidden Patterns

These patterns trigger CI warnings/errors:

- `console.log` / `console.warn` / `console.error` in production code
- `println` / `System.out` in Kotlin production code
- Logging sensitive data: passwords, tokens, API keys, credit card numbers

## Error Tracking

- Web: Error boundaries must wrap all route components
- API: All endpoints must have try-catch with structured error responses
- Source maps must be configured for production builds

## CI Validation

The `observability.yml` workflow checks:

- Structured logging compliance
- Sensitive data logging prevention
- Error boundary coverage
- Build performance metrics
- Bundle size tracking
