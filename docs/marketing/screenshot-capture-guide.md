# Production Screenshot Capture & Store Assets

> **Issue:** [#843](https://github.com/jrmoulckers/finance/issues/843)
> **Status:** PROPOSED — Pending human review
> **Sprint:** Marketing Sprint 3
> **Last Updated:** 2025-07-27
> **Author:** Marketing Strategist (AI agent)
> **Related:** [Screenshot Spec](screenshot-spec.md) · [Brand Voice Guide](brand-voice-guide.md)

---

## Table of Contents

1. [Capture Readiness Checklist](#1-capture-readiness-checklist)
2. [Sample Data Loading Procedure](#2-sample-data-loading-procedure)
3. [Platform Capture Guides](#3-platform-capture-guides)
4. [Post-Processing Pipeline](#4-post-processing-pipeline)
5. [Asset Delivery Matrix](#5-asset-delivery-matrix)
6. [Quality Assurance Checklist](#6-quality-assurance-checklist)
7. [File Naming & Organization](#7-file-naming--organization)
8. [Store Upload Guide](#8-store-upload-guide)

---

## 1. Capture Readiness Checklist

### Before ANY Captures

- [ ] **Release build** on all platforms (not debug/dev builds)
- [ ] **Sample data loaded** per specification (§ 2 below)
- [ ] **Known UI issues resolved** — no visible bugs in capture screens
- [ ] **Consistent state** — same financial data across all platform captures
- [ ] **Device settings standardized:**
  - Time: 10:09 AM (convention for store screenshots)
  - Battery: 100% or full icon
  - Signal: Full bars (cellular) or WiFi icon
  - Notifications: Cleared
  - Do Not Disturb: Off (no icon)
  - Language: English (US)
- [ ] **Dark mode AND light mode** ready on all devices

### Devices / Environments Required

| Platform | Device                           | Resolution      | Notes               |
| -------- | -------------------------------- | --------------- | ------------------- |
| iOS      | iPhone 16 Pro Max (or simulator) | 1320 × 2868     | Primary phone       |
| iOS      | iPad Pro 13" (or simulator)      | 2064 × 2752     | Primary tablet      |
| Android  | Pixel 8 Pro (or emulator)        | 1080 × 2400     | Primary phone       |
| Android  | Pixel Tablet (or emulator)       | 1200 × 1920     | Optional tablet     |
| Web      | Chrome on Mac/Windows            | 1200 × 630 (OG) | For social/OG image |
| Windows  | Windows 11 desktop               | 1920 × 1080     | Primary desktop     |

---

## 2. Sample Data Loading Procedure

### Step 1: Create Accounts

| Account       | Type        | Balance    |
| ------------- | ----------- | ---------- |
| Main Checking | Checking    | $2,847.33  |
| Savings       | Savings     | $8,420.00  |
| Visa Card     | Credit Card | -$1,234.56 |

### Step 2: Create Budget Categories with Allocations

| Category          | Monthly Budget |
| ----------------- | -------------- |
| 🏠 Housing        | $1,400         |
| 🍽️ Food & Dining  | $450           |
| 🚗 Transportation | $200           |
| 🎬 Entertainment  | $100           |
| 💊 Health         | $75            |
| 🛍️ Shopping       | $150           |
| 📱 Subscriptions  | $50            |
| 💡 Utilities      | $125           |

### Step 3: Create Transactions (Past 30 Days)

Enter these transactions to create realistic budget spend percentages:

**Food & Dining ($387.24 of $450):**

- Morning Brew Coffee — $4.50 (today)
- Riverside Grocers — $67.43 (yesterday)
- Luna's Thai Kitchen — $18.75 (3 days ago)
- Fresh Market — $89.30 (1 week ago)
- Cedar Street Bakery — $12.50 (1 week ago)
- Willow Creek Café — $22.76 (2 weeks ago)
- Harbor Fish Market — $45.00 (2 weeks ago)
- Riverside Grocers — $72.00 (3 weeks ago)
- Golden Bowl Ramen — $15.50 (3 weeks ago)
- Sunrise Deli — $39.50 (4 weeks ago)

**Transportation ($178.50 of $200):**

- Metro Transit — $2.75 (today)
- Metro Transit — $2.75 (yesterday)
- Shell Gas Station — $48.00 (1 week ago)
- Metro Transit — $55.00 (monthly pass, 2 weeks ago)
- Riverside Parking — $12.00 (2 weeks ago)
- Shell Gas Station — $52.00 (3 weeks ago)
- Uber — $6.00 (3 weeks ago)

**Entertainment ($112.00 of $100 — slightly over):**

- Elm Street Books — $24.99 (3 days ago)
- Streaming subscription — $15.99 (1 week ago)
- Movie tickets — $32.00 (2 weeks ago)
- Concert venue — $39.02 (3 weeks ago)

**Health ($45.00 of $75):**

- Green Leaf Pharmacy — $12.50 (yesterday)
- Sunrise Yoga Studio — $32.50 (2 days ago)

**Shopping ($89.99 of $150):**

- Home Depot — $34.99 (5 days ago)
- Target — $55.00 (2 weeks ago)

### Step 4: Create Goals

| Goal           | Target  | Current   | Account                         |
| -------------- | ------- | --------- | ------------------------------- |
| Emergency Fund | $10,000 | $8,420.00 | Savings                         |
| New Laptop     | $1,500  | $680.00   | (calculated from contributions) |

### Step 5: Verify Dashboard State

Before capturing, verify the dashboard shows:

- Today's spending: ~$7.25 (coffee + transit)
- Weekly trend: "On track" or equivalent positive indicator
- Budget categories with varied progress (some under, one slightly over)
- Net worth positive (checking + savings - credit card = ~$10,032.77)

---

## 3. Platform Capture Guides

### iOS Capture Guide

**Simulator method (recommended for pixel-perfect results):**

1. Open Xcode → Simulator → iPhone 16 Pro Max
2. Set status bar: `xcrun simctl status_bar booted override --time "10:09" --batteryState charged --batteryLevel 100 --cellularMode active --cellularBars 4`
3. Load sample data into the app
4. Navigate to each screen per screenshot spec
5. Capture: `⌘ + S` in Simulator (saves to Desktop)
6. Repeat for iPad Pro 13" simulator

**Physical device method:**

1. Set time display (not possible on real device — use simulator for status bar consistency)
2. Navigate to each screen
3. Screenshot: Side button + Volume Up
4. AirDrop to Mac for processing

**Dark mode:**

- Settings → Display → Dark Mode → Repeat all captures

### Android Capture Guide

**Emulator method (recommended):**

1. Android Studio → AVD Manager → Pixel 8 Pro (API 34+)
2. Set time via ADB: `adb shell date -s "10:09:00"`
3. Set demo mode: `adb shell settings put global sysui_demo_allowed 1` then `adb shell am broadcast -a com.android.systemui.demo -e command enter`
4. Set battery: `adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100`
5. Navigate to each screen
6. Capture: Emulator screenshot button or `adb exec-out screencap -p > screenshot.png`

**Physical device method:**

1. Power + Volume Down for screenshot
2. Transfer via USB or Google Photos

### Web Capture Guide

1. Open Finance in Chrome at staging URL
2. Set viewport to target size (1200px wide for desktop)
3. DevTools → Device toolbar → Responsive mode
4. Navigate to each screen
5. Full-page screenshot: DevTools → `⌘ + Shift + P` → "Capture screenshot"
6. For OG image: capture hero dashboard view at 1200×630

### Windows Capture Guide

1. Set display scaling to 100% (for clean pixel capture)
2. Set time (if clock visible in screenshots)
3. Open Finance app
4. Navigate to each screen
5. Snipping Tool: `Win + Shift + S` → Window capture
6. Save as PNG at native resolution

---

## 4. Post-Processing Pipeline

### Step 1: Raw Screenshot Review

- [ ] All 6 screens captured per platform (dashboard, quick entry, budget, reports, goals, privacy)
- [ ] Both light and dark mode variants
- [ ] No debug elements or test data visible
- [ ] Status bars clean and consistent

### Step 2: Device Frame Application

**Recommended tools:**

- [Rotato](https://rotato.app/) — Premium, realistic 3D device frames
- [Screenshots.pro](https://screenshots.pro/) — Web-based, free tier available
- [Previewed](https://previewed.app/) — Mockup generator
- Apple/Google marketing asset kits (free official device frames)

**Settings:**

- Device frame matches capture device (iPhone 16 Pro Max frame for iPhone captures)
- Shadow: subtle drop shadow (not harsh)
- Background: solid color per screenshot spec color recommendations

### Step 3: Copy Overlay Addition

Add overlay text per screenshot spec § 3:

| Position        | Overlay Text                 |
| --------------- | ---------------------------- |
| 1 - Dashboard   | "See your money at a glance" |
| 2 - Quick Entry | "3 taps. 30 seconds. Done."  |
| 3 - Budget      | "Every dollar has a purpose" |
| 4 - Reports     | "Your spending, visualized"  |
| 5 - Goals       | "Track your progress"        |
| 6 - Privacy     | "Private by design"          |

**Typography:**

- Font: System font or brand font, Bold/Semi-Bold weight
- Size: Large enough to read at 50% thumbnail (test this!)
- Color: High contrast against background (≥4.5:1)
- Position: Top 20% of image, centered horizontally
- Max lines: 1–2

### Step 4: Export

Export each screenshot at platform-specific dimensions:

- iOS: 1320×2868 (iPhone), 2064×2752 (iPad)
- Android: 1080×2400 (phone, 16:9+ aspect ratio)
- Feature Graphic: 1024×500
- Windows: 1920×1080
- Web OG: 1200×630

Format: PNG, sRGB color space

---

## 5. Asset Delivery Matrix

### Complete Asset List

| Asset                         | Dimensions | Platform | Light | Dark | Status  |
| ----------------------------- | ---------- | -------- | ----- | ---- | ------- |
| iPhone 1 - Dashboard          | 1320×2868  | iOS      | ☐     | ☐    | Pending |
| iPhone 2 - Quick Entry        | 1320×2868  | iOS      | ☐     | ☐    | Pending |
| iPhone 3 - Budget             | 1320×2868  | iOS      | ☐     | ☐    | Pending |
| iPhone 4 - Reports            | 1320×2868  | iOS      | ☐     | ☐    | Pending |
| iPhone 5 - Goals              | 1320×2868  | iOS      | ☐     | ☐    | Pending |
| iPhone 6 - Privacy            | 1320×2868  | iOS      | ☐     | ☐    | Pending |
| iPad 1 - Dashboard            | 2064×2752  | iOS      | ☐     | ☐    | Pending |
| iPad 2 - Quick Entry          | 2064×2752  | iOS      | ☐     | ☐    | Pending |
| iPad 3 - Budget               | 2064×2752  | iOS      | ☐     | ☐    | Pending |
| iPad 4 - Goals                | 2064×2752  | iOS      | ☐     | ☐    | Pending |
| Android Phone 1 - Dashboard   | 1080×2400  | Android  | ☐     | ☐    | Pending |
| Android Phone 2 - Quick Entry | 1080×2400  | Android  | ☐     | ☐    | Pending |
| Android Phone 3 - Budget      | 1080×2400  | Android  | ☐     | ☐    | Pending |
| Android Phone 4 - Reports     | 1080×2400  | Android  | ☐     | ☐    | Pending |
| Android Phone 5 - Goals       | 1080×2400  | Android  | ☐     | ☐    | Pending |
| Android Phone 6 - Privacy     | 1080×2400  | Android  | ☐     | ☐    | Pending |
| Android Feature Graphic       | 1024×500   | Android  | ☐     | —    | Pending |
| Windows 1 - Dashboard         | 1920×1080  | Windows  | ☐     | ☐    | Pending |
| Windows 2 - Budget            | 1920×1080  | Windows  | ☐     | ☐    | Pending |
| Windows 3 - Reports           | 1920×1080  | Windows  | ☐     | ☐    | Pending |
| Windows 4 - Goals             | 1920×1080  | Windows  | ☐     | ☐    | Pending |
| Web OG Image                  | 1200×630   | Web      | ☐     | —    | Pending |
| Twitter Card                  | 1200×675   | Social   | ☐     | —    | Pending |

**Total assets: ~47** (including light + dark variants)

---

## 6. Quality Assurance Checklist

### Per-Screenshot QA

- [ ] Sample data is consistent with spec (correct amounts, payee names)
- [ ] No real financial data or PII visible
- [ ] No debug elements, developer tools, or test labels
- [ ] Status bar shows 10:09, full battery, full signal
- [ ] Copy overlay text matches spec exactly (no typos)
- [ ] Copy overlay readable at 50% thumbnail size
- [ ] Device frame correct for platform
- [ ] Background color matches spec recommendations
- [ ] Color contrast meets accessibility standards (≥4.5:1 for overlay text)
- [ ] File dimensions match platform requirements exactly

### Cross-Platform Consistency

- [ ] Same financial story told across all platforms (same account balances, budget amounts)
- [ ] Copy overlay text identical across platforms
- [ ] Visual quality consistent (no one platform looks better/worse)
- [ ] Dark mode variants have correct dark backgrounds and light overlay text

### Final Review

- [ ] All assets exported at correct dimensions
- [ ] File naming follows convention (§ 7)
- [ ] Light and dark variants for mobile platforms
- [ ] Feature graphic (Android) created
- [ ] OG image (Web) created
- [ ] All assets reviewed by at least one other person

---

## 7. File Naming & Organization

### Naming Convention

```
{platform}-{position}-{screen}-{mode}.png
```

**Examples:**

```
ios-iphone-01-dashboard-light.png
ios-iphone-01-dashboard-dark.png
ios-iphone-02-quickentry-light.png
ios-ipad-01-dashboard-light.png
android-phone-01-dashboard-light.png
android-phone-01-dashboard-dark.png
android-feature-graphic.png
windows-01-dashboard-light.png
web-og-image.png
social-twitter-card.png
```

### Directory Structure

```
assets/
├── screenshots/
│   ├── ios/
│   │   ├── iphone/
│   │   │   ├── light/
│   │   │   └── dark/
│   │   └── ipad/
│   │       ├── light/
│   │       └── dark/
│   ├── android/
│   │   ├── phone/
│   │   │   ├── light/
│   │   │   └── dark/
│   │   └── feature-graphic/
│   ├── windows/
│   │   ├── light/
│   │   └── dark/
│   └── web/
├── icons/
│   ├── ios/
│   ├── android/
│   └── web/
└── social/
    ├── og-image.png
    └── twitter-card.png
```

---

## 8. Store Upload Guide

### iOS (App Store Connect)

1. Navigate to App Store Connect → Your App → App Store → Version
2. Go to "App Previews and Screenshots"
3. Upload iPhone screenshots in order (position 1–6)
4. Upload iPad screenshots in order (position 1–4)
5. Verify screenshots appear in correct order in preview
6. Save changes

### Android (Google Play Console)

1. Navigate to Play Console → Your App → Store Listing → Main Store Listing
2. Upload phone screenshots (minimum 4, max 8)
3. Upload feature graphic (1024×500)
4. Optionally upload tablet screenshots
5. Verify preview
6. Save changes

### Windows (Microsoft Store Partner Center)

1. Navigate to Partner Center → Your App → Store Listings
2. Upload desktop screenshots (minimum 1, recommended 4)
3. Verify dimensions (minimum 1366×768)
4. Save and submit

### Web (OG/Social Meta Tags)

Update meta tags in the web app's `index.html`:

```html
<meta property="og:image" content="/assets/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="/assets/twitter-card.png" />
```

---

## References

- [Screenshot Spec](screenshot-spec.md) — Screen sequence, copy overlays, visual guidelines
- [Brand Voice Guide](brand-voice-guide.md) — Copy overlay tone
- [ASO Research](aso-keyword-research.md) — Store listing requirements
- Apple [Screenshot Specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications)
- Google [Store Listing Graphics](https://support.google.com/googleplay/android-developer/answer/9866151)
