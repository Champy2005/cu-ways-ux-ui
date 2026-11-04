export const visualProperties = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderTopWidth",
  "borderTopStyle",
  "borderBottomWidth",
  "borderBottomColor",
  "borderRadius",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontVariantNumeric",
  "lineHeight",
  "opacity",
  "boxShadow",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "gap",
];
export function numericContract(node) {
  const variant = node.variant.split("/")[0];
  if (node.ui === "MetadataValue")
    return variant === "summary" ? "tabular-nums" : "normal";
  if (node.ui === "ProofTimestamp")
    return variant === "proof" ? "tabular-nums" : "normal";
  return null;
}
export function compareEquivalent(previous, observed) {
  return visualProperties.filter((p) => previous[p] !== observed[p]);
}
export function compareProtected(
  reference,
  current,
  { owner, geometry = false } = {},
) {
  const failures = [];
  for (const previous of reference) {
    if (owner && (previous.ui === owner || previous.ancestors?.includes(owner)))
      continue;
    const match = current.find((n) => n.key === previous.key);
    if (!match) {
      failures.push({
        key: previous.key,
        reason: "protected instance missing",
      });
      continue;
    }
    const properties = compareEquivalent(previous.values, match.values);
    if (geometry && previous.bounds && match.bounds) {
      for (const p of ["x", "y", "width", "height"])
        if (Math.abs(previous.bounds[p] - match.bounds[p]) > 1)
          properties.push(`bounds.${p}`);
    }
    if (properties.length) failures.push({ key: previous.key, properties });
  }
  for (const node of current)
    if (
      !reference.some((p) => p.key === node.key) &&
      !(owner && (node.ui === owner || node.ancestors?.includes(owner)))
    )
      failures.push({
        key: node.key,
        reason: "unexpected protected instance added",
      });
  return failures;
}
