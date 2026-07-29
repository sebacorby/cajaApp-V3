# APPCAJA-V3-EVIDENCE-MATERIALIZATION-v1.0.7


Estado: ISSUED / OPERACIÓN DE EVIDENCIA, SIN REEJECUCIÓN
Proyecto: CajaApp V3


## Objetivo


Materializar en el repo sincronizado con Google Drive la evidencia ya generada por la campaña `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.7`.


Esta instrucción:


- no autoriza modificar código, tests, configuración, migraciones, dependencias, prompts, contratos ni SQLite;
- no autoriza repetir builds, tests, servidores, IA o Playwright;
- no cambia el veredicto `FAIL`;
- sólo copia evidencia existente.


## Origen operativo


`I:\cajaApp-V3-real\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.7`


## Destino sincronizado obligatorio


`I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.7`


## Procedimiento


1. Verificar que el directorio de origen existe.
2. Verificar que contiene como mínimo:
   - `00-verdict.md`
   - `18-ai-provider.md`
   - `19-ai-advisor.md`
   - `20-playwright-core.log`
   - `21-playwright-core-summary.md`
   - `22-playwright-ai.log` o su equivalente
   - `23-responsive-accessibility.md`
   - `27-known-issues.md`
   - inventario de evidencia y artefactos de fallos disponibles.
3. Crear el directorio de destino si no existe.
4. Copiar recursivamente todo el contenido del origen al destino, preservando nombres, tamaños y timestamps cuando sea posible.
5. No mover ni eliminar el origen.
6. Calcular SHA-256 de todos los archivos en origen y destino.
7. Comparar el conjunto de rutas relativas y hashes.
8. Generar en ambos directorios: `EVIDENCE-MATERIALIZATION-RECEIPT-v1.0.7.md`.
9. El recibo debe incluir:
   - timestamp;
   - origen y destino;
   - cantidad de archivos;
   - bytes totales;
   - comparación de rutas relativas;
   - comparación de SHA-256;
   - faltantes o diferencias;
   - resultado `PASS` o `FAIL`.
10. No declarar `PASS` si falta un archivo o difiere un hash.


## Respuesta final


Responder únicamente:


```text
Materialización de evidencia: PASS | FAIL
Origen: I:\cajaApp-V3-real\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.7
Destino: I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.7
Archivos: <origen> / <destino>
Hashes coincidentes: SI | NO
Campaña repetida: NO
Código modificado: NO
```