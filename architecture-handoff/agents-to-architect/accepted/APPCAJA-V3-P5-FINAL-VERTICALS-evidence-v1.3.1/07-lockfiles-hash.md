# 07 — Hash de package-lock.json (backend y frontend)

`npm ci` no reescribe `package-lock.json` (falla si está desincronizado con `package.json` en vez de modificarlo);
ambos `npm ci` de esta campaña completaron sin error, lo que por sí mismo garantiza que ninguno de los dos lockfiles
fue tocado por los gates. Hashes registrados tras la re-ejecución completa del gate frontend y el cleanup final:

| Archivo | SHA-256 |
|---|---|
| `workspace/backend/package-lock.json` | `825d44d6c4e1e59d8f489b33d08f52ee56ee434c8f70003b5cfed2261b458a87` |
| `workspace/frontend/package-lock.json` | `db0ece39a9a66b3fb10a4bd6644b2a4616d82ad42476ba9f513964ec6793e6ed` |

**Verdict: PASS** (sin cambios, por garantía de `npm ci` + confirmación de hash puntual).
