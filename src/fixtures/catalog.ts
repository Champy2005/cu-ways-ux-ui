import us025 from "../features/us025/scenarios.json";
import us026 from "../features/us026/scenarios.json";
import us027 from "../features/us027/scenarios.json";
import us028 from "../features/us028/scenarios.json";
import us034 from "../features/us034/scenarios.json";
export const features = {
  "025": us025,
  "026": us026,
  "027": us027,
  "028": us028,
  "034": us034,
};
export type FeatureId = keyof typeof features;
export type Scenario = {
  id: string;
  title: string;
  expected?: string;
  kind?: string;
  [key: string]: unknown;
};
export const scenarios = Object.entries(features).flatMap(([feature, cases]) =>
  cases.map((s) => ({
    ...s,
    feature: feature as FeatureId,
    storyId:
      "us" + feature + "--" + s.id[0].toLowerCase() + "-" + s.id.slice(1),
  })),
);
