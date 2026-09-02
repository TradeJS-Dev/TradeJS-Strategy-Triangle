/** @jest-environment node */

import { createTriangleEngine } from "../engine";
import {
  makeAscendingTriangleCandles,
  makeCandle,
  makeSymmetricTriangleLongCandles,
  makeSymmetricTriangleShortCandles,
  makeTriangleConfig,
  mirrorCandles,
} from "./fixtures";

describe("Triangle engine", () => {
  it("detects an ascending triangle above horizontal resistance", () => {
    const engine = createTriangleEngine({ config: makeTriangleConfig() });
    const states = makeAscendingTriangleCandles().map((candle) =>
      engine.next(candle as any),
    );
    const pattern = states[states.length - 1]?.pattern;

    expect(pattern?.kind).toBe("ascending_triangle");
    expect(pattern?.direction).toBe("LONG");
    expect(pattern?.upperSlopePctPerBar).toBeCloseTo(0);
    expect(pattern?.lowerSlopePctPerBar).toBeGreaterThan(0);
    expect(pattern?.contractionRatio).toBeLessThan(1);
    expect(pattern?.upperPivots.length).toBeGreaterThanOrEqual(2);
    expect(pattern?.lowerPivots.length).toBeGreaterThanOrEqual(2);
    expect(pattern?.targetPrice).toBeGreaterThan(pattern?.close ?? Infinity);
    expect(pattern?.stopLossPrice).toBeLessThan(pattern?.close ?? -Infinity);
  });

  it("detects the mirrored descending triangle below horizontal support", () => {
    const engine = createTriangleEngine({ config: makeTriangleConfig() });
    const states = mirrorCandles(makeAscendingTriangleCandles()).map((candle) =>
      engine.next(candle as any),
    );
    const pattern = states[states.length - 1]?.pattern;

    expect(pattern?.kind).toBe("descending_triangle");
    expect(pattern?.direction).toBe("SHORT");
    expect(pattern?.lowerSlopePctPerBar).toBeCloseTo(0);
    expect(pattern?.upperSlopePctPerBar).toBeLessThan(0);
    expect(pattern?.targetPrice).toBeLessThan(pattern?.close ?? -Infinity);
    expect(pattern?.stopLossPrice).toBeGreaterThan(pattern?.close ?? Infinity);
  });

  it("detects a reverse breakdown from an ascending triangle", () => {
    const candles = makeAscendingTriangleCandles();
    candles[candles.length - 1] = makeCandle(9, 108, 108.5, 105.5, 106.5);
    const engine = createTriangleEngine({ config: makeTriangleConfig() });
    const states = candles.map((candle) => engine.next(candle as any));
    const pattern = states[states.length - 1]?.pattern;

    expect(pattern?.kind).toBe("ascending_triangle");
    expect(pattern?.direction).toBe("SHORT");
    expect(pattern?.targetPrice).toBeLessThan(pattern?.close ?? -Infinity);
  });

  it("can disable reverse breakouts for directional triangles", () => {
    const candles = makeAscendingTriangleCandles();
    candles[candles.length - 1] = makeCandle(9, 108, 108.5, 105.5, 106.5);
    const engine = createTriangleEngine({
      config: makeTriangleConfig({
        TRIANGLE_ALLOW_REVERSE_BREAKOUTS: false,
      }),
    });
    const state = candles.reduce(
      (_, candle) => engine.next(candle as any),
      engine.getState(),
    );

    expect(state.pattern).toBeNull();
  });

  it.each([
    ["LONG", makeSymmetricTriangleLongCandles],
    ["SHORT", makeSymmetricTriangleShortCandles],
  ] as const)(
    "detects a symmetric triangle breaking %s",
    (direction, makeCandles) => {
      const engine = createTriangleEngine({ config: makeTriangleConfig() });
      const states = makeCandles().map((candle) => engine.next(candle as any));
      const pattern = states[states.length - 1]?.pattern;

      expect(pattern?.kind).toBe("symmetric_triangle");
      expect(pattern?.direction).toBe(direction);
      expect(pattern?.upperSlopePctPerBar).toBeLessThan(0);
      expect(pattern?.lowerSlopePctPerBar).toBeGreaterThan(0);
      expect(pattern?.symmetryRatio).toBeGreaterThanOrEqual(0.5);
    },
  );

  it("rejects boundaries that do not meet the convergence threshold", () => {
    const engine = createTriangleEngine({
      config: makeTriangleConfig({
        TRIANGLE_MIN_CONVERGING_SLOPE_PCT_PER_BAR: 2,
      }),
    });
    const state = makeAscendingTriangleCandles().reduce(
      (_, candle) => engine.next(candle as any),
      engine.getState(),
    );

    expect(state.pattern).toBeNull();
  });

  it("waits for close acceptance and emits the setup only once", () => {
    const engine = createTriangleEngine({
      config: makeTriangleConfig({
        TRIANGLE_ENTRY_MODE: "close_acceptance",
        TRIANGLE_CONFIRMATION_MAX_BARS: 2,
      }),
    });
    const history = makeAscendingTriangleCandles();
    const breakoutState = history.reduce(
      (_, candle) => engine.next(candle as any),
      engine.getState(),
    );

    expect(breakoutState.pattern).toBeNull();
    expect(breakoutState.pending?.pattern.kind).toBe("ascending_triangle");

    const confirmation = makeCandle(10, 111, 112, 109.5, 111.2);
    const accepted = engine.next(confirmation as any);
    expect(accepted.pattern?.entryStage).toBe("close_accepted");
    expect(accepted.pattern?.confirmationBars).toBe(1);

    expect(engine.next(confirmation as any)).toEqual(accepted);
    expect(
      engine.next(makeCandle(11, 111.2, 112.5, 110, 111.5) as any).pattern,
    ).toBeNull();
  });

  it("rebuilds a pending setup identically from initial candles", () => {
    const config = makeTriangleConfig({
      TRIANGLE_ENTRY_MODE: "close_acceptance",
    });
    const history = makeAscendingTriangleCandles();
    const confirmation = makeCandle(10, 111, 112, 109.5, 111.2);
    const continuous = createTriangleEngine({ config });
    for (const candle of history) continuous.next(candle as any);
    const continuousState = continuous.next(confirmation as any);

    const restored = createTriangleEngine({
      config,
      initialCandles: history as any,
    });
    expect(restored.next(confirmation as any)).toEqual(continuousState);
  });

  it("enters after a retest touches and holds the broken boundary", () => {
    const engine = createTriangleEngine({
      config: makeTriangleConfig({
        TRIANGLE_ENTRY_MODE: "retest",
        TRIANGLE_RETEST_TOLERANCE_ATR: 0.25,
      }),
    });
    const history = makeAscendingTriangleCandles();
    for (const candle of history) engine.next(candle as any);

    const retest = engine.next(
      makeCandle(10, 110.5, 111.5, 109.8, 111.2) as any,
    );

    expect(retest.pattern?.entryStage).toBe("retest_held");
    expect(retest.pattern?.confirmationBars).toBe(1);
  });

  it("keeps its candle buffer bounded", () => {
    const engine = createTriangleEngine({ config: makeTriangleConfig() });
    let state = engine.getState();
    for (let index = 0; index < 100; index += 1) {
      state = engine.next(makeCandle(index, 100, 101, 99, 100) as any);
    }

    expect(state.bufferedCandles).toBeLessThanOrEqual(11);
  });
});
