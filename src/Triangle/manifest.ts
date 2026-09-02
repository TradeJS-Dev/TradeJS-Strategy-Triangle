import { StrategyManifest } from "@tradejs/types";
import { triangleAiAdapter } from "./adapters/ai";

export const triangleManifest: StrategyManifest = {
  name: "Triangle",
  aiAdapter: triangleAiAdapter,
};
