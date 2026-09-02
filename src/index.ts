import { defineStrategyPlugin } from "@tradejs/core/config";
import type { ValidatedStrategyRegistryEntry } from "@tradejs/strategy-kit/config";
import type { StrategyConfig } from "@tradejs/types";
import { config as triangleDefaultConfig } from "./Triangle/config";
import { TriangleStrategyDefinition } from "./Triangle/strategy";

export const strategyEntries: ValidatedStrategyRegistryEntry<any>[] = [
  TriangleStrategyDefinition,
];

const defaultConfigs: Record<string, StrategyConfig> = {
  Triangle: triangleDefaultConfig,
};

export const getBuiltInStrategyDefaultConfig = (
  strategyName: string,
): StrategyConfig | undefined => defaultConfigs[strategyName];

export { TriangleStrategyDefinition } from "./Triangle/strategy";
export { triangleDefaultConfig };
export { triangleManifest } from "./Triangle/manifest";
export { triangleAiAdapter } from "./Triangle/adapters/ai";

export default defineStrategyPlugin({ strategyEntries });
