# CU Ways UX/UI

**Checkpoint status: visual migration rejected; fidelity correction required.** The React workbench is runnable, but its layout, navigation, sizing and responsive rules do not yet reproduce the original. Keep the original HTML/reference material. See [current migration status](MIGRATION-STATUS.md) and the forthcoming detailed fidelity recovery plan. This repository has not replaced the original handoff.

Independent React/TypeScript design workbench for US025/026/027/028/034. All 94 legacy cases are explicit Storybook stories with observable assertions. Application adoption and real API permissions/persistence remain separate.

## Start

Use Node 24.13+, pnpm 11.24.0 and Docker Desktop with its Linux engine for canonical screenshots.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm ui dev
```

Open <http://127.0.0.1:4191/>. Storybook Controls switch deterministic hold/automatic/stalled timing. Hold pauses simulated completion and deadlines for visual inspection; presentation still has a close/escape and check/reopen path. Stalled exercises the 12-second recovery deadline. Automatic resolves the simulated request. Ordinary previews keep their named state; test-only transitions run in Vitest.

## One tool

```sh
pnpm ui context "Accepted"
pnpm ui check --target LifecycleBadge --intent shared
pnpm ui check --full
pnpm ui review all
```

`--scope .artifacts/ui/scope.json` supplies current local/shared/global intent, target and optional canonical region. Intent never suppresses checks required by actual source changes. Unknown native tracking reach expands to full verification. `--native` is exploratory, never equivalent to Linux goldens. `--smoke` is a diagnostic subset and always remains inconclusive; add `--stress` to diagnose representative narrow, large, enlarged-text and reduced-transparency cases. Diagnostics cannot approve baselines or replace required full coverage.

Exit codes: **0** completed automated comparison; **1** defect/regression; **2** missing evidence or intended visual difference awaiting inspection; **3** usage/setup error. Agent inspection and human palette acceptance are separate from test results. Start with `.artifacts/ui/current/report.json`; full diagnostics stay local.

## Source of truth

- `src/design-system/tokens/theme.css`: current paint and depth values.
- Canonical components own internal appearance; compositions own child relationships; features own local arrangement and behavior.
- `preferences/current.json`: current human guidance, aliases and exceptions; no historical book.
- Storybook manifests/index provide props, owners and preview identities. Generated data is not committed.

Quiet content hover stays transparent; pagination icons have their named tonal circle. Purple/violet is rejected. Current replacement palette still awaits human acceptance.

## References and review

Close detail captures exclude only fixed chrome outside the subject, so navigation cannot cover its controls. Context and page captures retain the real chrome; contexts account for usable height after fixed chrome. Scrollable dialogs also receive a native footer capture. Each image records its treatment, and browser checks independently enforce viewport pinning, content clearance, short-title wrapping and semantic link paint. This does not hide controls inside the reviewed component.

Private Release archives hold the active reference and one rollback set. The small `baseline/reference.json` pins checksum/environment. Missing or incompatible references return **inconclusive**; checks never create approved images automatically.

After explicit user approval of a scoped report, use:

```sh
pnpm ui approve-baseline all --report REPORT_ID --inspection .artifacts/ui/inspection.json --authorization "Explicit scoped user direction"
```

The inspection receipt identifies `reportId`, `reviewer` and actually inspected relative image paths. Optional `methods` maps each path to `individual` or `sheet` inspection. Human promotion additionally requires `approval: {source: "user", scope: "TARGET", authorization: "actual explicit direction", geometry: "accepted", palette: "pending"}`; geometry and palette are separate decisions. Retained entries preserve their own provenance and acceptance; a partial promotion cannot label the whole archive approved. `--provisional` is reserved for the authorized initial migration bootstrap. Publication verifies the uploaded archive before changing the pointer. Commit the descriptor separately; no automatic merge. Review never calls promotion.

## Optional native agent integration

Set `UI_MCP=1` before `pnpm ui dev` to enable the official MCP addon and experimental curated review. The local endpoint is <http://127.0.0.1:4191/mcp>. Configure a client deliberately; no global agent settings are written. CLI/CI work without MCP. Current capability probes are recorded in ignored setup evidence.

Screenshots, builds, logs, comparison boards and traces are disposable current artifacts. Source Git contains fixtures and current decisions only. This workbench makes no backend calls and uses fictional records.
