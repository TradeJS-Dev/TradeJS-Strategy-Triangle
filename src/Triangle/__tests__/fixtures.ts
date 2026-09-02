import { config as DEFAULT_CONFIG } from "../config";

export const makeCandle = (
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
) => ({
  timestamp: 1_700_000_000_000 + index * 60_000,
  dt: new Date(1_700_000_000_000 + index * 60_000).toISOString(),
  open,
  high,
  low,
  close,
  volume: 1_000,
  turnover: close * 1_000,
});

export const makeTriangleConfig = (overrides: Record<string, unknown> = {}) =>
  ({
    ...DEFAULT_CONFIG,
    TRIANGLE_ATR_PERIOD: 3,
    TRIANGLE_MIN_BARS: 9,
    TRIANGLE_MAX_BARS: 9,
    TRIANGLE_PIVOT_RADIUS: 1,
    TRIANGLE_MIN_TOUCHES_PER_BOUNDARY: 2,
    TRIANGLE_MIN_TOUCH_SPAN_BARS: 2,
    TRIANGLE_MIN_HEIGHT_PCT: 0,
    TRIANGLE_MIN_HEIGHT_ATR: 0,
    TRIANGLE_MAX_TOUCH_ERROR_ATR: 1,
    TRIANGLE_MAX_BOUNDARY_VIOLATION_ATR: 1,
    TRIANGLE_MAX_FLAT_SLOPE_PCT_PER_BAR: 0.05,
    TRIANGLE_MIN_CONVERGING_SLOPE_PCT_PER_BAR: 0.01,
    TRIANGLE_MIN_SYMMETRY_RATIO: 0.5,
    TRIANGLE_MAX_END_WIDTH_RATIO: 0.9,
    TRIANGLE_MAX_APEX_AFTER_BREAKOUT_BARS: 60,
    TRIANGLE_BREAKOUT_BUFFER_ATR: 0,
    TRIANGLE_MAX_BREAKOUT_DISTANCE_ATR: 10,
    TRIANGLE_STOP_BUFFER_ATR: 0.1,
    TRIANGLE_ENTRY_MODE: "breakout",
    LONG: { ...DEFAULT_CONFIG.LONG, minRiskRatio: 0.5 },
    SHORT: { ...DEFAULT_CONFIG.SHORT, minRiskRatio: 0.5 },
    ...overrides,
  }) as any;

export const makeAscendingTriangleCandles = () => [
  makeCandle(0, 103, 106, 100, 104),
  makeCandle(1, 105, 108, 102, 107),
  makeCandle(2, 108, 110, 104, 109),
  makeCandle(3, 105, 107, 102.5, 104),
  makeCandle(4, 108, 110, 105, 109),
  makeCandle(5, 106, 108, 104.5, 106),
  makeCandle(6, 108, 110, 106, 109),
  makeCandle(7, 107, 109, 106.5, 108),
  makeCandle(8, 108, 108.5, 108, 108.25),
  makeCandle(9, 109.5, 112, 109, 111),
];

export const mirrorCandles = <
  T extends ReturnType<typeof makeAscendingTriangleCandles>,
>(
  candles: T,
) =>
  candles.map((candle) => ({
    ...candle,
    open: 220 - candle.open,
    high: 220 - candle.low,
    low: 220 - candle.high,
    close: 220 - candle.close,
    turnover: (220 - candle.close) * 1_000,
  }));

const symmetricBase = () => [
  makeCandle(0, 105, 112, 100, 106),
  makeCandle(1, 106, 110, 102, 108),
  makeCandle(2, 109, 111.5, 103, 110),
  makeCandle(3, 104, 108, 101.3, 103),
  makeCandle(4, 108, 110.3, 104, 109),
  makeCandle(5, 105, 107, 102.5, 105),
  makeCandle(6, 107, 109.1, 105, 108),
  makeCandle(7, 105, 106.5, 103.7, 105.5),
  makeCandle(8, 105.5, 106, 105, 105.5),
];

export const makeSymmetricTriangleLongCandles = () => [
  ...symmetricBase(),
  makeCandle(9, 106, 108.5, 105, 108),
];

export const makeSymmetricTriangleShortCandles = () => [
  ...symmetricBase(),
  makeCandle(9, 105, 106, 103.5, 104),
];
