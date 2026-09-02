import {
  StrategyEntryModelFigures,
  StrategyFigureLine,
  StrategyFigurePoints,
} from "@tradejs/types";
import { TrianglePattern } from "./engine";

export const buildTriangleFigures = ({
  pattern,
  entryTimestamp,
  entryPrice,
}: {
  pattern: TrianglePattern;
  entryTimestamp: number;
  entryPrice: number;
}): StrategyEntryModelFigures => {
  const directionColor = pattern.direction === "LONG" ? "#22c55e" : "#ef4444";
  const upperBoundaryAtEntry =
    pattern.upperBoundaryAtBreakout +
    pattern.upperSlope * pattern.confirmationBars;
  const lowerBoundaryAtEntry =
    pattern.lowerBoundaryAtBreakout +
    pattern.lowerSlope * pattern.confirmationBars;

  const lines: StrategyFigureLine[] = [
    {
      id: `triangle-upper-${entryTimestamp}`,
      kind: `triangle_${pattern.kind}_upper_boundary`,
      points: [
        {
          timestamp: pattern.patternStartTimestamp,
          value: pattern.upperBoundaryStart,
        },
        { timestamp: entryTimestamp, value: upperBoundaryAtEntry },
      ],
      color: "#2563eb",
      width: 2,
      style: "solid",
    },
    {
      id: `triangle-lower-${entryTimestamp}`,
      kind: `triangle_${pattern.kind}_lower_boundary`,
      points: [
        {
          timestamp: pattern.patternStartTimestamp,
          value: pattern.lowerBoundaryStart,
        },
        { timestamp: entryTimestamp, value: lowerBoundaryAtEntry },
      ],
      color: "#2563eb",
      width: 2,
      style: "solid",
    },
    {
      id: `triangle-target-${entryTimestamp}`,
      kind: "triangle_target",
      points: [
        {
          timestamp: pattern.patternStartTimestamp,
          value: pattern.targetPrice,
        },
        { timestamp: entryTimestamp, value: pattern.targetPrice },
      ],
      color: "#22c55e",
      width: 1,
      style: "dashed",
    },
    {
      id: `triangle-stop-${entryTimestamp}`,
      kind: "triangle_stop",
      points: [
        {
          timestamp: pattern.patternStartTimestamp,
          value: pattern.stopLossPrice,
        },
        { timestamp: entryTimestamp, value: pattern.stopLossPrice },
      ],
      color: "#ef4444",
      width: 1,
      style: "dashed",
    },
  ];

  const points: StrategyFigurePoints[] = [
    {
      id: `triangle-upper-pivots-${entryTimestamp}`,
      kind: "triangle_upper_pivots",
      points: pattern.upperPivots.map(({ timestamp, value }) => ({
        timestamp,
        value,
      })),
      color: "#2563eb",
      radius: 4,
    },
    {
      id: `triangle-lower-pivots-${entryTimestamp}`,
      kind: "triangle_lower_pivots",
      points: pattern.lowerPivots.map(({ timestamp, value }) => ({
        timestamp,
        value,
      })),
      color: "#2563eb",
      radius: 4,
    },
    {
      id: `triangle-entry-${entryTimestamp}`,
      kind: "triangle_entry",
      points: [{ timestamp: entryTimestamp, value: entryPrice }],
      color: directionColor,
      radius: 5,
    },
  ];

  return { lines, points };
};
