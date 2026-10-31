// Migrated pure scenario reducer; owns fixture transitions, not presentation.
export function seed(id) {
  const s = {
    status: "In Progress",
    proof: 0,
    paid: true,
    offer: true,
    access: true,
    modal: null,
    pending: null,
    message: null,
  };
  switch (id) {
    case "A02":
      s.modal = "blocked";
      break;
    case "A03":
      s.proof = 1;
      break;
    case "A04":
      s.proof = 1;
      s.modal = "confirm";
      break;
    case "A05":
      s.proof = 1;
      s.modal = "confirm";
      s.pending = "complete";
      break;
    case "A06":
      s.proof = 1;
      s.status = "Completed";
      s.message = "success";
      break;
    case "B01":
      s.proof = 1;
      s.paid = false;
      break;
    case "B02":
      s.proof = 1;
      s.offer = false;
      break;
    case "B03":
      s.status = "Accepted";
      break;
    case "B04":
      s.status = "Cancelled";
      break;
    case "R01":
      s.proof = 1;
      s.message = "unknown";
      break;
    case "R02":
      s.message = "read-failed";
      break;
    case "R03":
      s.access = false;
      break;
    case "R04":
      s.pending = "read";
      break;
  }
  return s;
}
export const blockers = (s) =>
  [
    s.status !== "In Progress" && "The job must be In Progress.",
    !s.proof &&
      "At least one Proof attachment is required. Brief and Other attachments do not qualify.",
    !s.offer &&
      "The accepted offer must belong to this job and still be Accepted.",
    !s.paid && "Payment must be marked Paid.",
  ].filter(Boolean);
export function reduce(s, e) {
  if (e.type === "dismiss") return { ...s, modal: null };
  if (e.type === "reopen" && s.pending && s.pending !== "read")
    return { ...s, modal: "confirm" };
  if (e.type === "timeout" && s.pending)
    return {
      ...s,
      pending: null,
      modal: null,
      message:
        s.pending === "read"
          ? s.message?.startsWith("unknown")
            ? "unknown-read-failed"
            : "read-failed"
          : "unknown",
    };
  if (e.type === "draft") return s;
  if (s.pending && e.type !== "resolve") return s;
  if (e.type === "resolve") {
    if (s.pending === "read") {
      if (e.read === "access")
        return { ...s, pending: null, access: false, modal: null };
      if (e.read === "failed")
        return {
          ...s,
          pending: null,
          message: s.message?.startsWith("unknown")
            ? "unknown-read-failed"
            : "read-failed",
        };
      return {
        ...s,
        pending: null,
        status:
          s.message?.startsWith("unknown") && e.read === "success"
            ? "Completed"
            : s.status,
        message: s.message?.startsWith("unknown")
          ? e.read === "success"
            ? "success"
            : "unchanged"
          : null,
      };
    }
    if (s.pending !== "complete") return s;
    if (e.outcome === "access")
      return { ...s, pending: null, modal: null, access: false };
    if (e.outcome === "unknown")
      return { ...s, pending: null, modal: null, message: "unknown" };
    if (e.outcome === "proof-missing")
      return {
        ...s,
        pending: null,
        modal: s.modal === "confirm" ? "blocked" : null,
        proof: 0,
        message: s.modal === "confirm" ? null : "requirements-changed",
      };
    if (e.outcome === "failed")
      return { ...s, pending: null, modal: null, message: "failed" };
    return {
      ...s,
      pending: null,
      modal: null,
      status: "Completed",
      message: "success",
    };
  }
  if (!s.access) return s;
  if (e.type === "dismiss") return { ...s, modal: null };
  if (e.type === "check") return { ...s, pending: "read", modal: null };
  if (s.message?.startsWith("unknown") || s.message === "read-failed") return s;
  if (e.type === "complete")
    return {
      ...s,
      modal: blockers(s).length ? "blocked" : "confirm",
      message: null,
    };
  if (e.type === "confirm" && s.modal === "confirm" && !blockers(s).length)
    return { ...s, pending: "complete" };
  return s;
}
