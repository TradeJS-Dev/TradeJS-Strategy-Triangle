import { round } from "@tradejs/core/math";
import {
  buildTradeEconomics,
  isStopLossOnCorrectSide,
} from "@tradejs/strategy-kit/risk";
import type {
  CreateStrategyCore,
  IndicatorsHistorySnapshot,
  Position,
} from "@tradejs/types";
import { TriangleConfig } from "./config";
import {
  buildTriangleSignalContext,
  createTriangleEngine,
  TrianglePattern,
} from "./engine";
import { buildTriangleFigures } from "./figures";

const isOpenPosition = (position: Position | null): position is Position =>
  Boolean(
    position &&
    typeof position.price === "number" &&
    Number.isFinite(position.price) &&
    typeof position.qty === "number" &&
    Number.isFinite(position.qty) &&
    position.qty > 0 &&
    (position.direction === "LONG" || position.direction === "SHORT"),
  );

const latestFiniteNumber = (value: unknown): number | null => {
  if (!Array.isArray(value)) return null;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const numeric = Number(value[index]);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
};

const readMaTrend = ({
  indicators,
  currentPrice,
  direction,
}: {
  indicators: IndicatorsHistorySnapshot | undefined;
  currentPrice: number;
  direction: "LONG" | "SHORT";
}) => {
  const snapshot = (indicators ?? {}) as unknown as Record<string, unknown>;
  const maFast = latestFiniteNumber(snapshot.maFast);
  const maSlow = latestFiniteNumber(snapshot.maSlow);
  const aligned =
    maFast != null &&
    maSlow != null &&
    (direction === "LONG"
      ? currentPrice >= maFast && maFast > maSlow
      : currentPrice <= maFast && maFast < maSlow);
  return { maFast, maSlow, aligned };
};

const buildTriangleStateKey = (config: TriangleConfig) =>
  JSON.stringify({
    atrPeriod: config.TRIANGLE_ATR_PERIOD,
    minBars: config.TRIANGLE_MIN_BARS,
    maxBars: config.TRIANGLE_MAX_BARS,
    pivotRadius: config.TRIANGLE_PIVOT_RADIUS,
    minTouchesPerBoundary: config.TRIANGLE_MIN_TOUCHES_PER_BOUNDARY,
    minTouchSpanBars: config.TRIANGLE_MIN_TOUCH_SPAN_BARS,
    minHeightPct: config.TRIANGLE_MIN_HEIGHT_PCT,
    minHeightAtr: config.TRIANGLE_MIN_HEIGHT_ATR,
    maxTouchErrorAtr: config.TRIANGLE_MAX_TOUCH_ERROR_ATR,
    maxBoundaryViolationAtr: config.TRIANGLE_MAX_BOUNDARY_VIOLATION_ATR,
    maxFlatSlopePctPerBar: config.TRIANGLE_MAX_FLAT_SLOPE_PCT_PER_BAR,
    minConvergingSlopePctPerBar:
      config.TRIANGLE_MIN_CONVERGING_SLOPE_PCT_PER_BAR,
    minSymmetryRatio: config.TRIANGLE_MIN_SYMMETRY_RATIO,
    maxEndWidthRatio: config.TRIANGLE_MAX_END_WIDTH_RATIO,
    maxApexAfterBreakoutBars: config.TRIANGLE_MAX_APEX_AFTER_BREAKOUT_BARS,
    breakoutBufferAtr: config.TRIANGLE_BREAKOUT_BUFFER_ATR,
    maxBreakoutDistanceAtr: config.TRIANGLE_MAX_BREAKOUT_DISTANCE_ATR,
    allowReverseBreakouts: config.TRIANGLE_ALLOW_REVERSE_BREAKOUTS,
    targetHeightRatio: config.TRIANGLE_TARGET_HEIGHT_RATIO,
    stopBufferAtr: config.TRIANGLE_STOP_BUFFER_ATR,
    minStopDistanceAtr: config.TRIANGLE_MIN_STOP_DISTANCE_ATR,
    trendFilter: config.TRIANGLE_TREND_FILTER,
    entryMode: config.TRIANGLE_ENTRY_MODE,
    confirmationMaxBars: config.TRIANGLE_CONFIRMATION_MAX_BARS,
    retestMaxBars: config.TRIANGLE_RETEST_MAX_BARS,
    retestToleranceAtr: config.TRIANGLE_RETEST_TOLERANCE_ATR,
  });

const entryCode = (pattern: TrianglePattern) => {
  const stage = pattern.entryStage.toUpperCase();
  const kind = pattern.kind.replace("_triangle", "").toUpperCase();
  return `TRIANGLE_${kind}_${pattern.direction}_${stage}`;
};

export const createTriangleCore: CreateStrategyCore<
  TriangleConfig,
  IndicatorsHistorySnapshot | undefined
> = async ({ config, data: initialData, strategyApi, indicatorsState }) => {
  const detectorState = strategyApi.createStateController<
    { engine: ReturnType<typeof createTriangleEngine> },
    ReturnType<ReturnType<typeof createTriangleEngine>["next"]>,
    ReturnType<ReturnType<typeof createTriangleEngine>["getState"]>
  >(
    "Triangle",
    () => ({
      engine: createTriangleEngine({
        config,
        initialCandles: initialData,
      }),
    }),
    {
      configKey: buildTriangleStateKey(config),
      snapshot: (state) => state.engine.getState(),
    },
  );
  const lastTradeController = strategyApi.createLastTradeController({
    enabled: true,
  });
  const nextDetectorState = (
    candle: Parameters<ReturnType<typeof createTriangleEngine>["next"]>[0],
  ) =>
    detectorState.oncePerTimestamp(candle.timestamp, (state) =>
      state.engine.next(candle),
    );

  return async (candle) => {
    const runtimeState = nextDetectorState(candle);
    const pattern = runtimeState.pattern;
    if (!pattern) return strategyApi.skip("NO_PATTERN");

    const position = await strategyApi.getCurrentPosition();
    if (isOpenPosition(position)) {
      const oppositePattern = position.direction !== pattern.direction;
      if (
        Boolean(config.TRIANGLE_EXIT_ON_OPPOSITE_PATTERN) &&
        oppositePattern
      ) {
        return strategyApi.exit({
          code: "TRIANGLE_OPPOSITE_PATTERN_EXIT",
          direction: position.direction,
        });
      }
      return strategyApi.skip("POSITION_EXISTS");
    }

    if (lastTradeController.isInCooldown(candle.timestamp)) {
      return strategyApi.skip("DEV_TRADE_COOLDOWN");
    }

    const modeConfig =
      pattern.direction === "LONG" ? config.LONG : config.SHORT;
    if (!modeConfig.enable) return strategyApi.skip("STRATEGY_DISABLED");

    const { timestamp, currentPrice } =
      await strategyApi.getDecisionPriceContext();
    const minimumStopDistance =
      pattern.atr * Math.max(0, Number(config.TRIANGLE_MIN_STOP_DISTANCE_ATR));
    const stopLossPrice =
      pattern.direction === "LONG"
        ? Math.min(pattern.stopLossPrice, currentPrice - minimumStopDistance)
        : Math.max(pattern.stopLossPrice, currentPrice + minimumStopDistance);
    const entryPattern =
      stopLossPrice === pattern.stopLossPrice
        ? pattern
        : { ...pattern, stopLossPrice, close: currentPrice };
    if (
      !isStopLossOnCorrectSide({
        direction: pattern.direction,
        currentPrice,
        stopLossPrice,
      })
    ) {
      return strategyApi.skip("INVALID_STOP");
    }

    const targetIsValid =
      pattern.direction === "LONG"
        ? pattern.targetPrice > currentPrice
        : pattern.targetPrice < currentPrice;
    if (!targetIsValid) return strategyApi.skip("TARGET_ALREADY_PASSED");

    const economics = buildTradeEconomics({
      entryPrice: currentPrice,
      stopLossPrice,
      takeProfitPrice: pattern.targetPrice,
      feeRate: Number(config.FEE_PERCENT ?? 0),
      slippageBps:
        Number(config.SLIPPAGE_BASE_BPS ?? 0) +
        Number(config.SLIPPAGE_MARKET_IMPACT_BPS ?? 0),
    });
    const qty =
      economics.lossPerUnit > 0
        ? Number(config.MAX_LOSS_VALUE ?? 0) / economics.lossPerUnit
        : 0;
    if (!qty || !Number.isFinite(qty) || qty <= 0) {
      return strategyApi.skip("INVALID_QTY");
    }

    const riskRatio = economics.netRiskRatio;
    if (riskRatio <= modeConfig.minRiskRatio) {
      return strategyApi.skip(`RISK_RATIO:${round(riskRatio)}`);
    }

    const indicators = indicatorsState.snapshot();
    const maTrend = readMaTrend({
      indicators,
      currentPrice,
      direction: pattern.direction,
    });
    if (config.TRIANGLE_TREND_FILTER === "ma_stack" && !maTrend.aligned) {
      return strategyApi.skip("TREND_FILTER_MISMATCH");
    }

    const signalContext = {
      ...buildTriangleSignalContext({ ...entryPattern, close: currentPrice }),
      minimumStopDistanceAtr: Math.max(
        0,
        Number(config.TRIANGLE_MIN_STOP_DISTANCE_ATR),
      ),
      trendFilter: config.TRIANGLE_TREND_FILTER,
      trendAligned: maTrend.aligned,
      maFast: maTrend.maFast,
      maSlow: maTrend.maSlow,
      executionEconomics: {
        grossRiskRatio: economics.grossRiskRatio,
        netRiskRatio: economics.netRiskRatio,
        lossPerUnit: economics.lossPerUnit,
        rewardPerUnit: economics.rewardPerUnit,
      },
    };
    lastTradeController.markTrade(timestamp);

    return strategyApi.entry({
      code: entryCode(pattern),
      direction: modeConfig.direction,
      indicators,
      additionalIndicators: { triangleContext: signalContext },
      figures: buildTriangleFigures({
        pattern: entryPattern,
        entryTimestamp: timestamp,
        entryPrice: currentPrice,
      }),
      orderPlan: {
        qty,
        stopLossPrice,
        takeProfits: [{ rate: 1, price: pattern.targetPrice }],
      },
    });
  };
};
