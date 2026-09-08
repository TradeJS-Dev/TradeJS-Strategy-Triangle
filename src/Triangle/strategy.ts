import { createCostIsolatedStrategyConfigParser } from "@tradejs/strategy-kit/config";
import type { ValidatedStrategyRegistryEntry } from "@tradejs/strategy-kit/config";
import { config as DEFAULT_CONFIG, TriangleConfig } from "./config";
import { createTriangleCore } from "./core";
import { triangleManifest } from "./manifest";

export const TriangleStrategyDefinition: ValidatedStrategyRegistryEntry<TriangleConfig> =
  {
    defaults: DEFAULT_CONFIG,
    parseConfig: createCostIsolatedStrategyConfigParser({
      strategyName: "Triangle",
      defaults: DEFAULT_CONFIG,
    }),
    createCore: createTriangleCore,
    manifest: triangleManifest,
  };
