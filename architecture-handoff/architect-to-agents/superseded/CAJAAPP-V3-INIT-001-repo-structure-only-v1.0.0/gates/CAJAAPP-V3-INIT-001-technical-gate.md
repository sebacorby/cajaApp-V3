# CAJAAPP-V3-INIT-001 — Technical Gate

## Resultado esperado

La estructura base del repo V3 existe y no contiene basura técnica ni código de aplicación.

---

## Checks obligatorios

Marcar PASS/FAIL cada punto.

### Root

- [ ] Existe `I:\cajaApp-V3`.
- [ ] El root contiene solo elementos permitidos: `README.md`, `.gitignore`, `architecture-handoff`, `contracts`, `docs`, `workspace`.

### Estructura

- [ ] Existe `architecture-handoff/architect-to-agents/issued`.
- [ ] Existe `architecture-handoff/architect-to-agents/superseded`.
- [ ] Existe `architecture-handoff/agents-to-architect/pending-validation`.
- [ ] Existe `architecture-handoff/agents-to-architect/accepted`.
- [ ] Existe `architecture-handoff/agents-to-architect/rejected`.
- [ ] Existe `contracts/schemas`.
- [ ] Existe `contracts/examples`.
- [ ] Existe `contracts/prompts`.
- [ ] Existe `docs/00-context`.
- [ ] Existe `docs/01-architecture`.
- [ ] Existe `docs/02-decisions`.
- [ ] Existe `docs/03-specs`.
- [ ] Existe `docs/04-gates`.
- [ ] Existe `docs/05-evidence`.
- [ ] Existe `docs/06-reports`.
- [ ] Existe `docs/07-runbooks`.
- [ ] Existe `docs/08-artifacts`.
- [ ] Existe `workspace/backend`.
- [ ] Existe `workspace/frontend`.
- [ ] Existe `workspace/shared`.

### Forbidden patterns

- [ ] No existe `.agents`.
- [ ] No existe `.mavis`.
- [ ] No existe `node_modules`.
- [ ] No existe `dist`.
- [ ] No existe `build`.
- [ ] No existe `coverage`.
- [ ] No existe `package.json`.
- [ ] No existe `package-lock.json`.
- [ ] No existe `pending-validation` en root.
- [ ] No existe `architecture-handoff/architecture-handoff`.
- [ ] No hay zips viejos de V2 copiados.
- [ ] No hay scripts de debug sueltos.
- [ ] No hay logs sueltos.

### Evidencia

- [ ] Existe `docs/05-evidence/CAJAAPP-V3-INIT-001-directory-tree.txt`.
- [ ] Existe `docs/05-evidence/CAJAAPP-V3-INIT-001-forbidden-patterns-check.txt`.
- [ ] Existe `docs/06-reports/CAJAAPP-V3-INIT-001-delivery-report.md`.
- [ ] Existe ZIP de entrega en `architecture-handoff/agents-to-architect/pending-validation`.

---

## PASS

Solo declarar PASS si todos los checks obligatorios están verdes.

## FAIL

Declarar FAIL si:

- Se creó cualquier código de aplicación.
- Se instaló cualquier dependencia.
- Aparece cualquier carpeta prohibida.
- Se copió contenido de V2.
- La entrega no está en `agents-to-architect/pending-validation`.
