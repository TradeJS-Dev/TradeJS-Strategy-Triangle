import { FEE_PERCENT } from "@tradejs/core/constants";
import {
  BacktestPriceMode,
  Direction,
  Interval,
  StrategyConfig,
} from "@tradejs/types";

export interface TriangleSideConfig {
  enable: boolean;
  direction: Direction;
  minRiskRatio: number;
}

export type TriangleEntryMode = "breakout" | "close_acceptance" | "retest";

export const config = {
  ENV: "BACKTEST",
  INTERVAL: "15" as Interval,
  MAKE_ORDERS: true,
  CLOSE_OPPOSITE_POSITIONS: false,
  BACKTEST_PRICE_MODE: "open" as const,
  AI_ENABLED: false,
  AI_MODE: "llm" as const,
  ML_ENABLED: false,
  ML_THRESHOLD: 0.1,
  MIN_AI_QUALITY: 4,
  FEE_PERCENT,
  MAX_LOSS_VALUE: 10,
  MA_FAST: 14,
  MA_MEDIUM: 49,
  MA_SLOW: 50,
  OBV_SMA: 10,
  ATR: 14,
  ATR_PCT_SHORT: 7,
  ATR_PCT_LONG: 30,
  BB: 20,
  BB_STD: 2,
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,
  TRIANGLE_ATR_PERIOD: 14,
  TRIANGLE_MIN_BARS: 8,
  TRIANGLE_MAX_BARS: 60,
  TRIANGLE_PIVOT_RADIUS: 1,
  TRIANGLE_MIN_TOUCHES_PER_BOUNDARY: 2,
  TRIANGLE_MIN_TOUCH_SPAN_BARS: 3,
  TRIANGLE_MIN_HEIGHT_PCT: 0.5,
  TRIANGLE_MIN_HEIGHT_ATR: 2,
  TRIANGLE_MAX_TOUCH_ERROR_ATR: 0.35,
  TRIANGLE_MAX_BOUNDARY_VIOLATION_ATR: 0.3,
  TRIANGLE_MAX_FLAT_SLOPE_PCT_PER_BAR: 0.03,
  TRIANGLE_MIN_CONVERGING_SLOPE_PCT_PER_BAR: 0.02,
  TRIANGLE_MIN_SYMMETRY_RATIO: 0.5,
  TRIANGLE_MAX_END_WIDTH_RATIO: 0.8,
  TRIANGLE_MAX_APEX_AFTER_BREAKOUT_BARS: 60,
  TRIANGLE_BREAKOUT_BUFFER_ATR: 0.05,
  TRIANGLE_MAX_BREAKOUT_DISTANCE_ATR: 1.5,
  TRIANGLE_ALLOW_REVERSE_BREAKOUTS: true,
  TRIANGLE_TARGET_HEIGHT_RATIO: 1,
  TRIANGLE_STOP_BUFFER_ATR: 0.25,
  TRIANGLE_ENTRY_MODE: "close_acceptance" as TriangleEntryMode,
  TRIANGLE_CONFIRMATION_MAX_BARS: 2,
  TRIANGLE_RETEST_MAX_BARS: 4,
  TRIANGLE_RETEST_TOLERANCE_ATR: 0.25,
  TRIANGLE_EXIT_ON_OPPOSITE_PATTERN: true,
  LONG: {
    enable: true,
    direction: "LONG",
    minRiskRatio: 0.7,
  },
  SHORT: {
    enable: true,
    direction: "SHORT",
    minRiskRatio: 0.7,
  },
} as const;

export type TriangleConfig = StrategyConfig &
  Omit<
    typeof config,
    "BACKTEST_PRICE_MODE" | "LONG" | "SHORT" | "MIN_AI_QUALITY"
  > & {
    BACKTEST_PRICE_MODE: BacktestPriceMode;
    MIN_AI_QUALITY: number;
    TRIANGLE_ENTRY_MODE: TriangleEntryMode;
    LONG: TriangleSideConfig;
    SHORT: TriangleSideConfig;
  };
