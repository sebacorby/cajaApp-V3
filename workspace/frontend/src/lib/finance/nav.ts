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

export type NavGroupId =
  | "operacion"
  | "ingesta-calidad"
  | "planificacion"
  | "analisis"
  | "sistema";

export interface NavGroup {
  id: NavGroupId;
  label: string;
  description: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "operacion",
    label: "Operación",
    description: "Consulta y registro cotidiano de tus finanzas.",
    items: [
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
        description: "Importar y validar resúmenes de tarjeta",
      },
      {
        id: "deuda",
        label: "Pagos de tarjeta",
        icon: CalendarRange,
        description: "Pagos confirmados y cuotas proyectadas",
      },
    ],
  },
  {
    id: "ingesta-calidad",
    label: "Ingesta y calidad",
    description: "Carga, revisión y conciliación de fuentes.",
    items: [
      {
        id: "importaciones",
        label: "Importaciones",
        icon: Files,
        description: "Documentos consolidados, estados, errores y correcciones",
      },
      {
        id: "conciliacion",
        label: "Conciliación",
        icon: GitCompareArrows,
        description: "Duplicados, relaciones entre fuentes y doble conteo",
      },
    ],
  },
  {
    id: "planificacion",
    label: "Planificación",
    description: "Límites de gasto y metas personales.",
    items: [
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
    ],
  },
  {
    id: "analisis",
    label: "Análisis",
    description: "Lectura, evidencia y explicación de los datos reales.",
    items: [
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
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    description: "Cierres, resguardo y preferencias de la instalación local.",
    items: [
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
        id: "configuracion",
        label: "Configuración",
        icon: Settings,
        description: "Preferencias locales de CajaApp",
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
