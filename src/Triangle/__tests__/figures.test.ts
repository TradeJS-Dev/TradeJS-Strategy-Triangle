import { buildTriangleFigures } from "../figures";
import { TrianglePattern } from "../engine";

describe("Triangle figures", () => {
  it("renders both boundaries, target, stop, pivots and entry", () => {
    const pattern: TrianglePattern = {
      setupId: "ascending-triangle-1",
      kind: "ascending_triangle",
      direction: "LONG",
      entryMode: "close_acceptance",
      entryStage: "close_accepted",
      upperPivots: [
        { timestamp: 2, index: 1, value: 110, kind: "high" },
        { timestamp: 5, index: 4, value: 110, kind: "high" },
      ],
      lowerPivots: [
        { timestamp: 1, index: 0, value: 100, kind: "low" },
        { timestamp: 4, index: 3, value: 104, kind: "low" },
      ],
      patternStartTimestamp: 1,
      patternEndTimestamp: 8,
      patternBars: 8,
      upperBoundaryStart: 110,
      upperBoundaryEnd: 110,
      upperBoundaryAtBreakout: 110,
      lowerBoundaryStart: 100,
      lowerBoundaryEnd: 107,
      lowerBoundaryAtBreakout: 108,
      upperSlope: 0,
      lowerSlope: 1,
      upperSlopePctPerBar: 0,
      lowerSlopePctPerBar: 0.95,
      upperR2: 1,
      lowerR2: 1,
      upperTouchErrorAtr: 0,
      lowerTouchErrorAtr: 0,
      startWidth: 10,
      endWidth: 3,
      breakoutWidth: 2,
      contractionRatio: 0.3,
      symmetryRatio: null,
      patternHeight: 10,
      patternHeightPct: 9.5,
      patternHeightAtr: 4,
      apexBarsAfterBreakout: 2,
      breakoutDistanceAtr: 0.5,
      atr: 2.5,
      targetPrice: 120,
      stopLossPrice: 107.75,
      breakoutTimestamp: 9,
      breakoutPrice: 111,
      confirmationBars: 1,
      timestamp: 10,
      close: 111.5,
    };

    const figures = buildTriangleFigures({
      pattern,
      entryTimestamp: 10,
      entryPrice: 111.5,
    });

    expect(figures.lines).toHaveLength(4);
    expect(figures.points).toHaveLength(3);
    expect(figures.lines?.map((line) => line.kind)).toEqual([
      "triangle_ascending_triangle_upper_boundary",
      "triangle_ascending_triangle_lower_boundary",
      "triangle_target",
      "triangle_stop",
    ]);
    expect(figures.points?.[0]?.points).toHaveLength(2);
    expect(figures.points?.[1]?.points).toHaveLength(2);
  });
});
