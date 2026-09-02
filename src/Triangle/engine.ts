import { Candle, Direction } from "@tradejs/types";
import { TriangleConfig, TriangleEntryMode } from "./config";

export type TrianglePatternKind =
  "ascending_triangle" | "descending_triangle" | "symmetric_triangle";
export type TriangleEntryStage = "breakout" | "close_accepted" | "retest_held";

export interface TriangleBoundaryPivot {
  timestamp: number;
  index: number;
  value: number;
  kind: "high" | "low";
}

export interface TrianglePattern {
  setupId: string;
  kind: TrianglePatternKind;
  direction: Direction;
  entryMode: TriangleEntryMode;
  entryStage: TriangleEntryStage;
  upperPivots: TriangleBoundaryPivot[];
  lowerPivots: TriangleBoundaryPivot[];
  patternStartTimestamp: number;
  patternEndTimestamp: number;
  patternBars: number;
  upperBoundaryStart: number;
  upperBoundaryEnd: number;
  upperBoundaryAtBreakout: number;
  lowerBoundaryStart: number;
  lowerBoundaryEnd: number;
  lowerBoundaryAtBreakout: number;
  upperSlope: number;
  lowerSlope: number;
  upperSlopePctPerBar: number;
  lowerSlopePctPerBar: number;
  upperR2: number;
  lowerR2: number;
  upperTouchErrorAtr: number;
  lowerTouchErrorAtr: number;
  startWidth: number;
  endWidth: number;
  breakoutWidth: number;
  contractionRatio: number;
  symmetryRatio: number | null;
  patternHeight: number;
  patternHeightPct: number;
  patternHeightAtr: number;
  apexBarsAfterBreakout: number;
  breakoutDistanceAtr: number;
  atr: number;
  targetPrice: number;
  stopLossPrice: number;
  breakoutTimestamp: number;
  breakoutPrice: number;
  confirmationBars: number;
  timestamp: number;
  close: number;
}

export interface TrianglePendingSetup {
  setupId: string;
  mode: Exclude<TriangleEntryMode, "breakout">;
  breakoutIndex: number;
  pattern: TrianglePattern;
}

export interface TriangleRuntimeState {
  pattern: TrianglePattern | null;
  pending: TrianglePendingSetup | null;
  bufferedCandles: number;
}

interface IndexedCandle {
  index: number;
  candle: Candle;
}

interface RegressionLine {
  intercept: number;
  slope: number;
  r2: number;
}

interface EngineState {
  candles: IndexedCandle[];
  currentIndex: number;
  pattern: TrianglePattern | null;
  pending: TrianglePendingSetup | null;
  consumedSetupIds: Set<string>;
  consumedSetupOrder: string[];
  lastTimestamp: number | null;
}

interface TriangleEngineOptions {
  atrPeriod: number;
  minPatternBars: number;
  maxPatternBars: number;
  pivotRadius: number;
  minTouchesPerBoundary: number;
  minTouchSpanBars: number;
  minHeightPct: number;
  minHeightAtr: number;
  maxTouchErrorAtr: number;
  maxBoundaryViolationAtr: number;
  maxFlatSlopePctPerBar: number;
  minConvergingSlopePctPerBar: number;
  minSymmetryRatio: number;
  maxEndWidthRatio: number;
  maxApexAfterBreakoutBars: number;
  breakoutBufferAtr: number;
  maxBreakoutDistanceAtr: number;
  allowReverseBreakouts: boolean;
  targetHeightRatio: number;
  stopBufferAtr: number;
  entryMode: TriangleEntryMode;
  confirmationMaxBars: number;
  retestMaxBars: number;
  retestToleranceAtr: number;
}

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const positiveNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

const nonNegativeNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const positiveInteger = (value: unknown, fallback: number) =>
  Math.max(1, Math.floor(positiveNumber(value, fallback)));

const getOptions = (config: TriangleConfig): TriangleEngineOptions => {
  const minPatternBars = Math.max(
    4,
    positiveInteger(config.TRIANGLE_MIN_BARS, 8),
  );
  const maxPatternBars = Math.max(
    minPatternBars,
    positiveInteger(config.TRIANGLE_MAX_BARS, 60),
  );

  return {
    atrPeriod: Math.max(2, positiveInteger(config.TRIANGLE_ATR_PERIOD, 14)),
    minPatternBars,
    maxPatternBars,
    pivotRadius: positiveInteger(config.TRIANGLE_PIVOT_RADIUS, 1),
    minTouchesPerBoundary: Math.max(
      2,
      positiveInteger(config.TRIANGLE_MIN_TOUCHES_PER_BOUNDARY, 2),
    ),
    minTouchSpanBars: positiveInteger(config.TRIANGLE_MIN_TOUCH_SPAN_BARS, 3),
    minHeightPct: nonNegativeNumber(config.TRIANGLE_MIN_HEIGHT_PCT, 0.5),
    minHeightAtr: nonNegativeNumber(config.TRIANGLE_MIN_HEIGHT_ATR, 2),
    maxTouchErrorAtr: nonNegativeNumber(
      config.TRIANGLE_MAX_TOUCH_ERROR_ATR,
      0.35,
    ),
    maxBoundaryViolationAtr: nonNegativeNumber(
      config.TRIANGLE_MAX_BOUNDARY_VIOLATION_ATR,
      0.3,
    ),
    maxFlatSlopePctPerBar: nonNegativeNumber(
      config.TRIANGLE_MAX_FLAT_SLOPE_PCT_PER_BAR,
      0.03,
    ),
    minConvergingSlopePctPerBar: nonNegativeNumber(
      config.TRIANGLE_MIN_CONVERGING_SLOPE_PCT_PER_BAR,
      0.02,
    ),
    minSymmetryRatio: Math.min(
      1,
      nonNegativeNumber(config.TRIANGLE_MIN_SYMMETRY_RATIO, 0.5),
    ),
    maxEndWidthRatio: Math.min(
      1,
      nonNegativeNumber(config.TRIANGLE_MAX_END_WIDTH_RATIO, 0.8),
    ),
    maxApexAfterBreakoutBars: positiveInteger(
      config.TRIANGLE_MAX_APEX_AFTER_BREAKOUT_BARS,
      60,
    ),
    breakoutBufferAtr: nonNegativeNumber(
      config.TRIANGLE_BREAKOUT_BUFFER_ATR,
      0.05,
    ),
    maxBreakoutDistanceAtr: nonNegativeNumber(
      config.TRIANGLE_MAX_BREAKOUT_DISTANCE_ATR,
      1.5,
    ),
    allowReverseBreakouts: Boolean(config.TRIANGLE_ALLOW_REVERSE_BREAKOUTS),
    targetHeightRatio: nonNegativeNumber(
      config.TRIANGLE_TARGET_HEIGHT_RATIO,
      1,
    ),
    stopBufferAtr: nonNegativeNumber(config.TRIANGLE_STOP_BUFFER_ATR, 0.25),
    entryMode: config.TRIANGLE_ENTRY_MODE ?? "close_acceptance",
    confirmationMaxBars: positiveInteger(
      config.TRIANGLE_CONFIRMATION_MAX_BARS,
      2,
    ),
    retestMaxBars: positiveInteger(config.TRIANGLE_RETEST_MAX_BARS, 4),
    retestToleranceAtr: nonNegativeNumber(
      config.TRIANGLE_RETEST_TOLERANCE_ATR,
      0.25,
    ),
  };
};

const calculateAtr = (
  candles: IndexedCandle[],
  period: number,
): number | null => {
  const relevant = candles.slice(-(period + 1));
  if (relevant.length < 2) return null;

  const trueRanges: number[] = [];
  for (let index = 1; index < relevant.length; index += 1) {
    const current = relevant[index]?.candle;
    const previous = relevant[index - 1]?.candle;
    const high = asNumber(current?.high);
    const low = asNumber(current?.low);
    const previousClose = asNumber(previous?.close);
    if (high == null || low == null || previousClose == null) continue;
    trueRanges.push(
      Math.max(
        high - low,
        Math.abs(high - previousClose),
        Math.abs(low - previousClose),
      ),
    );
  }

  if (trueRanges.length === 0) return null;
  return trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length;
};

const regress = (
  points: Array<{ x: number; value: number }>,
): RegressionLine => {
  const count = points.length;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / count;
  const meanY = points.reduce((sum, point) => sum + point.value, 0) / count;
  const covariance = points.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.value - meanY),
    0,
  );
  const varianceX = points.reduce(
    (sum, point) => sum + (point.x - meanX) ** 2,
    0,
  );
  const slope = varianceX > 0 ? covariance / varianceX : 0;
  const intercept = meanY - slope * meanX;
  const totalVariance = points.reduce(
    (sum, point) => sum + (point.value - meanY) ** 2,
    0,
  );
  const residualVariance = points.reduce(
    (sum, point) => sum + (point.value - (intercept + slope * point.x)) ** 2,
    0,
  );
  const r2 =
    totalVariance <= Number.EPSILON
      ? residualVariance <= Number.EPSILON
        ? 1
        : 0
      : Math.max(0, Math.min(1, 1 - residualVariance / totalVariance));

  return { intercept, slope, r2 };
};

const lineValue = (line: RegressionLine, x: number) =>
  line.intercept + line.slope * x;

const findBoundaryPivots = ({
  candles,
  radius,
  kind,
}: {
  candles: IndexedCandle[];
  radius: number;
  kind: TriangleBoundaryPivot["kind"];
}): Array<TriangleBoundaryPivot & { x: number }> => {
  const result: Array<TriangleBoundaryPivot & { x: number }> = [];

  for (let index = radius; index < candles.length - radius; index += 1) {
    const current = candles[index];
    const value = asNumber(
      kind === "high" ? current?.candle.high : current?.candle.low,
    );
    if (!current || value == null) continue;

    const neighbors: number[] = [];
    const start = index - radius;
    const end = index + radius;
    for (let neighborIndex = start; neighborIndex <= end; neighborIndex += 1) {
      if (neighborIndex === index) continue;
      const neighbor = candles[neighborIndex];
      const neighborValue = asNumber(
        kind === "high" ? neighbor?.candle.high : neighbor?.candle.low,
      );
      if (neighborValue != null) neighbors.push(neighborValue);
    }
    if (neighbors.length === 0) continue;

    const isExtreme =
      kind === "high"
        ? neighbors.every((neighbor) => value >= neighbor) &&
          neighbors.some((neighbor) => value > neighbor)
        : neighbors.every((neighbor) => value <= neighbor) &&
          neighbors.some((neighbor) => value < neighbor);
    if (!isExtreme) continue;

    result.push({
      timestamp: current.candle.timestamp,
      index: current.index,
      value,
      kind,
      x: index,
    });
  }

  return result;
};

const maxTouchErrorAtr = (
  pivots: Array<TriangleBoundaryPivot & { x: number }>,
  line: RegressionLine,
  atr: number,
) =>
  Math.max(
    ...pivots.map((pivot) => Math.abs(pivot.value - lineValue(line, pivot.x))),
  ) / atr;

const hasAcceptableBoundaryContainment = ({
  candles,
  upperLine,
  lowerLine,
  tolerance,
}: {
  candles: IndexedCandle[];
  upperLine: RegressionLine;
  lowerLine: RegressionLine;
  tolerance: number;
}) =>
  candles.every(({ candle }, index) => {
    const high = asNumber(candle.high);
    const low = asNumber(candle.low);
    if (high == null || low == null) return false;
    return (
      high <= lineValue(upperLine, index) + tolerance &&
      low >= lineValue(lowerLine, index) - tolerance
    );
  });

const classifyTriangle = ({
  upperSlopePctPerBar,
  lowerSlopePctPerBar,
  options,
}: {
  upperSlopePctPerBar: number;
  lowerSlopePctPerBar: number;
  options: TriangleEngineOptions;
}): { kind: TrianglePatternKind; symmetryRatio: number | null } | null => {
  const upperMagnitude = Math.abs(upperSlopePctPerBar);
  const lowerMagnitude = Math.abs(lowerSlopePctPerBar);
  const symmetric =
    upperSlopePctPerBar <= -options.minConvergingSlopePctPerBar &&
    lowerSlopePctPerBar >= options.minConvergingSlopePctPerBar;
  const symmetryRatio =
    symmetric && Math.max(upperMagnitude, lowerMagnitude) > 0
      ? Math.min(upperMagnitude, lowerMagnitude) /
        Math.max(upperMagnitude, lowerMagnitude)
      : null;
  if (symmetric && (symmetryRatio ?? 0) >= options.minSymmetryRatio) {
    return { kind: "symmetric_triangle", symmetryRatio };
  }

  if (
    upperMagnitude <= options.maxFlatSlopePctPerBar &&
    lowerSlopePctPerBar >= options.minConvergingSlopePctPerBar
  ) {
    return { kind: "ascending_triangle", symmetryRatio: null };
  }

  if (
    lowerMagnitude <= options.maxFlatSlopePctPerBar &&
    upperSlopePctPerBar <= -options.minConvergingSlopePctPerBar
  ) {
    return { kind: "descending_triangle", symmetryRatio: null };
  }

  return null;
};

const rememberConsumedSetup = (state: EngineState, setupId: string) => {
  if (state.consumedSetupIds.has(setupId)) return;
  state.consumedSetupIds.add(setupId);
  state.consumedSetupOrder.push(setupId);
  if (state.consumedSetupOrder.length > 64) {
    const oldest = state.consumedSetupOrder.shift();
    if (oldest) state.consumedSetupIds.delete(oldest);
  }
};

const buildCandidate = ({
  state,
  current,
  atr,
  patternBars,
  options,
}: {
  state: EngineState;
  current: IndexedCandle;
  atr: number;
  patternBars: number;
  options: TriangleEngineOptions;
}): TrianglePattern | null => {
  const prior = state.candles.slice(0, -1);
  const patternCandles = prior.slice(-patternBars);
  if (patternCandles.length !== patternBars) return null;

  const firstCandle = patternCandles[0];
  const lastCandle = patternCandles[patternCandles.length - 1];
  const previousClose = asNumber(lastCandle?.candle.close);
  const currentClose = asNumber(current.candle.close);
  if (
    !firstCandle ||
    !lastCandle ||
    previousClose == null ||
    currentClose == null
  )
    return null;

  const upperPivotsWithX = findBoundaryPivots({
    candles: patternCandles,
    radius: options.pivotRadius,
    kind: "high",
  });
  const lowerPivotsWithX = findBoundaryPivots({
    candles: patternCandles,
    radius: options.pivotRadius,
    kind: "low",
  });
  if (
    upperPivotsWithX.length < options.minTouchesPerBoundary ||
    lowerPivotsWithX.length < options.minTouchesPerBoundary
  ) {
    return null;
  }

  const upperTouchSpan =
    upperPivotsWithX[upperPivotsWithX.length - 1]!.x - upperPivotsWithX[0]!.x;
  const lowerTouchSpan =
    lowerPivotsWithX[lowerPivotsWithX.length - 1]!.x - lowerPivotsWithX[0]!.x;
  if (
    upperTouchSpan < options.minTouchSpanBars ||
    lowerTouchSpan < options.minTouchSpanBars
  ) {
    return null;
  }

  const upperLine = regress(upperPivotsWithX);
  const lowerLine = regress(lowerPivotsWithX);
  const upperTouchErrorAtr = maxTouchErrorAtr(upperPivotsWithX, upperLine, atr);
  const lowerTouchErrorAtr = maxTouchErrorAtr(lowerPivotsWithX, lowerLine, atr);
  if (
    upperTouchErrorAtr > options.maxTouchErrorAtr ||
    lowerTouchErrorAtr > options.maxTouchErrorAtr
  ) {
    return null;
  }

  const breakoutX = patternBars;
  const lastPatternX = patternBars - 1;
  const upperBoundaryStart = lineValue(upperLine, 0);
  const upperBoundaryEnd = lineValue(upperLine, lastPatternX);
  const upperBoundaryAtBreakout = lineValue(upperLine, breakoutX);
  const lowerBoundaryStart = lineValue(lowerLine, 0);
  const lowerBoundaryEnd = lineValue(lowerLine, lastPatternX);
  const lowerBoundaryAtBreakout = lineValue(lowerLine, breakoutX);
  const startWidth = upperBoundaryStart - lowerBoundaryStart;
  const endWidth = upperBoundaryEnd - lowerBoundaryEnd;
  const breakoutWidth = upperBoundaryAtBreakout - lowerBoundaryAtBreakout;
  if (startWidth <= 0 || endWidth <= 0 || breakoutWidth <= 0) return null;

  const contractionRatio = endWidth / startWidth;
  if (contractionRatio > options.maxEndWidthRatio) return null;

  const referencePrice = Math.abs(
    (upperBoundaryStart + lowerBoundaryStart) / 2,
  );
  if (referencePrice <= Number.EPSILON) return null;
  const upperSlopePctPerBar = (upperLine.slope / referencePrice) * 100;
  const lowerSlopePctPerBar = (lowerLine.slope / referencePrice) * 100;
  const classification = classifyTriangle({
    upperSlopePctPerBar,
    lowerSlopePctPerBar,
    options,
  });
  if (!classification) return null;

  const convergencePerBar = lowerLine.slope - upperLine.slope;
  if (convergencePerBar <= Number.EPSILON) return null;
  const apexX = startWidth / convergencePerBar;
  const apexBarsAfterBreakout = apexX - breakoutX;
  if (
    apexBarsAfterBreakout < 0 ||
    apexBarsAfterBreakout > options.maxApexAfterBreakoutBars
  ) {
    return null;
  }

  const patternHeight = startWidth;
  const patternHeightPct = (patternHeight / referencePrice) * 100;
  const patternHeightAtr = patternHeight / atr;
  if (
    patternHeightPct < options.minHeightPct ||
    patternHeightAtr < options.minHeightAtr
  ) {
    return null;
  }

  if (
    !hasAcceptableBoundaryContainment({
      candles: patternCandles,
      upperLine,
      lowerLine,
      tolerance: atr * options.maxBoundaryViolationAtr,
    })
  ) {
    return null;
  }

  const breakoutBuffer = atr * options.breakoutBufferAtr;
  const previousInside =
    previousClose <= upperBoundaryEnd + breakoutBuffer &&
    previousClose >= lowerBoundaryEnd - breakoutBuffer;
  if (!previousInside) return null;

  let direction: Direction | null = null;
  let breakoutBoundary = 0;
  let oppositeBoundary = 0;
  const mayBreakUp =
    classification.kind !== "descending_triangle" ||
    options.allowReverseBreakouts;
  const mayBreakDown =
    classification.kind !== "ascending_triangle" ||
    options.allowReverseBreakouts;
  if (mayBreakUp && currentClose > upperBoundaryAtBreakout + breakoutBuffer) {
    direction = "LONG";
    breakoutBoundary = upperBoundaryAtBreakout;
    oppositeBoundary = lowerBoundaryAtBreakout;
  } else if (
    mayBreakDown &&
    currentClose < lowerBoundaryAtBreakout - breakoutBuffer
  ) {
    direction = "SHORT";
    breakoutBoundary = lowerBoundaryAtBreakout;
    oppositeBoundary = upperBoundaryAtBreakout;
  }
  if (!direction) return null;

  const breakoutDistanceAtr = Math.abs(currentClose - breakoutBoundary) / atr;
  if (
    options.maxBreakoutDistanceAtr > 0 &&
    breakoutDistanceAtr > options.maxBreakoutDistanceAtr
  ) {
    return null;
  }

  const firstUpper = upperPivotsWithX[0]!;
  const lastUpper = upperPivotsWithX[upperPivotsWithX.length - 1]!;
  const firstLower = lowerPivotsWithX[0]!;
  const lastLower = lowerPivotsWithX[lowerPivotsWithX.length - 1]!;
  const setupId = [
    classification.kind,
    direction,
    firstUpper.timestamp,
    lastUpper.timestamp,
    firstLower.timestamp,
    lastLower.timestamp,
  ].join(":");
  if (state.consumedSetupIds.has(setupId)) return null;

  const sign = direction === "LONG" ? 1 : -1;
  const targetPrice =
    breakoutBoundary + sign * patternHeight * options.targetHeightRatio;
  const stopLossPrice = oppositeBoundary - sign * atr * options.stopBufferAtr;

  return {
    setupId,
    kind: classification.kind,
    direction,
    entryMode: options.entryMode,
    entryStage: "breakout",
    upperPivots: upperPivotsWithX.map(({ x: _x, ...pivot }) => pivot),
    lowerPivots: lowerPivotsWithX.map(({ x: _x, ...pivot }) => pivot),
    patternStartTimestamp: firstCandle.candle.timestamp,
    patternEndTimestamp: lastCandle.candle.timestamp,
    patternBars,
    upperBoundaryStart,
    upperBoundaryEnd,
    upperBoundaryAtBreakout,
    lowerBoundaryStart,
    lowerBoundaryEnd,
    lowerBoundaryAtBreakout,
    upperSlope: upperLine.slope,
    lowerSlope: lowerLine.slope,
    upperSlopePctPerBar,
    lowerSlopePctPerBar,
    upperR2: upperLine.r2,
    lowerR2: lowerLine.r2,
    upperTouchErrorAtr,
    lowerTouchErrorAtr,
    startWidth,
    endWidth,
    breakoutWidth,
    contractionRatio,
    symmetryRatio: classification.symmetryRatio,
    patternHeight,
    patternHeightPct,
    patternHeightAtr,
    apexBarsAfterBreakout,
    breakoutDistanceAtr,
    atr,
    targetPrice,
    stopLossPrice,
    breakoutTimestamp: current.candle.timestamp,
    breakoutPrice: currentClose,
    confirmationBars: 0,
    timestamp: current.candle.timestamp,
    close: currentClose,
  };
};

const detectBreakout = ({
  state,
  current,
  atr,
  options,
}: {
  state: EngineState;
  current: IndexedCandle;
  atr: number;
  options: TriangleEngineOptions;
}): TrianglePattern | null => {
  const candidates: TrianglePattern[] = [];
  for (
    let patternBars = options.minPatternBars;
    patternBars <= options.maxPatternBars;
    patternBars += 1
  ) {
    const candidate = buildCandidate({
      state,
      current,
      atr,
      patternBars,
      options,
    });
    if (candidate) candidates.push(candidate);
  }

  candidates.sort((left, right) => {
    const leftScore =
      left.patternBars +
      (left.upperPivots.length + left.lowerPivots.length) * 3 +
      Math.min(left.upperR2, left.lowerR2) * 2 -
      (left.upperTouchErrorAtr + left.lowerTouchErrorAtr);
    const rightScore =
      right.patternBars +
      (right.upperPivots.length + right.lowerPivots.length) * 3 +
      Math.min(right.upperR2, right.lowerR2) * 2 -
      (right.upperTouchErrorAtr + right.lowerTouchErrorAtr);
    return rightScore - leftScore;
  });

  return candidates[0] ?? null;
};

const resolvePending = ({
  state,
  current,
  atr,
  options,
}: {
  state: EngineState;
  current: IndexedCandle;
  atr: number;
  options: TriangleEngineOptions;
}): TrianglePattern | null => {
  const pending = state.pending;
  if (!pending) return null;
  const confirmationBars = current.index - pending.breakoutIndex;
  if (confirmationBars < 1) return null;

  const close = asNumber(current.candle.close);
  const high = asNumber(current.candle.high);
  const low = asNumber(current.candle.low);
  if (close == null || high == null || low == null) return null;

  const pattern = pending.pattern;
  const maxBars =
    pending.mode === "retest"
      ? options.retestMaxBars
      : options.confirmationMaxBars;
  const invalidated =
    pattern.direction === "LONG"
      ? low <= pattern.stopLossPrice
      : high >= pattern.stopLossPrice;
  if (invalidated || confirmationBars > maxBars) {
    rememberConsumedSetup(state, pattern.setupId);
    state.pending = null;
    return null;
  }

  const upperBoundary =
    pattern.upperBoundaryAtBreakout + pattern.upperSlope * confirmationBars;
  const lowerBoundary =
    pattern.lowerBoundaryAtBreakout + pattern.lowerSlope * confirmationBars;
  const breakoutBoundary =
    pattern.direction === "LONG" ? upperBoundary : lowerBoundary;
  const breakoutBuffer = atr * options.breakoutBufferAtr;
  const closeAccepted =
    pattern.direction === "LONG"
      ? close >= breakoutBoundary + breakoutBuffer
      : close <= breakoutBoundary - breakoutBuffer;

  let entryStage: TriangleEntryStage | null = null;
  if (pending.mode === "close_acceptance") {
    if (closeAccepted) entryStage = "close_accepted";
  } else {
    const tolerance = atr * options.retestToleranceAtr;
    const retestTouched =
      low <= breakoutBoundary + tolerance &&
      high >= breakoutBoundary - tolerance;
    if (retestTouched && closeAccepted) entryStage = "retest_held";
  }
  if (!entryStage) return null;

  rememberConsumedSetup(state, pattern.setupId);
  state.pending = null;
  return {
    ...pattern,
    entryStage,
    confirmationBars,
    timestamp: current.candle.timestamp,
    close,
  };
};

const clonePattern = (
  pattern: TrianglePattern | null,
): TrianglePattern | null =>
  pattern
    ? {
        ...pattern,
        upperPivots: pattern.upperPivots.map((pivot) => ({ ...pivot })),
        lowerPivots: pattern.lowerPivots.map((pivot) => ({ ...pivot })),
      }
    : null;

const clonePending = (
  pending: TrianglePendingSetup | null,
): TrianglePendingSetup | null =>
  pending
    ? {
        ...pending,
        pattern: clonePattern(pending.pattern)!,
      }
    : null;

export const buildTriangleSignalContext = (pattern: TrianglePattern) => ({
  setupId: pattern.setupId,
  patternKind: pattern.kind,
  signalDirection: pattern.direction,
  entryMode: pattern.entryMode,
  entryStage: pattern.entryStage,
  patternBars: pattern.patternBars,
  upperSlopePctPerBar: pattern.upperSlopePctPerBar,
  lowerSlopePctPerBar: pattern.lowerSlopePctPerBar,
  upperR2: pattern.upperR2,
  lowerR2: pattern.lowerR2,
  upperTouchErrorAtr: pattern.upperTouchErrorAtr,
  lowerTouchErrorAtr: pattern.lowerTouchErrorAtr,
  startWidth: pattern.startWidth,
  endWidth: pattern.endWidth,
  breakoutWidth: pattern.breakoutWidth,
  contractionRatio: pattern.contractionRatio,
  symmetryRatio: pattern.symmetryRatio,
  patternHeight: pattern.patternHeight,
  patternHeightPct: pattern.patternHeightPct,
  patternHeightAtr: pattern.patternHeightAtr,
  apexBarsAfterBreakout: pattern.apexBarsAfterBreakout,
  breakoutDistanceAtr: pattern.breakoutDistanceAtr,
  atr: pattern.atr,
  stopDistanceAtr:
    pattern.atr > 0
      ? Math.abs(pattern.close - pattern.stopLossPrice) / pattern.atr
      : null,
  targetPrice: pattern.targetPrice,
  stopLossPrice: pattern.stopLossPrice,
  breakoutTimestamp: pattern.breakoutTimestamp,
  breakoutPrice: pattern.breakoutPrice,
  confirmationBars: pattern.confirmationBars,
  currentPrice: pattern.close,
  boundaries: {
    upper: {
      start: pattern.upperBoundaryStart,
      end: pattern.upperBoundaryEnd,
      breakout: pattern.upperBoundaryAtBreakout,
      slope: pattern.upperSlope,
    },
    lower: {
      start: pattern.lowerBoundaryStart,
      end: pattern.lowerBoundaryEnd,
      breakout: pattern.lowerBoundaryAtBreakout,
      slope: pattern.lowerSlope,
    },
  },
  upperPivots: pattern.upperPivots,
  lowerPivots: pattern.lowerPivots,
});

export type TriangleSignalContext = ReturnType<
  typeof buildTriangleSignalContext
>;

export const createTriangleEngine = ({
  config,
  initialCandles = [],
}: {
  config: TriangleConfig;
  initialCandles?: Candle[];
}): {
  next: (candle: Candle) => TriangleRuntimeState;
  getState: () => TriangleRuntimeState;
} => {
  const options = getOptions(config);
  const maxCandles = Math.max(
    options.atrPeriod + 1,
    options.maxPatternBars + 2,
  );
  const state: EngineState = {
    candles: [],
    currentIndex: -1,
    pattern: null,
    pending: null,
    consumedSetupIds: new Set(),
    consumedSetupOrder: [],
    lastTimestamp: null,
  };

  const snapshot = (): TriangleRuntimeState => ({
    pattern: clonePattern(state.pattern),
    pending: clonePending(state.pending),
    bufferedCandles: state.candles.length,
  });

  const apply = (candle: Candle): TriangleRuntimeState => {
    if (state.lastTimestamp === candle.timestamp) return snapshot();
    state.lastTimestamp = candle.timestamp;
    state.pattern = null;
    state.currentIndex += 1;
    const current: IndexedCandle = { index: state.currentIndex, candle };
    state.candles.push(current);
    if (state.candles.length > maxCandles) {
      state.candles.splice(0, state.candles.length - maxCandles);
    }

    const atr = calculateAtr(state.candles.slice(0, -1), options.atrPeriod);
    if (atr == null || atr <= 0) return snapshot();

    const pendingPattern = resolvePending({ state, current, atr, options });
    if (pendingPattern) {
      state.pattern = pendingPattern;
      return snapshot();
    }
    if (state.pending) return snapshot();

    const breakout = detectBreakout({ state, current, atr, options });
    if (!breakout) return snapshot();
    if (options.entryMode === "breakout") {
      rememberConsumedSetup(state, breakout.setupId);
      state.pattern = breakout;
      return snapshot();
    }

    state.pending = {
      setupId: breakout.setupId,
      mode: options.entryMode,
      breakoutIndex: current.index,
      pattern: breakout,
    };
    return snapshot();
  };

  for (const candle of initialCandles) apply(candle);

  return { next: apply, getState: snapshot };
};
