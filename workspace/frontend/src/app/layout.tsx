import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppPreferencesProvider } from "@/components/finance/preferences/app-preferences-provider";


export const metadata: Metadata = {
  title: "CajaApp — Finanzas personales",
  description: "Gestión local de ingresos, movimientos, tarjetas y proyecciones personales.",
  keywords: ["finanzas personales", "ingresos", "movimientos", "tarjetas", "proyecciones"],
  authors: [{ name: "CajaApp" }],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "CajaApp — Finanzas personales",
    description: "Organizá tus ingresos, consumos y compromisos futuros desde una aplicación local.",
    siteName: "CajaApp",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CajaApp — Finanzas personales",
    description: "Gestión personal de ingresos, movimientos y tarjetas.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <AppPreferencesProvider>
          {children}
          <Toaster />
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
