"use client";

import { SearchTargetBanner } from "@/components/finance/search/search-target-banner";
import { useFinanceUI } from "@/lib/finance/ui-store";
import { AsesorIaSection } from "./asesor-ia-section";
import { ConciliacionSection } from "./conciliacion-section";
import { CierresSection } from "./cierres-section";
import { ConfiguracionSection } from "./configuracion-section";
import { DashboardSection } from "./dashboard-section";
import { DeudaFuturaSection } from "./deuda-futura-section";
import { ImportacionesSection } from "./importaciones-section";
import { IngresosSection } from "./ingresos-section";
import { MovimientosSection } from "./movimientos-section";
import { ObjetivosSection } from "./objetivos-section";
import { PresupuestosSection } from "./presupuestos-section";
import { ReportesSection } from "./reportes-section";
import { RespaldoSection } from "./respaldo-section";
import { SaludFinancieraSection } from "./salud-financiera-section";
import { TarjetasSection } from "./tarjetas-section";

export function SectionRouter() {
  const section = useFinanceUI((state) => state.section);

  let content: React.ReactNode;
  switch (section) {
    case "dashboard":
      content = <DashboardSection />;
      break;
    case "movimientos":
      content = <MovimientosSection />;
      break;
    case "ingresos":
      content = <IngresosSection />;
      break;
    case "tarjetas":
      content = <TarjetasSection />;
      break;
    case "importaciones":
      content = <ImportacionesSection />;
      break;
    case "conciliacion":
      content = <ConciliacionSection />;
      break;
    case "cierres":
      content = <CierresSection />;
      break;
    case "respaldo":
      content = <RespaldoSection />;
      break;
    case "deuda":
      content = <DeudaFuturaSection />;
      break;
    case "presupuestos":
      content = <PresupuestosSection />;
      break;
    case "objetivos":
      content = <ObjetivosSection />;
      break;
    case "reportes":
      content = <ReportesSection />;
      break;
    case "salud":
      content = <SaludFinancieraSection />;
      break;
    case "asesor":
      content = <AsesorIaSection />;
      break;
    case "configuracion":
      content = <ConfiguracionSection />;
      break;
    default:
      content = <DashboardSection />;
  }

  return (
    <>
      <SearchTargetBanner />
      {content}
    </>
  );
}
