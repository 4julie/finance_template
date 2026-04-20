# Privacy-as-Marketing Messaging Spec

> **Issue:** [#841](https://github.com/jrmoulckers/finance/issues/841)
> **Status:** PROPOSED — Pending human review
> **Sprint:** Marketing Sprint 2
> **Last Updated:** 2025-07-27
> **Author:** Marketing Strategist (AI agent)
> **Related:** [ADR-0004: Auth & Security](../architecture/0004-auth-security-architecture.md) · [ADR-0003: Local Storage](../architecture/0003-local-storage-strategy.md) · [Privacy Audit v1](../architecture/privacy-audit-v1.md) · [Brand Voice Guide](brand-voice-guide.md)

---

## Table of Contents

1. [Privacy Messaging Philosophy](#1-privacy-messaging-philosophy)
2. [The Privacy Card](#2-the-privacy-card)
3. [Technical Accuracy Matrix](#3-technical-accuracy-matrix)
4. [Comparison Messaging](#4-comparison-messaging)
5. [In-App Privacy Explainer Copy](#5-in-app-privacy-explainer-copy)
6. [Privacy Messaging by Channel](#6-privacy-messaging-by-channel)
7. [Common Privacy Questions — Approved Answers](#7-common-privacy-questions--approved-answers)
8. [What NOT to Say](#8-what-not-to-say)

---

## 1. Privacy Messaging Philosophy

### Affirmative, Not Fear-Based

Finance's privacy marketing should emphasize **what users gain**, not what they should fear. We don't sell privacy through anxiety — we sell it through empowerment.

| ❌ Fear-Based (Avoid)                          | ✅ Empowerment-Based (Use)                             |
| ---------------------------------------------- | ------------------------------------------------------ |
| "Other apps are stealing your financial data!" | "Your financial data stays on your device, encrypted." |
| "You can't trust Big Tech with your money!"    | "You're in control of where your data lives."          |
| "Plaid is dangerous!"                          | "Finance works without a bank connection."             |
| "Your data will be hacked!"                    | "AES-256 encryption protects your data on-device."     |

### Specific, Not Vague

Privacy claims must reference specific technical implementations. "We take privacy seriously" is meaningless. "Your data is encrypted on-device with AES-256 via SQLCipher" is verifiable.

### Honest About Boundaries

No privacy claim should be absolute if it isn't. We are transparent about:

- What sync metadata the server CAN see (timestamps, category IDs)
- What the current compliance status is (audit says ~44% GDPR compliance)
- What features are not yet built (some E2E elements are in progress)

Use temporal qualifiers: "as of v1.0," "currently," "in the current release."

---

## 2. The Privacy Card

A 5-sentence summary suitable for app store descriptions, landing pages, and press materials:

> **Your money stays on your device.** Finance stores all your financial data in an encrypted database on your device using AES-256 encryption (SQLCipher). No data is uploaded to any server unless you choose to enable multi-device sync. No bank connection is ever required. The codebase is source-available — you can verify every privacy claim by reading the code at github.com/jrmoulckers/finance.

### Shortened Variants

**2-sentence (social media / captions):**

> Finance keeps your financial data encrypted on your device. No bank connection needed, no server uploads without your choice, and source-available code so you can verify.

**1-sentence (tagline use):**

> Your financial data stays encrypted on your device — verify it yourself in our source-available code.

---

## 3. Technical Accuracy Matrix

Every privacy marketing claim mapped to its architecture verification. **No claim should be published without a corresponding entry in this table.**

| Marketing Claim                     | Technical Basis                                                                       | Source Reference                                          | Accuracy Status                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Data encrypted on your device"     | SQLCipher AES-256-GCM for local SQLite DB                                             | `packages/models/src/*/DatabaseFactory.*.kt`, ADR-0003    | ✅ Verified                                                                                                                                                 |
| "AES-256 encryption"                | SQLCipher uses AES-256 in GCM mode                                                    | SQLCipher documentation, ADR-0003                         | ✅ Verified                                                                                                                                                 |
| "Keys stored in secure hardware"    | Keychain (Secure Enclave), Keystore (TEE), DPAPI (TPM), Web Crypto                    | ADR-0004 § 5                                              | ✅ Verified                                                                                                                                                 |
| "Works fully offline"               | Edge-first architecture, local SQLite storage, no server dependency for core features | `docs/architecture/overview.md` § 1, 4                    | ✅ Verified                                                                                                                                                 |
| "No bank connection required"       | Manual-entry-first design, no Plaid/MX integration                                    | Product Identity § 2, feature spec                        | ✅ Verified                                                                                                                                                 |
| "No analytics SDK"                  | No analytics dependency in codebase                                                   | Package.json, build.gradle.kts (absence of tracking libs) | ✅ Verified (current)                                                                                                                                       |
| "We can't read your financial data" | Hybrid E2E — sensitive fields encrypted, metadata server-readable                     | ADR-0004 § 6                                              | ⚠️ **Nuance required** — accurate for sensitive fields (amounts, balances, notes); metadata (categories, timestamps) is server-readable when sync is active |
| "End-to-end encrypted"              | Envelope encryption for sensitive fields                                              | ADR-0004 § 6, 7                                           | ⚠️ **Nuance required** — applies to sensitive fields only, not all data                                                                                     |
| "Source-available"                  | GitHub repo under BSL-1.1                                                             | LICENSE file, README.md                                   | ✅ Verified                                                                                                                                                 |
| "No data selling"                   | No data broker partnerships, no ad SDK                                                | Privacy Policy, business model (subscriptions only)       | ✅ Verified                                                                                                                                                 |
| "Passkey authentication"            | WebAuthn/FIDO2 implementation                                                         | ADR-0004 § 1                                              | ✅ Verified                                                                                                                                                 |
| "Crypto-shredding for deletion"     | Destroy KEK to make data irrecoverable                                                | ADR-0004 § 7                                              | ⚠️ **Partial** — architecture designed, implementation coverage per privacy audit ~44%                                                                      |

### Claims Requiring Nuance

#### "We can't read your financial data"

**Accurate version:** "Sensitive financial data — transaction amounts, account balances, and notes — is encrypted end-to-end. When you enable sync, the server processes metadata needed for synchronization (timestamps, category references) but cannot decrypt your financial amounts or personal notes."

**Short version for marketing:** "Your financial details (amounts, balances, notes) are encrypted end-to-end. We can't decrypt them."

#### "End-to-end encrypted"

**Accurate version:** "Finance uses a hybrid encryption model. Sensitive fields are encrypted end-to-end. Sync metadata required for multi-device coordination is server-readable but contains no financial amounts or personal financial details."

**Short version for marketing:** "Sensitive financial data is end-to-end encrypted. Sync metadata is handled separately."

#### "GDPR compliant"

**Current status:** Do NOT claim GDPR compliance. The privacy audit (v1) estimates ~44% compliance. Significant work remains on DSAR coverage, consent capture, retention schedules, and web-side encryption.

**What to say instead:** "Finance is designed with privacy by design principles and is working toward full GDPR compliance. Data export and account deletion with crypto-shredding are built in."

---

## 4. Comparison Messaging

### Finance vs. Bank-Connected Apps (Monarch, Copilot, PocketGuard)

**Neutral comparison (preferred):**

> Most budget apps connect to your bank via services like Plaid to automatically import transactions. This is convenient, but it means your financial data — every transaction, every paycheck, every purchase — passes through and is stored on third-party servers.
>
> Finance takes a different approach: you enter transactions manually (it takes about 30 seconds), and your data stays encrypted on your device. No bank credentials shared, no third-party data processing, no server-stored financial history.

**Key comparison points (factual, not FUD):**

| Aspect                  | Bank-Connected Apps                | Finance                                   |
| ----------------------- | ---------------------------------- | ----------------------------------------- |
| Transaction import      | Automatic via Plaid/MX             | Manual entry (3 taps, 30 seconds)         |
| Data location           | App company's servers              | Your device (encrypted)                   |
| Bank credentials        | Shared with Plaid (third party)    | Never collected                           |
| Offline use             | Not available                      | Full functionality                        |
| Third-party data access | Plaid processes all transactions   | No third parties involved                 |
| Encryption              | Server-side (company manages keys) | On-device (you manage keys via biometric) |

### Finance vs. YNAB

**Neutral comparison:**

> YNAB and Finance share the same budgeting philosophy: envelope budgeting (give every dollar a job). The key differences are architecture and pricing. YNAB is a web app that stores data on YNAB's servers and costs $14.99/month. Finance is a native app on 4 platforms that stores data encrypted on your device and offers the core tracker free forever.

### Important: What We Don't Say

- ❌ We don't say competitors are "insecure" or "unsafe"
- ❌ We don't say Plaid is "dangerous"
- ❌ We don't say other apps "steal" data
- ❌ We don't use "unlike [competitor name]" in store listings (policy violation risk)
- ❌ We don't imply that server-stored data is inherently bad — we explain our _alternative_ approach

---

## 5. In-App Privacy Explainer Copy

### Onboarding Welcome Screen (Step 1)

**Headline:** Your data stays here.

**Body:**

> Everything you track in Finance — transactions, budgets, goals — is stored on this device, encrypted. Nothing is uploaded to a server unless you choose to sync with other devices. We can't see your financial data, and we designed it that way.

**Supporting details** (expandable "Learn more"):

> • **Encryption:** Your data is protected by AES-256 encryption (SQLCipher) on this device
> • **Offline:** Finance works fully without internet
> • **No bank needed:** Add transactions manually — your bank credentials stay with your bank
> • **Sync (optional):** If you enable sync, sensitive data is encrypted end-to-end before leaving your device
> • **Source-available:** Read the code at github.com/jrmoulckers/finance

### Settings → Privacy Section

**Header:** How Finance handles your data

**Items:**

| Setting            | Description                                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data location**  | "All financial data is stored on this device in an encrypted database."                                                                                                           |
| **Encryption**     | "AES-256 encryption via SQLCipher. Your encryption key is stored in [Secure Enclave / Keystore / TPM]."                                                                           |
| **Sync status**    | "[Sync off — data is local only] / [Sync on — sensitive fields encrypted end-to-end]"                                                                                             |
| **Analytics**      | "Finance does not collect usage analytics or track your behavior."                                                                                                                |
| **Export data**    | "Download all your data as JSON or CSV at any time." → [Export button]                                                                                                            |
| **Delete account** | "Permanently delete your account and all data. This uses crypto-shredding — your encryption key is destroyed, making all data irrecoverable." → [Delete button with confirmation] |

### Empty State — First Transaction

> "Your first transaction stays right here on your device, encrypted. Only you can see it."

---

## 6. Privacy Messaging by Channel

### App Store Description (condensed)

> YOUR MONEY STAYS ON YOUR DEVICE
> Every transaction, budget, and goal is encrypted on your device using AES-256 encryption. No server uploads unless you choose to sync. No bank connection required. Your financial data is yours alone.

### Social Media (shareable)

> Your budget app stores your financial history on their servers.
>
> Finance stores it on your device, encrypted with AES-256.
>
> The code is open for you to verify: [link]

### Press / Media (detailed)

> Finance uses a hybrid end-to-end encryption model with on-device storage as the primary architecture. The local database is encrypted with SQLCipher (AES-256-GCM), with encryption keys stored in platform-native secure hardware — Secure Enclave on iOS, Trusted Execution Environment on Android, Trusted Platform Module on Windows, and Web Crypto API for the web PWA. When multi-device sync is enabled, sensitive fields (amounts, balances, notes) are encrypted end-to-end using an envelope encryption pattern before leaving the device. Sync metadata (timestamps, category references) is server-readable for coordination purposes. The complete codebase is source-available under BSL-1.1.

### Technical Audience (HN, developer communities)

> Architecture: SQLDelight + SQLCipher (AES-256-GCM) for local storage. Keys in platform Keychain/Keystore (SE/TEE/TPM). PowerSync for delta sync. Hybrid E2E: envelope encryption for sensitive fields, metadata server-readable for sync coordination. Passkey auth (WebAuthn/FIDO2). No analytics SDK. BSL-1.1 licensed. Full ADR: [link to ADR-0004]

---

## 7. Common Privacy Questions — Approved Answers

### "Is my data really private?"

> Yes. Your financial data (transactions, budgets, goals, account balances) is stored in an encrypted database on your device. Finance does not upload data to any server unless you enable multi-device sync — and even then, sensitive fields like amounts and notes are encrypted end-to-end before leaving your device.

### "What happens if I enable sync?"

> When you enable sync, Finance uses PowerSync to keep your devices in sync. Here's what happens:
>
> - **Encrypted before it leaves:** Sensitive data (amounts, balances, notes) is encrypted end-to-end on your device before transmission
> - **Metadata for coordination:** Timestamps and category references are server-readable so the sync engine can coordinate changes
> - **Your encryption key:** Stored in your device's secure hardware — never transmitted to our server
>
> If you disable sync, no further data is transmitted, and you can request deletion of any server-side data.

### "Do you sell my data?"

> No. Finance does not sell, share, or monetize user data. Our revenue comes from optional premium subscriptions. This is stated in our privacy policy and verifiable in our source code.

### "What data do you collect?"

> If you use Finance without sync (local-only mode): we collect nothing. No analytics, no telemetry, no usage data.
>
> If you create an account and enable sync: we store your email for authentication, sync metadata for multi-device coordination, and encrypted financial data that we cannot decrypt.

### "How can I verify your claims?"

> Our codebase is source-available on GitHub under BSL-1.1. You can read:
>
> - The encryption implementation in `packages/models/src/`
> - The sync protocol in `packages/sync/src/`
> - The security architecture in `docs/architecture/0004-auth-security-architecture.md`
> - The complete privacy audit in `docs/architecture/privacy-audit-v1.md`

### "What happens if I delete my account?"

> Finance uses crypto-shredding for account deletion: your encryption key (KEK) is permanently destroyed, making all encrypted data irrecoverable — including in server backups. Local data on your device is also deleted.

---

## 8. What NOT to Say

### Absolute Claims (Avoid)

| ❌ Don't Say                | Why                                         | ✅ Say Instead                                                                    |
| --------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| "100% private"              | No system is 100% anything                  | "Designed for privacy from the ground up"                                         |
| "Unhackable"                | Nothing is unhackable                       | "Protected by AES-256 encryption on your device"                                  |
| "Military-grade encryption" | Meaningless marketing term                  | "AES-256 encryption (SQLCipher)"                                                  |
| "We never see your data"    | Metadata is server-readable during sync     | "We can't decrypt your financial details (amounts, balances, notes)"              |
| "GDPR compliant"            | Not yet fully compliant (~44% per audit)    | "Designed with privacy by design principles, working toward full GDPR compliance" |
| "Zero knowledge"            | Not technically zero-knowledge architecture | "Hybrid end-to-end encryption for sensitive fields"                               |
| "Bank-grade security"       | Undefined, unverifiable                     | Cite specific encryption standards (AES-256, SQLCipher)                           |

### Fear-Based Messaging (Avoid)

| ❌ Don't Say                                 | Why                                              |
| -------------------------------------------- | ------------------------------------------------ |
| "Other apps are selling your data!"          | FUD — we don't know their specific practices     |
| "Your bank data is being stolen!"            | Inflammatory and inaccurate                      |
| "Plaid is a privacy nightmare!"              | Not our claim to make — focus on our alternative |
| "You can't trust anyone with your finances!" | Creates anxiety, not empowerment                 |
| "Are you SURE your budget app is safe?"      | Rhetorical fear question                         |

### Competitor-Specific Claims (Avoid)

| ❌ Don't Say                                  | Why                                                     |
| --------------------------------------------- | ------------------------------------------------------- |
| "Unlike YNAB, we actually care about privacy" | Implies competitor doesn't care — unprovable            |
| "Monarch sells your data to advertisers"      | Specific claim about a competitor — verify or don't say |
| "Copilot charges too much"                    | Subjective and competitor-bashing                       |

---

## References

- [ADR-0004: Auth & Security Architecture](../architecture/0004-auth-security-architecture.md) — Primary source for all encryption and security claims
- [ADR-0003: Local Storage Strategy](../architecture/0003-local-storage-strategy.md) — SQLCipher implementation details
- [Privacy Audit v1](../architecture/privacy-audit-v1.md) — Current compliance status (~44% GDPR)
- [Architecture Overview](../architecture/overview.md) — Edge-first architecture, data flow
- [Privacy Policy](../legal/privacy-policy.md) — Published privacy commitments
- [Brand Voice Guide](brand-voice-guide.md) — Tone guidelines for privacy messaging
