# Evidence File 16 — Cleanup Confirmation

## Service Shutdown
```
taskkill /PID 27776 /T /F
→ CORRECTO: proceso 24960 (hijo de 27776) terminado
→ CORRECTO: proceso 27776 terminado

taskkill /PID 60368 /T /F
→ CORRECTO: proceso 43696 (hijo de 60368) terminado
→ CORRECTO: proceso 60368 terminado
```

## Port Verification
```
Get-NetTCPConnection -LocalPort 11436,11437
→ (no output — ports are free) ✅
```

## SQLite Restoration
```
Copy-Item: C:\Users\javie\AppData\Local\Temp\cajaapp-import-center-v1.0.0\dev.db.backup
        → I:\cajaApp-V3\workspace\backend\prisma\dev.db
```

## SQLite Hash Verification
```
Get-FileHash I:\cajaApp-V3\workspace\backend\prisma\dev.db -Algorithm SHA256
→ E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208
```

✅ Hash matches initial backup AND matches salary receipt campaign stable hash
