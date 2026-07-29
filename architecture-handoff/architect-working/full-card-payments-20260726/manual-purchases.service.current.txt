import { prisma } from "../../db/prisma.js";
import { validateData } from "../../shared/validation.js";
import { manualPurchaseSchema, type ManualPurchaseInput } from "../cards/cards.schemas.js";
import { logger } from "../../shared/logger.js";
import { parseArgentinePesos, parseDollars } from "../../shared/money.js";
import { NotFoundError } from "../../shared/errors.js";
import { cardBillingCalendarService } from "../projections/card-billing-calendar.service.js";

export class ManualPurchasesService {
  async createPurchase(statementId: string, input: ManualPurchaseInput) {
    const validated = validateData(manualPurchaseSchema, input);

    const result = await prisma.$transaction(async (tx) => {
      const statement = await tx.cardStatement.findUnique({
        where: { id: statementId },
        select: {
          id: true,
          status: true,
          isActiveForPeriod: true,
          periodKey: true,
          currentDueDate: true,
          nextClosingDate: true,
          nextDueDate: true,
        },
      });

      if (!statement || statement.status !== "accepted" || !statement.isActiveForPeriod) {
        throw new NotFoundError("Accepted statement");
      }

      const billingAnchor = cardBillingCalendarService.resolveManualPurchaseAnchor({
        purchaseDate: validated.purchaseDate,
        periodKey: statement.periodKey,
        currentDueDate: statement.currentDueDate,
        nextClosingDate: statement.nextClosingDate,
        nextDueDate: statement.nextDueDate,
      });

      const purchase = await tx.manualCardPurchase.create({
        data: {
          statementId,
          cardLast4: validated.cardLast4,
          holderName: validated.holderName,
          purchaseDate: validated.purchaseDate,
          description: validated.description,
          currency: validated.currency,
          amountRaw: validated.amount,
          installments: validated.installments,
          notes: validated.notes || null,
        },
      });

      const amountCents = validated.currency === "USD"
        ? parseDollars(validated.amount)
        : parseArgentinePesos(validated.amount);
      const installmentCents = amountCents / BigInt(validated.installments);
      const remainder = amountCents % BigInt(validated.installments);
      const schedule = cardBillingCalendarService.purchaseInstallments(
        billingAnchor.firstBillingMonthKey,
        validated.installments,
      );
      const projections: Array<{
        statementId: string;
        rowId: string;
        monthKey: string;
        label: string;
        installmentCurrent: number;
        installmentTotal: number;
        amountPesosRaw: string | null;
        amountDollarsRaw: string | null;
        currencyOriginal: "ARS" | "USD";
        isManual: boolean;
      }> = [];

      for (const occurrence of schedule) {
        let installmentAmount = installmentCents;

        if (occurrence.installmentCurrent === 1 && remainder > 0n) {
          installmentAmount += remainder;
        }

        const formattedAmount = (Number(installmentAmount) / 100).toLocaleString(
          validated.currency === "USD" ? "en-US" : "es-AR",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        );

        projections.push({
          statementId,
          rowId: purchase.id,
          monthKey: occurrence.monthKey,
          label: occurrence.label,
          installmentCurrent: occurrence.installmentCurrent,
          installmentTotal: occurrence.installmentTotal,
          amountPesosRaw: validated.currency === "ARS" ? formattedAmount : null,
          amountDollarsRaw: validated.currency === "USD" ? formattedAmount : null,
          currencyOriginal: validated.currency,
          isManual: true,
        });
      }

      if (projections.length > 0) {
        await tx.cardInstallmentProjection.createMany({ data: projections });
      }

      return { purchase, projections, billingAnchor };
    });

    logger.info(
      {
        purchaseId: result.purchase.id,
        statementId,
        purchaseDate: validated.purchaseDate,
        installments: validated.installments,
        projectionsCreated: result.projections.length,
        firstBillingMonthKey: result.billingAnchor.firstBillingMonthKey,
        billingAnchorReason: result.billingAnchor.reason,
        dueDateEstimated: result.billingAnchor.dueDateEstimated,
        lastBillingMonthKey: result.projections.at(-1)?.monthKey ?? null,
      },
      "Manual purchase created with billing-cycle projections",
    );

    return result;
  }

  async deletePurchase(purchaseId: string) {
    const purchase = await prisma.manualCardPurchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) {
      throw new NotFoundError("Manual purchase");
    }

    await prisma.$transaction(async (tx) => {
      await tx.cardInstallmentProjection.deleteMany({
        where: {
          statementId: purchase.statementId,
          rowId: purchase.id,
          isManual: true,
        },
      });

      await tx.manualCardPurchase.delete({
        where: { id: purchaseId },
      });
    });

    logger.info(
      {
        purchaseId,
        statementId: purchase.statementId,
      },
      "Manual purchase deleted with projections",
    );

    return {
      success: true,
      statementId: purchase.statementId,
    };
  }
}

export const manualPurchasesService = new ManualPurchasesService();
