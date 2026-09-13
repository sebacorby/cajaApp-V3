# Integrity Preflight

## Port Check

```
Get-NetTCPConnection -LocalPort 11436,11437 -State Listen
LocalPort  OwningProcess
---------  -------------
11437      56088 (node.exe - frontend)
11436      53916 (node.exe - backend)
```

## Identity Verification

- Frontend HTTP 200 on port 11437: ✅ Confirmed CajaApp (not Diablo IV)
- Backend /health on port 11436: ✅ `{"status":"ok","service":"cajaapp-v3-backend","node":"v24.18.0"}`
- Backend /api/ai-advisor/context: ✅ Returns valid fingerprint response

## Startup Verification

```
Backend: http://127.0.0.1:11436/health → 200 OK
Frontend: http://127.0.0.1:11437 → 200 OK (CajaApp content confirmed)
```
