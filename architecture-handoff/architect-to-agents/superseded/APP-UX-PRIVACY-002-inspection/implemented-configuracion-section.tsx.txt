"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  Database,
  EyeOff,
  Globe,
  Loader2,
  MonitorCog,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppPreferences } from "@/components/finance/preferences/app-preferences-provider";
import {
  getSystemStatus,
  type AppTheme,
  type SystemStatus,
} from "@/lib/finance/settings-api";

type FormState = {
  displayName: string;
  locale: "es-AR";
  timezone: "America/Argentina/Tucuman";
  defaultCurrency: "ARS" | "USD";
  theme: AppTheme;
  hideAmounts: boolean;
};

export function ConfiguracionSection() {
  const { settings, loading, error, saveSettings } = useAppPreferences();
  const [form, setForm] = useState<FormState>({
    displayName: settings.displayName,
    locale: settings.locale,
    timezone: settings.timezone,
    defaultCurrency: settings.defaultCurrency,
    theme: settings.theme,
    hideAmounts: settings.hideAmounts,
  });
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      displayName: settings.displayName,
      locale: settings.locale,
      timezone: settings.timezone,
      defaultCurrency: settings.defaultCurrency,
      theme: settings.theme,
      hideAmounts: settings.hideAmounts,
    });
  }, [settings]);

  useEffect(() => {
    let active = true;
    void getSystemStatus()
      .then((value) => {
        if (active) setSystem(value);
      })
      .catch(() => {
        if (active) setSystem(null);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.displayName.trim()) {
      setMessage("Ingresá un nombre para el perfil local.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveSettings({ ...form, displayName: form.displayName.trim() });
      setMessage("Preferencias guardadas en CajaApp.");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "No se pudieron guardar las preferencias.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        className="flex min-h-64 items-center justify-center"
        data-testid="settings-section"
      >
        <Loader2 className="size-5 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">
          Cargando configuración…
        </span>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 lg:grid-cols-2"
      data-testid="settings-section"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4" /> Perfil local
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="settings-display-name">Nombre visible</Label>
              <Input
                id="settings-display-name"
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label>Tema</Label>
              <Select
                value={form.theme}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    theme: value as AppTheme,
                  }))
                }
              >
                <SelectTrigger data-testid="settings-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">
                    Usar preferencia del sistema
                  </SelectItem>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Oscuro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Moneda principal informativa</Label>
              <Select
                value={form.defaultCurrency}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    defaultCurrency: value as "ARS" | "USD",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">Peso argentino (ARS)</SelectItem>
                  <SelectItem value="USD">
                    Dólar estadounidense (USD)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                No convierte ni reescribe movimientos históricos.
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <EyeOff className="mt-0.5 size-5 text-muted-foreground" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="settings-hide-amounts">
                      Ocultar importes sensibles
                    </Label>
                    <input
                      id="settings-hide-amounts"
                      data-testid="settings-hide-amounts"
                      type="checkbox"
                      checked={form.hideAmounts}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          hideAmounts: event.target.checked,
                        }))
                      }
                      className="size-4 accent-primary"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reemplaza los importes visibles por máscaras en toda la
                    aplicación. No modifica los valores guardados, las APIs,
                    exportaciones ni respaldos.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              data-testid="save-local-settings"
            >
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Check className="mr-2 size-4" />
              )}
              Guardar preferencias
            </Button>
            {message ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : null}
            {error ? (
              <p className="flex gap-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4" />
                {error}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4" /> Región y formatos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Zona horaria:</span>{" "}
            {form.timezone}
          </p>
          <p>
            <span className="text-muted-foreground">Formato:</span> Español
            (Argentina)
          </p>
          <p>
            <span className="text-muted-foreground">
              Monedas registradas:
            </span>{" "}
            ARS y USD, siempre separadas
          </p>
          <p className="text-xs text-muted-foreground">
            Estas preferencias afectan presentación y valores predeterminados,
            no los importes ya guardados.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4" /> Instalación local
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Modo:</span>{" "}
            {system?.mode === "local" ? "Local" : "No disponible"}
          </p>
          <p>
            <span className="text-muted-foreground">Base de datos:</span>{" "}
            {system?.databaseEngine ?? "No disponible"}
          </p>
          <p className="break-all">
            <span className="text-muted-foreground">
              Carpeta de documentos:
            </span>{" "}
            {system?.storageDirectory ?? "No disponible"}
          </p>
          <p>
            <span className="text-muted-foreground">Backend:</span>{" "}
            {system?.backend === "available" ? "Disponible" : "No disponible"}
          </p>
          <p>
            <span className="text-muted-foreground">Node:</span>{" "}
            {system?.nodeVersion ?? "No disponible"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MonitorCog className="size-4" /> Alcance del MVP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            No hay login, contraseña, segundo factor, cuentas bancarias
            conectadas ni notificaciones automáticas.
          </p>
          <p>
            Los datos financieros permanecen en la instalación local. CajaApp
            no muestra controles decorativos para funciones inexistentes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
