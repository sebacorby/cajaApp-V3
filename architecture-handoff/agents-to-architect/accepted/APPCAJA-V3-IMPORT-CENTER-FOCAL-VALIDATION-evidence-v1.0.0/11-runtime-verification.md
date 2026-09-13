# Evidence File 11 — Runtime Verification

## Backend Health
```
GET http://127.0.0.1:11436/health

Response:
{
  "status": "ok",
  "service": "cajaapp-v3-backend",
  "node": "v24.18.0"
}

Status: 200 ✅
```

## Frontend Health
```
GET http://127.0.0.1:11437

Status: 200 ✅
```

## Services Confirmed Up
| Service | Port | PID | Status |
|---------|------|-----|--------|
| Backend | 11436 | 27776 | ✅ Running |
| Frontend | 11437 | 60368 | ✅ Running |
