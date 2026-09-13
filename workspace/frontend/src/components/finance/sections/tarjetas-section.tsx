"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  acceptCardStatementDraft,
  activateCardStatement,
  archiveCardStatement,
  createManualPurchase,
  deleteManualPurchase,
  getCardExchangeRate,
  getCardStatement,
  getCardStatementTraceability,
  getCardStatementDraft,
  getLatestCardStatement,
  getUpdatedValues,
  importCardStatementPdf,
  listCardStatements,
  updateCardExchangeRate,
  type AcceptResult,
  type AcceptedCardStatement,
  type CardExchangeRate,
  type CardMoneyEquivalents,
  type CardStatementListItem,
  type CardStatementPreview,
  type CardStatementTraceability,
  type UpdatedValuesResponse,
} from "@/lib/finance/card-statements-api";
import { AcceptedState } from "@/components/finance/card-statements/accepted-state";
import {
  ErrorState,
  LoadingState,
  PersistedDataLoadingState,
} from "@/components/finance/card-statements/loading-and-error-states";
import { ImportState } from "@/components/finance/card-statements/import-state";
import { PreviewState } from "@/components/finance/card-statements/preview-state";
import { StatementHistoryPanel } from "@/components/finance/card-statements/statement-history-panel";
import {
  acceptedStatementToPreview,
  createEditedPreview,
  getProjectionRange,
} from "@/components/finance/card-statements/helpers";
import {
  EMPTY_MANUAL_PURCHASE,
  type EditableRowField,
  type ManualPurchaseForm,
  type RowEdit,
  type UIState,
} from "@/components/finance/card-statements/types";

/**
 * Sección Tarjetas: orquesta el ciclo completo de importación de un resumen
 * (booting → initial → loading → preview → accepted / error), manejo de
 * historial de versiones, cotización USD/ARS y compras manuales. Las
 * distintas vistas y componentes de presentación viven en
 * `components/finance/card-statements/`.
 */
export function TarjetasSection() {
  const [uiState, setUiState] = useState<UIState>("booting");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CardStatementPreview | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [rowEdits, setRowEdits] = useState<Map<string, RowEdit>>(new Map());
  const [loadingMessage, setLoadingMessage] = useState("Preparando importación...");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acceptResult, setAcceptResult] = useState<AcceptResult | null>(null);
  const [updatedValues, setUpdatedValues] = useState<UpdatedValuesResponse[]>([]);
  const [acceptedStatement, setAcceptedStatement] =
    useState<AcceptedCardStatement | null>(null);
  const [statementHistory, setStatementHistory] = useState<CardStatementListItem[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);
  const [historyActionId, setHistoryActionId] = useState<string | null>(null);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [traceability, setTraceability] = useState<CardStatementTraceability | null>(null);
  const [traceabilityLoadingId, setTraceabilityLoadingId] = useState<string | null>(null);
  const [manualPurchaseOpen, setManualPurchaseOpen] = useState(false);
  const [manualPurchase, setManualPurchase] = useState<ManualPurchaseForm>(
    EMPTY_MANUAL_PURCHASE,
  );
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<CardExchangeRate | null>(null);
  const [equivalents, setEquivalents] = useState<CardMoneyEquivalents>({
    usdEquivalentPesos: null,
    combinedTotalPesos: null,
  });
  const [rateSaving, setRateSaving] = useState(false);
  const [rateMessage, setRateMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingControllerRef = useRef<AbortController | null>(null);

  const applyAcceptedStatement = useCallback(
    (statement: AcceptedCardStatement) => {
      const nextPreview = acceptedStatementToPreview(statement);

      setAcceptedStatement(statement);
      setPreview(nextPreview);
      setExchangeRate(statement.exchangeRate);
      setEquivalents(statement.equivalents);
      setDraftId(null);
      setRowEdits(new Map());
      setSelectedFile(null);
      setAcceptResult({
        statementId: statement.id,
        status: statement.status,
        updatedValues: statement.projections,
        warnings: [],
      });
      setUpdatedValues(statement.projections);
      setErrorMessage(null);
      setUiState("accepted");
    },
    [],
  );

  const refreshHistory = useCallback(async () => {
    const statements = await listCardStatements({ limit: 100, includeArchived: true });
    setStatementHistory(statements);
  }, []);

  const loadAcceptedStatement = useCallback(
    async (statementId: string) => {
      setStatementLoading(true);
      setErrorMessage(null);

      try {
        const statement = await getCardStatement(statementId);
        applyAcceptedStatement(statement);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el resumen guardado.",
        );
      } finally {
        setStatementLoading(false);
      }
    },
    [applyAcceptedStatement],
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [latest, history, currentExchangeRate] = await Promise.all([
          getLatestCardStatement(),
          listCardStatements({ limit: 100, includeArchived: true }),
          getCardExchangeRate(),
        ]);

        if (!active) return;

        setStatementHistory(history);
        setExchangeRate(currentExchangeRate);

        if (latest) {
          applyAcceptedStatement(latest);
        } else {
          setUiState("initial");
        }
      } catch (error) {
        if (!active) return;

        setErrorMessage(
          error instanceof Error
            ? `No se pudieron cargar los resúmenes guardados: ${error.message}`
            : "No se pudieron cargar los resúmenes guardados.",
        );
        setUiState("initial");
      }
    })();

    return () => {
      active = false;
      pollingControllerRef.current?.abort();
    };
  }, [applyAcceptedStatement]);

  const editedPreview = useMemo(
    () => (preview ? createEditedPreview(preview, rowEdits) : null),
    [preview, rowEdits],
  );

  const cardOptions = useMemo(() => {
    if (!preview) return [];

    const seen = new Set<string>();
    const options: Array<{ cardLast4: string; holderName: string }> = [];

    for (const group of preview.groups) {
      if (!group.cardLast4 || seen.has(group.cardLast4)) continue;
      seen.add(group.cardLast4);
      options.push({
        cardLast4: group.cardLast4,
        holderName: group.holderName ?? "",
      });
    }

    return options;
  }, [preview]);

  const startNewImport = useCallback(() => {
    pollingControllerRef.current?.abort();
    pollingControllerRef.current = null;
    setSelectedFile(null);
    setPreview(null);
    setDraftId(null);
    setRowEdits(new Map());
    setErrorMessage(null);
    setAcceptResult(null);
    setUpdatedValues([]);
    setElapsedSeconds(0);
    setManualPurchaseOpen(false);
    setUiState("initial");

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const returnToSavedStatement = useCallback(() => {
    if (acceptedStatement) {
      applyAcceptedStatement(acceptedStatement);
    }
  }, [acceptedStatement, applyAcceptedStatement]);

  const handleActivateStatement = useCallback(async (statementId: string) => {
    const candidate = statementHistory.find((item) => item.id === statementId);
    const confirmed = window.confirm(
      `¿Activar ${candidate?.brand ?? "este resumen"} versión ${candidate?.version ?? "seleccionada"}? La versión activa actual quedará conservada como anterior.`,
    );
    if (!confirmed) return;

    setHistoryActionId(statementId);
    setHistoryMessage(null);
    try {
      const statement = await activateCardStatement(statementId);
      applyAcceptedStatement(statement);
      await refreshHistory();
      setHistoryMessage("Versión activada. Las compras manuales y sus cuotas quedaron vinculadas al resumen activo.");
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "No se pudo activar el resumen.");
    } finally {
      setHistoryActionId(null);
    }
  }, [applyAcceptedStatement, refreshHistory, statementHistory]);

  const handleArchiveStatement = useCallback(async (statementId: string) => {
    const candidate = statementHistory.find((item) => item.id === statementId);
    const confirmed = window.confirm(
      `¿Archivar ${candidate?.brand ?? "este resumen"} versión ${candidate?.version ?? "seleccionada"}? No se borrará el PDF, el borrador ni la trazabilidad de la IA.`,
    );
    if (!confirmed) return;

    const reason = window.prompt(
      "Motivo del archivo (queda guardado en la trazabilidad):",
      "Archivado manualmente desde el historial de Tarjetas",
    );
    if (reason === null) return;

    setHistoryActionId(statementId);
    setHistoryMessage(null);
    try {
      await archiveCardStatement(statementId, reason);
      await refreshHistory();

      if (acceptedStatement?.id === statementId) {
        const latest = await getLatestCardStatement();
        if (latest) {
          applyAcceptedStatement(latest);
        } else {
          setAcceptedStatement(null);
          setPreview(null);
          setAcceptResult(null);
          setUpdatedValues([]);
          setUiState("initial");
        }
      }

      setTraceability((current) => current?.statement.id === statementId ? null : current);
      setHistoryMessage("Resumen archivado sin eliminar su documento ni su historial de procesamiento.");
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "No se pudo archivar el resumen.");
    } finally {
      setHistoryActionId(null);
    }
  }, [acceptedStatement?.id, applyAcceptedStatement, refreshHistory, statementHistory]);

  const handleOpenTraceability = useCallback(async (statementId: string) => {
    if (traceability?.statement.id === statementId) {
      setTraceability(null);
      return;
    }

    setTraceabilityLoadingId(statementId);
    setHistoryMessage(null);
    try {
      setTraceability(await getCardStatementTraceability(statementId));
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "No se pudo cargar la trazabilidad.");
    } finally {
      setTraceabilityLoadingId(null);
    }
  }, [traceability?.statement.id]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setErrorMessage(null);
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    pollingControllerRef.current?.abort();
    const controller = new AbortController();
    pollingControllerRef.current = controller;

    setUiState("loading");
    setLoadingMessage("Subiendo el resumen...");
    setErrorMessage(null);
    setElapsedSeconds(0);

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1_000);

    try {
      const result = await importCardStatementPdf(
        selectedFile,
        controller.signal,
        (status) => {
          setLoadingMessage(
            status.progress?.message || "Analizando el resumen con IA...",
          );
          setElapsedSeconds(
            status.progress?.elapsedSeconds ??
              Math.floor((Date.now() - startedAt) / 1000),
          );
        },
      );

      setDraftId(result.draftId);
      setPreview(result.preview);
      setExchangeRate(result.exchangeRate);
      setEquivalents(result.equivalents);
      setRateMessage(null);
      setRowEdits(new Map());
      setUiState("preview");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo procesar el resumen.",
      );
      setUiState("error");
    } finally {
      window.clearInterval(timer);
      if (pollingControllerRef.current === controller) {
        pollingControllerRef.current = null;
      }
    }
  }, [selectedFile]);

  const handleRowEdit = useCallback(
    (rowId: string, field: EditableRowField, value: string) => {
      setRowEdits((current) => {
        const next = new Map(current);
        const currentEdit = next.get(rowId) ?? {};
        next.set(rowId, { ...currentEdit, [field]: value || null });
        return next;
      });
    },
    [],
  );

  const handleRestoreEdits = useCallback(() => {
    setRowEdits(new Map());
  }, []);

  const handleAccept = useCallback(async () => {
    if (!draftId || !editedPreview) return;

    setUiState("loading");
    setLoadingMessage("Guardando el resumen confirmado...");
    setErrorMessage(null);

    try {
      const result = await acceptCardStatementDraft(draftId, editedPreview);

      try {
        const persisted = await getCardStatement(result.statementId);
        applyAcceptedStatement(persisted);
      } catch {
        const { from, to } = getProjectionRange();
        const values =
          result.updatedValues.length > 0
            ? result.updatedValues
            : await getUpdatedValues(from, to);

        setAcceptedStatement(null);
        setPreview({
          ...editedPreview,
          statementId: result.statementId,
        });
        setAcceptResult(result);
        setUpdatedValues(values);
        setUiState("accepted");
      }

      await refreshHistory();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo aceptar el resumen.",
      );
      setUiState("preview");
    }
  }, [
    applyAcceptedStatement,
    draftId,
    editedPreview,
    refreshHistory,
  ]);

  const openManualPurchase = useCallback(() => {
    const firstCard = cardOptions[0];
    setManualPurchase({
      ...EMPTY_MANUAL_PURCHASE,
      cardLast4: firstCard?.cardLast4 ?? "",
      holderName: firstCard?.holderName ?? "",
      purchaseDate: new Date().toISOString().slice(0, 10),
    });
    setManualMessage(null);
    setManualPurchaseOpen(true);
  }, [cardOptions]);

  const handleManualPurchaseSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const statementId = acceptResult?.statementId ?? preview?.statementId;
      if (!statementId) {
        setManualMessage("No se encontró el resumen confirmado.");
        return;
      }

      const installments = Number.parseInt(manualPurchase.installments, 10);
      if (!Number.isFinite(installments) || installments < 1) {
        setManualMessage("La cantidad de cuotas debe ser mayor a cero.");
        return;
      }

      setManualSubmitting(true);
      setManualMessage(null);

      try {
        await createManualPurchase({
          statementId,
          cardLast4: manualPurchase.cardLast4,
          holderName: manualPurchase.holderName,
          purchaseDate: manualPurchase.purchaseDate,
          description: manualPurchase.description,
          currency: manualPurchase.currency,
          amount: manualPurchase.amount,
          installments,
          notes: manualPurchase.notes || undefined,
        });

        const refreshed = await getCardStatement(statementId);
        applyAcceptedStatement(refreshed);
        await refreshHistory();

        setManualPurchaseOpen(false);
        setManualPurchase(EMPTY_MANUAL_PURCHASE);
        setManualMessage("Compra manual agregada y proyecciones actualizadas.");
      } catch (error) {
        setManualMessage(
          error instanceof Error ? error.message : "No se pudo agregar la compra.",
        );
      } finally {
        setManualSubmitting(false);
      }
    },
    [
      acceptResult?.statementId,
      applyAcceptedStatement,
      manualPurchase,
      preview?.statementId,
      refreshHistory,
    ],
  );

  const handleDeleteManualPurchase = useCallback(
    async (purchaseId: string) => {
      const statementId = acceptedStatement?.id;
      if (!statementId) return;

      const confirmed = window.confirm(
        "¿Eliminar esta compra manual y sus cuotas proyectadas?",
      );
      if (!confirmed) return;

      setDeletingPurchaseId(purchaseId);
      setManualMessage(null);

      try {
        await deleteManualPurchase(purchaseId);
        const refreshed = await getCardStatement(statementId);
        applyAcceptedStatement(refreshed);
        await refreshHistory();
        setManualMessage("Compra manual eliminada y proyecciones actualizadas.");
      } catch (error) {
        setManualMessage(
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la compra manual.",
        );
      } finally {
        setDeletingPurchaseId(null);
      }
    },
    [acceptedStatement?.id, applyAcceptedStatement, refreshHistory],
  );

  const handleExchangeRateSave = useCallback(
    async (rate: string, effectiveDate: string) => {
      setRateSaving(true);
      setRateMessage(null);

      try {
        const saved = await updateCardExchangeRate({ rate, effectiveDate });
        setExchangeRate(saved);

        const activeStatementId = acceptedStatement?.id ?? acceptResult?.statementId ?? null;
        if (activeStatementId) {
          const refreshed = await getCardStatement(activeStatementId);
          applyAcceptedStatement(refreshed);
        } else if (draftId) {
          const refreshed = await getCardStatementDraft(draftId);
          setExchangeRate(refreshed.exchangeRate);
          setEquivalents(refreshed.equivalents);
        } else {
          setEquivalents({
            usdEquivalentPesos: null,
            combinedTotalPesos: null,
          });
        }

        setRateMessage("Cotización guardada y equivalentes recalculados por el backend.");
      } catch (error) {
        setRateMessage(
          error instanceof Error
            ? error.message
            : "No se pudo guardar la cotización.",
        );
      } finally {
        setRateSaving(false);
      }
    },
    [
      acceptResult?.statementId,
      acceptedStatement?.id,
      applyAcceptedStatement,
      draftId,
    ],
  );

  if (uiState === "booting") {
    return <PersistedDataLoadingState />;
  }

  if (uiState === "loading") {
    return (
      <LoadingState
        message={loadingMessage}
        elapsedSeconds={elapsedSeconds}
        onCancel={() => {
          pollingControllerRef.current?.abort();
          if (acceptedStatement) {
            applyAcceptedStatement(acceptedStatement);
          } else {
            setUiState("initial");
          }
        }}
      />
    );
  }

  if (uiState === "error") {
    return (
      <ErrorState
        message={errorMessage ?? "No se pudo procesar el resumen."}
        onRetry={() => {
          setUiState("initial");
          setErrorMessage(null);
        }}
        onReset={startNewImport}
      />
    );
  }

  if (uiState === "initial") {
    return (
      <div className="space-y-6">
        <ImportState
          selectedFile={selectedFile}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onImport={handleImport}
          savedStatement={acceptedStatement}
          noticeMessage={errorMessage}
          onBackToSaved={returnToSavedStatement}
        />
        <StatementHistoryPanel
          history={statementHistory}
          selectedStatementId={null}
          activeStatementId=""
          loading={statementLoading}
          actionId={historyActionId}
          message={historyMessage}
          traceability={traceability}
          traceabilityLoadingId={traceabilityLoadingId}
          onSelect={loadAcceptedStatement}
          onActivate={handleActivateStatement}
          onArchive={handleArchiveStatement}
          onTraceability={handleOpenTraceability}
        />
      </div>
    );
  }

  if (!editedPreview) {
    return null;
  }

  if (uiState === "accepted") {
    return (
      <AcceptedState
        preview={editedPreview}
        statement={acceptedStatement}
        result={acceptResult}
        updatedValues={updatedValues}
        history={statementHistory}
        statementLoading={statementLoading}
        historyActionId={historyActionId}
        historyMessage={historyMessage}
        traceability={traceability}
        traceabilityLoadingId={traceabilityLoadingId}
        onSelectStatement={loadAcceptedStatement}
        onActivateStatement={handleActivateStatement}
        onArchiveStatement={handleArchiveStatement}
        onOpenTraceability={handleOpenTraceability}
        onNewImport={startNewImport}
        onManualPurchase={openManualPurchase}
        manualPurchaseOpen={manualPurchaseOpen}
        setManualPurchaseOpen={setManualPurchaseOpen}
        manualPurchase={manualPurchase}
        setManualPurchase={setManualPurchase}
        cardOptions={cardOptions}
        onManualPurchaseSubmit={handleManualPurchaseSubmit}
        manualSubmitting={manualSubmitting}
        manualMessage={manualMessage}
        deletingPurchaseId={deletingPurchaseId}
        onDeleteManualPurchase={handleDeleteManualPurchase}
        exchangeRate={exchangeRate}
        equivalents={equivalents}
        rateSaving={rateSaving}
        rateMessage={rateMessage}
        onExchangeRateSave={handleExchangeRateSave}
      />
    );
  }

  return (
    <PreviewState
      preview={editedPreview}
      fileName={selectedFile?.name ?? "Resumen importado"}
      pendingEdits={rowEdits.size}
      errorMessage={errorMessage}
      onEdit={handleRowEdit}
      onRestore={handleRestoreEdits}
      onAccept={handleAccept}
      onNewImport={startNewImport}
      exchangeRate={exchangeRate}
      equivalents={equivalents}
      rateSaving={rateSaving}
      rateMessage={rateMessage}
      onExchangeRateSave={handleExchangeRateSave}
    />
  );
}
