// Migrated pure scenario reducer; owns fixture transitions, not presentation.
export function eligible(s) {
  return (
    s.access &&
    ["Pending", "Accepted", "In Progress"].includes(s.status) &&
    !s.paid
  );
}
export function seed(id) {
  const s = {
    status: "In Progress",
    paid: false,
    access: true,
    modal: null,
    pending: null,
    message: null,
    requests: 2,
    offers: 3,
  };
  switch (id) {
    case "A01":
      s.status = "Pending";
      break;
    case "A02":
      s.status = "Accepted";
      break;
    case "A04":
      s.modal = "confirm";
      break;
    case "A05":
      s.modal = "confirm";
      s.pending = "cancel";
      break;
    case "A06":
      s.status = "Cancelled";
      s.requests = 0;
      s.offers = 0;
      s.message = "success";
      break;
    case "B01":
      s.paid = true;
      break;
    case "B02":
      s.status = "Completed";
      s.paid = true;
      break;
    case "B03":
      s.status = "Cancelled";
      s.requests = 0;
      s.offers = 0;
      break;
    case "B04":
      s.status = "Unverified";
      break;
    case "R01":
      s.message = "unknown";
      break;
    case "R02":
      s.message = "failed";
      break;
    case "R03":
      s.access = false;
      break;
    case "R04":
      s.message = "read-failed";
      break;
    case "R05":
      s.pending = "read";
      break;
  }
  return s;
}
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
      if (e.read === "failed")
        return {
          ...s,
          pending: null,
          message: s.message?.startsWith("unknown")
            ? "unknown-read-failed"
            : "read-failed",
        };
      if (e.read === "access")
        return { ...s, pending: null, modal: null, access: false };
      if (s.message?.startsWith("unknown") && e.read === "success")
        return {
          ...s,
          pending: null,
          status: "Cancelled",
          requests: 0,
          offers: 0,
          message: "success",
        };
      return {
        ...s,
        pending: null,
        message: s.message?.startsWith("unknown") ? "unchanged" : null,
      };
    }
    if (s.pending !== "cancel") return s;
    if (e.outcome === "access")
      return { ...s, access: false, pending: null, modal: null };
    if (e.outcome === "unknown")
      return { ...s, pending: null, modal: null, message: "unknown" };
    if (e.outcome === "paid")
      return { ...s, pending: null, modal: null, paid: true, message: "paid" };
    if (e.outcome === "completed")
      return {
        ...s,
        pending: null,
        modal: null,
        status: "Completed",
        paid: true,
        message: "completed",
      };
    if (e.outcome === "failed")
      return { ...s, pending: null, modal: null, message: "failed" };
    return {
      ...s,
      pending: null,
      modal: null,
      status: "Cancelled",
      requests: 0,
      offers: 0,
      message: "success",
    };
  }
  if (!s.access) return s;
  if (e.type === "dismiss") return { ...s, modal: null };
  if (e.type === "check") return { ...s, pending: "read", modal: null };
  if (s.message?.startsWith("unknown") || s.message === "read-failed") return s;
  if (e.type === "cancel-job" && eligible(s))
    return { ...s, modal: "confirm", message: null };
  if (e.type === "confirm" && s.modal === "confirm" && eligible(s))
    return { ...s, pending: "cancel" };
  return s;
}
