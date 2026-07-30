# Resumen VAL-002

**Fecha:** 2026-07-29  
**Rama:** feat/ingresos  
**HEAD:** 3b379b5a3f63d2916ec014ec0c4f3214abc4719b  
**Commit baseline probado:** 09f85adfb7301402291f4849a5e284d31cb2e480 (ancestro)

---

## Gates

| Gate | Resultado |
|------|-----------|
| B1 Backend build | PASS |
| B2 Parser contracts | PASS |
| B3 Generic parser | PASS |
| B4 Import service | PASS |
| B5 Cutover guard | PASS |
| B6 Historical integration | FAIL |
| B7 Combined | FAIL |
| F1 Typecheck | PASS |
| F2 Build | PASS |
| Static inspection | PASS |
| E2E | NOT RUN |

---

## Fallo

**Test:** `tests/salary-receipts/salary-receipts.test.ts` > "normalizes Argentine and international decimal amounts"

**Error:**
```
expected '0.00' to be '1234.56'
normalizeSalaryAmount("1,234.56") returns "0.00" instead of "1234.56"
```

---

## Veredicto: FAIL

Ver archivo 13-final-result.md para detalle completo.
