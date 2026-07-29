# APPCAJA-V3-REMEDIATION-VALIDATION v1.0.5 - Remediation Log

## Source
- Recovery folder: `I:\cajaApp-V3\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-v1.0.5-CANONICAL-RECOVERY`
- Manifest: `RECOVERY-MANIFEST-v1.0.5.gdoc` (Google Docs link; doc_id: 1YXehuBHmtOpC9AXugz1Zt7cxYrIxEEAlz8X4nkuJCLI)
- Campaign: `I:\cajaApp-V3\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.5.md`

## Canonical file recovery

| File | Operation | Source BOM | Dest BOM | Source Hash | Dest Hash | Canonical Hash | Match |
|------|-----------|------------|----------|-------------|-----------|----------------|-------|
| categories.service.ts | verify existing (renamed from `categories (2).service.ts`) | False | False | 00E3ED... | 00E3ED... | 00E3ED2DB1ACED3315FBBF0A5A964FE103B3DEEBE14C47AFA4D372BA6362EC29 | True |
| global-search.service.ts | copy + strip BOM | True | False | 71A99F... | 71A99F... | 71A99FD5A191F66D102BEF039B792F69E30EA940214EF789AF04C8B3D1025B94 | True |
| global-search.routes.ts | copy + strip BOM | True | False | B15C1D... | B15C1D... | B15C1DFDFEEE7E87079A23C219FC0ED50A63BC103F0B1603A82AC9D51B632EA3 | True |
| global-search.controller.ts | copy + strip BOM | True | False | DDF5C7... | DDF5C7... | DDF5C7441C7B6E5E0EEE17E6C0CFD2A77DE758588BD98B4B45FE91612A07B24A | True |
| global-search.schemas.ts | copy + strip BOM | True | False | C06449... | C06449... | C06449249B364194B7EAA031DF35A25AA8F3B970E8A96CAC061A00433214941F | True |
| global-search-dialog.tsx | copy + strip BOM | True | False | 4C7BD8... | 4C7BD8... | 4C7BD8E4E664F4DF2CF3DDB74EABB8097FD292C3C1D6EC177E4E52FFB0BF8BE1 | True |
| search-target-banner.tsx | copy + strip BOM | True | False | 85C752... | 85C752... | 85C7528636F2F835FFEE36A6722D9E7A3BE17EEB3A0FEB1885C0F9513EF97E1D | True |
| migration.sql | copy | False | False | 3368E2... | 3368E2... | 3368E20A3CBFFE8CC36E18FC563C459E6939EE121C653D9AEC7722BE831E28B4 | True |

All canonical files present and hashes match: **True**

## BOM cleanup

- 63 files had initial BOM removed (62 from scan + next.config.ts).
- Full list: see `bom-cleanup.csv` in this evidence folder.
- Final BOM scan of authorized scope: **0 files with BOM**.

## Duplicate cleanup

- `categories (2).service.ts` was renamed to `categories.service.ts` (verified identical content).
- No additional duplicate files with suffixes `(1)`, `(2)`, `copy`, `copia`, `TEMP-`, `~` found.
- Duplicates removed: **0**.

## Build artifacts removed

- `I:\cajaApp-V3\workspace\backend\dist`

## Resultado obligatorio de Fase 5A

- 8 archivos canónicos presentes con hash exacto: **OK**
- `migration.sql` no vacío: **OK** (880 bytes)
- Cero BOM: **OK**
- Cero duplicados ambiguos: **OK**
- `schema.prisma` comienza con `generator client`: **OK**
