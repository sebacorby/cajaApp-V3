# Responsive, accesibilidad y honestidad funcional

## Estado

El gate de responsive, accesibilidad y honestidad funcional no pudo ejecutarse de forma integral.

El spec `quality-audit.spec.ts` existe en el frontend, pero no se ejecut debido a que:
1. El ecosistema no arranc mediante el script headless autoritativo (fallo en `prisma:generate`).
2. El frontend no pas `typecheck` (EXIT=2).

## Criterios no verificados

- Once secciones navegables en desktop y mobile
- `aria-current="page"` en desktop
- Men mvil funcional
- Foco inicial no queda en `BODY`
- Controles accesibles por teclado
- Asesor IA visible y navegable en ambas vistas
- Citas del asesor operables mediante botn
- Estados loading, error, vaco y respuesta legibles
- Salud Financiera enlaza a `Explicar con IA`
- Privacidad visual conserva su estado al recargar
- Tema oscuro persiste
- Tablas o textos equivalentes acompaan los grficos
- Ausencia de overflow horizontal significativo en 390x844
- Ausencia de textos prohibidos (`prototipo demo`, `datos simulados`, etc.)
- Disclaimers del Asesor IA visibles

Resultado: NOT RUN (Playwright no ejecutado).
