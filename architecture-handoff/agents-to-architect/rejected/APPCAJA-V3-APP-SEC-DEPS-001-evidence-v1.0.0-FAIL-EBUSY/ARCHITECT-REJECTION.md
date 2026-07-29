# ARCHITECT REJECTION — APP-SEC-DEPS-001 v1.0.0

Estado: RECHAZADO / FAIL AMBIENTAL.
Fecha: 18 de julio de 2026.

La remediación candidata no fue invalidada. El materializador finalizó con exit 0 y produjo los hashes esperados, pero `npm ci` dentro del workspace sincronizado falló cinco veces con `EBUSY` sobre rutas diferentes.

Hallazgos aceptados:

- preflight correcto;
- hashes baseline correctos;
- materializador correcto;
- fallo ambiental de filesystem Windows consistente con Dropbox, antivirus o watchers;
- gates posteriores correctamente bloqueados;
- package.json, package-lock.json y SQLite restaurados exactamente;
- no se usó `--force` ni una estrategia alternativa no autorizada.

La evidencia se conserva como antecedente técnico. La continuación autorizada es v1.0.1 con instalación, build, runtime y Playwright desde staging fuera de Dropbox, seguida de promoción atómica de los dos archivos de dependencias únicamente después de PASS completo.
