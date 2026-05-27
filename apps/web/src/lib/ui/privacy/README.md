# Privacy money rendering foundation

All user-facing monetary strings must be produced by `formatAmount`, `formatRange`, or UI components that delegate to them (for example `CurrencyDisplay`). Do not interpolate raw amount or balance variables into template strings.

Supported `MaskingMode` values are `Visible`, `Bucketed`, `Percent`, and `Dots`. Widget instances default to `Bucketed`; users must explicitly opt in to `Visible` because widgets can be seen from locked or shared surfaces.

The root ESLint config includes a build-time rule that rejects likely money template interpolation outside this directory.
