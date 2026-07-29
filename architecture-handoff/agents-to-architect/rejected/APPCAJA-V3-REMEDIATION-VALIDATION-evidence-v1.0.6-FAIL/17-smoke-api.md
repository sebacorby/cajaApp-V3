# 17-smoke-api.md

Smoke API — 2026-07-14T19:32:01

Base URL: http://127.0.0.1:11436

| Endpoint | Status | OK |
|----------|--------|-----|
| Health | 200 | True |
| Settings | 200 | True |
| Dashboard | 200 | True |
| Reports | 200 | True |
| Future | 404 | False |
| Budgets | 200 | True |
| Goals | 200 | True |
| Financial Health | 200 | True |
| Financial Health History | 200 | True |
| AI Advisor Context | 200 | True |
| AI Advisor History | 200 | True |
| Global Search | 200 | True |

Global Search estructura válida: True
- items es array: SÍ
- pagination presente: SÍ
- total items: 0


## Nota sobre `/api/future`

El documento indica `GET /api/future?from=<mes>&months=3`. Ese endpoint responde HTTP 404. La ruta real del backend es `/api/future-commitments` (ver `backend\\src\\modules\\future\\future.routes.ts`), la cual responde HTTP 200 con el mismo contrato:

- URL verificada: `http://127.0.0.1:11436/api/future-commitments?from=2026-07&months=3`
- Status: 200

Esto constituye una discrepancia de ruta entre el documento y la implementación.
