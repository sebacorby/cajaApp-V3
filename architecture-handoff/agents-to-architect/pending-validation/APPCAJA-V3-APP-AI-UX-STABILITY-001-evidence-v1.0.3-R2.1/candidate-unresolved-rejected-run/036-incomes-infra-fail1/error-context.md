# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\incomes.spec.ts >> Ingresos >> crea, proyecta y persiste ingresos ARS y USD desde la UI real
- Location: tests\e2e\incomes.spec.ts:20:7

# Error details

```
Error: apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:11436
Call log:
  - → GET http://127.0.0.1:11436/api/incomes/overview?from=2026-04&to=2027-07
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```

# Page snapshot

```yaml
- generic:
  - alert
  - generic:
    - generic:
      - complementary:
        - generic:
          - generic:
            - generic:
              - generic:
                - generic:
                  - img
                - generic:
                  - generic: CajaApp
                  - generic: Finanzas personales
            - navigation:
              - region:
                - paragraph: Operación
                - paragraph: Consulta y registro cotidiano de tus finanzas.
                - generic:
                  - button:
                    - img
                    - generic: Inicio
                  - button:
                    - img
                    - generic: Movimientos
                  - button:
                    - img
                    - generic: Ingresos
                  - button:
                    - img
                    - generic: Tarjetas
                  - button:
                    - img
                    - generic: Deuda futura
              - region:
                - paragraph: Ingesta y calidad
                - paragraph: Carga, revisión y conciliación de fuentes.
                - generic:
                  - button:
                    - img
                    - generic: Importaciones
                  - button:
                    - img
                    - generic: Conciliación
              - region:
                - paragraph: Planificación
                - paragraph: Límites de gasto y metas personales.
                - generic:
                  - button:
                    - img
                    - generic: Presupuestos
                  - button:
                    - img
                    - generic: Objetivos
              - region:
                - paragraph: Análisis
                - paragraph: Lectura, evidencia y explicación de los datos reales.
                - generic:
                  - button:
                    - img
                    - generic: Reportes
                  - button:
                    - img
                    - generic: Salud financiera
                  - button:
                    - img
                    - generic: Asesor IA
              - region:
                - paragraph: Sistema
                - paragraph: Cierres, resguardo y preferencias de la instalación local.
                - generic:
                  - button:
                    - img
                    - generic: Cierres
                  - button:
                    - img
                    - generic: Respaldo
                  - button:
                    - img
                    - generic: Configuración
            - region "Salud financiera":
              - paragraph:
                - img
                - text: Salud financiera
              - paragraph: Indicador no disponible
              - paragraph: Failed to fetch
              - button "Reintentar":
                - img
                - text: Reintentar
            - generic: Datos locales. CajaApp no conecta cuentas bancarias ni toma decisiones financieras por vos.
      - generic:
        - banner:
          - generic:
            - generic:
              - generic: CajaApp
              - generic: Así están tus finanzas, Javi
            - generic:
              - combobox:
                - generic: Mes actual
                - img
              - generic: 01 de jul de 2026 – 31 de jul de 2026
              - button:
                - img
                - generic: Buscar
              - button:
                - img
              - button:
                - img
                - generic: Nuevo movimiento
        - main:
          - generic:
            - generic:
              - paragraph: Sueldos, bonos y proyecciones
            - generic:
              - generic:
                - generic:
                  - heading [level=1]: Ingresos
                  - paragraph: Sueldos, aumentos, bonos y valores reales calculados por el backend.
                - generic:
                  - button:
                    - img
                    - text: Actualizar
                  - button:
                    - img
                    - text: Bono / extra
                  - button:
                    - img
                    - text: Nueva fuente
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - paragraph: Total del mes
                        - paragraph: $ 0,00
                        - paragraph: ARS y USD se muestran separados
                      - generic:
                        - img
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - paragraph: Recurrentes
                        - paragraph: $ 0,00
                        - paragraph: 0 fuentes incluidas este mes
                      - generic:
                        - img
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - paragraph: Bonos y extras
                        - paragraph: $ 0,00
                        - paragraph: 0 eventos este mes
                      - generic:
                        - img
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - paragraph: Horizonte
                        - paragraph: 16 meses
                        - paragraph: 2026-04 a 2027-07
                      - generic:
                        - img
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - img
                      - text: Recibos de sueldo
                    - paragraph: Importá el PDF, revisá los conceptos y convertí el neto en un ingreso real sin duplicarlo.
                - generic:
                  - generic:
                    - img
                    - paragraph: Seleccioná un recibo PDF
                    - paragraph: CajaApp extrae los datos; vos los confirmás antes de incorporarlos.
                    - button:
                      - img
                      - text: Importar recibo
                  - generic:
                    - generic:
                      - generic:
                        - paragraph: Historial reciente
                        - paragraph: Cada reemplazo conserva su versión y trazabilidad.
                      - button:
                        - img
                        - text: Actualizar
                    - generic: Todavía no hay recibos aceptados.
              - generic:
                - generic:
                  - generic:
                    - generic: Fuentes recurrentes
                    - paragraph: Cada fuente conserva su base, ajustes y regla de aumento.
                  - button:
                    - img
                    - text: Agregar
                - generic:
                  - generic:
                    - img
                    - paragraph: Todavía no hay fuentes de ingreso
                    - paragraph: Agregá un sueldo o ingreso recurrente para comenzar la proyección.
                    - button:
                      - img
                      - text: Agregar primer ingreso
              - generic:
                - generic:
                  - generic: Calendario de ingresos
                  - paragraph: Valores reales y estimados. El frontend sólo presenta el cálculo del backend.
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2026-04
                          - heading [level=3]: abril de 2026
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2026-05
                          - heading [level=3]: mayo de 2026
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2026-06
                          - heading [level=3]: junio de 2026
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: Mes actual
                          - heading [level=3]: julio de 2026
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2026-08
                          - heading [level=3]: agosto de 2026
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2026-09
                          - heading [level=3]: septiembre de 2026
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2026-10
                          - heading [level=3]: octubre de 2026
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2026-11
                          - heading [level=3]: noviembre de 2026
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2026-12
                          - heading [level=3]: diciembre de 2026
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2027-01
                          - heading [level=3]: enero de 2027
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2027-02
                          - heading [level=3]: febrero de 2027
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2027-03
                          - heading [level=3]: marzo de 2027
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2027-04
                          - heading [level=3]: abril de 2027
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2027-05
                          - heading [level=3]: mayo de 2027
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2027-06
                          - heading [level=3]: junio de 2027
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
                    - generic:
                      - generic:
                        - generic:
                          - paragraph: 2027-07
                          - heading [level=3]: julio de 2027
                        - generic:
                          - paragraph: $ 0,00
                      - generic:
                        - paragraph: Sin ingresos configurados.
        - contentinfo:
          - generic:
            - paragraph: © 2026 CajaApp.
            - paragraph: La información se procesa localmente en tu instalación.
  - list
  - dialog "Nueva fuente de ingreso" [active] [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - heading "Nueva fuente de ingreso" [level=2] [ref=e5]
        - paragraph [ref=e6]: Configurá el monto base y la regla de aumento. Los cálculos se realizan en el backend.
      - generic [ref=e7]:
        - alert [ref=e8]: Failed to fetch
        - generic [ref=e9]:
          - generic [ref=e10]: Nombre
          - textbox "Sueldo principal" [ref=e11]: Sueldo E2E 1784761302496
        - generic [ref=e12]:
          - generic [ref=e13]: Empleador o pagador
          - textbox "Empresa" [ref=e14]
        - generic [ref=e15]:
          - generic [ref=e16]:
            - generic [ref=e17]: Tipo
            - combobox [ref=e18]:
              - option "Sueldo" [selected]
              - option "Asignación / beneficio"
              - option "Freelance recurrente"
              - option "Otro recurrente"
          - generic [ref=e19]:
            - generic [ref=e20]: Moneda
            - combobox [ref=e21]:
              - option "Pesos argentinos" [selected]
              - option "Dólares"
        - generic [ref=e22]:
          - generic [ref=e23]:
            - generic [ref=e24]: Monto base
            - textbox "1.000.000,00" [ref=e25]
          - generic [ref=e26]:
            - generic [ref=e27]: Comienza en
            - textbox [ref=e28]: 2026-07
        - generic [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]: Día de cobro
            - spinbutton [ref=e32]: "1"
          - generic [ref=e33]:
            - generic [ref=e34]: Aumenta cada
            - spinbutton [ref=e35]: "3"
          - generic [ref=e36]:
            - generic [ref=e37]: Aumento %
            - textbox [ref=e38]: "10"
        - generic [ref=e39] [cursor=pointer]:
          - checkbox "Fuente activa Al pausarla queda guardada, pero no participa de las proyecciones." [checked] [ref=e40]
          - generic [ref=e41]:
            - generic [ref=e42]: Fuente activa
            - generic [ref=e43]: Al pausarla queda guardada, pero no participa de las proyecciones.
      - generic [ref=e44]:
        - button "Cancelar" [ref=e45]
        - button "Guardar fuente" [ref=e46]
    - button "Close" [ref=e47]:
      - img [ref=e48]
      - generic [ref=e51]: Close
```

# Test source

```ts
  57  |         ).toBeVisible();
  58  |       });
  59  | 
  60  |       await test.step("verificar el aumento automático", async () => {
  61  |         const increasedMonthCard = page.getByTestId(
  62  |           `income-month-${increasedMonth}`,
  63  |         );
  64  |         await expect(increasedMonthCard).toContainText(sourceName);
  65  |         await expect(increasedMonthCard).toContainText(/1\.100\.000/);
  66  |       });
  67  | 
  68  |       await test.step("registrar un cambio permanente", async () => {
  69  |         const sourceCard = page
  70  |           .locator('div[data-testid^="income-source-"]')
  71  |           .filter({ hasText: sourceName })
  72  |           .first();
  73  | 
  74  |         await sourceCard
  75  |           .getByRole("button", { name: /Cambio desde un mes/i })
  76  |           .click();
  77  |         await page.getByTestId("income-event-month").fill(adjustmentMonth);
  78  |         await page.getByTestId("income-event-amount").fill("1.500.000,00");
  79  |         await page.getByTestId("save-income-event").click();
  80  |         await expect(page.getByTestId("save-income-event")).toBeHidden();
  81  | 
  82  |         const increasedAfterAdjustment = page.getByTestId(
  83  |           `income-month-${increasedMonth}`,
  84  |         );
  85  |         await expect(increasedAfterAdjustment).toContainText(sourceName);
  86  |         await expect(increasedAfterAdjustment).toContainText(/1\.650\.000/);
  87  |       });
  88  | 
  89  |       await test.step("registrar un valor real mensual sin alterar el futuro", async () => {
  90  |         const sourceCard = page
  91  |           .locator('div[data-testid^="income-source-"]')
  92  |           .filter({ hasText: sourceName })
  93  |           .first();
  94  | 
  95  |         await sourceCard
  96  |           .getByRole("button", { name: /Valor real de un mes/i })
  97  |           .click();
  98  |         await page.getByTestId("income-event-month").fill(overrideMonth);
  99  |         await page.getByTestId("income-event-amount").fill("1.550.000,00");
  100 |         await page.getByTestId("save-income-event").click();
  101 |         await expect(page.getByTestId("save-income-event")).toBeHidden();
  102 | 
  103 |         await expect(
  104 |           page.getByTestId(`income-month-${overrideMonth}`),
  105 |         ).toContainText(/1\.550\.000/);
  106 |         await expect(
  107 |           page.getByTestId(`income-month-${monthBeforeIncrease}`),
  108 |         ).toContainText(/1\.500\.000/);
  109 |       });
  110 | 
  111 |       await test.step("crear un ingreso extraordinario en USD", async () => {
  112 |         const addOneOff = page.getByTestId("add-one-off-income");
  113 |         await expect(addOneOff).toBeVisible();
  114 |         await addOneOff.click();
  115 | 
  116 |         const currency = page.getByTestId("income-event-currency");
  117 |         await expect(currency).toBeVisible();
  118 |         await currency.selectOption("USD");
  119 |         await page.getByTestId("income-event-month").fill(startMonth);
  120 |         await page.getByTestId("income-event-amount").fill("250.50");
  121 |         await page.getByTestId("income-event-label").fill(oneOffLabel);
  122 | 
  123 |         const createResponsePromise = page.waitForResponse(
  124 |           (response) =>
  125 |             response.request().method() === "POST" &&
  126 |             /\/api\/incomes\/events$/.test(response.url()),
  127 |         );
  128 |         await page.getByTestId("save-income-event").click();
  129 |         const createResponse = await createResponsePromise;
  130 |         expect(createResponse.ok(), await createResponse.text()).toBeTruthy();
  131 |         await expect(page.getByTestId("save-income-event")).toBeHidden();
  132 | 
  133 |         const currentMonthCard = page.getByTestId(`income-month-${startMonth}`);
  134 |         await expect(currentMonthCard).toContainText(oneOffLabel);
  135 |         await expect(currentMonthCard).toContainText(/250[,.]50/);
  136 |       });
  137 | 
  138 |       await test.step("confirmar persistencia luego de recargar", async () => {
  139 |         await page.reload();
  140 |         await page.getByRole("button", { name: /^Ingresos$/i }).click();
  141 |         await expect(
  142 |           page
  143 |             .locator('div[data-testid^="income-source-"]')
  144 |             .filter({ hasText: sourceName })
  145 |             .first(),
  146 |         ).toBeVisible();
  147 |         await expect(
  148 |           page.getByText(oneOffLabel, { exact: true }),
  149 |         ).toBeVisible();
  150 |         await page.screenshot({
  151 |           path: testInfo.outputPath("ingresos-persistidos.png"),
  152 |           fullPage: true,
  153 |         });
  154 |       });
  155 |     } finally {
  156 |       const { from, to } = monthRange();
> 157 |       const overviewResponse = await request.get(
      |                                              ^ Error: apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:11436
  158 |         `${API_BASE_URL}/api/incomes/overview?from=${from}&to=${to}`,
  159 |       );
  160 | 
  161 |       if (overviewResponse.ok()) {
  162 |         const overview = (await overviewResponse.json()) as {
  163 |           sources: Array<{ id: string; name: string }>;
  164 |           months: Array<{
  165 |             oneOffs: Array<{ id: string; label: string }>;
  166 |           }>;
  167 |         };
  168 | 
  169 |         const oneOffIds = overview.months.flatMap((month) =>
  170 |           month.oneOffs
  171 |             .filter((event) => event.label === oneOffLabel)
  172 |             .map((event) => event.id),
  173 |         );
  174 | 
  175 |         for (const eventId of new Set(oneOffIds)) {
  176 |           await request.delete(`${API_BASE_URL}/api/incomes/events/${eventId}`);
  177 |         }
  178 | 
  179 |         const source = overview.sources.find(
  180 |           (item) => item.name === sourceName,
  181 |         );
  182 |         if (source) {
  183 |           await request.delete(
  184 |             `${API_BASE_URL}/api/incomes/sources/${source.id}`,
  185 |           );
  186 |         }
  187 |       }
  188 |     }
  189 |   });
  190 | });
  191 | 
```