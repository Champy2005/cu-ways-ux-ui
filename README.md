# CU Ways UX/UI

Independent React/TypeScript design workbench for US025/026/027/028/034. All 94 legacy cases are explicit Storybook stories with observable assertions. Application adoption and real API permissions/persistence remain separate.

## Start

Use Node 24.13+, pnpm 11.24.0 and Docker Desktop with its Linux engine for canonical screenshots.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm ui dev
```

Open <http://127.0.0.1:4190/>. Storybook Controls switch deterministic hold/automatic operation timing. Hold is an author fixture; pending presentation always has a close/escape and a check/reopen path.

## One tool

```sh
pnpm ui context "Accepted"
pnpm ui check --target LifecycleBadge --intent shared
pnpm ui check --full
pnpm ui review all
```

`--scope .artifacts/ui/scope.json` supplies current local/shared/global intent, target and optional canonical region. Intent never suppresses checks required by actual source changes. Unknown native tracking reach expands to full verification. `--native` is exploratory, never equivalent to Linux goldens. `--smoke` is a diagnostic subset, never full acceptance.

Exit codes: **0** completed automated comparison; **1** defect/regression; **2** missing evidence or intended visual difference awaiting inspection; **3** usage/setup error. Agent inspection and human palette acceptance are separate from test results. Start with `.artifacts/ui/current/report.json`; full diagnostics stay local.

## Source of truth

- `src/design-system/tokens/theme.css`: current paint and depth values.
- Canonical components own internal appearance; compositions own child relationships; features own local arrangement and behavior.
- `preferences/current.json`: current human guidance, aliases and exceptions; no historical book.
- Storybook manifests/index provide props, owners and preview identities. Generated data is not committed.

Quiet content hover stays transparent; pagination icons have their named tonal circle. Purple/violet is rejected. Current replacement palette still awaits human acceptance.

## References and review

Private Release archives hold the active reference and one rollback set. The small `baseline/reference.json` pins checksum/environment. Missing or incompatible references return **inconclusive**; checks never create approved images automatically.

After explicit user approval of a scoped report, use:

```sh
pnpm ui approve-baseline all --report REPORT_ID --inspection .artifacts/ui/inspection.json --authorization "Explicit scoped user direction"
```

The inspection receipt identifies `reportId`, `reviewer` and actually inspected relative image paths. `--provisional` is reserved for the authorized agent-reviewed migration bootstrap and does not claim human approval. Publication verifies the uploaded archive before changing the pointer. Commit the descriptor separately; no automatic merge. Review never calls promotion.

## Optional native agent integration

Set `UI_MCP=1` before `pnpm ui dev` to enable the official MCP addon and experimental curated review. The local endpoint is <http://127.0.0.1:4190/mcp>. Configure a client deliberately; no global agent settings are written. CLI/CI work without MCP. Current capability probes are recorded in ignored setup evidence.

Screenshots, builds, logs, comparison boards and traces are disposable current artifacts. Source Git contains fixtures and current decisions only. This workbench makes no backend calls and uses fictional records.
