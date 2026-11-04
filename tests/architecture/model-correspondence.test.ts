import { expect, test } from "vitest";
import { compareStateModels } from "../../scripts/ui/model-correspondence.mjs";

const model = {
  seed: () => ({ phase: 0 }),
  reduce: (state: { phase: number }) => ({
    phase: Math.min(3, state.phase + 1),
  }),
};
test("model correspondence finds drift reached through several transitions", () => {
  const candidate = {
    ...model,
    reduce: (state: { phase: number }) => ({
      phase: state.phase === 2 ? 4 : Math.min(3, state.phase + 1),
    }),
  };
  const result = compareStateModels({
    original: model,
    candidate,
    scenarios: ["A01"],
    events: [{ type: "advance" }],
  });
  expect(result.mismatches[0].trace).toHaveLength(4);
  expect(result.mismatches[0].original).toEqual({ phase: 3 });
  expect(result.mismatches[0].candidate).toEqual({ phase: 4 });
});
test("matching reachable states are deduplicated and cannot silently exhaust coverage", () => {
  const input = {
    original: model,
    candidate: model,
    scenarios: ["A01", "A02"],
    events: [{ type: "advance" }],
  };
  expect(compareStateModels(input)).toMatchObject({
    statesCompared: 4,
    mismatches: [],
  });
  expect(() => compareStateModels({ ...input, maxStates: 2 })).toThrow(
    "coverage incomplete",
  );
});
