# Current migration status

The React migration remains **rejected / fidelity recovery in progress** on `feat/source-fidelity-recovery`. The original HTML, selected Round 10 references and latest explicit user corrections remain authoritative. No original material has been removed. No React baseline, cutover or frontend adoption is authorized by passing functional checks.

## Current implementation

- All 94 legacy identities remain mapped to executable Storybook scenarios. Additional component and workflow stories do not replace them.
- Source-derived typography, fluid workspace bounds, Contract/Surveys hierarchy, contextual actions, loading scaffolds, feedback, proof workspace/records and review compositions have been restored at their canonical owners.
- Product navigation is Overview, Services, My Jobs, Invitations and Profile. Mobile uses the original short labels. Feature shortcuts remain outside product navigation.
- Appearance changes preserve drafts and dispatched operations. Pending presentation remains dismissible; uncertainty requires reconciliation before another write.
- Narrow enlarged-reading dialogs retain the original gutters, separate close row, full-width title and initial heading focus when scrollable. Keyboard access to the footer is checked separately.
- Reduced-transparency scrim paint uses the exact original source value. The comparator checks rendered backdrop RGBA and blur independently of its page-pixel tolerance.
- Proof entry preserves initial caret position and focuses the heading while pending. Proof recovery and empty-state variants retain source width, alignment and wrapping. Unverified lifecycle uses the canonical warning icon.
- Dismissing a pending proof dialog restores the source progress panel above the workspace and returns focus to View progress. The operation remains active independently of the dialog.
- Proof reconciliation misses reopen the retained form and focus the result. Explicit progress reopening focuses the retained URL; initial pending dialogs still focus their heading. Source document scroll padding, visible-focus clearance and proof scroll-anchoring behavior preserve the background position on short enlarged layouts.
- Job-list destinations are native links. Ordinary and modifier-click navigation preserve the selected job's real mock lifecycle; terminal jobs cannot become startable Accepted jobs.
- US025 keeps dispatched start operations and confirmed mock lifecycle independently of list/detail presentation. Returning through product navigation does not discard pending work; late results update their own job, and uncertain results require a fresh read before retry.
- Desktop selection uses the original sibling tile and anchor stacking, including the source-specific fill treatment. Targeted canonical comparisons match in both themes; broad final comparison remains required.
- Rendered numeric contracts distinguish summary values, row/dialog facts and proof/task timestamps. Equivalent consumers cannot collectively drift past a screenshot baseline without a property-level failure.

## Verification and evidence

Use the current ignored `.artifacts/ui/current/report.json` for static, interaction and cross-instance checks, and `.artifacts/ui/fidelity/report.json` for original-to-React comparison. Read source fingerprints and run status before reuse. Old images outside a report are not current evidence.

`pnpm ui check --full` runs recovery/keyboard checks first, then the complete canonical matrix and targeted stress states. Browser locators have bounded timeouts; capture waits for the intended DOM, fonts and stable layout rather than network-idle delays. A missing durable reference remains inconclusive even if these gates pass.

The immutable original packet contains 47 required files (about 1 MB), with hashes and all 94 mappings in `reference/original.json`. Default comparisons cover 390/1440px and both themes. Diagnostic settings cover seven widths, text enlargement, short height, materials, long fixtures and media preferences. Original captures are reused only after environment/implementation/settings and image-checksum verification; React captures are always fresh.

The selected original is also available as a verified 507 KB private Release archive, pinned by checksum in that descriptor. A fresh checkout can retrieve it with existing GitHub authentication; source extraction accepts only the exact pinned files. This publication preserves the original input and grants no React acceptance.

US027/028/034 originally used superseded feature navigation. Their source capture explicitly applies the human's product-navigation correction through original navigation primitives and the four original US025 enlarged-reading chrome rules. Frozen files remain unchanged. This narrowly declared treatment does not permit other reference repainting.

The core comparison has matched all 376 initial scenario/theme/width cases, and the representative boundary sweep matched 180 cases around six breakpoint families. The stress sweep matched geometry in all 30 cases; two enlarged desktop proof views retain flagged inactive-navigation glyph differences. Twelve post-dismissal cases, standard reopening/reconciliation cases and the short enlarged proof reopening have matched geometry/focus/pixels. These results are scoped measurements, not human acceptance. Read current receipt fingerprints before reuse after further source changes.

Fidelity preflight also checks bounded reachable original/candidate model transitions. Browser journeys separately exercise pending dismissal/reopening, completion, reconciliation, native job links, pagination and disclosure. Independent review records actual opened images and coverage limits; pure models, captured images and reviewed images remain distinct evidence.

## Remaining acceptance work

- Fresh original comparisons after the latest repairs, covering all named states rather than only representative initial views.
- Resolve or explicitly review the two remaining US026 2560px/200%-text inactive navigation raster differences. Computed geometry/paint match; paired compositor promotion changes the source raster to the candidate, but the source trigger remains unisolated. Font/paint tweaks, tolerance changes and product layer hacks are not justified by current evidence.
- Extend recovery/pending, long-content and material transition correspondence beyond the checked cases.
- Original-to-React transition correspondence, including focus, dismissal, uncertain outcomes and navigation semantics.
- Close, sibling/context and page inspection of changed regions. Modal-obscured context crops and captured-only footer images must not be described as inspected content.
- Complete independent rendered review and explicit migration acceptance. All React scenarios and replacement palette values still await human acceptance.

Baseline promotion remains mechanically blocked. Durable React provisional-reference publication, original deletion, workspace cutover, frontend pointer replacement and closure of the old bulk PR remain deferred. A selected-original runtime archive is a separate reproducibility input and does not approve React. Frontend and backend runtime are unchanged.

The active specification is `docs/ONE-TO-ONE-FIDELITY-RECOVERY-PLAN.md`. Measurements verify responsive relationships; they do not authorize fixed screenshot coordinates.
