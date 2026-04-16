# @finance/design-tokens

Design tokens for the Finance app, defined in [DTCG](https://design-tokens.github.io/community-group/format/) format and built with [Style Dictionary v5](https://styledictionary.com/).

## Token Architecture

```
tokens/
├── primitive/     # Raw values (colors, spacing, typography, shadows, motion, cognitive)
├── semantic/      # Purpose-mapped tokens with theme variants + accessibility modes
│   ├── colors.light.json          # Light theme colors
│   ├── colors.dark.json           # Dark theme colors
│   ├── colors.dark-oled.json      # OLED dark theme (true black)
│   ├── colors.high-contrast.json  # High-contrast theme (WCAG AAA)
│   ├── typography.json            # Type scale (display → caption)
│   ├── elevation.json             # Shadow elevation mapping
│   ├── animation.json             # Motion purpose mapping
│   ├── breakpoints.json           # Responsive layout breakpoints
│   └── cognitive.json             # Cognitive accessibility overrides
└── component/     # Component-specific tokens
    ├── button.json                # Button variants (primary, secondary, destructive)
    ├── card.json                  # Card container styling
    ├── input.json                 # Text input/field styling
    ├── navigation.json            # Navigation bar/tab styling
    ├── chart.json                 # Data visualization charts
    ├── progress.json              # Progress bars and rings
    ├── animation.json             # Component animation bindings
    └── cognitive.json             # Cognitive mode component overrides
```

## Build

```bash
npm run build    # Generate platform outputs in build/
npm run clean    # Remove build artifacts
```

### Output Platforms

| Platform       | Path             | Files                                                                                                              |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Web (CSS)      | `build/web/`     | `tokens.css`, `tokens-dark.css`, `tokens-dark-oled.css`, `tokens-high-contrast.css`                                |
| iOS (Swift)    | `build/ios/`     | `FinanceTokens.swift`, `FinanceTokensDark.swift`, `FinanceTokensDarkOLED.swift`, `FinanceTokensHighContrast.swift` |
| Android (XML)  | `build/android/` | `colors.xml`, `dimens.xml`, `colors-night.xml`, `colors-night-oled.xml`, `colors-high-contrast.xml`                |
| Windows (XAML) | `build/windows/` | `FinanceTokens.xaml`, `FinanceTokensBrushes.xaml` + dark/OLED/HC variants                                          |
| Kotlin (KMP)   | `build/kotlin/`  | `FinanceBreakpoints.kt`                                                                                            |

### Theme Coverage

| Theme         | CSS Selector                   | Use Case                              |
| ------------- | ------------------------------ | ------------------------------------- |
| Light         | `:root`                        | Default theme                         |
| Dark          | `[data-theme="dark"]`          | Standard dark mode                    |
| Dark OLED     | `[data-theme="dark-oled"]`     | True black for AMOLED battery savings |
| High Contrast | `[data-theme="high-contrast"]` | Low vision / `prefers-contrast: more` |

## Usage

### CSS (Web)

```css
@import '@finance/design-tokens/build/web/tokens.css';
@import '@finance/design-tokens/build/web/tokens-dark.css';
@import '@finance/design-tokens/build/web/tokens-high-contrast.css';

.card {
  background: var(--semantic-background-elevated);
  border-radius: var(--card-border-radius);
  padding: var(--card-padding);
}
```

### XAML (Windows)

```xml
<Page.Resources>
  <ResourceDictionary Source="ms-appx:///Tokens/FinanceTokens.xaml" />
</Page.Resources>

<Border
  Background="{StaticResource SemanticBackgroundElevatedBrush}"
  CornerRadius="{StaticResource CardBorderRadius}"
  Padding="{StaticResource CardPadding}" />
```

### Swift (iOS)

```swift
import FinanceTokens

let cardBg = FinanceTokens.cardBackground
let cardRadius = FinanceTokens.cardBorderRadius
```

### Kotlin / Android XML

```xml
<View
  android:background="@color/card_background"
  android:padding="@dimen/card_padding" />
```

## Token Tiers

Every visual property follows the three-tier resolution chain:

```
primitive (raw value)  →  semantic (purpose)  →  component (binding)
    color.blue.600     →  interactive.default  →  button.primary.background
    spacing.4          →     —                 →  card.padding
    shadow.sm          →  elevation.low        →  card.shadow
```

## Adding Tokens

1. Add the primitive value to the appropriate file under `tokens/primitive/`
2. Create a semantic mapping in `tokens/semantic/` (purpose-driven name)
3. Bind to components in `tokens/component/` (component-specific name)
4. Use `$value` and `$type` (DTCG format)
5. Reference other tokens with `{group.subgroup.key}` syntax
6. Run `npm run build` and verify output across all platforms
7. Update `docs/design/token-preview.md` if adding a new token category

## Documentation

- **[Token Preview & Reference](../../docs/design/token-preview.md)** — Visual reference of all tokens
- **[Data Visualization](../../docs/design/data-visualization.md)** — Chart token usage
- **[Cognitive Accessibility](../../docs/design/cognitive-accessibility.md)** — Cognitive mode tokens
- **[Animation Library](../../docs/design/animation-library.md)** — Motion token reference
- **[OLED Dark Mode](../../docs/design/oled-dark-mode.md)** — OLED theme tokens
