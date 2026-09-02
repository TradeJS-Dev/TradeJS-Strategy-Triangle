import { mapAiRuntimeFromConfig } from "@tradejs/core/strategies";
import type { StrategyAiAdapter } from "@tradejs/types";
import type { TriangleConfig } from "../config";

export const triangleAiAdapter: StrategyAiAdapter = {
  buildPayload: ({ signal, basePayload }) => {
    const baseAdditional =
      (basePayload.additionalIndicators as
        Record<string, unknown> | undefined) ?? {};

    return {
      ...basePayload,
      additionalIndicators: {
        ...baseAdditional,
        triangleContext: (
          signal.additionalIndicators as Record<string, unknown> | undefined
        )?.triangleContext,
      },
    };
  },
  buildHumanPromptAddon: ({ payload }) => {
    const additional =
      (payload.additionalIndicators as Record<string, unknown> | undefined) ??
      {};
    const context =
      (additional.triangleContext as Record<string, unknown> | undefined) ?? {};

    return `
Additional Triangle context:
- patternKind=${String(context.patternKind ?? "n/a")}
- signalDirection=${String(context.signalDirection ?? "n/a")}
- entryStage=${String(context.entryStage ?? "n/a")}
- upperSlopePctPerBar=${String(context.upperSlopePctPerBar ?? "n/a")}
- lowerSlopePctPerBar=${String(context.lowerSlopePctPerBar ?? "n/a")}
- contractionRatio=${String(context.contractionRatio ?? "n/a")}
- symmetryRatio=${String(context.symmetryRatio ?? "n/a")}
- patternHeightAtr=${String(context.patternHeightAtr ?? "n/a")}
- apexBarsAfterBreakout=${String(context.apexBarsAfterBreakout ?? "n/a")}
- breakoutDistanceAtr=${String(context.breakoutDistanceAtr ?? "n/a")}
- targetPrice=${String(context.targetPrice ?? "n/a")}
- stopLossPrice=${String(context.stopLossPrice ?? "n/a")}
- upperPivots=${JSON.stringify(context.upperPivots ?? [])}
- lowerPivots=${JSON.stringify(context.lowerPivots ?? [])}

Interpretation rules for Triangle:
- An ascending triangle has approximately flat resistance and rising lows; its conventional breakout is above resistance.
- A descending triangle has approximately flat support and falling highs; its conventional breakout is below support.
- The actually broken boundary selects LONG or SHORT for every triangle kind, so reverse breakouts remain valid when enabled.
- A symmetric triangle has falling highs and rising lows without a preferred breakout direction.
- Boundary convergence and repeated touches validate geometry; they are not independent entry signals.
- Prefer a fresh breakout near the broken boundary and reject analysis that contradicts the signal direction.
`.trim();
  },
  mapEntryRuntimeFromConfig: (config) =>
    mapAiRuntimeFromConfig(
      config as Pick<
        TriangleConfig,
        "AI_ENABLED" | "AI_MODE" | "MIN_AI_QUALITY"
      >,
    ),
};
