# CU Ways standalone UX/UI

Current migration fidelity is rejected. Read MIGRATION-STATUS.md before cutover or reference work. The original remains the comparator; do not promote React-only captures as proof of one-to-one migration. The detailed recovery plan is implementation context, not mandatory reading for every routine lookup.

This repository is independent of the application repositories. Runtime components may not import Storybook, fixtures, sibling repositories or feature controllers. Tokens own paint; components own internals; compositions own child relationships; features own external placement.

Start with `pnpm ui context "<name>"` and `preferences/current.json`. Edit the smallest canonical owner. Declare local/shared/global intent for visual work. `pnpm ui check --target <name>` performs static, behavior and rendered checks; `--full` includes all scenarios. Inspect close/context/page evidence before claiming visual review. Captured is not inspected; tests are not aesthetic approval.

Five operations: `dev`, `context`, `check`, `review`, `approve-baseline`. Review never promotes references. Promotion needs explicit user authorization tied to the current report; only the migration bootstrap may publish an agent-reviewed provisional reference. Human palette acceptance remains pending. Never widen scope or exceptions merely to pass a check.

Keep current rules only. Generated artifacts/builds/reports/screenshots stay out of Git. Reuse native Storybook manifests/tracking and broaden checking when reach is uncertain. Do not create a graph service or custom studio. No frontend/backend runtime edits. Preserve unrelated legacy stories and read-only reference assets until migration acceptance.
