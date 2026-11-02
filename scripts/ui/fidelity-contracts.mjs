/** Original geometry is the comparator, never a React-only approved screenshot. */
export function compareMeasured(original, candidate) {
  const differences = [];
  if (original.rootFont !== candidate.rootFont)
    differences.push({
      owner: "root-scale",
      original: original.rootFont,
      react: candidate.rootFont,
    });
  for (const region of [
    "heading",
    "header",
    "page",
    "dialog",
    "contract",
    "surveys",
    "jobCard",
  ]) {
    const a = original[region],
      b = candidate[region];
    if (Boolean(a) !== Boolean(b)) {
      differences.push({ owner: region, reason: "missing counterpart" });
      continue;
    }
    if (!a) continue;
    for (const property of [
      "x",
      "y",
      "width",
      "height",
      "font",
      "weight",
      ...(region === "dialog" ? ["contentPadding"] : ["padding"]),
      "color",
      "fill",
    ]) {
      if (
        typeof a[property] === "number"
          ? Math.abs(a[property] - b[property]) > 0.5
          : a[property] !== b[property]
      )
        differences.push({
          owner: region,
          property,
          original: a[property],
          react: b[property],
        });
    }
  }
  if (original.heading?.text !== candidate.heading?.text)
    differences.push({
      owner: "heading-content",
      original: original.heading?.text,
      react: candidate.heading?.text,
    });
  for (const action of original.actions ?? []) {
    const match = (candidate.actions ?? []).filter(
      (a) => a.text === action.text,
    );
    if (match.length !== 1) {
      differences.push({
        owner: "action",
        label: action.text,
        reason: "missing or ambiguous visible action",
      });
      continue;
    }
    for (const property of ["width", "height"])
      if (Math.abs(action[property] - match[0][property]) > 0.5)
        differences.push({
          owner: "action",
          label: action.text,
          property,
          original: action[property],
          react: match[0][property],
        });
  }
  return differences;
}
