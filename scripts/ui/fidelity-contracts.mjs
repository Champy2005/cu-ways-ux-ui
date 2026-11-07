/** A direct R13 URL starts an automatic read even when writes are held. */
export function originalEntryScenario(scenario) {
  return scenario.feature === "025" && scenario.legacy === "R13"
    ? "L02"
    : scenario.legacy;
}

/** Two identical transient paints must not be mistaken for a settled frame. */
export async function captureStablePaint(page, capture) {
  let previous,
    png,
    consecutive = 0;
  for (let frame = 0; frame < 8; frame++) {
    await page.clock.runFor(17);
    png = await capture();
    consecutive = previous?.equals(png) ? consecutive + 1 : 1;
    if (consecutive >= 3) return { png, frames: frame + 1, stable: true };
    previous = png;
  }
  return { png, frames: 8, stable: false };
}

/** Bounds are viewport-relative; scene origin maps that viewport into its PNG. */
export function sceneCropBounds(bounds, scene) {
  if (
    !bounds ||
    !scene ||
    !scene.origin ||
    ![
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      scene.origin.x,
      scene.origin.y,
      scene.width,
      scene.height,
    ].every(Number.isFinite) ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    !Number.isInteger(scene.width) ||
    !Number.isInteger(scene.height) ||
    scene.width <= 0 ||
    scene.height <= 0
  )
    throw Error("Invalid measured crop or scene bounds");
  const left = Math.floor(bounds.x - scene.origin.x),
    top = Math.floor(bounds.y - scene.origin.y),
    right = Math.ceil(bounds.x + bounds.width - scene.origin.x),
    bottom = Math.ceil(bounds.y + bounds.height - scene.origin.y);
  const x = Math.max(0, left),
    y = Math.max(0, top),
    endX = Math.min(scene.width, right),
    endY = Math.min(scene.height, bottom);
  if (endX <= x || endY <= y) return { availability: "offscreen", clip: null };
  return {
    availability:
      x !== left || y !== top || endX !== right || endY !== bottom
        ? "clipped"
        : "captured",
    clip: { x, y, width: endX - x, height: endY - y },
  };
}

/** Missing coverage is distinct from an observed correspondence defect. */
export function fidelityRecordStatus(differences) {
  if (differences.some((entry) => entry.type === "setup"))
    return "inconclusive";
  if (differences.some((entry) => entry.type !== "coverage"))
    return "different";
  return differences.length
    ? "inconclusive"
    : "measurement-match; image inspection required";
}

/** Snapshot frame zero only after the browser has committed animation pauses. */
export async function freezeCssAnimations() {
  const animations = document
    .getAnimations()
    .filter((animation) => animation instanceof CSSAnimation);
  for (const animation of animations) animation.pause();
  // pause() queues a browser animation task. Freezing time before that task
  // commits can retain an earlier compositor frame in an immutable cache.
  await Promise.all(animations.map((animation) => animation.ready));
  for (const animation of animations) animation.currentTime = 0;
  const states = animations.map((animation) => ({
    name: animation.animationName,
    state: animation.playState,
    pending: animation.pending,
    currentTime: animation.currentTime,
  }));
  if (
    states.some(
      (animation) =>
        animation.pending ||
        animation.state !== "paused" ||
        animation.currentTime !== 0,
    )
  )
    throw Error("Frame-zero animation pause has not settled");
  return states;
}
/** Original geometry is the comparator, never a React-only approved screenshot. */
export function compareMeasured(original, candidate) {
  const differences = [];
  if (Boolean(original.focusPaint) !== Boolean(candidate.focusPaint))
    differences.push({
      owner: "page-focus-paint",
      reason: "missing counterpart",
    });
  else if (original.focusPaint)
    for (const property of ["style", "width", "color", "offset"])
      if (original.focusPaint[property] !== candidate.focusPaint[property])
        differences.push({
          owner: "page-focus-paint",
          property,
          original: original.focusPaint[property],
          react: candidate.focusPaint[property],
        });
  if (original.focus !== candidate.focus)
    differences.push({
      owner: "focus",
      original: original.focus,
      react: candidate.focus,
    });
  if (Boolean(original.backdrop) !== Boolean(candidate.backdrop))
    differences.push({ owner: "backdrop", reason: "missing counterpart" });
  else if (original.backdrop)
    for (const property of ["fill", "filter"])
      if (original.backdrop[property] !== candidate.backdrop[property])
        differences.push({
          owner: "backdrop",
          property,
          original: original.backdrop[property],
          react: candidate.backdrop[property],
        });
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
    "dialogTitle",
    "contract",
    "surveys",
    "jobCard",
    "proofWorkspace",
    "proofJobEntry",
    "proofProgress",
    "entitySummary",
    "taskContext",
    "evidence",
    "empty",
    "reviews",
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

/** Page area cannot dilute an important close/context defect. No acceptance is implied. */
export function pixelRegionDifference(
  pixel,
  { owner = "page", level = "page" } = {},
) {
  const relativeLimit = pixel.width * pixel.height * 0.0001;
  // The canonical renderer already ignores per-channel deltas <=16. A close
  // region cannot dilute a visible defect into surrounding blank area.
  const allowedPixels = level === "page" ? relativeLimit : 0;
  const dimensionMismatch =
    pixel.original[0] !== pixel.candidate[0] ||
    pixel.original[1] !== pixel.candidate[1];
  if (pixel.pixels <= allowedPixels && !dimensionMismatch) return null;
  return {
    owner: owner + "-pixels",
    level,
    changedPixels: pixel.pixels,
    ratio: pixel.ratio,
    allowedPixels,
    ...(dimensionMismatch
      ? { dimensions: { original: pixel.original, react: pixel.candidate } }
      : {}),
  };
}
