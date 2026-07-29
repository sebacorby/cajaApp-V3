# CAJAAPP-V3-INIT-001 — Crear estructura base del repo V3

## Rol del agente

Actuá como agente de inicialización de repositorio. Tu única responsabilidad en esta tarea es crear la estructura base limpia de CajaApp V3.

No implementes features. No crees backend. No crees frontend. No instales dependencias. No copies nada desde V2.

---

## Contexto

CajaApp V2 quedó inmanejable porque el repo terminó contaminado con carpetas y archivos que no correspondían al root: `.agents`, `.mavis`, `pending-validation`, handoff duplicado, zips mezclados, `node_modules`, `dist`, logs, scripts de debug y artifacts de remediaciones dentro del workspace.

CajaApp V3 empieza desde cero para evitar repetir ese problema.

---

## Root obligatorio

Crear o usar exactamente este root:

```text
I:\cajaApp-V3
```

Si el directorio no existe, crealo.

Si el directorio existe, validá que esté vacío o que solo contenga archivos/carpetas permitidas por esta instrucción. Si tiene contenido extraño, no lo mezcles: reportalo y detenete.

---

## Alcance permitido

Podés crear solamente:

1. Carpetas de estructura.
2. `.gitkeep` para preservar carpetas vacías.
3. `README.md` raíz mínimo.
4. `.gitignore` raíz mínimo.
5. Evidencia mínima en `docs/05-evidence`.
6. Reporte mínimo en `docs/06-reports`.
7. ZIP de entrega en `architecture-handoff/agents-to-architect/pending-validation`.

---

## Alcance prohibido absoluto

No hagas nada de esto:

```text
NO crear backend funcional.
NO crear frontend funcional.
NO crear package.json.
NO crear package-lock.json.
NO ejecutar npm install.
NO ejecutar npm create.
NO ejecutar npx create-vite.
NO ejecutar nest new.
NO ejecutar prisma init.
NO crear node_modules.
NO crear dist.
NO crear build.
NO crear .agents.
NO crear .mavis.
NO crear pending-validation en el root.
NO crear architecture-handoff/architecture-handoff.
NO copiar carpetas de I:\cajaApp-V2.
NO copiar archivos de V2.
NO copiar zips viejos de V2.
NO crear scripts de debug sueltos.
NO crear logs sueltos en root.
NO crear archivos temporales en workspace.
```

Si necesitás ejecutar comandos, usá comandos nativos de PowerShell para crear carpetas y archivos mínimos. No uses generadores de proyectos.

---

## Estructura obligatoria exacta

Crear esta estructura:

```text
I:\cajaApp-V3
├── README.md
├── .gitignore
├── architecture-handoff
│   ├── architect-to-agents
│   │   ├── issued
│   │   └── superseded
│   └── agents-to-architect
│       ├── pending-validation
│       ├── accepted
│       └── rejected
├── contracts
│   ├── schemas
│   ├── examples
│   └── prompts
├── docs
│   ├── 00-context
│   ├── 01-architecture
│   ├── 02-decisions
│   ├── 03-specs
│   ├── 04-gates
│   ├── 05-evidence
│   ├── 06-reports
│   ├── 07-runbooks
│   └── 08-artifacts
└── workspace
    ├── backend
    ├── frontend
    └── shared
```

Todas las carpetas vacías deben tener `.gitkeep`, excepto cuando contengan otro archivo válido.

---

## README raíz obligatorio

Crear `I:\cajaApp-V3\README.md` con este contenido mínimo:

```md
# CajaApp V3

Reconstrucción limpia de CajaApp.

## Estado

INIT-001: estructura base del repositorio.

## Reglas del repo

- No se copia código desde V2.
- `workspace/` contiene código fuente futuro, no artifacts de agentes.
- `architecture-handoff/` contiene intercambio entre arquitecto y agentes.
- `docs/` contiene documentación viva y evidencia mínima.
- `contracts/` contiene schemas, ejemplos y prompts contractuales.
```

---

## `.gitignore` obligatorio

Crear `I:\cajaApp-V3\.gitignore` con al menos:

```gitignore
# dependencies
node_modules/

# builds
dist/
build/
coverage/

# env/secrets
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.pfx

# logs
*.log
logs/

# local agent/sandbox garbage
.agents/
.mavis/
.agent/
.sandbox/
pending-validation/

# OS/editor
.DS_Store
Thumbs.db
.vscode/
.idea/

# temp/debug
*.tmp
*.bak
debug_*.py
debug_*.js
test_*.py
```

---

## Evidencia mínima obligatoria

Crear estos archivos:

```text
I:\cajaApp-V3\docs\05-evidence\CAJAAPP-V3-INIT-001-directory-tree.txt
I:\cajaApp-V3\docs\05-evidence\CAJAAPP-V3-INIT-001-forbidden-patterns-check.txt
I:\cajaApp-V3\docs\06-reports\CAJAAPP-V3-INIT-001-delivery-report.md
```

### `directory-tree.txt`

Debe contener el árbol final del repo, máximo 4 niveles, sin listar basura del sistema.

### `forbidden-patterns-check.txt`

Debe indicar explícitamente PASS/FAIL para:

```text
.agents absent
.mavis absent
node_modules absent
dist absent
build absent
package.json absent
package-lock.json absent
pending-validation absent from root
architecture-handoff/architecture-handoff absent
workspace contains only backend/frontend/shared placeholders
no V2 artifacts copied
```

### `delivery-report.md`

Debe ser corto:

```md
# CAJAAPP-V3-INIT-001 Delivery Report

## Estado
PASS/FAIL

## Root creado
I:\cajaApp-V3

## Cambios realizados
- Estructura base creada.
- README raíz creado.
- .gitignore creado.
- Evidencia mínima generada.

## Validaciones
- Forbidden patterns: PASS/FAIL
- Tree generated: PASS/FAIL

## Observaciones
...
```

---

## ZIP de entrega obligatorio

Al finalizar, crear un ZIP liviano con nombre exacto:

```text
CAJAAPP-V3-INIT-001-repo-structure-delivery-v1.0.0.zip
```

Ubicación obligatoria:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\CAJAAPP-V3-INIT-001-repo-structure-delivery-v1.0.0.zip
```

El ZIP debe incluir solamente:

```text
README.md
.gitignore
docs/05-evidence/CAJAAPP-V3-INIT-001-directory-tree.txt
docs/05-evidence/CAJAAPP-V3-INIT-001-forbidden-patterns-check.txt
docs/06-reports/CAJAAPP-V3-INIT-001-delivery-report.md
```

No incluir `workspace/`, no incluir zips viejos, no incluir V2, no incluir dependencias.

---

## Criterio de éxito

La tarea se considera PASS solo si:

1. El root es exactamente `I:\cajaApp-V3`.
2. La estructura coincide con el estándar de este artifact.
3. No existe basura técnica prohibida.
4. No se instaló nada.
5. No se creó código de aplicación.
6. La evidencia mínima existe.
7. El ZIP de entrega está en `agents-to-architect/pending-validation`.

Cualquier desviación es FAIL.
