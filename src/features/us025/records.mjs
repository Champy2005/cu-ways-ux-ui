/* Fictional per-visit records shared by list and detail; no application API or
   persistent job writes. Status overrides model confirmed mock read outcomes. */
export function mockJobRecords(fixture, overrides = new Map()) {
  const statuses = [
    "In Progress",
    "Accepted",
    "Completed",
    "Cancelled",
    "Accepted",
    "In Progress",
    "Accepted",
  ];
  const creators = [
    "Pimchanok Srisuk",
    "Arthit Chantarat",
    "Mali Srisawat",
    "Nalin Rattanakorn",
  ];
  return Array.from({ length: 21 }, (_, index) => {
    const id = 61 - index;
    const job =
      id === fixture.jobId
        ? { ...fixture, id, jobId: id }
        : {
            ...fixture,
            id,
            jobId: id,
            status: statuses[index % statuses.length],
            creator: creators[index % creators.length],
            offeredPrice: String(7200 + index * 150) + ".00",
            surveys: [
              index % 2
                ? "Student wellbeing pulse"
                : "Campus services feedback",
            ],
            deadline: index % 3 === 0 ? null : fixture.deadline,
          };
    return { ...job, status: overrides.get(id) ?? job.status };
  });
}

export function mockJobRecord(fixture, jobId, overrides = new Map()) {
  const id = Number(jobId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return (
    mockJobRecords(fixture, overrides).find((job) => job.id === id) ?? null
  );
}

export function mockReadStatus(
  record,
  { useConfiguredOutcome = false, configuredOutcome = "in-progress" } = {},
) {
  if (!record) return "unavailable";
  if (useConfiguredOutcome) return configuredOutcome;
  return (
    {
      Accepted: "accepted",
      "In Progress": "in-progress",
      Completed: "completed",
      Cancelled: "cancelled",
    }[record.status] ?? "failed"
  );
}
