import { triangleAiAdapter } from "../adapters/ai";

describe("triangleAiAdapter", () => {
  it("carries Triangle geometry into the AI payload and prompt", () => {
    const context = {
      patternKind: "ascending_triangle",
      signalDirection: "LONG",
      upperSlopePctPerBar: 0,
      lowerSlopePctPerBar: 0.2,
      contractionRatio: 0.4,
      upperPivots: [{ value: 110 }],
      lowerPivots: [{ value: 100 }],
    };
    const payload = triangleAiAdapter.buildPayload!({
      signal: { additionalIndicators: { triangleContext: context } },
      basePayload: {
        additionalIndicators: { baseContext: { available: true } },
      },
    } as any);

    expect((payload.additionalIndicators as any).triangleContext).toEqual(
      context,
    );
    expect((payload.additionalIndicators as any).baseContext).toEqual({
      available: true,
    });

    const prompt = triangleAiAdapter.buildHumanPromptAddon!({ payload } as any);
    expect(prompt).toContain("patternKind=ascending_triangle");
    expect(prompt).toContain("upperSlopePctPerBar=0");
    expect(prompt).toContain("contractionRatio=0.4");
  });
});
