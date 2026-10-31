// Migrated pure scenario reducer; owns fixture transitions, not presentation.
export const fixtureReviews = () =>
  Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    jobId: 41 + i,
    marketerId: 7,
    acceptedMarketerId: 7,
    status: "Completed",
    rating: [5, 4, 5, 4, 5, 3, 5][i],
    comment:
      i === 1
        ? null
        : [
            "Clear updates and reliable delivery. The distribution report made the results easy to verify.",
            "",
            "Thoughtful work with our student survey. Everything arrived as agreed.",
          ][i % 3],
    createdAt: `2026-10-${String(28 - i).padStart(2, "0")}T06:20:00.000Z`,
    creator: ["Narin C.", "Ploy T.", "Krit P."][i % 3],
  }));
export const qualifying = (rows) =>
  rows
    .filter(
      (r) =>
        r.status === "Completed" &&
        r.marketerId === 7 &&
        r.acceptedMarketerId === 7 &&
        Number.isInteger(r.rating) &&
        r.rating >= 1 &&
        r.rating <= 5,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
export const summary = (rows) => {
  const list = qualifying(rows);
  return {
    count: list.length,
    average: list.length
      ? list.reduce((a, r) => a + r.rating, 0) / list.length
      : null,
    distribution: [5, 4, 3, 2, 1].map((n) => [
      n,
      list.filter((r) => r.rating === n).length,
    ]),
  };
};
export const LONG_REVIEW_LENGTH = 420;
export function reviewPreview(comment) {
  const segments =
    typeof Intl.Segmenter === "function"
      ? [
          ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
            comment,
          ),
        ].map((s) => s.segment)
      : Array.from(comment);
  const part = segments.slice(0, 240).join(""),
    word = part.lastIndexOf(" ");
  return (word > 160 ? part.slice(0, word) : part).trimEnd() + "…";
}
export function seed(id) {
  const s = {
    rows: fixtureReviews(),
    page: 1,
    pageSize: 3,
    filter: "all",
    pending: null,
    error: null,
    access: true,
    expanded: [],
  };
  switch (id) {
    case "A02":
      s.rows = [];
      break;
    case "A03":
      s.rows = s.rows.map((r) => ({ ...r, comment: null }));
      break;
    case "A04":
      s.rows[0].comment =
        "Excellent delivery — ส่งงานครบถ้วนและสื่อสารชัดเจน ".repeat(18);
      break;
    case "A05":
      s.page = 2;
      break;
    case "B01":
      s.rows.push(
        { ...s.rows[0], id: 99, status: "In Progress", rating: 1 },
        { ...s.rows[0], id: 98, acceptedMarketerId: 9, rating: 1 },
        { ...s.rows[0], id: 97, rating: 0 },
      );
      break;
    case "B02":
      s.filter = "1";
      break;
    case "R01":
      s.rows = [];
      s.pending = "read";
      break;
    case "R02":
      s.rows = [];
      s.error = "failed";
      break;
    case "R03":
      s.rows = [];
      s.access = false;
      break;
  }
  return s;
}
export function reduce(s, e) {
  if (e.type === "review-expansion") {
    const id = Number(e.id);
    if (
      !qualifying(s.rows).some(
        (r) => r.id === id && r.comment?.length > LONG_REVIEW_LENGTH,
      )
    )
      return s;
    const expanded = new Set(s.expanded);
    if (e.open) expanded.add(id);
    else expanded.delete(id);
    return { ...s, expanded: [...expanded] };
  }
  if (e.type === "clear-filter") return { ...s, filter: "all", page: 1 };
  if (e.type === "timeout" && s.pending)
    return { ...s, pending: null, error: "failed", rows: [] };
  if (s.pending && e.type !== "resolve") return s;
  if (e.type === "resolve" && s.pending === "read") {
    if (e.read === "failed")
      return { ...s, pending: null, error: "failed", rows: [] };
    if (e.read === "access")
      return { ...s, pending: null, access: false, rows: [] };
    return {
      ...s,
      pending: null,
      error: null,
      rows: e.read === "missing" ? [] : fixtureReviews(),
      page: 1,
    };
  }
  if (!s.access) return s;
  if (e.type === "check")
    return { ...s, pending: "read", error: null, rows: [] };
  if (e.type === "draft" && e.name === "filter")
    return { ...s, filter: e.value, page: 1 };
  if (e.type === "filter")
    return {
      ...s,
      filter: ["all", "5", "4", "3", "2", "1"].includes(e.filter)
        ? e.filter
        : "all",
      page: 1,
    };
  if (e.type === "next" || e.type === "previous") {
    const count = qualifying(s.rows).filter(
      (r) => s.filter === "all" || r.rating === Number(s.filter),
    ).length;
    return {
      ...s,
      page: Math.max(
        1,
        Math.min(
          Math.max(1, Math.ceil(count / s.pageSize)),
          s.page + (e.type === "next" ? 1 : -1),
        ),
      ),
    };
  }
  return s;
}
