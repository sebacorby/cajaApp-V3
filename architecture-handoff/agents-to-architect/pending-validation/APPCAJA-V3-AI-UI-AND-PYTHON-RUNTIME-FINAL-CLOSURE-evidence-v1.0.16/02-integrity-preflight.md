# Integrity Preflight — v1.0.16

## Port Check

```
Get-NetTCPConnection -LocalPort 11436,11437 -State Listen
LocalPort  OwningProcess
---------  -------------
11437      56384 (node.exe - frontend)
11436      26904 (node.exe - backend)
```

## Identity Verification

- Frontend HTTP 200 on port 11437: ✅
- Backend /health on port 11436: ✅ `{"status":"ok","service":"cajaapp-v3-backend","node":"v24.18.0"}`

## Startup Verification

start-cajaapp.ps1 executed successfully:
```
Backend: no hay procesos escuchando en el puerto 11436.
Frontend: no hay procesos escuchando en el puerto 11437.
Backend disponible. HTTP 200.
Frontend disponible. HTTP 200.
```

## NEXT_PUBLIC_API_BASE_URL

Frontend .env.local: `NEXT_PUBLIC_API_BASE_URL=http://localhost:11436`

## CAJAAPP_API_BASE_URL for tests

`http://127.0.0.1:11436`
