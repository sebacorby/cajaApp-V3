# 00-remediation.md

Fase 6A — Recuperación canónica obligatoria

Fecha/hora: 2026-07-14T00:00:00Z (UTC local Windows)
Raíz del proyecto: `I:\cajaApp-V3-real`
Carpeta de recuperación: `I:\cajaApp-V3-real\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-v1.0.6-CANONICAL-RECOVERY`

## Archivo 1: global-search-api.ts

- Ruta origen: `I:\cajaApp-V3-real\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-v1.0.6-CANONICAL-RECOVERY\global-search-api.ts`
- Ruta destino: `I:\cajaApp-V3-real\workspace\frontend\src\lib\finance\global-search-api.ts`
- Existencia previa destino: SÍ
- Bytes iniciales: `0xEF 0xBB 0xBF`
- Hash origen (con BOM): `8A8A975201A3A23EE1A4A03CC4AFE33D6624B8DC6EBF5A9A76D3627EB4C03FD2`
- Hash destino previo: `BEAD4CFEEEC4B3733BAF2F6EC01749CAAA6D47B8F4456FBE72F043C0332D30DA`
- Operación realizada: copiado reemplazando el destino, retirando BOM inicial de 3 bytes
- Hash destino después: `BEAD4CFEEEC4B3733BAF2F6EC01749CAAA6D47B8F4456FBE72F043C0332D30DA`
- Hash esperado (documento): `233FEA4649A6D876C1504E5A13757B4077AC6EFA4AC97DDEE867342DC46EE8D5`
- Hash coincide: NO
- Único cambio adicional permitido: retirar BOM — SÍ, solo se retiraron los 3 bytes iniciales

## Archivo 2: category-donut.tsx

- Ruta origen: `I:\cajaApp-V3-real\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-v1.0.6-CANONICAL-RECOVERY\category-donut.tsx`
- Ruta destino: `I:\cajaApp-V3-real\workspace\frontend\src\components\finance\charts\category-donut.tsx`
- Existencia previa destino: SÍ
- Bytes iniciales: `0xEF 0xBB 0xBF`
- Hash origen (con BOM): `5EEE586DA92A12333F0E4CCC4BB6A45B21D1369352CEB118678264FCAD2A859A`
- Hash destino previo: `50F785CC0214F98CD2E6E1DD2A4F0D9DD588187AD8036F01B5BCEF7C5BAEF9DD`
- Operación realizada: copiado reemplazando el destino, retirando BOM inicial de 3 bytes
- Hash destino después: `50F785CC0214F98CD2E6E1DD2A4F0D9DD588187AD8036F01B5BCEF7C5BAEF9DD`
- Hash esperado (documento): `39074CA6A2E14C7D9BA0AB3E884C3B36F56B833034C36F7CE758FF5E01FF7BDA`
- Hash coincide: NO
- Único cambio adicional permitido: retirar BOM — SÍ, solo se retiraron los 3 bytes iniciales

## Observación

El contenido de los archivos de recuperación sin BOM coincide byte a byte con los archivos destino anteriores (CRLF, sin BOM). Los hashes esperados en el documento no se obtienen después de retirar únicamente el BOM. Esto constituye una discrepancia de hash que se reporta como defecto principal.
