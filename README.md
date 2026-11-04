# CU Ways UX/UI

**Checkpoint status: visual migration rejected; fidelity correction required.** The React workbench is runnable, but its layout, navigation, sizing and responsive rules do not yet reproduce the original. Keep the original HTML/reference material. See [current migration status](MIGRATION-STATUS.md) and the [detailed fidelity recovery plan](docs/ONE-TO-ONE-FIDELITY-RECOVERY-PLAN.md). This repository has not replaced the original handoff.

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

During fidelity recovery, use the original comparison path:

The pinned original downloads automatically with existing `gh` authentication. A sibling legacy workspace is unnecessary. Use `--prepare-reference "../UX UI"` only when deliberately selecting that local source again.

```sh
pnpm ui check --export-reference .artifacts/ui/original/selected-source.zip
pnpm ui check --restore-reference .artifacts/ui/original/selected-source.zip
pnpm ui check --fidelity
pnpm ui check --fidelity --target us025--c-02 --diagnostic
pnpm ui check --fidelity --target us025--c-02 --diagnostic --full
pnpm ui check --fidelity --target us026 --diagnostic --text-scale 200 --height 640 --material glass --reduced-motion --reduced-transparency
pnpm ui check --fidelity --target us025--l-02 --diagnostic --fixture long
pnpm ui check --fidelity --target us025--c-02 --diagnostic --widths "1023,1024,1025,1279,1280,1281"
pnpm ui check --fidelity --target "us026--a-03,us027--a-05,us028--a-05" --diagnostic --state dismissed
pnpm ui check --fidelity --target us026--a-03 --diagnostic --state reopened --widths "390" --height 568 --text-scale 200
pnpm ui check --fidelity --target us026--b-03 --diagnostic --state reconciled
pnpm ui review --fidelity
pnpm ui review --fidelity --diagnostic
```

Preparation copies only the runtime dependency closure and selected assets into ignored artifacts. `reference/original.json` pins its hashes and all 94 source/story correspondences. The comparison configures both implementations in the pinned Linux browser, freezes simulated time, checks the requested appearance/media, and produces close/context/page pairs, geometry and strict pixel differences. Full-page capture precedes any scrolling crop; close crops disclose external-chrome treatment. Original captures are reused only when the source packet, browser, capture implementation and all settings match and every image checksum verifies. Candidates always render anew.

Complete evidence stays in `.artifacts/ui/fidelity/`; focused `--diagnostic` evidence stays in its `diagnostic/` child. Each keeps one current input, progress, logs, images and report, so a focused investigation cannot replace the complete receipt. Page and crop hashes are verified before completion and review. Snapshot capture waits for CSS animation pause tasks, freezes frame zero and records settled animation state; it does not cancel production effects or change requested motion preferences.

Normal fidelity checks union requested targets with actual source impact; shared or uncertain reach expands to all scenarios. `--diagnostic` deliberately selects a subset and cannot establish affected-scope completion. `--full` adds seven viewport widths. Optional `--text-scale` (100/150/200), `--height` (320–2160), `--material` (opaque/glass), `--fixture` (standard/long), `--reduced-motion` and `--reduced-transparency` produce distinct evidence keys. For US027/028/034, the descriptor's explicit human navigation correction replaces obsolete story shortcuts using the original runtime's own navigation primitives and the four original US025 enlarged-reading chrome rules. Each source capture declares this treatment; frozen original files remain unchanged and available. This is a named correction, never permission to redesign other source regions or approve differences. Transition correspondence and complete migration acceptance remain unfinished. Even a matching capture exits **2** until inspection; promotion stays blocked. Review rejects failed, unfinished or stale runs. No command rewrites a golden as a side effect.

## Source of truth

Fidelity preflight compares bounded reachable model states with the selected original before rendering. This complements browser/controller checks; it does not prove application behavior. `--state dismissed` sends Escape to an initially open dialog; `reopened` activates View progress afterward (keyboard Enter for proof); `reconciled` checks the pending outcome and delivers the controlled successful read. These capture actual resulting pages with distinct evidence/cache keys and fail if required controls are absent. Proof transitions compare focus as well as geometry and pixels. The original's declared navigation correction is applied after its legacy renderer rebuilds the markup.

Original runtime archives contain only the descriptor's exact allowlisted files. Restore verifies archive and per-file checksums, names and bounded sizes before replacing the owned cache. The selected 47-file original is pinned to a private Release asset in `reference/original.json`; a missing cache is retrieved using existing `gh` authentication. This source packet is distinct from a React visual golden and never promotes one.

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
