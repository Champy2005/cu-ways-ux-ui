export const visualProperties = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderTopWidth",
  "borderRadius",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "gap",
];
export function compareEquivalent(previous, observed) {
  return visualProperties.filter((p) => previous[p] !== observed[p]);
}
export function compareProtected(reference, current) {
  const failures = [];
  for (const previous of reference) {
    const match = current.find((n) => n.key === previous.key);
    if (!match) {
      failures.push({
        key: previous.key,
        reason: "protected instance missing",
      });
      continue;
    }
    const properties = compareEquivalent(previous.values, match.values);
    if (properties.length) failures.push({ key: previous.key, properties });
  }
  return failures;
}
