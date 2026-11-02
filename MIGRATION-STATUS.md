# Current migration status

The React migration remains **rejected / fidelity recovery in progress** on `feat/source-fidelity-recovery`. The original HTML, selected Round 10 references and latest explicit user corrections remain authoritative. No original material has been removed. No React baseline, cutover or frontend adoption is authorized by passing functional checks.

## Current implementation

- All 94 legacy identities remain mapped to executable Storybook scenarios. Additional component and workflow stories do not replace them.
- Source-derived typography, fluid workspace bounds, Contract/Surveys hierarchy, contextual actions, loading scaffolds, feedback, proof workspace/records and review compositions have been restored at their canonical owners.
- Product navigation is Overview, Services, My Jobs, Invitations and Profile. Mobile uses the original short labels. Feature shortcuts remain outside product navigation.
- Appearance changes preserve drafts and dispatched operations. Pending presentation remains dismissible; uncertainty requires reconciliation before another write.
- Narrow enlarged-reading dialogs retain the original gutters, separate close row, full-width title and initial heading focus when scrollable. Keyboard access to the footer is checked separately.
- Reduced-transparency scrim paint uses the exact original source value. The comparator checks rendered backdrop RGBA and blur independently of its page-pixel tolerance.

## Verification and evidence

Use the current ignored `.artifacts/ui/current/report.json` for static, interaction and cross-instance checks, and `.artifacts/ui/fidelity/report.json` for original-to-React comparison. Read source fingerprints and run status before reuse. Old images outside a report are not current evidence.

`pnpm ui check --full` runs recovery/keyboard checks first, then the complete canonical matrix and targeted stress states. Browser locators have bounded timeouts; capture waits for the intended DOM, fonts and stable layout rather than network-idle delays. A missing durable reference remains inconclusive even if these gates pass.

The immutable original packet contains 47 required files (about 1 MB), with hashes and all 94 mappings in `reference/original.json`. Default comparisons cover 390/1440px and both themes. Diagnostic settings cover seven widths, text enlargement, short height, materials, long fixtures and media preferences. Original captures are reused only after environment/implementation/settings and image-checksum verification; React captures are always fresh.

US027/028/034 originally used superseded feature navigation. Their source capture explicitly applies the human's product-navigation correction through original navigation primitives and the four original US025 enlarged-reading chrome rules. Frozen files remain unchanged. This narrowly declared treatment does not permit other reference repainting.

Scoped detail/list/proof and enlarged-dialog comparisons have matched measured geometry and strict pixel tolerance. These results do not accept other states or prove all transitions. The independent review receipt records actual opened images, keyboard probes and crop limits. It does not grant human palette approval.

## Remaining acceptance work

- Fresh original comparisons after the latest repairs, covering all named states rather than only representative initial views.
- Recovery/pending and review empty/error parity; long content, materials and responsive stress correspondence.
- Original-to-React transition correspondence, including focus, dismissal, uncertain outcomes and navigation semantics.
- Close, sibling/context and page inspection of changed regions. Modal-obscured context crops and captured-only footer images must not be described as inspected content.
- Complete independent rendered review and explicit migration acceptance. All React scenarios and replacement palette values still await human acceptance.

Baseline promotion remains mechanically blocked. Durable provisional-reference publication, original deletion, workspace cutover, frontend pointer replacement and closure of the old bulk PR remain deferred. Frontend and backend runtime are unchanged.

The active specification is `docs/ONE-TO-ONE-FIDELITY-RECOVERY-PLAN.md`. Measurements verify responsive relationships; they do not authorize fixed screenshot coordinates.
