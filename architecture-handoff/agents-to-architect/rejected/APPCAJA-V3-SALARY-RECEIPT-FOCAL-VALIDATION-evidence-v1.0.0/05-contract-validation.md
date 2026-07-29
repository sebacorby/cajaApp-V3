# Contract Validation — v1.0.0 Salary Receipt Focal Validation

## Date: 2026-07-16

## Contract Files

### 1. Prompt
- Path: `contracts/prompts/salary-receipts/01-extract-salary-receipt.md`
- SHA256: D530CA159D95445FC511872E42AC2C5C7037A85D34CD47EF54F60B8F1D6DA938
- Size: 2239 bytes

**Validation:**
- ✅ Line 4: "Conservá el orden original de los conceptos" — ORDER PRESERVED
- ✅ Line 5: "Sos un extractor documental" — AI ONLY EXTRACTS, no decisions
- ✅ Strict extraction rules (lines 7-16): no invented data, only documented info
- ✅ Backend responsible for validation, normalization, calculations (lines 22-24)

### 2. JSON Schema
- Path: `contracts/schemas/salary-receipts/salary-receipt.schema.json`
- SHA256: 784769A901FBF3B0AC6B7F2FD1F23ADA12F2E064D311F7B71FD03AAD4F2347FE
- Size: 2521 bytes

**Validation:**
- ✅ Valid JSON
- ✅ Has required fields: version, documentType, source, summary, items, warnings
- ✅ Has displayOrder field for order preservation
- ✅ Has kinds: earning, deduction, employer_contribution, information
- ✅ Pattern for money: `^\d+(?:\.\d{1,2})?$`

### 3. Sanitized Example
- Path: `contracts/examples/salary-receipts/salary-receipt.sanitized.preview.json`
- SHA256: A814E5B1BFFE77670810F47293B2081757033CB19B4F645FE4935FF7FAB29403
- Size: 1581 bytes

**Validation:**
- ✅ Valid JSON
- ✅ Example complies with schema (all required fields present)
- ✅ NO real personal data:
  - employerName: "EMPRESA DE EJEMPLO SA" (fake)
  - employeeName: "PERSONA DE EJEMPLO" (fake)
  - employerTaxId: "30-00000000-0" (fake format)
  - employeeTaxId: "20-00000000-0" (fake format)
- ✅ Has displayOrder field showing order preservation
- ✅ Has multiple item kinds (earning, deduction) for calculation verification

## Contract Validation Result

✅ ALL CONTRACTS VALID
- JSON Schema: Valid
- JSON Example: Valid and compliant with schema
- No personal data in example
- Prompt preserves order and limits AI to extraction only
- Backend handles calculations

## Conclusion

PASS - Contracts are properly structured and validated.
