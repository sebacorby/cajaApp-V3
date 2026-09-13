import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FRONTEND_SRC = path.resolve(process.cwd(), "../frontend/src");
const BACKEND_SRC = path.resolve(process.cwd(), "src");

function readSourceTree(root: string): string {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .map((entry) => {
      const target = path.join(root, entry.name);
      if (entry.isDirectory()) return readSourceTree(target);
      if (!/\.(ts|tsx)$/.test(entry.name)) return "";
      return fs.readFileSync(target, "utf8");
    })
    .join("\n");
}

describe("contrato transversal del runtime", () => {
  const financeRuntime = readSourceTree(path.join(FRONTEND_SRC, "components", "finance"))
    + readSourceTree(path.join(FRONTEND_SRC, "lib", "finance"));

  it("no reintroduce placeholders ni acciones ficticias", () => {
    const forbidden = [
      "prototipo demo",
      "datos simulados",
      "datos ficticios",
      "fase posterior",
      "fuera del mvp",
      "2 cuentas bancarias conectadas",
      "actualizar contraseña",
      "gestionar cuentas",
      "cerrar sesión",
      "hello, world!",
    ];
    const normalized = financeRuntime.toLowerCase();
    for (const phrase of forbidden) expect(normalized).not.toContain(phrase);
  });

  it("mantiene en navegación todas las secciones funcionales", () => {
    const nav = fs.readFileSync(path.join(FRONTEND_SRC, "lib", "finance", "nav.ts"), "utf8");
    for (const label of [
      "Inicio",
      "Movimientos",
      "Ingresos",
      "Tarjetas",
      "Deuda futura",
      "Presupuestos",
      "Objetivos",
      "Reportes",
      "Configuración",
    ]) expect(nav).toContain(`label: "${label}"`);
  });

  it("preserva contratos monetarios determinísticos en objetivos y presupuestos", () => {
    const source = [
      fs.readFileSync(path.join(BACKEND_SRC, "modules", "goals", "goals.service.ts"), "utf8"),
      fs.readFileSync(path.join(BACKEND_SRC, "modules", "budgets", "budgets.service.ts"), "utf8"),
    ].join("\n");
    expect(source).not.toContain("parseFloat(");
    expect(source).toContain("BigInt");
    expect(source).toContain('"ARS"');
    expect(source).toContain('"USD"');
    expect(source).not.toContain("USD_ARS");
  });
});
