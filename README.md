# @tradejs/strategy-triangle

TradeJS strategy plugin providing `Triangle`.

## Strategy overview

`Triangle` detects three converging price structures:

1. An ascending triangle has approximately horizontal resistance and rising
   lows.
2. A descending triangle has approximately horizontal support and falling
   highs.
3. A symmetric triangle has falling highs and rising lows with comparable
   boundary angles.

The detector enters only after a candle closes through a boundary. By default,
an ascending triangle can break either upward as continuation or downward as
reversal, and a descending triangle can do the mirror image. Set
`TRIANGLE_ALLOW_REVERSE_BREAKOUTS` to `false` to keep only the conventional
ascending-up and descending-down signals. A symmetric triangle always takes the
direction of the actual breakout.

![Triangle strategy logic](https://raw.githubusercontent.com/TradeJS-Dev/TradeJS-Strategy-Triangle/main/docs/strategy-logic.svg)

## Signal geometry

![Ascending Triangle signal](https://raw.githubusercontent.com/TradeJS-Dev/TradeJS-Strategy-Triangle/main/docs/signal-example.svg)

The illustrations are schematic. Swing highs and lows define regression
boundaries. The detector requires repeated touches, shrinking width, acceptable
touch error, candle containment, sufficient height, and an apex ahead of the
breakout. These checks keep the pattern distinct from parallel channels and
already-expired wedges.

The stop sits beyond the opposite boundary. The target projects a configurable
part of the triangle's starting height from the broken boundary. The detector
supports `breakout`, `close_acceptance`, and `retest` entries and keeps bounded,
replay-safe state.

Primary research fields are grouped by purpose:

- Structure
  - `TRIANGLE_MIN_BARS` and `TRIANGLE_MAX_BARS`
  - `TRIANGLE_PIVOT_RADIUS`
  - `TRIANGLE_MIN_TOUCHES_PER_BOUNDARY`
  - `TRIANGLE_MIN_TOUCH_SPAN_BARS`
- Geometry
  - `TRIANGLE_MAX_FLAT_SLOPE_PCT_PER_BAR`
  - `TRIANGLE_MIN_CONVERGING_SLOPE_PCT_PER_BAR`
  - `TRIANGLE_MIN_SYMMETRY_RATIO`
  - `TRIANGLE_MAX_END_WIDTH_RATIO`
  - `TRIANGLE_MAX_APEX_AFTER_BREAKOUT_BARS`
- Entry and risk
  - `TRIANGLE_ALLOW_REVERSE_BREAKOUTS`
  - `TRIANGLE_ENTRY_MODE`
  - `TRIANGLE_TARGET_HEIGHT_RATIO`
  - `TRIANGLE_STOP_BUFFER_ATR`
  - `LONG.minRiskRatio` and `SHORT.minRiskRatio`

## Install

```bash
yarn add @tradejs/strategy-triangle
```

Register the package in `tradejs.config.ts`:

```ts
import { defineConfig } from "@tradejs/core/config";

export default defineConfig({
  strategies: ["@tradejs/strategy-triangle"],
});
```

The package exports `strategyEntries`, the `Triangle` strategy definition,
manifest, default config, and AI adapter. The adapter adds complete triangle
geometry to the AI payload without imposing an unresearched local gate.

## Development

```bash
yarn install --immutable
yarn checks
```

Publishing is beta-first and delegated to the pinned
`TradeJS-Workflows@v1` reusable workflow.

## Runtime host contract

All `@tradejs/*` runtime packages are peer dependencies. The consuming TradeJS
Project owns their exact installed versions and package manifest, so this
package never loads a hidden nested engine, types package, or Strategy Kit.
