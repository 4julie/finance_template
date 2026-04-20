# ADR-0014: AI/ML Pipeline Architecture — On-Device Serving, Training Pipeline, Federated Learning

**Status:** Proposed
**Date:** 2025-07-27
**Author:** System Architect (AI agent)
**Reviewers:** Pending human review
**Sprint:** S12

## Context

Finance V2 includes AI features (ADR-0010) that must run **entirely on-device** to preserve the privacy-first principle. Transaction data must never leave the device for inference.

### ML Feature Requirements

| Feature              | Model Type          | Size    | Latency  |
| -------------------- | ------------------- | ------- | -------- |
| Auto-categorization  | Text classification | < 15 MB | < 30 ms  |
| Anomaly detection    | Statistical + ML    | < 5 MB  | < 50 ms  |
| Predictive budgeting | Time-series         | < 10 MB | < 100 ms |
| NLP search           | Embedding           | < 30 MB | < 100 ms |
| Receipt OCR          | Vision              | < 20 MB | < 500 ms |

**Total: < 80 MB.** Downloaded on-demand, not bundled with app.

### Platform Runtimes

| Platform | Runtime          | Format     | Acceleration       |
| -------- | ---------------- | ---------- | ------------------ |
| Android  | TensorFlow Lite  | .tflite    | GPU, NNAPI         |
| iOS      | Core ML          | .mlpackage | Neural Engine, GPU |
| Windows  | ONNX Runtime     | .onnx      | DirectML, CPU      |
| Web      | TF.js / ONNX Web | .onnx      | WebGPU, WASM SIMD  |

## Decision

Implement a **three-layer ML architecture**: (1) on-device inference, (2) centralized training with synthetic data, (3) optional federated learning.

### Layer 1: On-Device Model Serving

```
┌──────────────────────────────────────────────────────┐
│  Client Device                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  AI Features (packages/core/ai/)                  │ │
│  │  Categorizer │ AnomalyDetector │ BudgetForecaster │ │
│  │       └──────────────┬──────────────┘             │ │
│  │  ┌──────────────────▼──────────────────────────┐ │ │
│  │  │  ModelRuntime (expect/actual per platform)   │ │ │
│  │  └──────────────────┬──────────────────────────┘ │ │
│  │  ┌──────────────────▼──────────────────────────┐ │ │
│  │  │  ModelManager                                │ │ │
│  │  │  • Version check + background download       │ │ │
│  │  │  • SHA-256 integrity verification            │ │ │
│  │  │  • 80 MB disk quota                          │ │ │
│  │  │  • Fallback to rules when model unavailable  │ │ │
│  │  └──────────────────┬──────────────────────────┘ │ │
│  └─────────────────────┼────────────────────────────┘ │
│                        │ HTTPS (background)            │
└────────────────────────┼──────────────────────────────┘
  ┌──────────────────────▼──────────────────────────────┐
  │  Model Registry (CDN)                                │
  │  /models/v1/manifest.json                            │
  │  /models/v1/{model}/{version}/{platform}/model.{ext} │
  └──────────────────────────────────────────────────────┘
```

**KMP Model Runtime:**

```kotlin
expect class ModelRuntime() {
    suspend fun loadModel(artifact: ModelArtifact): LoadedModel
    suspend fun predict(model: LoadedModel, input: ModelInput): ModelOutput
    fun isHardwareAccelerated(): Boolean
    suspend fun unloadModel(model: LoadedModel)
}
```

### Layer 2: Centralized Model Training

Three data sources, prioritized by privacy:

1. **Synthetic data** (primary) — generated descriptions, known category mappings, multi-language templates
2. **Public datasets** — government spending data, MCC database, open-source categorization datasets
3. **Opt-in anonymized** (future) — differential privacy applied; category mappings only, never amounts; k-anonymity ≥ 100

**Pipeline:**

```
Data Prep → Training (PyTorch/TF) → Quantization (INT8, ~4x smaller)
  → Export: TFLite + CoreML + ONNX + WASM
  → Evaluation Gate: accuracy > 85%, size < budget, latency < budget
  → Staged rollout: 5% → 25% → 100%
```

### Layer 3: Federated Learning (Future, 10K+ Users)

```
Round N:
1. Server publishes global model V(N)
2. Devices: download → fine-tune locally → compute gradient delta →
   apply differential privacy → encrypt with secure aggregation → upload
3. Server: aggregate 100+ encrypted updates → average → V(N+1)

Privacy: Server never sees device data OR individual updates.
ε-DP budget ≤ 8.0. Minimum cohort: 100 devices. Wi-Fi + charging only.
```

**Prerequisites (all required before enabling):**

- 10K+ active premium users
- Secure aggregation protocol deployed
- Differential privacy library integrated
- External privacy audit completed
- Opt-in UI with clear explanation
- GDPR Art. 22 regulatory review

### Rule-Based Fallback

Every ML feature has a rule-based fallback:

```kotlin
interface Categorizer {
    suspend fun categorize(description: String): CategorySuggestion
}

class RuleBasedCategorizer(
    private val merchantDb: MerchantDatabase,
    private val keywordRules: List<CategoryRule>,
) : Categorizer {
    override suspend fun categorize(description: String): CategorySuggestion {
        merchantDb.findMerchant(description)?.let {
            return CategorySuggestion(it.defaultCategoryId, 0.9, MERCHANT_DB)
        }
        keywordRules.firstOrNull { it.matches(description) }?.let {
            return CategorySuggestion(it.categoryId, 0.7, KEYWORD_RULE)
        }
        return CategorySuggestion(null, 0.0, NONE)
    }
}

class MLCategorizer(
    private val runtime: ModelRuntime,
    private val modelManager: ModelManager,
    private val fallback: RuleBasedCategorizer,
) : Categorizer {
    override suspend fun categorize(description: String): CategorySuggestion {
        val model = modelManager.getModel("categorizer")
            ?: return fallback.categorize(description)
        return try {
            val output = runtime.predict(model, ModelInput.text(description))
            CategorySuggestion(output.topClass, output.topConfidence, ML_MODEL)
        } catch (e: Exception) { fallback.categorize(description) }
    }
}
```

### Model Lifecycle

```
Draft → Testing (eval gate) → Staged (5% canary) → Live (100%) → Archived
Rollback: automatic if on-device metrics degrade
```

**Privacy-safe telemetry:**

```kotlin
data class ModelTelemetry(
    val modelId: String, val modelVersion: String, val platform: String,
    val inferenceCount: Int, val averageLatencyMs: Double,
    val p95LatencyMs: Double, val userOverrideRate: Double,
    // NO input data, NO output data, NO transaction details
)
```

## Alternatives Considered

### Alternative 1: Cloud ML (OpenAI / Vertex AI)

- **Pros:** State-of-the-art models; no on-device management.
- **Cons:** **Breaks privacy-first.** Sends transaction data to third parties. Cannot work offline. Per-request costs.

### Alternative 2: On-Device Training Only

- **Pros:** Maximum privacy.
- **Cons:** Cold-start: new users get no help. Battery/thermal impact. Quality varies wildly.

### Alternative 3: Homomorphic Encryption

- **Pros:** Cloud inference on encrypted data.
- **Cons:** 1000x–10000x overhead. A 30ms inference becomes 30–300 seconds.

### Alternative 4: Federated Learning Only

- **Pros:** Real data, no centralized collection.
- **Cons:** Can't bootstrap models from scratch. Needs 10K+ users.

## Consequences

### Positive

- **Privacy absolute** — Data never leaves device; architecturally enforced
- **Offline AI** — Works fully offline once models downloaded
- **Graceful degradation** — Rule-based fallbacks always available
- **Platform-optimal** — Neural Engine, NNAPI, DirectML per platform
- **Clear improvement path** — Synthetic → production → federated

### Negative

- **Four-format maintenance** — TFLite + CoreML + ONNX + WASM per model
- **Accuracy ceiling** — < 15 MB models: 80–90% vs. cloud 95%+
- **Download UX** — 15–80 MB model downloads required
- **FL complexity** — Secure aggregation + differential privacy are research-grade

### Risks

| Risk                      | Likelihood | Impact   | Mitigation                                        |
| ------------------------- | ---------- | -------- | ------------------------------------------------- |
| Model accuracy too low    | Medium     | High     | Confidence scores; easy override; iterate on data |
| Model too large (low-end) | Medium     | Medium   | INT8 quantization; skip on < 2 GB RAM             |
| FL privacy leak           | Low        | Critical | External audit; conservative ε; minimum cohorts   |
| Runtime breaking changes  | Low        | Medium   | Pin versions; integration tests; CPU fallback     |

## Implementation Notes

### Phased Plan

```
Phase 1 (V2.0): ModelRuntime expect/actual, ModelManager, CDN, rule-based fallbacks
Phase 2 (V2.1): First ML models (categorizer), A/B test vs. rules
Phase 3 (V2.2): NLP search, predictive budgeting, receipt OCR
Phase 4 (V3.0): Federated learning (prerequisite: 10K+ users, privacy audit)
```

## References

- [ADR-0010: V2 Architecture Vision](./0010-v2-architecture-vision.md)
- [TensorFlow Lite](https://www.tensorflow.org/lite)
- [Core ML](https://developer.apple.com/documentation/coreml)
- [ONNX Runtime](https://onnxruntime.ai/)
- [Federated Learning — Google AI](https://ai.google/research/pubs/pub45648)
- [Differential Privacy — Apple](https://www.apple.com/privacy/docs/Differential_Privacy_Overview.pdf)
- [Secure Aggregation — Bonawitz et al.](https://eprint.iacr.org/2017/281)
- [Flower FL Framework](https://flower.ai/)
