"use client";

import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  getLocalSettings,
  updateLocalSettings,
  type AppTheme,
  type LocalAppSettings,
  type SettingsPayload,
} from "@/lib/finance/settings-api";
import {
  installAmountPrivacyDomGuard,
  setAmountPrivacyHidden,
} from "@/lib/finance/amount-privacy";
import { useFinanceUI } from "@/lib/finance/ui-store";

const DEFAULT_SETTINGS: LocalAppSettings = {
  displayName: "Javi",
  locale: "es-AR",
  timezone: "America/Argentina/Tucuman",
  defaultCurrency: "ARS",
  theme: "system",
  hideAmounts: true,
  updatedAt: "",
};

type PreferencesContextValue = {
  settings: LocalAppSettings;
  loading: boolean;
  error: string | null;
  saveSettings: (
    payload: SettingsPayload,
  ) => Promise<LocalAppSettings>;
  refreshSettings: () => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function resolveDark(theme: AppTheme, media: MediaQueryList): boolean {
  return theme === "dark" || (theme === "system" && media.matches);
}

function applyTheme(theme: AppTheme): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const update = () =>
    document.documentElement.classList.toggle(
      "dark",
      resolveDark(theme, media),
    );
  update();
  if (theme === "system") media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

export function AppPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] =
    useState<LocalAppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeSection = useFinanceUI((state) => state.section);

  const refreshSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAmountPrivacyHidden(true);
    try {
      const loaded = await getLocalSettings();
      setAmountPrivacyHidden(loaded.hideAmounts);
      setSettings(loaded);
    } catch (caught) {
      setAmountPrivacyHidden(true);
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar las preferencias.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  useEffect(() => applyTheme(settings.theme), [settings.theme]);

  useEffect(() => installAmountPrivacyDomGuard(document.body), []);

  const saveSettings = useCallback(
    async (payload: SettingsPayload) => {
      const previousHideAmounts = settings.hideAmounts;
      if (payload.hideAmounts) setAmountPrivacyHidden(true);
      try {
        const saved = await updateLocalSettings(payload);
        setAmountPrivacyHidden(saved.hideAmounts);
        setSettings(saved);
        setError(null);
        return saved;
      } catch (caught) {
        setAmountPrivacyHidden(previousHideAmounts);
        throw caught;
      }
    },
    [settings.hideAmounts],
  );

  const value = useMemo(
    () => ({
      settings,
      loading,
      error,
      saveSettings,
      refreshSettings,
    }),
    [error, loading, refreshSettings, saveSettings, settings],
  );

  if (loading) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-background p-6"
        data-testid="preferences-loading"
        aria-live="polite"
      >
        <p className="text-sm text-muted-foreground">
          Cargando preferencias de privacidad…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-background p-6"
        data-testid="preferences-error"
      >
        <div className="max-w-md space-y-4 rounded-xl border bg-card p-6 text-center">
          <p role="alert" className="text-sm text-destructive">
            No se pudieron cargar las preferencias. Por seguridad, los importes
            permanecen ocultos. {error}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshSettings()}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Configuración conserva su estado local durante el guardado para que el
  // feedback de éxito no desaparezca. Al navegar nuevamente a una sección
  // financiera, el cambio de key fuerza un render completo con la privacidad
  // ya persistida y sincronizada.
  const privacyKey =
    activeSection === "configuracion"
      ? "settings-stable"
      : settings.hideAmounts
        ? "amounts-hidden"
        : "amounts-visible";

  return (
    <PreferencesContext.Provider value={value}>
      <Fragment key={privacyKey}>{children}</Fragment>
    </PreferencesContext.Provider>
  );
}

export function useAppPreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error(
      "useAppPreferences must be used inside AppPreferencesProvider",
    );
  }
  return context;
}
