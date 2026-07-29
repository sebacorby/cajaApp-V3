import {
  LayoutDashboard,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Files,
  GitCompareArrows,
  Archive,
  DatabaseBackup,
  CalendarRange,
  BarChart3,
  Wallet,
  Target,
  HeartPulse,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { SectionId } from "@/lib/finance/ui-store";

export interface NavItem {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  description: string;
}

/** Only contains active functions or those in integration within the MVP. */
export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Inicio",
    icon: LayoutDashboard,
    description: "Resumen financiero general",
  },
  {
    id: "movimientos",
    label: "Movimientos",
    icon: ArrowLeftRight,
    description: "Historial unificado de ingresos y gastos",
  },
  {
    id: "ingresos",
    label: "Ingresos",
    icon: Banknote,
    description: "Sueldos, bonos y proyecciones",
  },
  {
    id: "tarjetas",
    label: "Tarjetas",
    icon: CreditCard,
    description: "Resumen, cuotas y consumos futuros",
  },
  {
    id: "importaciones",
    label: "Importaciones",
    icon: Files,
    description: "Documentos, estados, errores y correcciones",
  },
  {
    id: "conciliacion",
    label: "Conciliación",
    icon: GitCompareArrows,
    description: "Duplicados, relaciones entre fuentes y doble conteo",
  },
  {
    id: "cierres",
    label: "Cierres",
    icon: Archive,
    description: "Snapshots mensuales versionados y reversibles",
  },
  {
    id: "respaldo",
    label: "Respaldo",
    icon: DatabaseBackup,
    description: "Backup portable y restauración segura de SQLite",
  },
  {
    id: "deuda",
    label: "Deuda futura",
    icon: CalendarRange,
    description: "Cuotas, compromisos e ingresos proyectados",
  },
  {
    id: "presupuestos",
    label: "Presupuestos",
    icon: Wallet,
    description: "Límites por categoría y período",
  },
  {
    id: "objetivos",
    label: "Objetivos",
    icon: Target,
    description: "Metas y aportes manuales",
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: BarChart3,
    description: "Análisis basado en datos reales",
  },
  {
    id: "salud",
    label: "Salud financiera",
    icon: HeartPulse,
    description: "Fórmula determinística, evidencia e historial",
  },
  {
    id: "asesor",
    label: "Asesor IA",
    icon: Sparkles,
    description: "Explicaciones trazables y simulaciones aisladas",
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: Settings,
    description: "Preferencias locales de CajaApp",
  },
];
