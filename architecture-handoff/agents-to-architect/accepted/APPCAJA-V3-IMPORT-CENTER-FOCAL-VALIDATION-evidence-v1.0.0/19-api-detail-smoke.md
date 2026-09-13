# 19-api-detail-smoke.md

# API Detail Endpoint Tests

## Valid Detail Request

### Request
```
GET /api/import-center/card_statement/4a8ca990-93c4-4e9d-96d2-746f2f2910bc
```

### Response
```json
{
  "id": "card_statement:4a8ca990-93c4-4e9d-96d2-746f2f2910bc",
  "kind": "card_statement",
  "entityId": "4a8ca990-93c4-4e9d-96d2-746f2f2910bc",
  "documentId": "86f939ae-9f27-4cb9-afed-650eccf89071",
  "fileName": "visa-galicia-julio2026.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 447562,
  "sha256": "57e3269d2a5a239345e3ced59d1e826e0f33a52b4fb5f8d285b5922f667b04b7",
  "pageCount": 8,
  "status": "needs_review",
  "title": "Resumen de tarjeta pendiente",
  "subtitle": "visa-galicia-julio2026.pdf",
  "periodKey": null,
  "createdAt": "2026-07-10T17:35:48.208Z",
  "updatedAt": "2026-07-10T17:40:06.910Z",
  "completedAt": "2026-07-10T17:40:06.913Z",
  "requiresAction": true,
  "correctionCount": 0,
  "version": null,
  "active": true,
  "error": null,
  "issues": [],
  "ai": {
    "status": "failed",
    "provider": "openai-compatible",
    "model": "kimi-k2.7-code:cloud",
    "completedAt": "2026-07-10T17:40:06.913Z",
    "warnings": ["The AI provider did not return assistant text."]
  },
  "navigation": {
    "section": "tarjetas",
    "label": "Abrir en Tarjetas"
  },
  "metadata": {
    "banco": null,
    "marca": null,
    "titular": null,
    "periodo": null,
    "totalPesos": null,
    "totalDolares": null
  }
}
```

**HTTP 200** ✅

## 404 Not Found

### Request
```
GET /api/import-center/card_statement/00000000-0000-0000-0000-000000000000
```

### Response
```json
{
  "statusCode": 404,
  "code": "NOT_FOUND",
  "error": "Not Found"
}
```

**HTTP 404** ✅

## Detail Matches List Item Fields
- kind: card_statement ✅
- entityId: 4a8ca990-93c4-4e9d-96d2-746f2f2910bc ✅
- fileName: visa-galicia-julio2026.pdf ✅
- status: needs_review ✅
- navigation.section: tarjetas ✅
- navigation.label: Abrir en Tarjetas ✅
- metadata: Record<string, string | number | boolean | null> ✅
