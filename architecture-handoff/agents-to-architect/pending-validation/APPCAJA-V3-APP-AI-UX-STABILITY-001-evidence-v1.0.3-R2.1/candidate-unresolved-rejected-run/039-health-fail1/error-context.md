# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: financial-health.spec.ts >> Salud financiera conserva fórmula, evidencia, navegación e historial
- Location: tests\financial-health.spec.ts:53:5

# Error details

```
Error: apiRequestContext.delete: connect ECONNREFUSED 127.0.0.1:11436
Call log:
  - → DELETE http://127.0.0.1:11436/api/financial-health/snapshots/1231ad39-3c30-4365-be45-8b3723f9f425
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - complementary [ref=e5]:
      - generic [ref=e7]:
        - generic [ref=e9]:
          - img [ref=e11]
          - generic [ref=e14]:
            - generic [ref=e15]: CajaApp
            - generic [ref=e16]: Finanzas personales
        - navigation "Navegación principal" [ref=e17]:
          - region "Operación" [ref=e18]:
            - paragraph [ref=e19]: Operación
            - paragraph [ref=e20]: Consulta y registro cotidiano de tus finanzas.
            - generic [ref=e21]:
              - button "Inicio" [ref=e22]:
                - img [ref=e23]
                - generic [ref=e28]: Inicio
              - button "Movimientos" [ref=e29]:
                - img [ref=e30]
                - generic [ref=e33]: Movimientos
              - button "Ingresos" [ref=e34]:
                - img [ref=e35]
                - generic [ref=e38]: Ingresos
              - button "Tarjetas" [ref=e39]:
                - img [ref=e40]
                - generic [ref=e42]: Tarjetas
              - button "Deuda futura" [ref=e43]:
                - img [ref=e44]
                - generic [ref=e46]: Deuda futura
          - region "Ingesta y calidad" [ref=e47]:
            - paragraph [ref=e48]: Ingesta y calidad
            - paragraph [ref=e49]: Carga, revisión y conciliación de fuentes.
            - generic [ref=e50]:
              - button "Importaciones" [ref=e51]:
                - img [ref=e52]
                - generic [ref=e56]: Importaciones
              - button "Conciliación" [ref=e57]:
                - img [ref=e58]
                - generic [ref=e65]: Conciliación
          - region "Planificación" [ref=e66]:
            - paragraph [ref=e67]: Planificación
            - paragraph [ref=e68]: Límites de gasto y metas personales.
            - generic [ref=e69]:
              - button "Presupuestos" [ref=e70]:
                - img [ref=e71]
                - generic [ref=e74]: Presupuestos
              - button "Objetivos" [ref=e75]:
                - img [ref=e76]
                - generic [ref=e80]: Objetivos
          - region "Análisis" [ref=e81]:
            - paragraph [ref=e82]: Análisis
            - paragraph [ref=e83]: Lectura, evidencia y explicación de los datos reales.
            - generic [ref=e84]:
              - button "Reportes" [ref=e85]:
                - img [ref=e86]
                - generic [ref=e88]: Reportes
              - button "Salud financiera" [active] [ref=e89]:
                - img [ref=e90]
                - generic [ref=e93]: Salud financiera
              - button "Asesor IA" [ref=e95]:
                - img [ref=e96]
                - generic [ref=e98]: Asesor IA
          - region "Sistema" [ref=e99]:
            - paragraph [ref=e100]: Sistema
            - paragraph [ref=e101]: Cierres, resguardo y preferencias de la instalación local.
            - generic [ref=e102]:
              - button "Cierres" [ref=e103]:
                - img [ref=e104]
                - generic [ref=e107]: Cierres
              - button "Respaldo" [ref=e108]:
                - img [ref=e109]
                - generic [ref=e115]: Respaldo
              - button "Configuración" [ref=e116]:
                - img [ref=e117]
                - generic [ref=e120]: Configuración
        - region "Salud financiera" [ref=e121]:
          - paragraph [ref=e122]:
            - img [ref=e123]
            - text: Salud financiera
          - paragraph [ref=e126]: Indicador no disponible
          - paragraph [ref=e127]: Internal server error
          - button "Reintentar" [ref=e128]:
            - img
            - text: Reintentar
        - generic [ref=e129]: Datos locales. CajaApp no conecta cuentas bancarias ni toma decisiones financieras por vos.
    - generic [ref=e130]:
      - banner [ref=e131]:
        - generic [ref=e132]:
          - generic [ref=e133]:
            - generic [ref=e134]: CajaApp
            - generic [ref=e135]: Así están tus finanzas, Javi
          - generic [ref=e136]:
            - combobox "Seleccionar período" [ref=e137]:
              - generic: Mes actual
              - img
            - generic [ref=e138]: 01 de jul de 2026 – 31 de jul de 2026
            - button "Buscar en CajaApp" [ref=e139]:
              - img
              - generic [ref=e140]: Buscar
            - button "Centro de alertas, sin alertas activas" [ref=e141]:
              - img
            - button "Nuevo movimiento" [ref=e142]:
              - img
              - generic [ref=e143]: Nuevo movimiento
      - main [ref=e144]:
        - generic [ref=e145]:
          - paragraph [ref=e147]: Fórmula determinística, evidencia e historial
          - generic [ref=e149]:
            - img [ref=e150]
            - generic [ref=e152]:
              - paragraph [ref=e153]: No se pudo calcular la salud financiera
              - paragraph [ref=e154]: Internal server error
            - button "Reintentar" [ref=e155]
      - contentinfo [ref=e156]:
        - generic [ref=e157]:
          - paragraph [ref=e158]: © 2026 CajaApp.
          - paragraph [ref=e159]: La información se procesa localmente en tu instalación.
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
  104 |     const snapshotResponse = await request.post(`${API_BASE_URL}/api/financial-health/snapshots`, {
  105 |       data: { from: current.first, to: current.last },
  106 |     });
  107 |     expect(snapshotResponse.status(), await snapshotResponse.text()).toBe(201);
  108 |     const health = (await snapshotResponse.json()) as {
  109 |       snapshotId: string;
  110 |       snapshotCreated: boolean;
  111 |       evaluation: {
  112 |         formula: { version: string };
  113 |         currencies: {
  114 |           ARS: { status: string; score: number | null; factors: Array<{ id: string; points: number | null }> };
  115 |           USD: { status: string; score: number | null };
  116 |         };
  117 |       };
  118 |       history: Array<{ id: string }>;
  119 |     };
  120 |     snapshotId = health.snapshotId;
  121 | 
  122 | 
  123 | 
  124 | 
  125 |     expect(health.snapshotCreated).toBeTruthy();
  126 |     expect(health.evaluation.formula.version).toBe("fh-v1.0.0");
  127 |     expect(health.evaluation.currencies.ARS.status).toBe("calculated");
  128 |     expect(health.evaluation.currencies.ARS.score).not.toBeNull();
  129 |     expect(["calculated", "insufficient_data"]).toContain(
  130 |       health.evaluation.currencies.USD.status,
  131 |     );
  132 |     expect(health.history.some((item) => item.id === snapshotId)).toBeTruthy();
  133 | 
  134 | 
  135 | 
  136 | 
  137 |     const duplicateResponse = await request.post(`${API_BASE_URL}/api/financial-health/snapshots`, {
  138 |       data: { from: current.first, to: current.last },
  139 |     });
  140 |     expect(duplicateResponse.status(), await duplicateResponse.text()).toBe(201);
  141 |     const duplicate = (await duplicateResponse.json()) as {
  142 |       snapshotId: string;
  143 |       snapshotCreated: boolean;
  144 |     };
  145 |     expect(duplicate.snapshotId).toBe(snapshotId);
  146 |     expect(duplicate.snapshotCreated).toBeFalsy();
  147 | 
  148 | 
  149 | 
  150 | 
  151 |     await page.goto("/");
  152 |     await page.getByRole("button", { name: "Salud financiera" }).first().click();
  153 |     const section = page.getByTestId("financial-health-section");
  154 |     await expect(section).toBeVisible();
  155 |     await expect(section).toHaveAttribute("data-formula-version", "fh-v1.0.0");
  156 |     await expect(page.getByTestId("financial-health-score-ars")).toHaveAttribute(
  157 |       "data-score",
  158 |       String(health.evaluation.currencies.ARS.score),
  159 |     );
  160 |     await expect(page.getByTestId("financial-health-score-usd")).toHaveAttribute(
  161 |       "data-score",
  162 |       health.evaluation.currencies.USD.score === null
  163 |         ? "not-calculated"
  164 |         : String(health.evaluation.currencies.USD.score),
  165 |     );
  166 |     await expect(page.getByTestId("financial-health-methodology")).toContainText("Requisitos mínimos");
  167 |     await expect(page.getByTestId("financial-health-history")).toContainText("Historial de evaluaciones");
  168 | 
  169 | 
  170 | 
  171 | 
  172 |     const actualFactor = page.getByTestId("financial-health-factor-ars-actual_balance");
  173 |     await expect(actualFactor).toHaveAttribute(
  174 |       "data-points",
  175 |       String(health.evaluation.currencies.ARS.factors.find((factor) => factor.id === "actual_balance")?.points),
  176 |     );
  177 |     await actualFactor.getByRole("button", { name: "Ver movimientos realizados" }).click();
  178 |     await expect(page.getByTestId("movements-section")).toBeVisible();
  179 |     await expect(page.getByTestId("movement-drilldown-banner")).toContainText(
  180 |       "Salud financiera: balance realizado ARS",
  181 |     );
  182 | 
  183 | 
  184 | 
  185 | 
  186 |     await page.getByRole("button", { name: "Inicio" }).first().click();
  187 |     const dashboardHealth = page.getByTestId("dashboard-financial-health");
  188 |     await expect(dashboardHealth).toBeVisible();
  189 |     await expect(page.getByTestId("dashboard-financial-health-ars")).toHaveAttribute(
  190 |       "data-score",
  191 |       String(health.evaluation.currencies.ARS.score),
  192 |     );
  193 |     await page.getByTestId("dashboard-open-financial-health").click();
  194 |     await expect(section).toBeVisible();
  195 | 
  196 | 
  197 | 
  198 | 
  199 |     await page.setViewportSize({ width: 390, height: 844 });
  200 |     await page.getByRole("button", { name: "Abrir menú" }).click();
  201 |     await expect(page.locator('button:has-text("Salud financiera"):visible')).toBeVisible();
  202 |   } finally {
  203 |     if (snapshotId) {
> 204 |       await request.delete(`${API_BASE_URL}/api/financial-health/snapshots/${snapshotId}`);
      |                           ^ Error: apiRequestContext.delete: connect ECONNREFUSED 127.0.0.1:11436
  205 |     }
  206 |     for (const movementId of movementIds.reverse()) {
  207 |       await request.delete(`${API_BASE_URL}/api/movements/manual/${movementId}`);
  208 |     }
  209 |   }
  210 | });
```