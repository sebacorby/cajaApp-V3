# 20 - Playwright Real E2E — v1.0.3 Salary Receipt Focal Revalidation

## Date: 2026-07-16

## Test: tests/salary-receipts.real.spec.ts

## Result: ❌ FAIL (ReferenceError)

### Reason
The test file uses ES module syntax:
```ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
```

But the frontend project is CommonJS (no "type": "module" in package.json).

When Playwright loads the test:
```
ReferenceError: require is not defined
   at salary-receipts.real.spec.ts:3
```

### Root Cause
ESM syntax in a CommonJS project. The imports from `node:` prefixed modules are ESM-only.

### Fix Needed
Either:
1. Add "type": "module" to frontend package.json (may break other tests)
2. Rename to .mts (ESM TypeScript)
3. Convert to CommonJS syntax with require()