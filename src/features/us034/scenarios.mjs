import cases from "./scenarios.json" with { type: "json" };
import fixtures from "./fixtures.json" with { type: "json" };
export const SCENARIOS = cases;
export const SCENARIO_BY_ID = Object.fromEntries(cases.map((s) => [s.id, s]));
export const FIXTURES = fixtures;
export const SCENARIO_IDS = SCENARIOS.map((s) => s.id);
