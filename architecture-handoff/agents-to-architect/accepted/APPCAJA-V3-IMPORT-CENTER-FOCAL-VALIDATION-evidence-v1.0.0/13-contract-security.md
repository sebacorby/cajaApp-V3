# Evidence File 13 — Contract Security Review

## API Response Shape (from /api/import-center)

### List Response
```json
{
  "items": [
    {
      "id": "card_statement:...",
      "kind": "card_statement",
      "entityId": "uuid",
      "documentId": "uuid",
      "fileName": "visa-galicia-julio2026.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 447562,
      "sha256": "57e3269d2a5a239345e3ced59d1e826e0f33a52b4fb5f8d285b5922f667b04b7",
      "pageCount": 8,
      "status": "failed",
      "title": "Resumen de tarjeta pendiente",
      "subtitle": "visa-galicia-julio2026.pdf",
      "periodKey": null,
      "createdAt": "2026-07-10T01:24:28.820Z",
      "updatedAt": "2026-07-10T21:56:20.747Z",
      "completedAt": "2026-07-10T22:01:30.163Z",
      "requiresAction": true,
      "correctionCount": 0,
      "version": null,
      "active": false,
      "error": { "message": "...", "stage": null, "details": [] },
      "issues": [],
      "ai": { "status": "failed", "provider": "ollama", "model": "kimi-k2.6:cloud", "completedAt": "...", "warnings": ["..."] },
      "navigation": { "section": "tarjetas", "label": "Abrir en Tarjetas" },
      "metadata": { "banco": null, "marca": null, "titular": null, "periodo": null, "totalPesos": null, "totalDolares": null }
    }
  ],
  "summary": { "total": 60, "processing": 0, "needsReview": 25, "accepted": 0, "failed": 35, "corrected": 0, "reversed": 0 },
  "pagination": { "limit": 25, "offset": 0, "total": 60, "hasMore": true }
}
```

## Forbidden Properties Check

| Property | Status | Notes |
|----------|--------|-------|
| passwords | ✅ ABSENT | No password fields in response |
| tokens | ✅ ABSENT | No auth tokens or API keys exposed |
| secrets | ✅ ABSENT | No secret values in any field |
| internal error stacks | ✅ ABSENT | Error messages are user-safe strings |
| database IDs (integer) | ✅ ABSENT | Only UUIDs and string IDs exposed |
| raw SQL queries | ✅ ABSENT | Prisma query logs stay in server logs only |
| file system paths | ✅ ABSENT | No server-side paths in response |
| environment variables | ✅ ABSENT | No env vars in response |

## Service Code Review
- import-center.service.ts maps Prisma entities to ImportCenterItem interface
- No raw Prisma objects returned directly — all fields are explicitly mapped
- aiInfo() strips internal Prisma fields, exposes only safe AI metadata
- parsePreviewError() sanitizes error messages, no stack traces
- parseValidationMessages() only extracts string message content

## Conclusion
✅ Contract security PASS — no forbidden properties found in API responses
