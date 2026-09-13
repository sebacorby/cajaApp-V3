# 02 - Fourth Remediation Integrity — v1.0.2 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Fourth Remediation: listSalaryReceiptsQuerySchema Fix

### Problem (v1.0.1)

The `listSalaryReceiptsQuerySchema` used `.default()`, `.transform()`, and `.coerce.number()`:
```ts
export const listSalaryReceiptsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeReversed: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});
```

This caused a type mismatch: `validateData<T>(schema: ZodType<T>)` expected input = output, but `.default()` made input (`number | undefined`) ≠ output (`number`). Error at `controller.ts:57`:

```
TS2345: Argument of type 'ZodObject<{ limit: ZodDefault<ZodNumber>; ... }>' is not assignable to parameter of type 'ZodType<{ limit: number; includeReversed: boolean; }>'
```

### Fix Applied (v1.0.2)

**schemas.ts** — Pure input contract (no defaults, no transforms, no coerce):
```ts
const listSalaryReceiptsLimitSchema = z.string().regex(
  /^(?:[1-9]|[1-9]\d|100)$/,
  "Expected an integer between 1 and 100",
);

export const listSalaryReceiptsQuerySchema = z.object({
  limit: listSalaryReceiptsLimitSchema.optional(),
  includeReversed: z.enum(["true", "false"]).optional(),
});
```

**controller.ts** — Normalizes after validation:
```ts
const queryInput = validateData(listSalaryReceiptsQuerySchema, request.query);
const query = {
  limit: queryInput.limit === undefined ? 20 : Number(queryInput.limit),
  includeReversed: queryInput.includeReversed === "true",
};
return reply.send(await salaryReceiptsService.list(query));
```

### Verification

- Backend build: **PASS** ✅
- Backend focal test: **5/5 PASS** ✅
- HTTP query tests: **ALL PASS** ✅

### File Hashes

| File | SHA-256 (v1.0.2) | Changed? |
|------|------------------|----------|
| salary-receipts.schemas.ts | 777D1A09AC717BFC8F3E171F3EF7C95A0E30079F8880FD9AA6F8B89E4CB2FFB1 | YES ✅ |
| salary-receipts.controller.ts | 167FFF5B858116309A571375251C9C93940428C09D0F99218EE262DA15AE6AAC | YES ✅ |

## Conclusion

Fourth remediation correctly applied. Type mismatch resolved.
