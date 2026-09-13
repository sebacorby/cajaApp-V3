# CAJAAPP-V3 — Repo Structure Standard

## Principio principal

El root del repo debe mantenerse limpio. El workspace es para código fuente futuro. El handoff es para intercambio de artifacts. La documentación y evidencia viven en `docs`.

---

## Root estándar

```text
I:\cajaApp-V3
```

---

## Estructura permitida en root

Solo se permiten estos elementos en el root inicial:

```text
README.md
.gitignore
architecture-handoff/
contracts/
docs/
workspace/
```

No se permite ningún otro archivo/carpeta en root durante INIT-001.

---

## `architecture-handoff/`

Uso exclusivo para intercambio con agentes.

```text
architecture-handoff/
├── architect-to-agents/
│   ├── issued/
│   └── superseded/
└── agents-to-architect/
    ├── pending-validation/
    ├── accepted/
    └── rejected/
```

Reglas:

- Los pedidos emitidos por arquitectura van en `architect-to-agents/issued`.
- Los pedidos reemplazados van en `architect-to-agents/superseded`.
- Las entregas del agente van inicialmente en `agents-to-architect/pending-validation`.
- Las entregas aceptadas se mueven físicamente a `agents-to-architect/accepted`.
- Las entregas rechazadas se mueven físicamente a `agents-to-architect/rejected`.
- Está prohibido crear `architecture-handoff/architecture-handoff`.

---

## `workspace/`

Uso exclusivo para código fuente futuro.

```text
workspace/
├── backend/
├── frontend/
└── shared/
```

En INIT-001 estas carpetas deben quedar vacías salvo `.gitkeep`.

Está prohibido colocar artifacts, zips, evidencia o scripts de debug en `workspace`.

---

## `docs/`

```text
docs/
├── 00-context/
├── 01-architecture/
├── 02-decisions/
├── 03-specs/
├── 04-gates/
├── 05-evidence/
├── 06-reports/
├── 07-runbooks/
└── 08-artifacts/
```

Reglas:

- Evidencia técnica mínima: `docs/05-evidence`.
- Reportes de entrega: `docs/06-reports`.
- Decisiones de arquitectura: `docs/02-decisions`.
- No duplicar documentación innecesaria.

---

## `contracts/`

```text
contracts/
├── schemas/
├── examples/
└── prompts/
```

En INIT-001 estas carpetas quedan vacías salvo `.gitkeep`.

---

## Forbidden by design

Durante INIT-001 no debe existir:

```text
.agents/
.mavis/
node_modules/
dist/
build/
coverage/
package.json
package-lock.json
pending-validation/ en root
architecture-handoff/architecture-handoff/
```
