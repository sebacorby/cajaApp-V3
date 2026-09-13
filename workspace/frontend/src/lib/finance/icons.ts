/**
 * Mapeo central de iconos lucide-react referenciados por nombre (string)
 * en los datos mock. Permite mantener los datos serializables y la UI tipada.
 */
import {
  Home,
  ShoppingCart,
  Car,
  Utensils,
  HeartPulse,
  Package,
  ShieldCheck,
  Plane,
  Laptop,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  TriangleAlert,
  Clock,
  CircleAlert,
  Wallet,
  PiggyBank,
  Target,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  "shopping-cart": ShoppingCart,
  car: Car,
  utensils: Utensils,
  "heart-pulse": HeartPulse,
  package: Package,
  "shield-check": ShieldCheck,
  plane: Plane,
  laptop: Laptop,
  "graduation-cap": GraduationCap,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "triangle-alert": TriangleAlert,
  clock: Clock,
  "circle-alert": CircleAlert,
  wallet: Wallet,
  "piggy-bank": PiggyBank,
  target: Target,
  sparkles: Sparkles,
};

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}
