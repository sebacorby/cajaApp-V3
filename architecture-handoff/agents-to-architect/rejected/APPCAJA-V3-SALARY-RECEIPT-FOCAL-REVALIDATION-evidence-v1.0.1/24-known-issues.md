# 24 - Known Issues — v1.0.1 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Blocking Defect

### TypeScript Build Failure

**File:** `src/modules/salary-receipts/salary-receipts.controller.ts`
**Line:** 57
**Error:** `TS2345` — Argument of type 'ZodObject<{ limit: ZodDefault<ZodNumber>; ... }>' is not assignable to parameter of type 'ZodType<{ limit: number; includeReversed: boolean; }>'

**Root Cause:** The `listSalaryReceiptsQuerySchema` (lines 60-63 in salary-receipts.schemas.ts) uses `.default()` on fields, making the input type different from the output type. The `validateData` function expects a `ZodType<T>` where input = output, but query schemas with defaults have input ≠ output.

**Code:**
```ts
// salary-receipts.schemas.ts:60-63
export const listSalaryReceiptsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeReversed: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});

// salary-receipts.controller.ts:57
const query = validateData(listSalaryReceiptsQuerySchema, request.query);
```

**Note:** This is a PRE-EXISTING bug not covered by the 3 remediations (schema preview type, accept payload construction, python -c safe argument).

## Other Observations

- Backend npm ci: 0 vulnerabilities ✅
- Frontend npm ci: 10 moderate vulnerabilities (not addressed per validation rules)
- Prisma generate: PASS ✅
- Prisma migrate status: 15 migrations ✅
- Prisma migrate deploy: PASS ✅
