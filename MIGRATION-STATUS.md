# Current migration status

The React migration is a functional checkpoint, **not an accepted visual migration**. The user rejected its fidelity on 1 November 2026. Original HTML, selected Round 10 references and later explicit user corrections remain the visual authority.

## Verified checkpoint

- Source revision `5974db619f74f53b20b44a5eda8c4320b2a33d8c`: 48 unit/architecture tests and 105 story tests passed; all 94 legacy scenario identities are reachable.
- Full canonical Linux report `a841d3bea4af6792`: 476 records, 1,432 captures and 11 rendered interaction checks, with no reported automated failure.
- Fresh GitHub Actions checkout at `e9de3b5adbbd82e14dc97ac73ddb75de4b0d56b6` also passed static gates, 48 unit tests, 105 stories and the full canonical matrix; report `1cf31c0f40b5ac9f` remains **inconclusive** because the reference is missing. The workflow is therefore not green. Secret scanning passed. The portal-title landmark regression was repaired and retested without a layout change.
- Visual regression is **inconclusive**: the durable reference is missing. Those checks establish behavior and React-internal consistency, not original-to-React fidelity.
- Fresh-clone install/start and focused proof-dialog interaction were exercised. Durable reference retrieval and original-to-React visual comparison remain incomplete.

## Required correction

Restore original page hierarchy, navigation semantics, contextual action widths, responsive scaling, breakpoints, material treatment and component relationships. Desktop product navigation must read **Overview, Services, My Jobs, Invitations, Profile**. Story selection belongs to the workbench interface.

The detailed implementation specification is `docs/ONE-TO-ONE-FIDELITY-RECOVERY-PLAN.md`. Its measurements are evidence inputs, not permission to hardcode screenshot coordinates. Current human palette acceptance remains pending.

## Handoff boundary

No React visual baseline has been promoted. Workspace cutover, deletion of original evidence, frontend pointer replacement and closure of the old bulk PR are deferred until fidelity acceptance. Frontend/backend runtime remains unchanged. The private repository is a reviewable checkpoint; application adoption remains separate.
